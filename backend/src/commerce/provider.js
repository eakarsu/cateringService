function adapter(name, settings, fetchImpl) {
  return async (operation, payload, idempotencyKey) => {
    const response = await fetchImpl(`${settings.baseUrl.replace(/\/$/,'')}/${operation}`, { method:'POST', headers:{ authorization:`Bearer ${settings.token}`,'content-type':'application/json','idempotency-key':idempotencyKey }, body:JSON.stringify(payload) });
    if (!response.ok) throw Object.assign(new Error(`${name} returned ${response.status}`), { code:`${name.toUpperCase()}_${response.status}`, retryable:response.status===429||response.status>=500 });
    return response.json();
  };
}
function createProviders(config, fetchImpl=fetch) {
  return { tax:adapter('tax',config.tax,fetchImpl), payment:adapter('payment',config.payment,fetchImpl), delivery:adapter('delivery',config.delivery,fetchImpl) };
}
module.exports = { createProviders };
