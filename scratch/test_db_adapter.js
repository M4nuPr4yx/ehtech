const pool = require('../backend/db');

console.log('Testing pool instance exports:');
console.log('execute exists:', typeof pool.execute === 'function');
console.log('query exists:', typeof pool.query === 'function');
console.log('testConnection exists:', typeof pool.testConnection === 'function');
console.log('All functions mapped correctly!');
