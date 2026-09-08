const fs = require('fs');
const c = fs.readFileSync('src/app/complements/Header.js', 'utf8');
const lines = c.split('\n');

// Show lines 265-310 to understand the structure
lines.slice(265, 310).forEach((l, i) => console.log(265+i+':', JSON.stringify(l).substring(0, 100)));
