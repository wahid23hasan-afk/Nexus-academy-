const fs = require('fs');
const path = require('path');
const https = require('https');

const wrapperPropsPath = path.join(__dirname, 'android', 'gradle', 'wrapper', 'gradle-wrapper.properties');
const wrapperJarPath = path.join(__dirname, 'android', 'gradle', 'wrapper', 'gradle-wrapper.jar');

function isValidJar(filePath) {
  if (!fs.existsSync(filePath)) return false;
  const buf = fs.readFileSync(filePath);
  return buf.length > 10000 && buf[0] === 0x50 && buf[1] === 0x4b && buf.toString('binary').includes('org/gradle/wrapper/GradleWrapperMain.class');
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode === 200) {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', err => reject(err));
      } else {
        reject(new Error(`HTTP status ${res.statusCode} for ${url}`));
      }
    }).on('error', reject);
  });
}

async function fixWrapper() {
  console.log('Checking Gradle wrapper status...');
  if (isValidJar(wrapperJarPath)) {
    console.log('Gradle wrapper JAR is already valid.');
    return;
  }

  let version = '8.14.3'; // fallback default
  if (fs.existsSync(wrapperPropsPath)) {
    const propsText = fs.readFileSync(wrapperPropsPath, 'utf8');
    const match = propsText.match(/gradle-([0-9]+\.[0-9]+(?:\.[0-9]+)?)/);
    if (match && match[1]) {
      version = match[1];
    }
  }

  console.log(`Target Gradle version from properties: ${version}`);

  const candidateUrls = [
    `https://raw.githubusercontent.com/gradle/gradle/v${version}/gradle/wrapper/gradle-wrapper.jar`,
    `https://raw.githubusercontent.com/gradle/gradle/v8.14.3/gradle/wrapper/gradle-wrapper.jar`,
    `https://raw.githubusercontent.com/gradle/gradle/v8.10.2/gradle/wrapper/gradle-wrapper.jar`
  ];

  for (const url of candidateUrls) {
    try {
      console.log(`Attempting download from: ${url}`);
      const buf = await fetchUrl(url);
      if (buf.length > 10000 && buf[0] === 0x50 && buf[1] === 0x4b && buf.toString('binary').includes('org/gradle/wrapper/GradleWrapperMain.class')) {
        fs.mkdirSync(path.dirname(wrapperJarPath), { recursive: true });
        fs.writeFileSync(wrapperJarPath, buf);
        console.log(`Successfully restored valid gradle-wrapper.jar (${buf.length} bytes) for Gradle ${version}!`);
        return;
      }
    } catch (e) {
      console.log(`Download failed from ${url}: ${e.message}`);
    }
  }

  throw new Error('Unable to download a valid gradle-wrapper.jar from any source.');
}

if (require.main === module) {
  fixWrapper().catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { fixWrapper };
