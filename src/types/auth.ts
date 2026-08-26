export type AppView = 'welcome' | 'login' | 'register' | 'verify' | 'profile-setup';

export interface UserBadgeItem {
  id: string;
  title: string;
  icon: string;
  unlockedAt: string;
  description?: string;
  xpReward?: number;
}

export interface User {
  uid?: string;
  fullName: string;
  username: string;
  email: string;
  phone?: string;
  password?: string; // Stored securely in placeholder DB
  verified: boolean;
  verificationCode?: string;
  createdAt: string;
  photoURL?: string;
  bio?: string;
  role?: string;
  xp?: number;
  streak?: number;
  lastActiveDate?: string;
  level?: number;
  badges?: UserBadgeItem[];
}

export interface ValidationState {
  isValid: boolean;
  message?: string;
}

export interface RegistrationFormErrors {
  fullName?: string;
  username?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
}

export interface LoginFormErrors {
  email?: string;
  password?: string;
}
