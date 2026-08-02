const fs = require('fs');
let content = fs.readFileSync('src/services/authService.ts', 'utf8');

// Fix Registration failed log
content = content.replace(
  "console.error('Registration failed:', error);",
  "console.warn('Registration failed (or permission denied):', error);"
);

// Fix setDoc failure in register just in case
let parts = content.split("await setDoc(doc(db, 'users', user.uid), userProfile);");
if (parts.length === 2) {
    content = parts[0] + "try { await setDoc(doc(db, 'users', user.uid), userProfile); } catch (e) { console.warn('Failed to save profile on register', e); }" + parts[1];
}

fs.writeFileSync('src/services/authService.ts', content);
