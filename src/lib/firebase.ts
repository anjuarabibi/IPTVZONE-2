import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDDrD_2KvE3LySayT81LIemENH6xmTdGFg",
  authDomain: "fit-pottery-p77bw.firebaseapp.com",
  projectId: "fit-pottery-p77bw",
  storageBucket: "fit-pottery-p77bw.firebasestorage.app",
  messagingSenderId: "95627027693",
  appId: "1:95627027693:web:e7d30394c338c661e758e4"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = initializeFirestore(app, {}, "ai-studio-iptvzone2-031410f3-c0ec-4e09-9bac-584173bc6367");

export const auth = getAuth(app);

// Sign in anonymously if possible, but carry on silently if restricted
signInAnonymously(auth)
  .then((user) => console.log('Signed in anonymously to Firebase:', user.user.uid))
  .catch((err) => console.info('Anonymous sign-in restricted or not configured, continuing with public access.'));
