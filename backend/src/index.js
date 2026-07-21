const { loadConfig } = require('./commerce/config');
const { createPool } = require('./commerce/db');
const { createProviders } = require('./commerce/provider');
const { createCommerceApp } = require('./commerce/app');

async function start(){
  const config=loadConfig();const pool=createPool(config);await pool.query('SELECT 1');
  const schema=await pool.query(`SELECT to_regclass('public.commerce_orders') AS orders`);if(!schema.rows[0].orders)throw new Error('Commerce schema is missing; run the explicit migration command');
  const app=createCommerceApp({config,pool,providers:createProviders(config)});const server=app.listen(config.port,config.host,()=>console.log(`Governed catering commerce API listening on http://${config.host}:${config.port}`));
  const stop=signal=>server.close(async()=>{await pool.end();console.log(`${signal}: graceful shutdown complete`);process.exit(0);});process.on('SIGTERM',()=>stop('SIGTERM'));process.on('SIGINT',()=>stop('SIGINT'));
}
start().catch(error=>{console.error(`Startup failed: ${error.message}`);process.exit(1);});
