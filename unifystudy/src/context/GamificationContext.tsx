import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, auth } from '@/services/firebaseConfig';
import { ref, onValue, runTransaction } from 'firebase/database';
import { toast } from 'sonner';

interface GamificationContextType {
  xp: number;
  level: number;
  progress: number; // 0-100% to next level
  addXP: (amount: number, reason: string) => Promise<void>;
}

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

export const useGamification = () => {
    const context = useContext(GamificationContext);
    if (!context) {
        throw new Error("useGamification must be used within a GamificationProvider");
    }
    return context;
};

// Level Curve: Level = sqrt(XP / 100)
// XP = 100 * Level^2
// Level 1: 100 XP
// Level 2: 400 XP
// Level 3: 900 XP ...
const calculateLevel = (xp: number) => Math.floor(Math.sqrt(xp / 100)) || 1;
const calculateXPForLevel = (level: number) => 100 * Math.pow(level, 2);

export const GamificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [xp, setXp] = useState(0);
    const [level, setLevel] = useState(1);
    const [progress, setProgress] = useState(0);
    const [userId, setUserId] = useState<string | null>(null);

    // Listen to Auth
    useEffect(() => {
        const unsub = auth.onAuthStateChanged((u) => setUserId(u ? u.uid : null));
        return () => unsub();
    }, []);

    // Listen to Stats
    useEffect(() => {
        if (!userId) {
            setXp(0);
            setLevel(1);
            setProgress(0);
            return;
        }

        const statsRef = ref(db, `users/${userId}/stats`);
        const unsub = onValue(statsRef, (snapshot) => {
            const data = snapshot.val();
            const currentXP = data?.xp || 0;
            console.log("[Gamification] onValue XP:", currentXP);
            
            setXp(currentXP);
            
            const currentLevel = calculateLevel(currentXP);
            setLevel(currentLevel);

            // Calculate Progress to next level
            const currentLevelBaseXP = calculateXPForLevel(currentLevel);
            const nextLevelXP = calculateXPForLevel(currentLevel + 1);
            const xpInCurrentLevel = currentXP - currentLevelBaseXP;
            const xpNeededForNextLevel = nextLevelXP - currentLevelBaseXP;
            
            const prog = Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeededForNextLevel) * 100));
            setProgress(prog);
        });

        return () => unsub();
    }, [userId]);

    const addXP = async (amount: number, reason: string) => {
        if (!userId) return;

        const statsRef = ref(db, `users/${userId}/stats`);
        
        try {
            await runTransaction(statsRef, (currentData) => {
                if (currentData === null) {
                    return { xp: amount }; // Initialize if null
                }
                const newXp = (currentData.xp || 0) + amount;
                console.log("[Gamification] updated XP:", newXp);
                return { ...currentData, xp: newXp };
            });
            
            // Check for level up (client-side prediction for toast, actual state follows DB listener)
            const oldLevel = calculateLevel(xp);
            const newLevel = calculateLevel(xp + amount);
            
            if (newLevel > oldLevel) {
                 toast.success(`Leveled Up! 🎉`, {
                     description: `You reached Level ${newLevel}!`,
                     duration: 5000,
                 });
            } else {
                 toast.success(`+${amount} XP: ${reason}`, {
                     duration: 2000,
                     position: 'bottom-right',
                     description: `Total: ${xp + amount} XP`
                 });
            }

        } catch (error) {
            console.error("Failed to specific XP", error);
            toast.error("Failed to sync progress");
        }
    };

    return (
        <GamificationContext.Provider value={{ xp, level, progress, addXP }}>
            {children}
        </GamificationContext.Provider>
    );
};
