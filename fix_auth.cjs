const fs = require('fs');
let content = fs.readFileSync('src/services/authService.ts', 'utf8');

if (!content.includes('ENABLE_EMAIL_VERIFICATION')) {
  content = content.replace("import { auth, db } from './firebase';", "import { auth, db } from './firebase';\nimport { ENABLE_EMAIL_VERIFICATION } from '../config';");
}

const checkBlock = `      // Check if email is verified
      if (!user.emailVerified) {`;
const newCheckBlock = `      // Check if email is verified
      if (!user.emailVerified && ENABLE_EMAIL_VERIFICATION) {`;

content = content.replace(checkBlock, newCheckBlock);

const registerBlock = `      // Send verification email after account creation
      try {`;
const newRegisterBlock = `      // Send verification email after account creation
      if (ENABLE_EMAIL_VERIFICATION) {
      try {`;

// Wait, let's just do it with sed or simple regex
content = content.replace(/if \(!user\.emailVerified\)/g, 'if (!user.emailVerified && ENABLE_EMAIL_VERIFICATION)');

// What about register?
fs.writeFileSync('src/services/authService.ts', content);
