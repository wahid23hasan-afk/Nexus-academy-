const fs = require('fs');
let content = fs.readFileSync('src/services/authService.ts', 'utf8');

const oldRegister = `      // 5. Send real Firebase Verification link
      const actionCodeSettings = {
        url: window.location.origin + '/?verify=success',
        handleCodeInApp: false
      };
      await sendEmailVerification(user, actionCodeSettings);`;

const newRegister = `      // 5. Send real Firebase Verification link
      if (ENABLE_EMAIL_VERIFICATION) {
        const actionCodeSettings = {
          url: window.location.origin + '/?verify=success',
          handleCodeInApp: false
        };
        await sendEmailVerification(user, actionCodeSettings);
      }`;

content = content.replace(oldRegister, newRegister);
fs.writeFileSync('src/services/authService.ts', content);
