const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Add import
if (!content.includes('ENABLE_EMAIL_VERIFICATION')) {
  content = content.replace("import { authService } from './services/authService';", "import { authService } from './services/authService';\nimport { ENABLE_EMAIL_VERIFICATION } from './config';");
}

content = content.replace(/if \(freshUser\.emailVerified\)/g, 'if (freshUser.emailVerified || !ENABLE_EMAIL_VERIFICATION)');
content = content.replace(/user && user\.emailVerified && isProfileCompleted === false/g, 'user && (user.emailVerified || !ENABLE_EMAIL_VERIFICATION) && isProfileCompleted === false');
content = content.replace(/user && user\.emailVerified && isProfileCompleted === true/g, 'user && (user.emailVerified || !ENABLE_EMAIL_VERIFICATION) && isProfileCompleted === true');

fs.writeFileSync('src/App.tsx', content);
