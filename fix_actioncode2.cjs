const fs = require('fs');

let rv = fs.readFileSync('src/services/authService.ts', 'utf8');

const regex = /await verifyBeforeUpdateEmail\(user, newEmail\);/g;
const replacement = `const actionCodeSettings = {
        url: window.location.origin + '/?verify=success',
        handleCodeInApp: false
      };
      await verifyBeforeUpdateEmail(user, newEmail, actionCodeSettings);`;

rv = rv.replace(regex, replacement);

fs.writeFileSync('src/services/authService.ts', rv);

