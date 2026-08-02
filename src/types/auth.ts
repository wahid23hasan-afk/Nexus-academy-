export type AppView = 'welcome' | 'login' | 'register' | 'verify' | 'profile-setup';

export interface User {
  fullName: string;
  username: string;
  email: string;
  phone?: string;
  password?: string; // Stored securely in placeholder DB
  verified: boolean;
  verificationCode?: string;
  createdAt: string;
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
