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

// Initialize Firebase - safe for both server and client
const apps = getApps();
let app;
if (apps.length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = apps[0];
}

const auth: Auth = getAuth(app);

// Connect to Auth emulator in development (optional) - only in browser
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  try {
    connectAuthEmulator(auth!, 'http://localhost:9099', { disableWarnings: true });
  } catch (error) {
    // Emulator may already be connected
  }
}

export { auth };
