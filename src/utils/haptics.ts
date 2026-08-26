/**
 * Tactile Haptic Feedback Utility
 * Provides clean, cross-platform haptic feedback using Web Vibration API
 */

export const triggerHaptic = (_type: 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'error' = 'light') => {
  // Vibration disabled per user request
  return;
};

export default triggerHaptic;
