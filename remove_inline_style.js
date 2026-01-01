const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');

const regex = /<div class="goals-controls" style="[^"]+">/;
c = c.replace(regex, '<div class="goals-controls">');

fs.writeFileSync('index.html', c, 'utf8');
console.log('Removed inline style');
