const fs = require('fs');
let content = fs.readFileSync('src/services/authService.ts', 'utf8');

const importStatement = "import { ENABLE_EMAIL_VERIFICATION } from '../config';\n";
content = importStatement + content;

fs.writeFileSync('src/services/authService.ts', content);
