const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');
let depth = 0;
let lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  for(let j=0; j<line.length; j++) {
     if(line[j] === '{') depth++;
     if(line[j] === '}') depth--;
  }
  if (depth < 0) {
    console.log('Negative depth at line ' + (i+1));
    break;
  }
}
