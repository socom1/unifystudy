import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "@/types";
import { auth } from "@/services/firebaseConfig";
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  setUser: (user: User | null) => void; 
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser as unknown as User);
      setLoading(false);

      // Sync to public_leaderboard
      if (currentUser) {
          try {
              const { uid, displayName, email, photoURL } = currentUser;
              // We only update if necessary, but for now a simple update on load is safe enough
              // and ensures robustness.
              const { ref, update } = await import("firebase/database");
              const { db } = await import("@/services/firebaseConfig");
              
              const userRef = ref(db, `public_leaderboard/${uid}`);
              await update(userRef, {
                  username: displayName || email?.split('@')[0] || 'User',
                  displayName,
                  photoURL,
                  email // Optional: might be sensitive, but required for search by email. 
                        // If privacy is key, remove email and search by username only. 
                        // User requested finding "WhyNot", implies username search.
              });
          } catch (e) {
              console.error("Failed to sync to public_leaderboard", e);
          }
      }
    });
    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
