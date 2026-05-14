import { getStorage } from "firebase/storage";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { GoogleAuthProvider, FacebookAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "tdtt-doan.firebaseapp.com",
  projectId: "tdtt-doan",
  storageBucket: "tdtt-doan.firebasestorage.app",
  messagingSenderId: "399489193156",
  appId: "1:399489193156:web:20797f51a36e38e47b2591"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();
export const storage = getStorage(app);
facebookProvider.addScope('email');
facebookProvider.setCustomParameters({ display: 'popup' });