const fs = require('fs');
let content = fs.readFileSync('src/components/LoginView.tsx', 'utf8');

content = content.replace(/\/\/ Dispatch simulated notification too so they can see it in preview![\s\S]*?window\.dispatchEvent\([\s\S]*?\}\)\n\s*\);\n/g, '');

fs.writeFileSync('src/components/LoginView.tsx', content);
