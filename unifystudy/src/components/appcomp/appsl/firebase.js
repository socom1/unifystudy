import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from "firebase/auth";
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

// Enable local persistence
setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error("Auth persistence error:", error);
  });

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" }); // optional

export const db = getDatabase(app);
// Enable offline persistence
// Note: This might fail if multiple tabs are open, so we catch errors
// enableIndexedDbPersistence(db).catch((err) => {
//   if (err.code == 'failed-precondition') {
//       // Multiple tabs open, persistence can only be enabled in one tab at a a time.
//       console.log('Persistence failed: Multiple tabs open');
//   } else if (err.code == 'unimplemented') {
//       // The current browser does not support all of the features required to enable persistence
//       console.log('Persistence failed: Browser not supported');
//   }
// });
// Note: Realtime Database enables offline persistence by default for short sessions, 
// but for disk persistence in web, it's actually `enableIndexedDbPersistence` for Firestore.
// For Realtime Database, it handles connection drops automatically, but full disk persistence 
// is more limited in web SDK compared to mobile. 
// However, we can keep the `keepSynced` logic if needed for specific paths.
// For now, we'll rely on default caching behavior and the OfflineIndicator.
export const storage = getStorage(app);

export default app;
