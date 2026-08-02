const fs = require('fs');

let rv = fs.readFileSync('src/components/RegisterView.tsx', 'utf8');
rv = rv.replace(/\n\s*\/\/ Dispatch custom email in-app notification[\s\S]*?window\.dispatchEvent\([\s\S]*?\}\)\n\s*\);\n/g, '\n');
fs.writeFileSync('src/components/RegisterView.tsx', rv);

let vv = fs.readFileSync('src/components/VerificationView.tsx', 'utf8');
vv = vv.replace(/\n\s*\/\/ Dispatch custom email in-app notification[\s\S]*?window\.dispatchEvent\([\s\S]*?\}\)\n\s*\);\n/g, '\n');
fs.writeFileSync('src/components/VerificationView.tsx', vv);
