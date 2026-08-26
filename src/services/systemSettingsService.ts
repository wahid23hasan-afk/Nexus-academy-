import { db } from './firebase';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';

export interface SystemSettings {
  maintenanceMode: boolean;
  maintenanceTitle?: string;
  maintenanceMessage?: string;
  estimatedEndTime?: string;
  allowedRoles?: string[];
  allowedEmails?: string[];
  updatedAt?: any;
  updatedBy?: string;
}

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  maintenanceMode: false,
  maintenanceTitle: 'সিস্টেম রক্ষণাবেক্ষণ চলছে / System Maintenance In Progress',
  maintenanceMessage: 'আমাদের প্ল্যাটফর্মে প্রয়োজনীয় সিস্টেম আপগ্রেড ও রক্ষণাবেক্ষণ কার্যক্রম চলছে। শিক্ষার্থীদের নিরবচ্ছিন্ন ও দ্রুততর সেবা নিশ্চিত করতে আমাদের টিম কাজ করছে। খুব শীঘ্রই সব কিছু স্বাভাবিক হয়ে যাবে। সাময়িক অসুবিধার জন্য আমরা আন্তরিকভাবে দুঃখিত।',
  estimatedEndTime: '৩০-৪৫ মিনিট (Within 30-45 minutes)',
  allowedRoles: ['admin', 'super_admin'],
  allowedEmails: ['wahid23hasan@gmail.com', 'admin@nexus.edu']
};

