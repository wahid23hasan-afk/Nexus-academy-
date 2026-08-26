import React, { ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { MaintenanceScreen } from './MaintenanceScreen';
import { SystemSettings, DEFAULT_SYSTEM_SETTINGS } from '../services/systemSettingsService';

interface StudentLayoutProps {
  children: ReactNode;
  userProfile?: any;
  systemSettings?: SystemSettings;
  onLogout?: () => void;
  onOpenAdminPanel?: () => void;
  onRefresh?: () => void;
}

export const StudentLayout: React.FC<StudentLayoutProps> = ({
  children,
  userProfile: propUserProfile,
  systemSettings: propSystemSettings,
  onLogout: propOnLogout,
  onOpenAdminPanel,
  onRefresh: propOnRefresh,
}) => {
  const authContext = useAuth();

  const user = authContext.user;
  const userProfile = propUserProfile || authContext.userProfile;
  const maintenanceMode = authContext.maintenanceMode;
  const settings = propSystemSettings || authContext.systemSettings || DEFAULT_SYSTEM_SETTINGS;
  const userRole = (userProfile?.role || '').toLowerCase().trim();
  const userEmail = (user?.email || userProfile?.email || '').toLowerCase().trim();
  const isRealAdmin = userRole === 'super_admin' || userRole === 'admin' || userEmail === 'wahid23hasan@gmail.com';

  const isMaintenanceActiveForStudent = Boolean(maintenanceMode) && !isRealAdmin;

  if (isMaintenanceActiveForStudent) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="student-layout-maintenance-active"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-[#030712]/95 backdrop-blur-xl flex flex-col justify-center items-center overflow-y-auto"
        >
          <MaintenanceScreen
            settings={settings}
            userEmail={user?.email || userProfile?.email || undefined}
            onLogout={propOnLogout || authContext.logout}
            onRefresh={async () => {
              if (propOnRefresh) propOnRefresh();
              await authContext.refreshMaintenanceMode();
            }}
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  return <>{children}</>;
};
