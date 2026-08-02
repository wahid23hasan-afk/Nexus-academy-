const fs = require('fs');
let pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

if (pkg.devDependencies.vite) {
  delete pkg.devDependencies.vite;
}

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
