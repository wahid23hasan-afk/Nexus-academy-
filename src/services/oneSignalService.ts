/**
 * OneSignal Web / Mobile Push Notification Service
 * Manages SDK initialization, User Linking (External ID), Tags (Courses),
 * and Permission Toggles.
 */

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void | Promise<void>>;
    OneSignal?: any;
  }
}

class OneSignalService {
  private isInitialized = false;
  private currentAppId: string | null = null;
  private permissionStatus: NotificationPermission = 'default';
  private permissionListeners: Array<(permission: NotificationPermission) => void> = [];

  constructor() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permissionStatus = Notification.permission;
    }
  }

  /**
   * Initialize OneSignal SDK on app startup
   */
  public async initOneSignal(customAppId?: string): Promise<void> {
    if (typeof window === 'undefined') return;

    const appId =
      customAppId ||
      import.meta.env.VITE_ONESIGNAL_APP_ID ||
      '74e9438f-be4f-424f-9f93-1cbebf369984'; // Specific production App ID

    if (this.isInitialized && this.currentAppId === appId) {
      return;
    }

    this.currentAppId = appId;
    window.OneSignalDeferred = window.OneSignalDeferred || [];

    return new Promise<void>((resolve) => {
      window.OneSignalDeferred!.push(async (OneSignal: any) => {
        try {
          if (!this.isInitialized) {
            await OneSignal.init({
              appId: appId,
              allowLocalhostAsSecureOrigin: true,
              notifyButton: {
                enable: false,
              },
              serviceWorkerParam: { scope: '/' },
              serviceWorkerPath: 'OneSignalSDKWorker.js',
            });

            this.isInitialized = true;

            // Track permission state changes
            if (OneSignal.Notifications && typeof OneSignal.Notifications.addEventListener === 'function') {
              OneSignal.Notifications.addEventListener('permissionChange', (granted: boolean) => {
                const status: NotificationPermission = granted ? 'granted' : 'denied';
                this.permissionStatus = status;
                this.notifyPermissionListeners(status);
              });
            }

            if ('Notification' in window) {
              this.permissionStatus = Notification.permission;
            }

            // Prompt user to allow notification permission on launch if status is default
            if (OneSignal.Notifications && typeof OneSignal.Notifications.requestPermission === 'function') {
              if (Notification.permission === 'default') {
                setTimeout(async () => {
                  try {
                    await OneSignal.Notifications.requestPermission();
                  } catch (err) {
                    console.warn('[OneSignal] Launch permission request notice:', err);
                  }
                }, 2000);
              }
            }
          }
          resolve();
        } catch (error) {
          console.warn('[OneSignal] Initialization note:', error);
          this.isInitialized = true;
          resolve();
        }
      });
    });
  }

  /**
   * Link logged-in user with OneSignal (External User ID, Email, & Tags)
   */
  public async linkUser(
    uid: string,
    email?: string | null,
    enrolledCourses: string[] = []
  ): Promise<void> {
    if (typeof window === 'undefined' || !uid) return;

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      try {
        // Link External User ID
        if (typeof OneSignal.login === 'function') {
          await OneSignal.login(uid);
        } else if (typeof OneSignal.setExternalUserId === 'function') {
          await OneSignal.setExternalUserId(uid);
        }

        // Add user email if available
        if (email && OneSignal.User && typeof OneSignal.User.addEmail === 'function') {
          try {
            await OneSignal.User.addEmail(email);
          } catch (e) {
            // Email might already be bound or pending
          }
        }

        // Add course enrollment tags for targeted course announcements and live classes
        if (OneSignal.User && typeof OneSignal.User.addTag === 'function') {
          OneSignal.User.addTag('user_type', 'student');
          if (enrolledCourses && enrolledCourses.length > 0) {
            enrolledCourses.forEach((courseId) => {
              OneSignal.User.addTag(`course_${courseId}`, 'enrolled');
            });
          }
        } else if (typeof OneSignal.sendTags === 'function') {
          const tags: Record<string, string> = { user_type: 'student' };
          enrolledCourses.forEach((courseId) => {
            tags[`course_${courseId}`] = 'enrolled';
          });
          OneSignal.sendTags(tags);
        }

        // Prompt user to allow notification permission on first login/link
        if (OneSignal.Notifications && typeof OneSignal.Notifications.requestPermission === 'function') {
          if (Notification.permission === 'default') {
            try {
              await OneSignal.Notifications.requestPermission();
            } catch (e) {
              console.warn('[OneSignal] Login permission request notice:', e);
            }
          }
        }
      } catch (err) {
        console.warn('[OneSignal] User linking note:', err);
      }
    });
  }

  /**
   * Sync newly enrolled course tags to OneSignal
   */
  public async syncCourseEnrollment(courseId: string): Promise<void> {
    if (typeof window === 'undefined' || !courseId) return;

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      try {
        if (OneSignal.User && typeof OneSignal.User.addTag === 'function') {
          OneSignal.User.addTag(`course_${courseId}`, 'enrolled');
        } else if (typeof OneSignal.sendTag === 'function') {
          OneSignal.sendTag(`course_${courseId}`, 'enrolled');
        }
      } catch (err) {
        console.warn('[OneSignal] Tag sync note:', err);
      }
    });
  }

  /**
   * Disconnect user on logout
   */
  public async unlinkUser(): Promise<void> {
    if (typeof window === 'undefined') return;

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      try {
        if (typeof OneSignal.logout === 'function') {
          await OneSignal.logout();
        } else if (typeof OneSignal.removeExternalUserId === 'function') {
          await OneSignal.removeExternalUserId();
        }
      } catch (err) {
        console.warn('[OneSignal] Logout note:', err);
      }
    });
  }

  /**
   * Request Push Permission (1-Click trigger for Bell / Toggle buttons)
   */
  public async requestPushPermission(): Promise<{ success: boolean; status: NotificationPermission; isIframe?: boolean }> {
    if (typeof window === 'undefined') {
      return { success: false, status: 'default' };
    }

    const isIframe = (() => {
      try {
        return window.self !== window.top;
      } catch (e) {
        return true;
      }
    })();

    if (isIframe) {
      return { success: false, status: 'default', isIframe: true };
    }

    // Set a safety timeout of 3.5 seconds so the promise never hangs indefinitely in restricted environments
    return new Promise<{ success: boolean; status: NotificationPermission; isIframe?: boolean }>((resolve) => {
      const timeoutId = setTimeout(() => {
        console.warn('[OneSignal] Permission request timed out (likely restricted).');
        resolve({ success: false, status: 'default' });
      }, 3500);

      (async () => {
        try {
          let isGranted = false;

          // 1. Try via OneSignal SDK
          if (window.OneSignal?.Notifications?.requestPermission) {
            try {
              const res = await window.OneSignal.Notifications.requestPermission();
              isGranted = Boolean(res);
            } catch (e) {
              // Fallback to browser standard
            }
          }

          // 2. Standard Browser Notification API Fallback
          if (!isGranted && 'Notification' in window) {
            const perm = await Notification.requestPermission();
            isGranted = perm === 'granted';
            this.permissionStatus = perm;
          } else if (isGranted) {
            this.permissionStatus = 'granted';
          }

          const finalStatus: NotificationPermission = isGranted ? 'granted' : this.permissionStatus;
          this.notifyPermissionListeners(finalStatus);

          // Dispatch global window event
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('nexus_push_permission_changed', { detail: { permission: finalStatus } })
            );
          }

          clearTimeout(timeoutId);
          resolve({
            success: isGranted,
            status: finalStatus,
          });
        } catch (error) {
          console.warn('[OneSignal] Permission request note:', error);
          clearTimeout(timeoutId);
          resolve({
            success: false,
            status: this.permissionStatus,
          });
        }
      })();
    });
  }

  /**
   * Get current push notification permission
   */
  public getPermissionStatus(): NotificationPermission {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return this.permissionStatus;
  }

  /**
   * Check if push notifications are supported on current device
   */
  public isPushSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  /**
   * Subscribe to permission changes
   */
  public onPermissionChange(callback: (permission: NotificationPermission) => void): () => void {
    this.permissionListeners.push(callback);
    return () => {
      this.permissionListeners = this.permissionListeners.filter((cb) => cb !== callback);
    };
  }

  private notifyPermissionListeners(status: NotificationPermission) {
    this.permissionListeners.forEach((cb) => {
      try {
        cb(status);
      } catch (e) {}
    });
  }
}

export const oneSignalService = new OneSignalService();
