import { ref, onValue, off, update, push, runTransaction } from 'firebase/database';
import { db } from './firebaseConfig';
import { checkAchievements, getAchievementById } from "@/utils/achievements";

export const subscribeToLeaderboard = (callback) => {
  const usersRef = ref(db, 'public_leaderboard');
  
  const listener = onValue(usersRef, (snap) => {
    const data = snap.val();
    callback(data);
  }, (error) => {
    console.error("Error fetching leaderboard data:", error);
    callback(null);
  });

  return () => off(usersRef, listener);
};

export const recordStudySession = async (uid, durationMinutes, type = 'study') => {
  if (!uid || durationMinutes <= 0) return { earnedCoins: 0, unlocked: [] };

  try {
    const now = Date.now();
    
    const statsRef = ref(db, `users/${uid}/stats`);
    let finalStreak = 1;
    
    await runTransaction(statsRef, (currentStats) => {
        if (!currentStats) return { lastSession: now, currentStreak: 1, totalStudyTime: 0, sessionCount: 0 };
        
        const last = currentStats.lastSession || 0;
        const lastDate = new Date(last).setHours(0,0,0,0);
        const todayDate = new Date(now).setHours(0,0,0,0);
        
        const diffDays = (todayDate - lastDate) / (1000 * 60 * 60 * 24);
        
        let newStreak = currentStats.currentStreak || 0;
        
        if (diffDays === 1) {
            newStreak += 1;
        } else if (diffDays > 1) {
            newStreak = 1;
        } else if (diffDays === 0) {
            if (newStreak === 0) newStreak = 1;
        }
        
        finalStreak = newStreak;
        
        return {
            ...currentStats,
            lastSession: now,
            currentStreak: newStreak
        };
    });

    await push(ref(db, `users/${uid}/study_sessions`), {
      duration: durationMinutes,
      timestamp: now,
      type: type
    });

    const totalTimeRef = ref(db, `users/${uid}/stats/totalStudyTime`);
    let finalTotalTime = 0;
    await runTransaction(totalTimeRef, (current) => {
      finalTotalTime = (current || 0) + durationMinutes;
      return finalTotalTime;
    });

    const sessionCountRef = ref(db, `users/${uid}/stats/sessionCount`);
    let finalSessionCount = 0;
    await runTransaction(sessionCountRef, (current) => {
      finalSessionCount = (current || 0) + 1;
      return finalSessionCount;
    });

    const { newlyUnlocked, progress } = checkAchievements(
      { totalStudyTime: finalTotalTime, sessionCount: finalSessionCount },
      finalStreak
    );

    const unlockedSnapshot = await new Promise((resolve) => {
      onValue(ref(db, `users/${uid}/achievements/unlocked`), (snap) => resolve(snap), { onlyOnce: true });
    });
    const unlockedAchievements = unlockedSnapshot.val() || [];
    const achievementsToUnlock = newlyUnlocked.filter(id => !unlockedAchievements.includes(id));

    let achievementCoins = 0;
    achievementsToUnlock.forEach(id => {
        const ach = getAchievementById(id);
        if (ach) achievementCoins += ach.reward;
    });

    const sessionCoins = Math.floor(durationMinutes);
    const totalCoinsToAdd = sessionCoins + achievementCoins;

    const currencyRef = ref(db, `users/${uid}/currency`);
    let finalCurrency = 0;
    await runTransaction(currencyRef, (current) => {
        finalCurrency = (current || 0) + totalCoinsToAdd;
        return finalCurrency;
    });

    if (achievementsToUnlock.length > 0) {
       await update(ref(db, `users/${uid}/achievements`), {
        unlocked: [...unlockedAchievements, ...achievementsToUnlock],
        progress
      });
    }

    const publicLbRef = ref(db, `public_leaderboard/${uid}`);
    
    const publicUserSnap = await new Promise(r => onValue(publicLbRef, s => r(s), {onlyOnce: true}));
    if (!publicUserSnap.exists() || !publicUserSnap.val().displayName) {
        const privateSnap = await new Promise(r => onValue(ref(db, `users/${uid}`), s => r(s), {onlyOnce: true}));
        const pVal = privateSnap.val();
        if (pVal) {
             await update(publicLbRef, {
                 username: pVal.username || pVal.displayName || 'Student',
                 displayName: pVal.displayName || 'Student',
                 photoURL: pVal.photoURL || null
             });
        }
    }

    await update(publicLbRef, {
        stats: { totalStudyTime: finalTotalTime },
        currency: finalCurrency
    });
    
    await push(ref(db, `public_leaderboard/${uid}/study_sessions`), {
        duration: durationMinutes,
        timestamp: now
    });

    return { earnedCoins: totalCoinsToAdd, unlocked: achievementsToUnlock };

  } catch (error) {
    console.error("Error recording study session:", error);
    throw error;
  }
};

export const syncUserToLeaderboard = async (uid) => {
    if (!uid) return;
    try {
        const userRef = ref(db, `users/${uid}`);
        const snap = await new Promise(r => onValue(userRef, s => r(s), {onlyOnce: true}));
        const userData = snap.val();

        if (!userData) return;

        const publicLbRef = ref(db, `public_leaderboard/${uid}`);
        
        await update(publicLbRef, {
            username: userData.username || userData.displayName || 'Student',
            displayName: userData.displayName || 'Student',
            photoURL: userData.photoURL || null,
            stats: { 
                totalStudyTime: userData.stats?.totalStudyTime || 0 
            },
            currency: userData.currency || 0,
            settings: userData.settings || {} 
        });
        
    } catch (e) {
        console.error("Leaderboard Sync Failed", e);
    }
};
