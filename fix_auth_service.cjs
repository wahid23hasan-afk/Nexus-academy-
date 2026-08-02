const fs = require('fs');

let rv = fs.readFileSync('src/services/authService.ts', 'utf8');
rv = rv.replace(/\n\s*verificationCode: 'FIREBASE_LINK',\s*\/\/ Marker indicating standard link verify/g, '');
fs.writeFileSync('src/services/authService.ts', rv);

