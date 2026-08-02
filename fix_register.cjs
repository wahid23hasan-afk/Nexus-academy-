const fs = require('fs');
let content = fs.readFileSync('src/components/RegisterView.tsx', 'utf8');

const oldNav = `        onNavigate('verify');`;
const newNav = `        if (ENABLE_EMAIL_VERIFICATION) {
          onNavigate('verify');
        } else {
          onNavigate('profile-setup');
        }`;

content = content.replace(oldNav, newNav);

const importStatement = "import { ENABLE_EMAIL_VERIFICATION } from '../config';\n";
content = importStatement + content;

fs.writeFileSync('src/components/RegisterView.tsx', content);
