const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// The function starts here
const startIdx = content.indexOf('const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {');
const endIdx = content.indexOf('setIsAuthLoading(false);');

if (startIdx !== -1 && endIdx !== -1) {
  let inner = content.substring(startIdx, endIdx);
  inner = `const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      let freshUser = firebaseUser;
      
      if (firebaseUser) {
        try {
          await firebaseUser.reload();
          if (auth.currentUser) {
            freshUser = auth.currentUser;
          }
        } catch (e) {
          console.warn('Failed to reload user in App', e);
        }
      }
      
      setUser(freshUser);
      
      if (freshUser) {
        setVerificationEmail(freshUser.email || '');
        // Fetch profile details and verify completeness
        try {
          const result = await authService.checkAndInitializeProfile(freshUser);
          const data = result.data;
          
          setUserProfile({
            fullName: data?.fullName || freshUser.displayName || 'Scholar',
            username: data?.username || '',
            phone: data?.phoneNumber || data?.phone || undefined,
            createdAt: data?.createdAt ? (typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate().toISOString() : data.createdAt) : undefined,
            photoURL: data?.photoURL || freshUser.photoURL || undefined,
          });

          setIsProfileCompleted(result.profileCompleted);

          // Auto-routing depending on verification status and profile completed status
          if (freshUser.emailVerified) {
            if (result.profileCompleted) {
              setCurrentView('welcome');
            } else {
              setCurrentView('profile-setup');
            }
          } else {
            setCurrentView('verify');
          }
        } catch (err) {
          console.error('Error loading user profile details from Firestore:', err);
          setUserProfile({
            fullName: freshUser.displayName || 'Scholar',
            username: '',
          });
          setIsProfileCompleted(false);
          
          if (freshUser.emailVerified) {
            setCurrentView('profile-setup');
          } else {
            setCurrentView('verify');
          }
        }
      } else {
        setUserProfile(null);
        setIsProfileCompleted(null);
        // If not logged in, take them back to welcome/login
        if (currentView === 'verify' || currentView === 'profile-setup') {
          setCurrentView('welcome');
        }
      }
      `;
  
  content = content.substring(0, startIdx) + inner + content.substring(endIdx);
  fs.writeFileSync('src/App.tsx', content);
  console.log('Fixed App.tsx inner effect.');
} else {
  console.log('Could not find onAuthStateChanged');
}

