const fs = require('fs');

let rv = fs.readFileSync('src/services/authService.ts', 'utf8');

const regex = /await sendEmailVerification\(user\);/g;
const replacement = `const actionCodeSettings = {
        url: window.location.origin + '/?verify=success',
        handleCodeInApp: false
      };
      await sendEmailVerification(user, actionCodeSettings);`;

rv = rv.replace(regex, replacement);

fs.writeFileSync('src/services/authService.ts', rv);

