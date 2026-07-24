const express = require('express');
const helmet = require('helmet');
const crypto = require('node:crypto');
const { auth, roles, localLogin, tokenFrom } = require('./auth');
const { transition, validateLines, canSee } = require('./domain');
const { tx, register, audit } = require('./db');

function problem(status,message,code) { return Object.assign(new Error(message),{status,code}); }
function callbackSignature(body,secret) { return crypto.createHmac('sha256',secret).update(body).digest('hex'); }
function safeSignature(actual,expected) { return /^[a-f0-9]{64}$/i.test(actual||'') && crypto.timingSafeEqual(Buffer.from(actual,'hex'),Buffer.from(expected,'hex')); }
async function orderWithLines(client,tenantId,id,lock=false) {
  const order=(await client.query(`SELECT * FROM commerce_orders WHERE tenant_id=$1 AND id=$2${lock?' FOR UPDATE':''}`,[tenantId,id])).rows[0];
  if (!order) throw problem(404,'Order not found');
  order.lines=(await client.query(`SELECT * FROM commerce_order_lines WHERE order_id=$1 ORDER BY id`,[id])).rows;
  return order;
}
async function changeState(client,principal,order,command,metadata={}) {
  const next=command==='recover'&&order.recovery_state?order.recovery_state:transition(order.state,command);
  const recoveryState=command==='delivery_exception'?order.state:command==='recover'?null:order.recovery_state;
  const result=await client.query(`UPDATE commerce_orders SET state=$1,version=version+1,updated_at=now(),exception_code=$2,recovery_state=$3 WHERE tenant_id=$4 AND id=$5 AND version=$6 RETURNING *`,[next,command==='recover'?null:(metadata.exceptionCode||order.exception_code),recoveryState,principal.tenantId,order.id,order.version]);
  if(!result.rowCount) throw problem(409,'Order changed concurrently');
  await audit(client,principal,`order.${command}`,order.id,order.state,next,metadata);
  return result.rows[0];
}
function assertVisible(principal,order){ if(!canSee(principal,order)) throw problem(403,'Forbidden'); }

