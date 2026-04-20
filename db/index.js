const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: 'localhost',
  port: 5432,
});
async function run() {
  try {
    await Pool.connect();
    console.log('Success connect to database: ${process.env.DB_NAME}');

  } catch (err) {
    console.error("Error connect");
  } finally {
    await Pool.end();
    console.log("Close the connect");
  }
}
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};

