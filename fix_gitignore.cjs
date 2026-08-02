const fs = require('fs');
let content = fs.readFileSync('.gitignore', 'utf8');
content = content.replace(/dist\/?/g, '');
fs.writeFileSync('.gitignore', content);