function createCommerceApp({config,pool,providers}) {
  const app=express(); app.disable('x-powered-by'); app.use(helmet());
  app.use(express.json({limit:'256kb',verify:(req,_res,buffer)=>{req.rawBody=buffer.toString('utf8');}}));
  app.get('/api/health',async(_req,res,next)=>{try{await pool.query('SELECT 1');res.json({ok:true,service:'catering-commerce',database:'reachable'});}catch(e){next(Object.assign(e,{status:503}));}});
  app.get('/api/auth/sso',(_req,res)=>res.redirect(303,config.oidcLoginUrl));
  app.post('/api/auth/login',async(req,res,next)=>{try{if(!config.localLogin)return res.status(410).json({error:'Password login is disabled; use organization SSO'});const session=await localLogin(pool,req.body?.email,req.body?.password);if(!session)return res.status(401).json({error:'Invalid credentials'});res.cookie('catering_session',session.token,{httpOnly:true,secure:false,sameSite:'strict',maxAge:8*60*60*1000});res.json(session);}catch(error){next(error);}});
  app.post('/api/auth/logout',async(req,res,next)=>{try{const token=tokenFrom(req);if(token&&token.split('.').length!==3)await pool.query('DELETE FROM commerce_sessions WHERE token_hash=$1',[crypto.createHash('sha256').update(token).digest('hex')]);res.clearCookie('catering_session',{httpOnly:true,secure:config.production,sameSite:'strict'});res.status(204).end();}catch(error){next(error);}});

  app.post('/api/webhooks/:provider',async(req,res,next)=>{
    try{
      const tenantId=req.get('x-tenant-id'),deliveryId=req.get('x-delivery-id');
      if(!tenantId||!deliveryId||!safeSignature(req.get('x-signature'),callbackSignature(req.rawBody||'',config.webhookSecret))) throw problem(401,'Invalid webhook signature');
      const principal={tenantId,subject:`webhook:${req.params.provider}`,role:'operator'};
      const result=await tx(pool,principal,async client=>{
        const receipt=await client.query(`INSERT INTO commerce_webhook_receipts(tenant_id,provider,delivery_id,body_sha256) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING id`,[tenantId,req.params.provider,deliveryId,crypto.createHash('sha256').update(req.rawBody||'').digest('hex')]);
        if(!receipt.rowCount)return {duplicate:true};
        const order=await orderWithLines(client,tenantId,req.body.orderId,true);
        const commands={payment_succeeded:'payment_succeeded',payment_failed:'payment_failed',refund_succeeded:'refund_succeeded',delivery_exception:'delivery_exception',delivery_completed:'complete'};
        const command=commands[req.body.event]; if(!command)throw problem(400,'Unsupported webhook event');
        await changeState(client,principal,order,command,{deliveryId,provider:req.params.provider,exceptionCode:req.body.code});
        return {duplicate:false};
      }); res.status(result.duplicate?200:202).json({accepted:true,...result});
    }catch(e){next(e);}
  });

  app.use('/api',auth(config,pool));
  app.use('/api',async(req,res,next)=>{try{await tx(pool,req.principal,client=>register(client,req.principal));next();}catch(e){next(Object.assign(e,{status:e.code==='23503'?403:500}));}});
  app.get('/api/session',(req,res)=>res.json({user:req.principal}));
  app.get('/api/auth/me',(req,res)=>res.json({user:req.principal}));

  app.post('/api/runtime-ai/readiness',async(req,res,next)=>{try{
    const prompt=String(req.body?.prompt||'').trim();if(!prompt)return res.status(400).json({error:'Prompt is required'});
    const apiKey=process.env.OPENROUTER_API_KEY,model=process.env.OPENROUTER_MODEL,baseUrl=process.env.OPENROUTER_BASE_URL;
    if(!apiKey||!model||!baseUrl)throw problem(503,'OpenRouter runtime is not configured');
    const provider=await fetch(`${baseUrl.replace(/\/$/,'')}/chat/completions`,{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model,temperature:0.2,messages:[{role:'system',content:'You are a catering operations reviewer. Return concise risks, evidence gaps, next actions, uncertainty, and required human review.'},{role:'user',content:prompt}]})});
    if(!provider.ok)throw problem(502,`OpenRouter returned ${provider.status}`);const payload=await provider.json();const output=String(payload?.choices?.[0]?.message?.content||'').trim();if(!output)throw problem(502,'OpenRouter returned an empty response');
    const saved=await pool.query(`INSERT INTO catering_ai_results(tenant_id,actor_subject,feature,input,output,model)VALUES($1,$2,'readiness',$3,$4,$5)RETURNING id`,[req.principal.tenantId,req.principal.subject,{prompt},output,model]);
    res.json({id:saved.rows[0].id,response:output,model,provider:'openrouter'});
  }catch(e){next(e);}});

  app.get('/api/commerce/inventory',async(req,res,next)=>{try{
    const params=[req.principal.tenantId];let where='tenant_id=$1';
    if(req.principal.role==='merchant'){params.push(req.principal.subject);where+=' AND merchant_subject=$2';}
    const rows=(await pool.query(`SELECT * FROM commerce_inventory WHERE ${where} ORDER BY name`,params)).rows;res.json({inventory:rows});
  }catch(e){next(e);}});
  app.post('/api/commerce/inventory',roles('merchant','operator'),async(req,res,next)=>{try{
    const merchant=req.principal.role==='merchant'?req.principal.subject:req.body.merchantSubject;
    if(!merchant||!req.body.sku||!req.body.name||!Number.isInteger(req.body.availableQuantity)||!Number.isInteger(req.body.unitPriceCents))throw problem(400,'merchant, SKU, name, integer quantity, and integer cents are required');
    const row=await tx(pool,req.principal,async client=>{const result=await client.query(`INSERT INTO commerce_inventory(tenant_id,merchant_subject,sku,name,available_quantity,unit_price_cents) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(tenant_id,merchant_subject,sku) DO UPDATE SET name=EXCLUDED.name,available_quantity=EXCLUDED.available_quantity,unit_price_cents=EXCLUDED.unit_price_cents,version=commerce_inventory.version+1,updated_at=now() RETURNING *`,[req.principal.tenantId,merchant,req.body.sku,req.body.name,req.body.availableQuantity,req.body.unitPriceCents]);await audit(client,req.principal,'inventory.upserted',null,null,null,{inventoryId:result.rows[0].id,sku:req.body.sku});return result.rows[0];});res.status(201).json({inventory:row});
  }catch(e){next(e);}});

  app.post('/api/commerce/orders',roles('customer','operator'),async(req,res,next)=>{try{
    validateLines(req.body.lines);if(!req.body.idempotencyKey||!req.body.merchantSubject)throw problem(400,'idempotencyKey and merchantSubject are required');
    const customer=req.principal.role==='customer'?req.principal.subject:req.body.customerSubject;if(!customer)throw problem(400,'customerSubject is required');
    const order=await tx(pool,req.principal,async client=>{
      const replay=await client.query(`SELECT * FROM commerce_orders WHERE tenant_id=$1 AND customer_subject=$2 AND idempotency_key=$3`,[req.principal.tenantId,customer,req.body.idempotencyKey]);if(replay.rowCount)return orderWithLines(client,req.principal.tenantId,replay.rows[0].id);
      const ids=req.body.lines.map(l=>l.inventoryId);const inventory=(await client.query(`SELECT * FROM commerce_inventory WHERE tenant_id=$1 AND merchant_subject=$2 AND id=ANY($3::uuid[])`,[req.principal.tenantId,req.body.merchantSubject,ids])).rows;
      if(inventory.length!==new Set(ids).size)throw problem(409,'Inventory item missing or belongs to another merchant/tenant');
      const byId=new Map(inventory.map(i=>[i.id,i]));const subtotal=req.body.lines.reduce((sum,line)=>sum+byId.get(line.inventoryId).unit_price_cents*line.quantity,0);
      const created=(await client.query(`INSERT INTO commerce_orders(tenant_id,order_number,customer_subject,merchant_subject,subtotal_cents,idempotency_key) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[req.principal.tenantId,`CAT-${crypto.randomUUID().slice(0,8).toUpperCase()}`,customer,req.body.merchantSubject,subtotal,req.body.idempotencyKey])).rows[0];
      for(const line of req.body.lines)await client.query(`INSERT INTO commerce_order_lines(order_id,inventory_id,quantity,unit_price_cents) VALUES($1,$2,$3,$4)`,[created.id,line.inventoryId,line.quantity,byId.get(line.inventoryId).unit_price_cents]);
      await client.query(`INSERT INTO commerce_provider_jobs(tenant_id,order_id,provider,operation,idempotency_key,request_payload) VALUES($1,$2,'tax','calculate',$3,$4)`,[req.principal.tenantId,created.id,`tax:${created.id}`,{orderId:created.id,subtotalCents:subtotal,postalCode:req.body.postalCode}]);
      await audit(client,req.principal,'order.created',created.id,null,'TAX_PENDING',{subtotalCents:subtotal});return orderWithLines(client,req.principal.tenantId,created.id);
    });res.status(201).json({order});
  }catch(e){next(e);}});

  app.get('/api/commerce/orders',async(req,res,next)=>{try{
    const p=[req.principal.tenantId];let where='tenant_id=$1';if(req.principal.role==='customer'){p.push(req.principal.subject);where+=' AND customer_subject=$2';}if(req.principal.role==='merchant'){p.push(req.principal.subject);where+=' AND merchant_subject=$2';}
    const orders=(await pool.query(`SELECT * FROM commerce_orders WHERE ${where} ORDER BY created_at DESC LIMIT 200`,p)).rows;
    await Promise.all(orders.map(async order=>{order.lines=(await pool.query(`SELECT * FROM commerce_order_lines WHERE order_id=$1 ORDER BY id`,[order.id])).rows;}));res.json({orders});
  }catch(e){next(e);}});
  app.get('/api/commerce/orders/:id',async(req,res,next)=>{try{const order=await tx(pool,req.principal,client=>orderWithLines(client,req.principal.tenantId,req.params.id));assertVisible(req.principal,order);res.json({order});}catch(e){next(e);}});
  app.get('/api/commerce/orders/:id/history',async(req,res,next)=>{try{const order=await tx(pool,req.principal,client=>orderWithLines(client,req.principal.tenantId,req.params.id));assertVisible(req.principal,order);const history=(await pool.query(`SELECT sequence,actor_subject,action,from_state,to_state,metadata,occurred_at FROM commerce_audit_events WHERE tenant_id=$1 AND order_id=$2 ORDER BY sequence`,[req.principal.tenantId,req.params.id])).rows;res.json({history});}catch(e){next(e);}});

  app.post('/api/commerce/orders/:id/reserve',roles('merchant','operator'),async(req,res,next)=>{try{
    const result=await tx(pool,req.principal,async client=>{const order=await orderWithLines(client,req.principal.tenantId,req.params.id,true);assertVisible(req.principal,order);if(order.state!=='PENDING_RESERVATION')throw problem(409,`Cannot reserve while ${order.state}`);
      for(const line of order.lines){const changed=await client.query(`UPDATE commerce_inventory SET available_quantity=available_quantity-$1,reserved_quantity=reserved_quantity+$1,version=version+1,updated_at=now() WHERE tenant_id=$2 AND id=$3 AND available_quantity >= $1 RETURNING id`,[line.quantity,req.principal.tenantId,line.inventory_id]);if(!changed.rowCount)throw problem(409,'Insufficient inventory; no items were reserved');}
      return changeState(client,req.principal,order,'reserve');});res.json({order:result});
  }catch(e){next(e);}});

  app.post('/api/commerce/orders/:id/payment',roles('customer','operator'),async(req,res,next)=>{try{
    const result=await tx(pool,req.principal,async client=>{const order=await orderWithLines(client,req.principal.tenantId,req.params.id,true);assertVisible(req.principal,order);const command=order.state==='PAYMENT_FAILED'?'retry_payment':'request_payment';const updated=await changeState(client,req.principal,order,command);
      const key=req.body.idempotencyKey||`capture:${order.id}`;const job=(await client.query(`INSERT INTO commerce_provider_jobs(tenant_id,order_id,provider,operation,idempotency_key,request_payload) VALUES($1,$2,'payment','capture',$3,$4) ON CONFLICT(tenant_id,provider,idempotency_key) DO UPDATE SET status=CASE WHEN commerce_provider_jobs.status IN ('retryable','dead-letter') THEN 'queued' ELSE commerce_provider_jobs.status END,next_attempt_at=now(),updated_at=now() RETURNING id,status`,[req.principal.tenantId,order.id,key,{orderId:order.id,amountCents:order.total_cents,currency:order.currency,paymentMethodToken:req.body.paymentMethodToken}])).rows[0];return {order:updated,job};});res.status(202).json(result);
  }catch(e){next(e);}});

  app.post('/api/commerce/orders/:id/fulfill',roles('merchant','operator'),async(req,res,next)=>{try{
    if(!req.body.lineId||!Number.isInteger(req.body.quantity)||req.body.quantity<1||!req.body.idempotencyKey)throw problem(400,'lineId, positive integer quantity, and idempotencyKey are required');
    const result=await tx(pool,req.principal,async client=>{let order=await orderWithLines(client,req.principal.tenantId,req.params.id,true);assertVisible(req.principal,order);const replay=await client.query(`SELECT id FROM commerce_fulfillments WHERE tenant_id=$1 AND idempotency_key=$2`,[req.principal.tenantId,req.body.idempotencyKey]);if(replay.rowCount)return order;
      if(order.state==='PAID')order=await changeState(client,req.principal,order,'begin_fulfillment');if(!['FULFILLING','PARTIALLY_FULFILLED'].includes(order.state))throw problem(409,`Cannot fulfill while ${order.state}`);
      const line=(await client.query(`SELECT * FROM commerce_order_lines WHERE order_id=$1 AND id=$2 FOR UPDATE`,[order.id,req.body.lineId])).rows[0];if(!line||line.fulfilled_quantity+req.body.quantity>line.quantity)throw problem(409,'Fulfillment exceeds remaining quantity');
      await client.query(`UPDATE commerce_order_lines SET fulfilled_quantity=fulfilled_quantity+$1 WHERE id=$2`,[req.body.quantity,line.id]);await client.query(`UPDATE commerce_inventory SET reserved_quantity=reserved_quantity-$1,version=version+1,updated_at=now() WHERE tenant_id=$2 AND id=$3 AND reserved_quantity >= $1`,[req.body.quantity,req.principal.tenantId,line.inventory_id]);
      await client.query(`INSERT INTO commerce_fulfillments(tenant_id,order_id,line_id,quantity,idempotency_key,created_by) VALUES($1,$2,$3,$4,$5,$6)`,[req.principal.tenantId,order.id,line.id,req.body.quantity,req.body.idempotencyKey,req.principal.subject]);
      const remaining=Number((await client.query(`SELECT sum(quantity-fulfilled_quantity) AS remaining FROM commerce_order_lines WHERE order_id=$1`,[order.id])).rows[0].remaining);return changeState(client,req.principal,order,remaining===0?'full_fulfillment':'partial_fulfillment',{quantity:req.body.quantity,lineId:line.id});});res.json({order:result});
  }catch(e){next(e);}});

  app.post('/api/commerce/orders/:id/dispatch',roles('merchant','operator'),async(req,res,next)=>{try{
    const result=await tx(pool,req.principal,async client=>{const order=await orderWithLines(client,req.principal.tenantId,req.params.id,true);assertVisible(req.principal,order);const updated=await changeState(client,req.principal,order,'dispatch');const job=(await client.query(`INSERT INTO commerce_provider_jobs(tenant_id,order_id,provider,operation,idempotency_key,request_payload) VALUES($1,$2,'delivery','dispatch',$3,$4) ON CONFLICT(tenant_id,provider,idempotency_key) DO UPDATE SET updated_at=now() RETURNING id,status`,[req.principal.tenantId,order.id,req.body.idempotencyKey||`dispatch:${order.id}`,{orderId:order.id,address:req.body.address,window:req.body.window}])).rows[0];return {order:updated,job};});res.status(202).json(result);
  }catch(e){next(e);}});

  app.post('/api/commerce/orders/:id/cancel',roles('customer','operator'),async(req,res,next)=>{try{
    const result=await tx(pool,req.principal,async client=>{const order=await orderWithLines(client,req.principal.tenantId,req.params.id,true);assertVisible(req.principal,order);if(!req.body.reason)throw problem(400,'Cancellation reason is required');const next=transition(order.state,'cancel');
      const remainingByInventory=new Map();for(const line of order.lines){const remaining=line.quantity-line.fulfilled_quantity;if(remaining)remainingByInventory.set(line.inventory_id,(remainingByInventory.get(line.inventory_id)||0)+remaining);}
      if(['RESERVED','PAYMENT_FAILED'].includes(order.state)||next==='REFUND_PENDING')for(const [inventoryId,quantity]of remainingByInventory)await client.query(`UPDATE commerce_inventory SET available_quantity=available_quantity+$1,reserved_quantity=reserved_quantity-$1,version=version+1,updated_at=now() WHERE tenant_id=$2 AND id=$3`,[quantity,req.principal.tenantId,inventoryId]);
      const updated=await changeState(client,req.principal,order,'cancel',{reason:req.body.reason});if(next==='REFUND_PENDING'){const key=req.body.idempotencyKey||`refund:${order.id}`;await client.query(`INSERT INTO commerce_refunds(tenant_id,order_id,amount_cents,request_key) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING`,[req.principal.tenantId,order.id,order.total_cents,key]);const job=(await client.query(`INSERT INTO commerce_provider_jobs(tenant_id,order_id,provider,operation,idempotency_key,request_payload) VALUES($1,$2,'payment','refund',$3,$4) ON CONFLICT(tenant_id,provider,idempotency_key) DO UPDATE SET updated_at=now() RETURNING id,status`,[req.principal.tenantId,order.id,key,{orderId:order.id,amountCents:order.total_cents,reason:req.body.reason}])).rows[0];return {order:updated,job};}return {order:updated};});res.status(result.job?202:200).json(result);
  }catch(e){next(e);}});

  app.post('/api/commerce/orders/:id/exception',roles('merchant','operator'),async(req,res,next)=>{try{const order=await tx(pool,req.principal,async client=>{const current=await orderWithLines(client,req.principal.tenantId,req.params.id,true);assertVisible(req.principal,current);return changeState(client,req.principal,current,'delivery_exception',{exceptionCode:req.body.code||'DELIVERY_EXCEPTION',details:req.body.details});});res.json({order});}catch(e){next(e);}});
  app.post('/api/commerce/orders/:id/recover',roles('merchant','operator'),async(req,res,next)=>{try{const order=await tx(pool,req.principal,async client=>{const current=await orderWithLines(client,req.principal.tenantId,req.params.id,true);assertVisible(req.principal,current);return changeState(client,req.principal,current,'recover',{plan:req.body.plan});});res.json({order});}catch(e){next(e);}});

  app.post('/api/commerce/jobs/:id/execute',roles('operator'),async(req,res,next)=>{let job;try{
    job=await tx(pool,req.principal,async client=>{const result=await client.query(`UPDATE commerce_provider_jobs SET status='running',attempts=attempts+1,updated_at=now() WHERE tenant_id=$1 AND id=$2 AND status IN ('queued','retryable') AND next_attempt_at<=now() RETURNING *`,[req.principal.tenantId,req.params.id]);if(!result.rowCount)throw problem(409,'Job is not executable');return result.rows[0];});
    const response=await providers[job.provider](job.operation,job.request_payload,job.idempotency_key);
    const result=await tx(pool,req.principal,async client=>{let order=job.order_id?await orderWithLines(client,req.principal.tenantId,job.order_id,true):null;if(job.operation==='calculate'){if(!Number.isInteger(response.taxCents)||response.taxCents<0)throw problem(502,'Tax provider returned invalid cents');await client.query(`UPDATE commerce_orders SET tax_cents=$1,total_cents=subtotal_cents+$1 WHERE id=$2`,[response.taxCents,order.id]);order=await orderWithLines(client,req.principal.tenantId,order.id,true);await changeState(client,req.principal,order,'tax_succeeded',{taxCents:response.taxCents});}
      if(job.operation==='capture')await changeState(client,req.principal,order,'payment_succeeded',{providerReference:response.reference});
      if(job.operation==='refund'){await changeState(client,req.principal,order,'refund_succeeded',{providerReference:response.reference});await client.query(`UPDATE commerce_refunds SET status='succeeded',provider_reference=$1 WHERE tenant_id=$2 AND request_key=$3`,[response.reference,req.principal.tenantId,job.idempotency_key]);}
      if(job.operation==='dispatch')await changeState(client,req.principal,order,'dispatch_succeeded',{providerReference:response.reference});
      const updated=(await client.query(`UPDATE commerce_provider_jobs SET status='succeeded',response_payload=$1,last_error_code=NULL,updated_at=now() WHERE id=$2 RETURNING id,status,attempts`,[response,job.id])).rows[0];await audit(client,req.principal,'provider-job.succeeded',job.order_id,null,null,{provider:job.provider,operation:job.operation});return updated;});res.json({job:result});
  }catch(e){if(!job)return next(e);try{const failed=await tx(pool,req.principal,async client=>{const retry=e.retryable&&job.attempts<5;const status=retry?'retryable':'dead-letter';const updated=(await client.query(`UPDATE commerce_provider_jobs SET status=$1,last_error_code=$2,next_attempt_at=now()+($3*interval '1 minute'),updated_at=now() WHERE id=$4 RETURNING id,status,attempts,last_error_code`,[status,e.code||'PROVIDER_ERROR',2**job.attempts,job.id])).rows[0];if(job.order_id){const order=await orderWithLines(client,req.principal.tenantId,job.order_id,true);const command=job.operation==='capture'?'payment_failed':job.operation==='refund'?'refund_failed':job.operation==='dispatch'?'delivery_exception':null;if(command)await changeState(client,req.principal,order,command,{exceptionCode:e.code||'PROVIDER_ERROR'});}await audit(client,req.principal,'provider-job.failed',job.order_id,null,null,{provider:job.provider,code:e.code||'PROVIDER_ERROR',retry});return updated;});res.status(502).json({error:'Provider operation failed',job:failed});}catch(persist){next(persist);}}
  });

  app.get('/api/commerce/jobs',roles('operator'),async(req,res,next)=>{try{res.json({jobs:(await pool.query(`SELECT id,order_id,provider,operation,status,attempts,last_error_code,next_attempt_at,created_at FROM commerce_provider_jobs WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 200`,[req.principal.tenantId])).rows});}catch(e){next(e);}});
  app.post('/api/commerce/reconciliation',roles('operator'),async(req,res,next)=>{try{
    const key=req.body.idempotencyKey||`reconcile:${new Date().toISOString().slice(0,10)}`;const run=(await pool.query(`INSERT INTO commerce_reconciliation_runs(tenant_id,provider,status,started_by) VALUES($1,'payment','running',$2) RETURNING *`,[req.principal.tenantId,req.principal.subject])).rows[0];
    try{const providerData=await providers.payment('reconcile',{from:req.body.from,to:req.body.to},key);const local=(await pool.query(`SELECT order_id,response_payload->>'reference' AS reference FROM commerce_provider_jobs WHERE tenant_id=$1 AND provider='payment' AND operation='capture' AND status='succeeded'`,[req.principal.tenantId])).rows;const external=new Set((providerData.transactions||[]).map(t=>t.reference));const missing=local.filter(row=>!external.has(row.reference));for(const item of missing)await pool.query(`INSERT INTO commerce_reconciliation_exceptions(run_id,order_id,exception_type,details) VALUES($1,$2,'missing-provider-transaction',$3)`,[run.id,item.order_id,item]);await pool.query(`UPDATE commerce_reconciliation_runs SET status=$1,exception_count=$2,completed_at=now() WHERE id=$3`,[missing.length?'exceptions':'passed',missing.length,run.id]);res.status(201).json({run:{...run,status:missing.length?'exceptions':'passed',exception_count:missing.length}});}catch(error){await pool.query(`UPDATE commerce_reconciliation_runs SET status='failed',completed_at=now() WHERE id=$1`,[run.id]);throw error;}
  }catch(e){next(e);}});

  app.use((_req,res)=>res.status(404).json({error:'Route not found; legacy and generated demo routes are quarantined from the production entrypoint'}));
  app.use((error,_req,res,_next)=>{const status=error.status||({23503:409,23505:409,'22P02':400}[error.code])||500;if(status>=500)console.error(error);res.status(status).json({error:status>=500?'Internal server error':error.message,code:error.code||undefined});});
  return app;
}
module.exports={createCommerceApp,callbackSignature};
