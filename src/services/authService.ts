import { ENABLE_EMAIL_VERIFICATION } from '../config';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendEmailVerification, 
  sendPasswordResetEmail, 
  updateProfile, 
  verifyBeforeUpdateEmail,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  collection, 
  query, 
  where,
  serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from './firebase';
import { User } from '../types/auth';

export const authService = {
  // Query Firestore to check if a username is already taken
  async isUsernameTaken(username: string): Promise<boolean> {
    try {
      const q = query(
        collection(db, 'users'), 
        where('username', '==', username.toLowerCase().trim())
      );
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.warn('Username uniqueness check skipped due to permissions.');
      // Fallback: assume false so we don't block registration if Firestore is loading rules
      return false;
    }
  },

  // Query Firestore to check if an email is already registered
  async isEmailRegistered(email: string): Promise<boolean> {
    try {
      const q = query(
        collection(db, 'users'), 
        where('email', '==', email.toLowerCase().trim())
      );
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.warn('Email uniqueness check skipped due to permissions.');
      return false;
    }
  },

  // Get all users in database (useful for legacy components or debug purposes)
  async getUsers(): Promise<User[]> {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const users: User[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        users.push({
          fullName: data.fullName || '',
          username: data.username || '',
          email: data.email || '',
          phone: data.phone || null,
          verified: data.verified || false,
          verificationCode: '', // No longer needed with real Firebase links
          createdAt: data.createdAt || '',
        });
      });
      return users;
    } catch (error) {
      console.warn('Error fetching users:', error);
      return [];
    }
  },

  // Register a new secure Firebase account
  async register(
    fullName: string,
    username: string,
    email: string,
    phone: string,
    password: string
  ): Promise<{ success: boolean; error?: string; user?: any; operationNotAllowed?: boolean }> {
    try {
      // 1. Double check username uniqueness in Firestore
      const usernameExists = await this.isUsernameTaken(username);
      if (usernameExists) {
        return { success: false, error: 'Username is already taken.' };
      }

      // 2. Double check email uniqueness in Firestore
      const emailExists = await this.isEmailRegistered(email);
      if (emailExists) {
        return { success: false, error: 'Email address is already registered.' };
      }

      // 3. Create Firebase user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 4. Update display profile name
      await updateProfile(user, { displayName: fullName });

      // 5. Send real Firebase Verification link
      if (ENABLE_EMAIL_VERIFICATION) {
        const actionCodeSettings = {
          url: window.location.origin + '/?verify=success',
          handleCodeInApp: false
        };
        await sendEmailVerification(user, actionCodeSettings);
      }

      // 6. Save premium extensible profile details in Firestore
      const userProfile: User = {
        fullName,
        username: username.toLowerCase().trim(),
        email: email.toLowerCase().trim(),
        phone: phone ? phone.trim() : null,
        verified: false,
        createdAt: new Date().toISOString(),
      };

      try { await setDoc(doc(db, 'users', user.uid), userProfile); } catch (e) { console.warn('Failed to save profile on register', e); }

      return { success: true, user };
    } catch (error: any) {
      console.warn('Registration failed (or permission denied):', error);
      let message = 'Failed to create your secure account.';
      let operationNotAllowed = false;
      if (error.code === 'auth/email-already-in-use') {
        message = 'This email address is already registered.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'The email address is invalid.';
      } else if (error.code === 'auth/weak-password') {
        message = 'The password is too weak.';
      } else if (error.code === 'auth/operation-not-allowed') {
        message = 'Email/Password authentication is currently disabled in the Firebase Console.';
        operationNotAllowed = true;
      }
      return { success: false, error: message, operationNotAllowed };
    }
  },

  // Login with existing Firebase account
  async login(
    email: string, 
    password: string
  ): Promise<{ success: boolean; error?: string; user?: any; notVerified?: boolean; operationNotAllowed?: boolean }> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      let user = userCredential.user;

      try {
        await user.reload();
        // After reload, use auth.currentUser to get the latest status
        if (auth.currentUser) {
           user = auth.currentUser;
        }
      } catch (e) {
        console.warn('Failed to reload user during login', e);
      }

      // Check if email is verified
      if (!user.emailVerified && ENABLE_EMAIL_VERIFICATION) {
        // Automatically trigger a fresh verification email send to guarantee receipt
        try {
          const actionCodeSettings = {
        url: window.location.origin + '/?verify=success',
        handleCodeInApp: false
      };
      await sendEmailVerification(user, actionCodeSettings);
        } catch (err) {
          console.warn('Could not auto-resend verification email during login:', err);
        }

        return {
          success: false,
          error: 'Your email address has not been verified yet. Please verify your email before logging in.',
          notVerified: true,
          user,
        };
      }

      // Update verified status in Firestore since it is now verified
      try {
        await setDoc(doc(db, 'users', user.uid), { verified: true }, { merge: true });
      } catch (err) {
        console.warn('Could not sync verified state to Firestore user document:', err);
      }

      return { success: true, user };
    } catch (error: any) {
      console.warn('Login attempt error:', error);

      let message = 'Incorrect email or password.';
      let operationNotAllowed = false;
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = 'Incorrect email address or password.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Please enter a valid email address.';
      } else if (error.code === 'auth/user-disabled') {
        message = 'This account has been disabled.';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Too many attempts. Access temporarily locked. Try again later.';
      } else if (error.code === 'auth/operation-not-allowed') {
        message = 'Email/Password authentication is currently disabled in the Firebase Console.';
        operationNotAllowed = true;
      }
      return { success: false, error: message, operationNotAllowed };
    }
  },

  // Login/Register with Google provider
  async loginWithGoogle(): Promise<{ success: boolean; error?: string; user?: any; operationNotAllowed?: boolean }> {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Sync/Initialize user profile state in Firestore
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
          // New profile registration via Google
          const initialProfile = {
            uid: user.uid,
            fullName: user.displayName || 'Google Scholar',
            username: '', // Must complete setup to choose a unique username
            email: user.email || '',
            phoneNumber: user.phoneNumber || '',
            photoURL: user.photoURL || '',
            role: 'student',
            accountStatus: 'active',
            emailVerified: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            profileCompleted: false,
            deviceInfo: getDeviceInfo(),
          };
          await setDoc(userDocRef, initialProfile);
        } else {
          // Existing profile, update login metadata
          await setDoc(userDocRef, {
            emailVerified: true,
            lastLogin: serverTimestamp(),
            updatedAt: serverTimestamp(),
            deviceInfo: getDeviceInfo(),
          }, { merge: true });
        }
      } catch (err) {
        console.warn('Could not sync Google user profile to Firestore:', err);
      }

      return { success: true, user };
    } catch (error: any) {
      console.warn('Google Sign-In failed:', error);
      let message = 'Google sign-in was unsuccessful.';
      let operationNotAllowed = false;

      if (error.code === 'auth/popup-closed-by-user') {
        message = 'The sign-in popup was closed before completing.';
      } else if (error.code === 'auth/popup-blocked') {
        message = 'The sign-in popup was blocked by your browser. Please allow popups for this site and try again.';
      } else if (error.code === 'auth/unauthorized-domain') {
        const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'current domain';
        message = `This domain (${currentDomain}) is not authorized for Google Sign-In in Firebase Console. Please add "${currentDomain}" under Authentication > Settings > Authorized Domains in Firebase Console.`;
      } else if (error.code === 'auth/operation-not-allowed') {
        message = 'Google sign-in is not enabled in your Firebase console. Please enable the Google sign-in provider in Firebase Auth settings.';
        operationNotAllowed = true;
      } else if (error.code === 'auth/cancelled-popup-request') {
        message = 'The sign-in request was cancelled. Please try again.';
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        message = 'An account already exists with the same email using a different sign-in method.';
      } else if (error.code === 'auth/network-request-failed') {
        message = 'Network request failed. Please check your internet connection and try again.';
      } else if (error.message) {
        message = error.message;
      }

      return { success: false, error: message, operationNotAllowed };
    }
  },

  // Poll or check current verification status
  async checkVerificationStatus(): Promise<{ success: boolean; verified: boolean; error?: string }> {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, verified: false, error: 'No user is currently authenticated.' };
    }

    try {
      await user.reload();
      const verified = user.emailVerified;
      
      if (verified) {
        // Sync state to Firestore user profile doc
        try {
          await setDoc(doc(db, 'users', user.uid), { verified: true }, { merge: true });
        } catch (e) {
          console.warn('Failed to sync verified state to Firestore during check:', e);
        }
      }

      return { success: true, verified };
    } catch (error: any) {
      if (error.code === 'auth/network-request-failed') {
         console.warn('Network request failed during reload, returning cached verification status');
         return { success: true, verified: user.emailVerified };
      }
      console.warn('Error reloading verification status (permissions or network):', error);
      return { success: false, verified: user.emailVerified, error: error.message || 'Verification status check failed.' };
    }
  },

  // Manual Trigger to Resend Verification Email
  async resendVerificationEmail(): Promise<{ success: boolean; error?: string }> {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'Session expired. Please sign in again.' };
    }

    try {
      const actionCodeSettings = {
        url: window.location.origin + '/?verify=success',
        handleCodeInApp: false
      };
      await sendEmailVerification(user, actionCodeSettings);
      return { success: true };
    } catch (error: any) {
      console.warn('Resend verification email failed:', error);
      let message = 'Failed to resend verification email.';
      if (error.code === 'auth/too-many-requests') {
        message = 'Please wait a few moments before requesting another link.';
      }
      return { success: false, error: message };
    }
  },

  // Send Password Reset Email via Firebase Auth
  async sendPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
    const cleanEmail = email.toLowerCase().trim();
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      return { success: true };
    } catch (error: any) {
      console.warn('Password reset failed:', error);
      let message = 'Failed to dispatch password reset link.';
      if (error.code === 'auth/user-not-found') {
        message = 'This email is not registered.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'The email address format is invalid.';
      }
      return { success: false, error: message };
    }
  },

  // Change currently registered email address
  async changeEmail(newEmail: string): Promise<{ success: boolean; error?: string }> {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'Session expired. Please sign in again.' };
    }

    try {
      // Send verification before updating email on Auth
      const actionCodeSettings = {
        url: window.location.origin + '/?verify=success',
        handleCodeInApp: false
      };
      await verifyBeforeUpdateEmail(user, newEmail, actionCodeSettings);

      return { success: true };
    } catch (error: any) {
      console.warn('Failed to change email address:', error);
      let message = 'Failed to update email address.';
      if (error.code === 'auth/requires-recent-login') {
        message = 'Please sign out and sign in again to complete this sensitive operation.';
      } else if (error.code === 'auth/email-already-in-use') {
        message = 'The new email address is already in use by another user.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'The new email address format is invalid.';
      } else if (error.code === 'auth/operation-not-allowed') {
        message = 'Changing email address is disabled in the Firebase Console.';
      }
      return { success: false, error: message };
    }
  },

  // Sign out user session safely
  async logout(): Promise<{ success: boolean; error?: string }> {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error: any) {
      console.warn('Sign out failed:', error);
      return { success: false, error: error.message || 'Logout failed.' };
    }
  },

  // Check profile status and initialize if missing
  async checkAndInitializeProfile(user: any): Promise<{ profileCompleted: boolean; data: any }> {
    try {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const existingData = docSnap.data();
        
        // Update login metadata
        const updateData = {
          emailVerified: user.emailVerified,
          lastLogin: serverTimestamp(),
          updatedAt: serverTimestamp(),
          deviceInfo: getDeviceInfo(),
        };
        await setDoc(docRef, updateData, { merge: true });

        return {
          profileCompleted: !!existingData.profileCompleted,
          data: { ...existingData, ...updateData },
        };
      } else {
        // First login and no profile exists: Create one!
        const initialProfile = {
          uid: user.uid,
          fullName: user.displayName || '',
          username: '', // Must complete setup to choose a unique username
          email: user.email || '',
          phoneNumber: user.phoneNumber || '',
          photoURL: user.photoURL || '',
          role: 'student',
          accountStatus: 'active',
          emailVerified: user.emailVerified,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          profileCompleted: false,
          deviceInfo: getDeviceInfo(),
        };

        await setDoc(docRef, initialProfile);
        return {
          profileCompleted: false,
          data: initialProfile,
        };
      }
    } catch (error) {
      console.warn('Error in checkAndInitializeProfile (permissions):', error);
      return {
        profileCompleted: false,
        data: { uid: user.uid, email: user.email, profileCompleted: false },
      };
    }
  },

  // Save/Complete user profile
  async saveUserProfile(
    uid: string, 
    profileData: { 
      fullName: string; 
      username: string; 
      phoneNumber: string; 
      gender?: string; 
      dateOfBirth?: string; 
      photoURL?: string; 
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check username unique (excluding current user's profile if already set)
      const usernameLower = profileData.username.toLowerCase().trim();
      const q = query(
        collection(db, 'users'), 
        where('username', '==', usernameLower)
      );
      let taken = false;
      try {
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          if (doc.id !== uid) {
            taken = true;
          }
        });
      } catch (e) {
        console.warn('Username uniqueness check skipped during save due to permissions.');
      }

      if (taken) {
        return { success: false, error: 'Username is already taken by another user.' };
      }

      const docRef = doc(db, 'users', uid);
      await setDoc(docRef, {
        ...profileData,
        username: usernameLower,
        profileCompleted: true,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      return { success: true };
    } catch (error: any) {
      console.warn('Failed to save user profile:', error);
      return { success: false, error: error.message || 'Failed to save profile' };
    }
  },

  // Upload profile photo to Firebase Storage
  async uploadProfilePicture(uid: string, blob: Blob): Promise<string> {
    try {
      const storageRef = ref(storage, `users/${uid}/profile_pic.jpg`);
      const snapshot = await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.warn('Firebase Storage upload failed:', error);
      throw error;
    }
  }
};

