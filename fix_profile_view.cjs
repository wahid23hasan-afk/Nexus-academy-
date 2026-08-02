const fs = require('fs');
let content = fs.readFileSync('src/components/ProfileView.tsx', 'utf8');

content = content.replace(
  "export function ProfileView({ userProfile, onLogout, onShowNotification, onOpenRewards }: ProfileViewProps) {",
  "export function ProfileView({ userProfile, onLogout, onShowNotification, onOpenRewards, onNavigate }: ProfileViewProps) {"
);

fs.writeFileSync('src/components/ProfileView.tsx', content);
