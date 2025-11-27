import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCax0FPsBTauiQjJc8alni_mnKQjMxvn1A",
  authDomain: "unifys-c6b42.firebaseapp.com",
  projectId: "unifys-c6b42",
  storageBucket: "unifys-c6b42.appspot.com",
  messagingSenderId: "397741027892",
  appId: "1:397741027892:web:e01f7db83b838ce3915061",
  databaseURL:
    "https://unifys-c6b42-default-rtdb.europe-west1.firebasedatabase.app",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" }); // optional

export const db = getDatabase(app);
export const storage = getStorage(app);

export default app;
