import { initializeApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator, Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let authInstance: Auth | null = null;

// Lazy initialization - only initialize when first called (in browser)
export function getAuthInstance(): Auth {
  if (authInstance) {
    return authInstance;
  }

  if (typeof window === 'undefined') {
    throw new Error('Firebase Auth can only be used in the browser');
  }

  const apps = getApps();
  let app;
  if (apps.length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = apps[0];
  }

  authInstance = getAuth(app);

  // Connect to Auth emulator in development (optional)
  if (process.env.NODE_ENV === 'development') {
    try {
      connectAuthEmulator(authInstance, 'http://localhost:9099', { disableWarnings: true });
    } catch (error) {
      // Emulator may already be connected
    }
  }

  return authInstance;
}

// Re-export for convenience - this won't be evaluated until getAuthInstance() is called
export { getAuthInstance as auth };
