const fs = require('fs');
let c = fs.readFileSync('app.js', 'utf8');

const searchStr = "document.querySelector('.sidebar').addEventListener('click', (e) => {";
const endStr = "});";
const searchIdx = c.indexOf(searchStr);

if (searchIdx !== -1) {
    const endIdx = c.indexOf(endStr, searchIdx);
    if (endIdx !== -1) {
        const replacement = `document.querySelector('.sidebar').addEventListener('click', (e) => {
         const btn = e.target.closest('.nav-item');
         if (btn) this.switchView(btn.dataset.view);
      });

      // Logo Home Link
      document.querySelector('.logo').addEventListener('click', () => this.switchView('dashboard'));`;
        
        c = c.substring(0, searchIdx) + replacement + c.substring(endIdx + endStr.length);
        fs.writeFileSync('app.js', c, 'utf8');
        console.log('Success');
    }
}