export const systemSettingsService = {
  // Real-time listener for system settings (Maintenance Mode, etc.)
  subscribeSystemSettings(callback: (settings: SystemSettings) => void) {
    const docRef = doc(db, 'settings', 'general');
    const legacyRef = doc(db, 'appSettings', 'systemSettings');

    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as SystemSettings;
        const isMaint = Boolean(data.maintenanceMode === true);
        const resolved: SystemSettings = {
          maintenanceMode: isMaint,
          maintenanceTitle: data.maintenanceTitle || DEFAULT_SYSTEM_SETTINGS.maintenanceTitle,
          maintenanceMessage: data.maintenanceMessage || DEFAULT_SYSTEM_SETTINGS.maintenanceMessage,
          estimatedEndTime: data.estimatedEndTime || DEFAULT_SYSTEM_SETTINGS.estimatedEndTime,
          allowedRoles: data.allowedRoles || DEFAULT_SYSTEM_SETTINGS.allowedRoles,
          allowedEmails: data.allowedEmails || DEFAULT_SYSTEM_SETTINGS.allowedEmails,
          updatedAt: data.updatedAt,
          updatedBy: data.updatedBy
        };
        try {
          localStorage.setItem('nexus_system_settings', JSON.stringify(resolved));
        } catch {}
        callback(resolved);
      } else {
        // Fallback: Check appSettings/systemSettings or set defaults
        getDoc(legacyRef).then((legacySnap) => {
          if (legacySnap.exists()) {
            const legacyData = legacySnap.data() as SystemSettings;
            setDoc(docRef, { ...DEFAULT_SYSTEM_SETTINGS, ...legacyData }, { merge: true }).catch(console.warn);
            callback({ ...DEFAULT_SYSTEM_SETTINGS, ...legacyData });
          } else {
            setDoc(docRef, { ...DEFAULT_SYSTEM_SETTINGS, updatedAt: serverTimestamp() }, { merge: true }).catch(console.warn);
            setDoc(legacyRef, { ...DEFAULT_SYSTEM_SETTINGS, updatedAt: serverTimestamp() }, { merge: true }).catch(console.warn);
            callback(DEFAULT_SYSTEM_SETTINGS);
          }
        }).catch(() => callback(DEFAULT_SYSTEM_SETTINGS));
      }
    }, (err) => {
      console.warn('System settings settings/general live subscription notice:', err);
      try {
        const cached = localStorage.getItem('nexus_system_settings');
        if (cached) {
          callback(JSON.parse(cached));
        } else {
          callback(DEFAULT_SYSTEM_SETTINGS);
        }
      } catch {
        callback(DEFAULT_SYSTEM_SETTINGS);
      }
    });
  },

  // Fetch current system settings once
  async getSystemSettings(): Promise<SystemSettings> {
    try {
      const docRef = doc(db, 'settings', 'general');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as SystemSettings;
        const isMaint = Boolean(data.maintenanceMode === true);
        const resolved: SystemSettings = {
          maintenanceMode: isMaint,
          maintenanceTitle: data.maintenanceTitle || DEFAULT_SYSTEM_SETTINGS.maintenanceTitle,
          maintenanceMessage: data.maintenanceMessage || DEFAULT_SYSTEM_SETTINGS.maintenanceMessage,
          estimatedEndTime: data.estimatedEndTime || DEFAULT_SYSTEM_SETTINGS.estimatedEndTime,
          allowedRoles: data.allowedRoles || DEFAULT_SYSTEM_SETTINGS.allowedRoles,
          allowedEmails: data.allowedEmails || DEFAULT_SYSTEM_SETTINGS.allowedEmails,
          updatedAt: data.updatedAt,
          updatedBy: data.updatedBy
        };
        try {
          localStorage.setItem('nexus_system_settings', JSON.stringify(resolved));
        } catch {}
        return resolved;
      } else {
        await setDoc(docRef, { ...DEFAULT_SYSTEM_SETTINGS, updatedAt: serverTimestamp() }, { merge: true });
        return DEFAULT_SYSTEM_SETTINGS;
      }
    } catch (err) {
      console.warn('Error reading system settings:', err);
      try {
        const cached = localStorage.getItem('nexus_system_settings');
        if (cached) return JSON.parse(cached);
      } catch {}
      return DEFAULT_SYSTEM_SETTINGS;
    }
  },

  // Update maintenance mode status and configuration
  async setMaintenanceMode(
    enabled: boolean, 
    details?: { 
      title?: string; 
      message?: string; 
      estimatedEndTime?: string; 
      adminEmail?: string;
    }
  ): Promise<boolean> {
    try {
      const generalDocRef = doc(db, 'settings', 'general');
      const legacyDocRef = doc(db, 'appSettings', 'systemSettings');
      
      const updatePayload: Partial<SystemSettings> = {
        maintenanceMode: enabled,
        updatedAt: serverTimestamp(),
        updatedBy: details?.adminEmail || 'admin'
      };

      if (details?.title !== undefined) updatePayload.maintenanceTitle = details.title;
      if (details?.message !== undefined) updatePayload.maintenanceMessage = details.message;
      if (details?.estimatedEndTime !== undefined) updatePayload.estimatedEndTime = details.estimatedEndTime;

      // Instantly execute setDoc on settings/general as required by specification 2
      await setDoc(generalDocRef, updatePayload, { merge: true });
      await setDoc(legacyDocRef, updatePayload, { merge: true }).catch(console.warn);
      
      // Update local storage cache
      try {
        const current = await this.getSystemSettings();
        localStorage.setItem('nexus_system_settings', JSON.stringify({ ...current, ...updatePayload }));
      } catch {}

      return true;
    } catch (err) {
      console.error('Failed to update maintenance mode:', err);
      throw err;
    }
  },

  // Helper to verify if a user has Admin or Super Admin access rights
  isUserAdmin(user: any, userProfile?: any): boolean {
    if (!user && !userProfile) return false;

    const userEmail = (user?.email || userProfile?.email || '').toLowerCase().trim();
    const userRole = (userProfile?.role || '').toLowerCase().trim();

    // Check role attribute
    if (userRole === 'admin' || userRole === 'super_admin') {
      return true;
    }

    // Check predefined super admin emails
    if (
      userEmail === 'wahid23hasan@gmail.com' ||
      userEmail === 'admin@nexus.edu' ||
      userEmail === 'superadmin@nexus.edu' ||
      userEmail.endsWith('@nexus.admin') ||
      userEmail.startsWith('admin_')
    ) {
      return true;
    }

    // Check if session has validated admin token
    try {
      if (typeof window !== 'undefined') {
        const adminSession = sessionStorage.getItem('nexus_admin_authenticated');
        if (adminSession === 'true') return true;
      }
    } catch {}

    return false;
  }
};
