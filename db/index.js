const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST || 'localhost',
  port: 5432,
});
pool.connect((err, client, release) => {
  if (err) {
    console.error("Error connect to PostgreSQL:", err.stack);
  } else {
    console.log('Connected to database: ${process.env.DB_NAME}');
    release();
  }
});
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};



