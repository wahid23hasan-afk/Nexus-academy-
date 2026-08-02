const fs = require('fs');
let rv = fs.readFileSync('src/App.tsx', 'utf8');

const strToFind = "  }, [currentView]);\n\n      setToast({ message, type });\n  };\n  };\n  return (";
const replaceWith = "  }, [currentView]);\n\n  const triggerToast = (message: string, type: 'success' | 'error') => {\n    setToast({ message, type });\n  };\n\n  return (";

if (rv.includes(strToFind)) {
    rv = rv.replace(strToFind, replaceWith);
    fs.writeFileSync('src/App.tsx', rv);
    console.log("Fixed by exact match");
} else {
    // maybe spaces are different
    rv = rv.replace(/setToast\(\{ message, type \}\);\s*\};\s*\};\s*return \(/g, "const triggerToast = (message: string, type: 'success' | 'error') => {\n    setToast({ message, type });\n  };\n\n  return (");
    fs.writeFileSync('src/App.tsx', rv);
    console.log("Fixed by fallback regex");
}
