const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_LOCAL || 'localhost',
  password: process.env.DB_PASSWORD,
  user: process.env.DB_USER || 'root',
  port: process.env.DB_PORTA || 3306,
  database: process.env.DB_DATABASE || 'ehtech'
});

module.exports = pool;
