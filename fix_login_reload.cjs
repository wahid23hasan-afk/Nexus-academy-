const fs = require('fs');
let content = fs.readFileSync('src/services/authService.ts', 'utf8');

const oldLogin = `      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Check if email is verified
      if (!user.emailVerified) {`;

const newLogin = `      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      let user = userCredential.user;

      try {
        await user.reload();
        // After reload, use auth.currentUser to get the latest status
        if (auth.currentUser) {
           user = auth.currentUser;
        }
      } catch (e) {
        console.warn('Failed to reload user during login', e);
      }

      // Check if email is verified
      if (!user.emailVerified) {`;

content = content.replace(oldLogin, newLogin);
fs.writeFileSync('src/services/authService.ts', content);
