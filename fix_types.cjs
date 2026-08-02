const fs = require('fs');

let rv = fs.readFileSync('src/types/auth.ts', 'utf8');
rv = rv.replace(/verificationCode: string;/g, 'verificationCode?: string;');
fs.writeFileSync('src/types/auth.ts', rv);

