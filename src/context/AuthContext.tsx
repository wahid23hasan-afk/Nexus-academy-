import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { authService } from '../services/authService';
import { systemSettingsService, SystemSettings, DEFAULT_SYSTEM_SETTINGS } from '../services/systemSettingsService';
import { offlineStorageService } from '../services/offlineStorageService';

export interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: any | null;
  maintenanceMode: boolean;
  systemSettings: SystemSettings;
  isAuthLoading: boolean;
  isAdmin: boolean;
  logout: () => Promise<void>;
  refreshMaintenanceMode: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  maintenanceMode: false,
  systemSettings: DEFAULT_SYSTEM_SETTINGS,
  isAuthLoading: true,
  isAdmin: false,
  logout: async () => {},
  refreshMaintenanceMode: async () => false,
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(false);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // 1. Setup real-time snapshot listener on settings/general as required by Specification 3
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'settings', 'general'),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const isMaint = Boolean(data?.maintenanceMode === true);
          setMaintenanceMode(isMaint);
          setSystemSettings((prev) => ({
            ...prev,
            maintenanceMode: isMaint,
            maintenanceTitle: data?.maintenanceTitle || prev.maintenanceTitle,
            maintenanceMessage: data?.maintenanceMessage || prev.maintenanceMessage,
            estimatedEndTime: data?.estimatedEndTime || prev.estimatedEndTime,
          }));
        } else {
          setMaintenanceMode(false);
        }
      },
      (err) => {
        console.warn('Real-time listener on settings/general notice:', err);
      }
    );

    return () => unsub();
  }, []);

  // 2. Sync with systemSettingsService
  useEffect(() => {
    const unsubService = systemSettingsService.subscribeSystemSettings((settings) => {
      setSystemSettings(settings);
      setMaintenanceMode(settings.maintenanceMode);
    });
    return () => unsubService();
  }, []);

  // 3. Firebase Auth State Observer & Real-time User Document Listener
  useEffect(() => {
    let isMounted = true;
    let unsubUserDoc: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (freshUser) => {
      if (!isMounted) return;
      setUser(freshUser);

      // Clean up previous user doc listener if any
      if (unsubUserDoc) {
        unsubUserDoc();
        unsubUserDoc = null;
      }

      if (freshUser) {
        try {
          const result = await authService.checkAndInitializeProfile(freshUser);
          if (isMounted && result.data) {
            setUserProfile(result.data);
          }
        } catch (err) {
          if (isMounted) {
            const cachedProfile = await offlineStorageService.getCachedUserProfile(freshUser.uid);
            setUserProfile(cachedProfile || {
              uid: freshUser.uid,
              fullName: freshUser.displayName || freshUser.email?.split('@')[0] || 'Scholar',
              email: freshUser.email || '',
              role: freshUser.email === 'wahid23hasan@gmail.com' ? 'super_admin' : 'student',
            });
          }
        }

        // Setup real-time listener on users/{uid} for instant role & profile sync across the app
        try {
          unsubUserDoc = onSnapshot(
            doc(db, 'users', freshUser.uid),
            (userDocSnap) => {
              if (userDocSnap.exists() && isMounted) {
                const liveData = userDocSnap.data();
                setUserProfile((prev: any) => ({
                  ...(prev || {}),
                  ...liveData,
                  uid: freshUser.uid,
                }));
              }
            },
            (err) => {
              console.warn('Real-time user doc listener notice:', err);
            }
          );
        } catch (subErr) {
          console.warn('Failed to attach user doc listener:', subErr);
        }

      } else {
        if (isMounted) {
          // Attempt offline profile recovery if offline
          if (!navigator.onLine) {
            const cachedProfile = await offlineStorageService.getCachedUserProfile();
            if (cachedProfile) {
              setUserProfile(cachedProfile);
            } else {
              setUserProfile(null);
            }
          } else {
            setUserProfile(null);
          }
        }
      }

      if (isMounted) {
        setIsAuthLoading(false);
      }
    });

    return () => {
      isMounted = false;
      if (unsubUserDoc) unsubUserDoc();
      unsubAuth();
    };
  }, []);

  const isAdmin = systemSettingsService.isUserAdmin(user, userProfile);

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setUserProfile(null);
  };

  const refreshMaintenanceMode = async (): Promise<boolean> => {
    try {
      const docSnap = await getDoc(doc(db, 'settings', 'general'));
      if (docSnap.exists()) {
        const isMaint = Boolean(docSnap.data()?.maintenanceMode);
        setMaintenanceMode(isMaint);
        return isMaint;
      }
    } catch (err) {
      console.warn('Refresh maintenance mode notice:', err);
    }
    return maintenanceMode;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        maintenanceMode,
        systemSettings,
        isAuthLoading,
        isAdmin,
        logout,
        refreshMaintenanceMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
