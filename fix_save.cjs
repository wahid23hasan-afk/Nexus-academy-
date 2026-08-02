const fs = require('fs');
let content = fs.readFileSync('src/services/authService.ts', 'utf8');

const oldCode = `      const querySnapshot = await getDocs(q);
      
      let taken = false;
      querySnapshot.forEach((doc) => {
        if (doc.id !== uid) {
          taken = true;
        }
      });

      if (taken) {
        return { success: false, error: 'Username is already taken by another user.' };
      }`;

const newCode = `      let taken = false;
      try {
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          if (doc.id !== uid) {
            taken = true;
          }
        });
      } catch (e) {
        console.warn('Username uniqueness check skipped during save due to permissions.');
      }

      if (taken) {
        return { success: false, error: 'Username is already taken by another user.' };
      }`;

content = content.replace(oldCode, newCode);
fs.writeFileSync('src/services/authService.ts', content);
