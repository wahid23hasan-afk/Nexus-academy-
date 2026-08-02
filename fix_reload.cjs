const fs = require('fs');
let content = fs.readFileSync('src/services/authService.ts', 'utf8');

const oldCheck = `    try {
      await user.reload();
      const verified = user.emailVerified;
      
      if (verified) {
        // Sync state to Firestore user profile doc
        await setDoc(doc(db, 'users', user.uid), { verified: true }, { merge: true });
      }

      return { success: true, verified };
    } catch (error: any) {
      console.error('Error reloading verification status:', error);
      return { success: false, verified: false, error: error.message || 'Verification status check failed.' };
    }`;

const newCheck = `    try {
      await user.reload();
      const verified = user.emailVerified;
      
      if (verified) {
        // Sync state to Firestore user profile doc
        try {
          await setDoc(doc(db, 'users', user.uid), { verified: true }, { merge: true });
        } catch (e) {
          console.warn('Failed to sync verified state to Firestore during check:', e);
        }
      }

      return { success: true, verified };
    } catch (error: any) {
      if (error.code === 'auth/network-request-failed') {
         console.warn('Network request failed during reload, returning cached verification status');
         return { success: true, verified: user.emailVerified };
      }
      console.warn('Error reloading verification status (permissions or network):', error);
      return { success: false, verified: user.emailVerified, error: error.message || 'Verification status check failed.' };
    }`;

content = content.replace(oldCheck, newCheck);
fs.writeFileSync('src/services/authService.ts', content);
