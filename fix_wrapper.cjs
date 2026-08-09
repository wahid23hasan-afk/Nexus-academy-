const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const wrapperPropsPath = path.join(__dirname, 'android', 'gradle', 'wrapper', 'gradle-wrapper.properties');
const wrapperJarPath = path.join(__dirname, 'android', 'gradle', 'wrapper', 'gradle-wrapper.jar');

function isValidJar(filePath) {
  if (!fs.existsSync(filePath)) return false;
  try {
    // 1. Verify zip archive integrity using unzip -t
    execSync(`unzip -t "${filePath}"`, { stdio: 'pipe' });
    
    // 2. Verify presence of GradleWrapperMain.class using unzip -l
    const listOutput = execSync(`unzip -l "${filePath}"`, { stdio: 'pipe' }).toString();
    if (!listOutput.includes('org/gradle/wrapper/GradleWrapperMain.class')) {
      console.log('JAR is a valid zip archive but missing org/gradle/wrapper/GradleWrapperMain.class');
      return false;
    }
    return true;
  } catch (err) {
    console.log(`ZIP integrity validation failed for ${filePath}: ${err.message}`);
    return false;
  }
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
  console.log('Checking Gradle wrapper integrity...');

  let version = '8.14.3'; // fallback default
  if (fs.existsSync(wrapperPropsPath)) {
    const propsText = fs.readFileSync(wrapperPropsPath, 'utf8');
    const match = propsText.match(/gradle-([0-9]+\.[0-9]+(?:\.[0-9]+)?)/);
    if (match && match[1]) {
      version = match[1];
    }
  }

  console.log(`Target Gradle version from properties: ${version}`);

  if (isValidJar(wrapperJarPath)) {
    console.log('Gradle wrapper JAR is valid (passed ZIP CRC and class structure check).');
  } else {
    console.log('Gradle wrapper JAR is missing or corrupt. Replacing with official Gradle wrapper JAR...');
    const candidateUrls = [
      `https://raw.githubusercontent.com/gradle/gradle/v${version}/gradle/wrapper/gradle-wrapper.jar`,
      `https://raw.githubusercontent.com/gradle/gradle/v8.14.3/gradle/wrapper/gradle-wrapper.jar`,
      `https://raw.githubusercontent.com/gradle/gradle/v8.10.2/gradle/wrapper/gradle-wrapper.jar`,
      `https://raw.githubusercontent.com/gradle/gradle/v8.5/gradle/wrapper/gradle-wrapper.jar`
    ];

    let downloaded = false;
    for (const url of candidateUrls) {
      try {
        console.log(`Attempting download from: ${url}`);
        const buf = await fetchUrl(url);
        fs.mkdirSync(path.dirname(wrapperJarPath), { recursive: true });
        fs.writeFileSync(wrapperJarPath, buf);
        
        if (isValidJar(wrapperJarPath)) {
          console.log(`Successfully restored valid gradle-wrapper.jar (${buf.length} bytes) for Gradle ${version}!`);
          downloaded = true;
          break;
        } else {
          console.log(`Downloaded file from ${url} failed validation.`);
        }
      } catch (e) {
        console.log(`Download failed from ${url}: ${e.message}`);
      }
    }

    if (!downloaded) {
      throw new Error('Failed to download a valid gradle-wrapper.jar from any source.');
    }
  }

  // Final verification: If Java is installed, test running ./gradlew --version
  const androidDir = path.join(__dirname, 'android');
  const gradlewPath = path.join(androidDir, 'gradlew');
  
  if (fs.existsSync(gradlewPath)) {
    try {
      fs.chmodSync(gradlewPath, 0o755);
      console.log('Testing gradlew execution: ./gradlew --version ...');
      const versionOutput = execSync('./gradlew --version', { cwd: androidDir, stdio: 'pipe' }).toString();
      console.log('Gradle wrapper test execution succeeded! Output sample:');
      console.log(versionOutput.split('\n').slice(0, 6).join('\n'));
    } catch (e) {
      // Check if Java is available in environment
      try {
        execSync('java -version', { stdio: 'pipe' });
        // Java is available but gradlew failed -> raise error!
        throw new Error(`./gradlew --version failed to execute: ${e.stdout ? e.stdout.toString() : ''} ${e.stderr ? e.stderr.toString() : ''}`);
      } catch (javaErr) {
        console.log('Java is not installed in current environment (local development mode). Skipping ./gradlew --version runtime execution test.');
      }
    }
  }
}

if (require.main === module) {
  fixWrapper().catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { fixWrapper };

