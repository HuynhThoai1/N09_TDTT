import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBkhUlqe8-U-zvZcCQ-5ZwlpthNiye5nA4",
  authDomain: "tdtt-doan.firebaseapp.com",
  projectId: "tdtt-doan",
  storageBucket: "tdtt-doan.firebasestorage.app",
  messagingSenderId: "399489193156",
  appId: "1:399489193156:web:20797f51a36e38e47b2591"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);