// Helper to determine user's browser & platform
export function getDeviceInfo(): string {
  if (typeof navigator === 'undefined') return 'Unknown Client';
  const ua = navigator.userAgent;
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';

  if (ua.indexOf('Firefox') > -1) browser = 'Firefox';
  else if (ua.indexOf('SamsungBrowser') > -1) browser = 'Samsung Browser';
  else if (ua.indexOf('Opera') > -1 || ua.indexOf('OPR') > -1) browser = 'Opera';
  else if (ua.indexOf('Trident') > -1) browser = 'Internet Explorer';
  else if (ua.indexOf('Edge') > -1 || ua.indexOf('Edg') > -1) browser = 'Edge';
  else if (ua.indexOf('Chrome') > -1) browser = 'Chrome';
  else if (ua.indexOf('Safari') > -1) browser = 'Safari';

  if (ua.indexOf('Windows NT 10.0') > -1) os = 'Windows 10/11';
  else if (ua.indexOf('Windows NT 6.2') > -1) os = 'Windows 8';
  else if (ua.indexOf('Windows NT 6.1') > -1) os = 'Windows 7';
  else if (ua.indexOf('Macintosh') > -1) os = 'macOS';
  else if (ua.indexOf('iPhone') > -1) os = 'iOS (iPhone)';
  else if (ua.indexOf('iPad') > -1) os = 'iOS (iPad)';
  else if (ua.indexOf('Android') > -1) os = 'Android';
  else if (ua.indexOf('Linux') > -1) os = 'Linux';

  return `${browser} on ${os}`;
}
