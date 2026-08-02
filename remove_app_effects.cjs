const fs = require('fs');

let rv = fs.readFileSync('src/App.tsx', 'utf8');

const regexToRemove = /\/\/ Listener for custom simulated emails from our authService\n\s*useEffect\(\(\) => \{[\s\S]*?\}, \[\]\);\n/g;
rv = rv.replace(regexToRemove, '');

// also remove `setIncomingMail` and `incomingMail` if they are back
rv = rv.replace(/\n\s*const \[incomingMail, setIncomingMail\] = useState<MockMail \| null>\(null\);\n/g, '');

// Also handleCopyCode
rv = rv.replace(/\n\s*\/\/ Helper to copy code to clipboard\n\s*const handleCopyCode = \(code: string\) => \{[\s\S]*?\}\n/g, '');

fs.writeFileSync('src/App.tsx', rv);

let lv = fs.readFileSync('src/components/LoginView.tsx', 'utf8');
lv = lv.replace(/\n\s*\/\/ Dispatch custom email in-app notification[\s\S]*?window\.dispatchEvent\([\s\S]*?\}\)\n\s*\);\n/g, '\n');
fs.writeFileSync('src/components/LoginView.tsx', lv);

