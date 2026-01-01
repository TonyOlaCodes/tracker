const fs = require('fs');
let content = fs.readFileSync('app.js', 'utf8');

const targetRegex = /selections\.forEach\(sel => \{\s*const m = AppState\.metrics\[sel\.metric\];\s*if \(!m \|\| !m\.entries \|\| m\.entries\.length === 0\) return;/;

if (targetRegex.test(content)) {
    const replacement = `selections.forEach(sel => {
             const m = AppState.metrics[sel.metric];
             
             html += \`<div class="dash-metric-group" style="text-align:left; width:100%;">
                 <div style="font-size:0.8rem; font-weight:800; text-transform:uppercase; color:var(--primary); margin-bottom:0.4rem; padding-left:0.2rem;">\${sel.metric}</div>\`;
             
             if (!m || !m.entries || m.entries.length === 0) {
                 html += \`<div style="padding:0.5rem; color:var(--text-muted); font-size:0.8rem; font-style:italic;">No entries yet</div>\`;
             } else {
                 const entries = [...m.entries].sort((a,b) => new Date(a.date) - new Date(b.date));
                 html += \`<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(80px, 1fr)); gap:0.4rem;">\`;
                 sel.stats.forEach(statKey => {
                     let val = '--', label = '';
                     if (statKey === 'latest') { val = entries[entries.length - 1].value; label = 'Latest'; }
                     else if (statKey === 'average') { val = Math.round((entries.reduce((acc, e) => acc + e.value, 0) / entries.length) * 10) / 10; label = 'Avg (All)'; }
                     else if (statKey === 'averageWeek') {
                         const wAgo = new Date(); wAgo.setDate(wAgo.getDate() - 7);
                         const weekEntries = entries.filter(e => new Date(e.date) >= wAgo);
                         if (weekEntries.length > 0) val = Math.round((weekEntries.reduce((acc, e) => acc + e.value, 0) / weekEntries.length) * 10) / 10;
                         label = 'Avg (7d)';
                     }
                     else if (statKey === 'start') { val = entries[0].value; label = 'Start'; }
                     else if (statKey === 'high') { val = Math.max(...entries.map(e=>e.value)); label = 'High'; }
                     else if (statKey === 'low') { val = Math.min(...entries.map(e=>e.value)); label = 'Low'; }

                     html += \`<div style="display:flex; flex-direction:column; background:rgba(255,255,255,0.05); padding:0.4rem; border-radius:8px;">
                         <span style="font-size:0.65rem; color:var(--text-muted); font-weight:700;">\${label}</span>
                         <span style="font-size:0.95rem; font-weight:800;">\${val}<span style="font-size:0.7rem; font-weight:600; opacity:0.7; margin-left:1px;">\${m.unit||''}</span></span>
                     </div>\`;
                 });
                 html += \`</div>\`;
             }
             html += \`</div>\`;`;
    
    // We need to match the entire loop carefully or just the start.
    // Let's replace from the start of the loop until the end of that specific loop block.
    // The loop block ends with: html += `</div></div>`; });
    
    const fullLoopRegex = /selections\.forEach\(sel => \{\s*const m = AppState\.metrics\[sel\.metric\];\s*if \(!m \|\| !m\.entries \|\| m\.entries\.length === 0\) return;[\s\S]*?html \+= `<\/div><\/div>`;\s*\}\);/;
    
    if (fullLoopRegex.test(content)) {
        content = content.replace(fullLoopRegex, replacement + " });");
        fs.writeFileSync('app.js', content, 'utf8');
        console.log("Updated Growth render logic");
    } else {
        console.log("Could not find full loop block");
    }
} else {
    console.log("Could not find start of loop");
}
