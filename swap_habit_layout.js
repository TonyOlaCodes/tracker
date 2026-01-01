const fs = require('fs');
const path = 'app.js';
let c = fs.readFileSync(path, 'utf8');

// We are looking for the 'else' block for quantitative habits.
// We want to move the <div class="habit-stats">...</div> block 
// to be BEFORE <div class="minimal-counter">

// Let's identify the chunks
const counterBlockStart = '<div class="minimal-counter">';
const counterBlockEnd = '<button class="goal-step-btn habit-plus" data-id="${g.id}">&plus;</button>';
// The slider comes after counter
const sliderBlockStart = '<div class="slider-container">';
const sliderBlockEnd = 'value="${g.progress}">\n              </div>';

// The stats block comes after slider (currently)
const statsBlockStart = '<div class="habit-stats">';
const statsBlockEnd = '<span class="stat-label">Consist.</span></div>\n              </div>';


// Let's regex for the whole block to be safe
// Structure is: Header -> Counter -> Slider -> Stats -> Bottom
// We want: Header -> Stats -> Counter -> Slider -> Bottom

// Find where Counter starts
const idxCounter = c.indexOf(counterBlockStart);
if (idxCounter === -1) { console.log("Counter not found"); process.exit(1); }

// Find where Stats starts (it should be after counter)
const idxStats = c.indexOf(statsBlockStart, idxCounter);
if (idxStats === -1) { console.log("Stats not found"); process.exit(1); }

// Find where Stats ends
const idxStatsEnd = c.indexOf('</div>', c.indexOf('Consist.</span></div>', idxStats)) + 6;

// Find where Slider ends (it is before stats)
const idxSliderEnd = c.lastIndexOf('</div>', idxStats) + 6; // This is risky

// Let's try to extract the specific strings
// We need to capture the text from <div class="minimal-counter"> to the end of <div class="slider-container">...</div>
// And the text for <div class="habit-stats">...</div>

// We can just regex the specific blocks since we know their content structure
const counterRegex = /<div class="minimal-counter">[\s\S]*?<\/div>\s*<div class="slider-container">[\s\S]*?<\/div>/;
const statsRegex = /<div class="habit-stats">[\s\S]*?<\/div>/;

// We need to find these specifically within the 'else' block of renderGoals to avoid hitting the binary one.
// The binary one also has habit-stats but NOT minimal-counter.
// So searching for minimal-counter is safe to find the quantitative block.

const matchCounter = c.match(counterRegex);
if (!matchCounter) { console.log("Counter block match failed"); process.exit(1); }

// We need to find the stats block that FOLLOWS this counter match
const restOfFile = c.substring(matchCounter.index + matchCounter[0].length);
const matchStats = restOfFile.match(statsRegex);

if (!matchStats) { console.log("Stats block match failed"); process.exit(1); }

const counterAndSliderHtml = matchCounter[0];
const statsHtml = matchStats[0];

// Now we replace:
// 1. Remove statsHtml from its current location (which is inside restOfFile relative to original)
// 2. Insert statsHtml before counterAndSliderHtml

// Actually, simpler:
// The original sequence is: [counterAndSliderHtml] ... [statsHtml]
// We want: [statsHtml] ... [counterAndSliderHtml]
// But there might be whitespace between them.

// Let's capture the range.
const startIdx = matchCounter.index;
const endIdx = matchCounter.index + matchCounter[0].length + restOfFile.indexOf(statsHtml) + statsHtml.length;

const originalSegment = c.substring(startIdx, endIdx);

// Construct new segment
// We need to check if there is stuff between slider and stats.
// In the file view, they are adjacent lines.
// <div class="slider-container">
//    ...
// </div>
// <div class="habit-stats">

// So we can likely just swap them directly.
const newSegment = statsHtml + '\n' + counterAndSliderHtml;

// Wait, we need to be careful about newlines to keep formatting pretty if possible.
// Let's search-replace the exact sequence found.
const sequenceToReplace = counterAndSliderHtml + '\n               ' + statsHtml;
// The indentation is likely 15 spaces based on previous views.

// Let's try a safer approach: Replace the whole block in the file string.
const fullBlockRegex = /(<div class="minimal-counter">[\s\S]*?<\/div>\s*<div class="slider-container">[\s\S]*?<\/div>)(\s*)(<div class="habit-stats">[\s\S]*?<\/div>)/;

c = c.replace(fullBlockRegex, '$3$2$1');

fs.writeFileSync(path, c, 'utf8');
console.log("Swapped stats and counter/slider.");
