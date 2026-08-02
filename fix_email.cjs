const fs = require('fs');
let content = fs.readFileSync('src/services/authService.ts', 'utf8');

content = content.replace('updateEmail,', 'verifyBeforeUpdateEmail,');

const oldEmailLogic = `      // Update email on Auth
      await updateEmail(user, newEmail);

      // Sync state to Firestore user doc
      await setDoc(doc(db, 'users', user.uid), { 
        email: newEmail.toLowerCase().trim(),
        verified: false 
      }, { merge: true });

      // Automatically send verification link to the new email
      await sendEmailVerification(user);`;

const newEmailLogic = `      // Send verification before updating email on Auth
      await verifyBeforeUpdateEmail(user, newEmail);`;

content = content.replace(oldEmailLogic, newEmailLogic);

// also let's catch the operation not allowed just in case
content = content.replace(
  "message = 'The new email address format is invalid.';",
  "message = 'The new email address format is invalid.';\n      } else if (error.code === 'auth/operation-not-allowed') {\n        message = 'Changing email address is disabled in the Firebase Console.';"
);

fs.writeFileSync('src/services/authService.ts', content);
