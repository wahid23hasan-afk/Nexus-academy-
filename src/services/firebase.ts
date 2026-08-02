import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence 
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyABGoYDfeWYEBU648Z8SrKs8_ltFFYL3-U",
  authDomain: "nexus-academy-cbf21.firebaseapp.com",
  projectId: "nexus-academy-cbf21",
  storageBucket: "nexus-academy-cbf21.firebasestorage.app",
  messagingSenderId: "961086542118",
  appId: "1:961086542118:web:1f71e71b7ed428bbb931e7",
  measurementId: "G-HEXGCQNV3Y"
};

// Initialize Firebase using the user's custom configuration
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication with browser local persistence
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Failed to set Firebase Auth persistence:', error);
});

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Storage
export const storage = getStorage(app);

export default app;
