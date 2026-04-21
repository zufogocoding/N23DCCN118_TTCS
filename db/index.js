
require('dotenv').config();
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');


const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});


const adapter = new PrismaPg(pool);


const prisma = new PrismaClient({ adapter });

pool.connect((err) => {
  if (err) {
    console.error('❌ Lỗi kết nối Database:', err.message);
  } else {
    console.log('✅ Đã kết nối Database thành công qua Prisma Adapter!');
  }
});

module.exports = prisma;
