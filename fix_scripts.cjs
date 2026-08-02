const fs = require('fs');
let pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

pkg.scripts.start = "node server.ts";
pkg.scripts.build = "vite build";

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
