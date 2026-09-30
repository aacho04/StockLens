const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://stocklens:stocklens@localhost:5432/stocklens' });

async function checkCols() {
  const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders'");
  console.log('Orders columns:', res.rows);
  const hRes = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'holdings'");
  console.log('Holdings columns:', hRes.rows);
  await pool.end();
}
checkCols().catch(console.error);
