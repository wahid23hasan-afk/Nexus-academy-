const fs = require('fs');
let content = fs.readFileSync('firestore.rules', 'utf8');
content = content.replace(/allow list: if isSignedIn\(\); \/\/ rely on query where clause/g, "allow list: if isSignedIn() && resource.data.userId == request.auth.uid;");
fs.writeFileSync('firestore.rules', content);
