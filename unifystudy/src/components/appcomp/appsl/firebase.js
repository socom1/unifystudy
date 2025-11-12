// src/firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database"; // Realtime DB import

const firebaseConfig = {
  apiKey: "AIzaSyCax0FPsBTauiQjJc8alni_mnKQjMxvn1A",
  authDomain: "unifys-c6b42.firebaseapp.com",
  projectId: "unifys-c6b42",
  storageBucket: "unifys-c6b42.firebasestorage.app",
  messagingSenderId: "397741027892",
  appId: "1:397741027892:web:e01f7db83b838ce3915061",
  measurementId: "G-XJQRKVSPKR",
  databaseURL:
    "https://unifys-c6b42-default-rtdb.europe-west1.firebasedatabase.app/", // 👈 Required for RTDB
};

// Prevent duplicate initialization
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);
