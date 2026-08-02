const fs = require('fs');

let rv = fs.readFileSync('src/components/VerificationView.tsx', 'utf8');

// Remove handleKeyDown
rv = rv.replace(/\n\s*const handleKeyDown = \([\s\S]*?\}\n\s*};\n/g, '');

fs.writeFileSync('src/components/VerificationView.tsx', rv);
