const fs = require('fs');
let c = fs.readFileSync('app.js', 'utf8');

// 1. Fix Triple Badge Issue
// We look for the pattern of repeated badges and divs
const badPattern = `
                  <div>
                     <span class="badge badge-\${g.freq}">\${g.freq}</span>
                     <div>
                      <span class="badge badge-\${g.freq}">\${g.freq}</span>
                      <div>
                      <span class="badge badge-\${g.freq}">\${g.freq}</span>
                      <div class="habit-title">\${g.title}</div>
                   </div>
                   </div>
                  </div>`;

// We want to replace it with:
const goodPattern = `
                  <div>
                     <span class="badge badge-\${g.freq}">\${g.freq}</span>
                     <div class="habit-title">\${g.title}</div>
                  </div>`;

// Since whitespace is tricky, let's try a regex that captures the essence
// The key identifier is the nested divs with spans inside renderGoals
const regex = /<div class="habit-header">\s*<div>\s*<span class="badge badge-\$\{g\.freq\}">\$\{g\.freq\}<\/span>\s*<div>\s*<span class="badge badge-\$\{g\.freq\}">\$\{g\.freq\}<\/span>\s*<div>\s*<span class="badge badge-\$\{g\.freq\}">\$\{g\.freq\}<\/span>\s*<div class="habit-title">\$\{g\.title\}<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/g;

const replacement = `<div class="habit-header">
                  <div>
                     <span class="badge badge-\${g.freq}">\${g.freq}</span>
                     <div class="habit-title">\${g.title}</div>
                  </div>`;

// Let's try a more robust string replacement if regex is too brittle
const startMarker = '<div class="habit-header">';
const endMarker = '<div class="card-actions">';

// We know the problematic block is inside binary and maybe quantitative (checked earlier, quantitative looked fine in previous turn, but let's check).
// Wait, looking at the previous view_file (Step 699), the issue is in the `if (g.type === 'binary')` block.
// The `else` block (around line 804 in step 699 view) had:
// <div class="habit-header">
//    <div class="habit-title">${g.title}</div>
//    <div class="card-actions">
// Which is weird because it DOESNT show the badge at all in the header for quantitative?
// Ah wait, looking at line 825:
// <span class="badge badge-${g.freq}">${g.freq}</span>
// It's in the mini-stats for quantitative.
// So the triple badge is ONLY in the binary block.

const binaryBlockStart = `if (g.type === 'binary') {
           card.innerHTML = \``;
const binaryBlockEnd = `
               <div class="habit-stats">`;

const binaryBlockFixed = `
              <div class="habit-header">
                 <div>
                    <span class="badge badge-\${g.freq}">\${g.freq}</span>
                    <div class="habit-title">\${g.title}</div>
                 </div>
                 <div class="card-actions">
                    <button class="icon-btn edit-habit">✏️</button>
                    <button class="icon-btn delete-habit">🗑️</button>
                 </div>
              </div>`;

// We will find the range between binaryBlockStart and binaryBlockEnd and replace the header part.
// Actually, let's just replace the exact messy string we saw in the view_file.

const messyString = `
               <div class="habit-header">
                  <div>
                     <span class="badge badge-\${g.freq}">\${g.freq}</span>
                     <div>
                      <span class="badge badge-\${g.freq}">\${g.freq}</span>
                      <div>
                      <span class="badge badge-\${g.freq}">\${g.freq}</span>
                      <div class="habit-title">\${g.title}</div>
                   </div>
                   </div>
                  </div>
                  <div class="card-actions">
                     <button class="icon-btn edit-habit">✏️</button>
                     <button class="icon-btn delete-habit">🗑️</button>
                  </div>
               </div>`;

// Normalize whitespace for comparison
function normalize(str) { return str.replace(/\s+/g, ' ').trim(); }

const fixedString = `
               <div class="habit-header">
                  <div>
                     <span class="badge badge-\${g.freq}">\${g.freq}</span>
                     <div class="habit-title">\${g.title}</div>
                  </div>
                  <div class="card-actions">
                     <button class="icon-btn edit-habit">✏️</button>
                     <button class="icon-btn delete-habit">🗑️</button>
                  </div>
               </div>`;

// We'll read the file, find the messy block (it might have slightly different indentation in file vs view), and replace it.
// I'll use a regex that handles the nesting.

c = c.replace(/<div class="habit-header">\s*<div>\s*<span[^>]+>\$\{g\.freq\}<\/span>\s*<div>\s*<span[^>]+>\$\{g\.freq\}<\/span>\s*<div>\s*<span[^>]+>\$\{g\.freq\}<\/span>\s*<div class="habit-title">\$\{g\.title\}<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/, 
`<div class="habit-header">
                  <div>
                     <span class="badge badge-\${g.freq}">\${g.freq}</span>
                     <div class="habit-title">\${g.title}</div>
                  </div>`);


// 2. Fix App Global Exposure
if (!c.includes('window.App = App;')) {
    c += "\n\nwindow.App = App;\n";
}

fs.writeFileSync('app.js', c, 'utf8');
console.log('Fixed triple badge and exposed App global.');
