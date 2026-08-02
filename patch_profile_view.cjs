const fs = require('fs');
let content = fs.readFileSync('src/components/ProfileView.tsx', 'utf8');

content = content.replace(
  "  onOpenRewards: () => void;\n}",
  "  onOpenRewards: () => void;\n  onNavigate: (route: string) => void;\n}"
);

content = content.replace(
  "export const ProfileView: React.FC<ProfileViewProps> = ({ userProfile, onLogout, onShowNotification, onOpenRewards }) => {",
  "export const ProfileView: React.FC<ProfileViewProps> = ({ userProfile, onLogout, onShowNotification, onOpenRewards, onNavigate }) => {"
);

content = content.replace(
  /<button onClick=\{\(\) => onShowNotification\('Feature coming soon', 'success'\)\}[\s\S]*?<span className="text-sm font-medium text-slate-200">Account Details<\/span>/,
  '<button onClick={() => onNavigate(\'account-details\')}\n            className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors group">\n              <div className="flex items-center space-x-3">\n                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">\n                  <UserCheck size={16} />\n                </div>\n                <span className="text-sm font-medium text-slate-200">Account Details</span>'
);

content = content.replace(
  /<button onClick=\{\(\) => onShowNotification\('Feature coming soon', 'success'\)\}[\s\S]*?<span className="text-sm font-medium text-slate-200">Privacy & Security<\/span>/,
  '<button onClick={() => onNavigate(\'privacy-security\')}\n            className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors group">\n              <div className="flex items-center space-x-3">\n                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">\n                  <Shield size={16} />\n                </div>\n                <span className="text-sm font-medium text-slate-200">Privacy & Security</span>'
);

content = content.replace(
  /<button onClick=\{\(\) => onShowNotification\('Feature coming soon', 'success'\)\}[\s\S]*?<span className="text-sm font-medium text-slate-200">Help & Support<\/span>/,
  '<button onClick={() => onNavigate(\'help-support\')}\n            className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors group">\n              <div className="flex items-center space-x-3">\n                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">\n                  <HelpCircle size={16} />\n                </div>\n                <span className="text-sm font-medium text-slate-200">Help & Support</span>'
);

fs.writeFileSync('src/components/ProfileView.tsx', content);
