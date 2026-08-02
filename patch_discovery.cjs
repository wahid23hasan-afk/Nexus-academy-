const fs = require('fs');
let content = fs.readFileSync('src/components/CourseDiscoveryView.tsx', 'utf8');

content = content.replace(
  "const RewardsView = React.lazy(() => import('./RewardsView').then(m => ({ default: m.RewardsView })));",
  "const RewardsView = React.lazy(() => import('./RewardsView').then(m => ({ default: m.RewardsView })));\nconst AccountDetailsView = React.lazy(() => import('./AccountDetailsView').then(m => ({ default: m.AccountDetailsView })));\nconst PrivacySecurityView = React.lazy(() => import('./PrivacySecurityView').then(m => ({ default: m.PrivacySecurityView })));\nconst HelpSupportView = React.lazy(() => import('./HelpSupportView').then(m => ({ default: m.HelpSupportView })));"
);

content = content.replace(
  "const [activeTab, setActiveTab] = useState<'discover' | 'my-courses' | 'certificates' | 'live-classes' | 'community' | 'profile'>('discover');",
  "const [activeTab, setActiveTab] = useState<'discover' | 'my-courses' | 'certificates' | 'live-classes' | 'community' | 'profile' | 'account-details' | 'privacy-security' | 'help-support'>('discover');"
);

content = content.replace(
  "        <ProfileView\n          userProfile={userProfile}\n          onLogout={onLogout}\n          onShowNotification={onShowNotification}\n          onOpenRewards={() => setIsRewardsOpen(true)}\n        />",
  "        <ProfileView\n          userProfile={userProfile}\n          onLogout={onLogout}\n          onShowNotification={onShowNotification}\n          onOpenRewards={() => setIsRewardsOpen(true)}\n          onNavigate={(route: any) => setActiveTab(route)}\n        />\n      ) : activeTab === 'account-details' ? (\n        <AccountDetailsView onBack={() => setActiveTab('profile')} userProfile={userProfile} />\n      ) : activeTab === 'privacy-security' ? (\n        <PrivacySecurityView onBack={() => setActiveTab('profile')} />\n      ) : activeTab === 'help-support' ? (\n        <HelpSupportView onBack={() => setActiveTab('profile')} />"
);

fs.writeFileSync('src/components/CourseDiscoveryView.tsx', content);
