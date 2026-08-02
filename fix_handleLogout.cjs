const fs = require('fs');
let rv = fs.readFileSync('src/App.tsx', 'utf8');

const strToFind = "  const triggerToast = (message: string, type: 'success' | 'error') => {\n    setToast({ message, type });\n  };\n\n  return (";
const replaceWith = "  const triggerToast = (message: string, type: 'success' | 'error') => {\n    setToast({ message, type });\n  };\n\n  const handleLogout = async () => {\n    await authService.logout();\n  };\n\n  return (";

if (rv.includes(strToFind)) {
    rv = rv.replace(strToFind, replaceWith);
    fs.writeFileSync('src/App.tsx', rv);
}
