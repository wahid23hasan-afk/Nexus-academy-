const fs = require('fs');
let content = fs.readFileSync('src/services/authService.ts', 'utf8');

// Fix Error in checkAndInitializeProfile log
content = content.replace(
  "console.error('Error in checkAndInitializeProfile:', error);",
  "console.warn('Error in checkAndInitializeProfile (permissions):', error);"
);

// Fix undefined in registration
content = content.replace(
  "phone: phone ? phone.trim() : undefined,",
  "phone: phone ? phone.trim() : null,"
);

// Fix undefined in getUsers
content = content.replace(
  "phone: data.phone || undefined,",
  "phone: data.phone || null,"
);

fs.writeFileSync('src/services/authService.ts', content);
