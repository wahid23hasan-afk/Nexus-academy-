const fs = require('fs');

let rv = fs.readFileSync('src/components/VerificationView.tsx', 'utf8');

// Remove states
rv = rv.replace(/const \[code, setCode\] = useState<string\[\]>\(Array\(6\)\.fill\(''\)\);\n/g, '');

// Remove handleOtpChange and handleKeyDown
rv = rv.replace(/\n\s*\/\/ Focus management for the 6 OTP inputs[\s\S]*?\}\n\s*};\n/g, '');

// Remove handleVerify
rv = rv.replace(/\n\s*\/\/ Submit code verification \/ Developer bypass trigger[\s\S]*?onShowNotification\('Checking Firebase security rules\.\.\.', 'error'\);\n\s*};\n/g, '');

// Remove UI block
const uiStart = `          <div className="pt-2 border-t border-white/5">
            <label className="text-[9px] font-mono uppercase tracking-wider text-slate-500 block mb-2">
              Preview Sandbox Bypass Code (Bypass: 123456)
            </label>`;
const uiEnd = `              </button>
            )}
          </div>`;
// Actually, it's easier to just use regex:
rv = rv.replace(/\n\s*<div className="pt-2 border-t border-white\/5">[\s\S]*?<\/div>\s*<\/div>\n/g, '\n        </div>\n');

// Also remove `setCode(Array(6).fill(''));` from `handleResend`
rv = rv.replace(/setCode\(Array\(6\)\.fill\(''\)\);\n/g, '');
rv = rv.replace(/setCode\(Array\(6\)\.fill\(''\)\);\s*/g, '');

fs.writeFileSync('src/components/VerificationView.tsx', rv);
