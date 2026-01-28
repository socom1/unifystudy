
// @ts-nocheck
import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import { recordStudySession } from '@/services/leaderboardService';
import { auth } from "@/services/firebaseConfig";
import { useGamification } from "@/context/GamificationContext";

const TimerContext = createContext();

export const useTimer = () => useContext(TimerContext);

const defaultTemplates = [
  {
    id: "t1",
    name: "Default Pomodoro",
    work: 25,
    short: 5,
    long: 15,
    cycles: 4,
  },
  { id: "t2", name: "Deep Work", work: 50, short: 10, long: 30, cycles: 3 },
];

export const TimerProvider = ({ children }) => {
  // --- State from Pomdoro.jsx ---
  const [templateList, setTemplateList] = useState(defaultTemplates);
  const [selectedTemplateId, setSelectedTemplateId] = useState(defaultTemplates[0].id);
  
  const { addXP } = useGamification();

  const selectedTemplate = useMemo(() => 
    templateList.find((t) => t.id === selectedTemplateId) || templateList[0],
  [templateList, selectedTemplateId]);

  const [mode, setMode] = useState("work"); // "work" | "short" | "long"
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState((selectedTemplate?.work || 25) * 60);
  
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);
  const [showClaimModal, setShowClaimModal] = useState(false); // New state for anti-abuse modal

  // Refs for rAF
  const rafRef = useRef(null);
  const endTimeRef = useRef(null);
  const secondsLeftRef = useRef(secondsLeft);

  // Derived total seconds
  const totalSeconds = useMemo(() => {
    if (mode === "work") return (selectedTemplate?.work || 25) * 60;
    if (mode === "short") return (selectedTemplate?.short || 5) * 60;
    return (selectedTemplate?.long || 15) * 60;
  }, [mode, selectedTemplate]);

  // Sync ref
  useEffect(() => {
    secondsLeftRef.current = secondsLeft;
  }, [secondsLeft]);

  // Reset on totalSeconds change (mode/template change)
  useEffect(() => {
    // Standard Reset Logic: If total duration changes (template switch), reset timer.
    // Ensure we don't accidentally reset active sessions just by navigation re-renders.
    if (secondsLeftRef.current > totalSeconds) {
        setSecondsLeft(totalSeconds);
        secondsLeftRef.current = totalSeconds;
    }
  }, [totalSeconds]);

  // Helper to stop rAF
  const cancelRaf = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  // rAF Loop
  const rafLoop = (now) => {
    if (!endTimeRef.current) {
      cancelRaf();
      setRunning(false);
      return;
    }

    const remainingMs = endTimeRef.current - now;
    const remainingSec = Math.max(0, remainingMs / 1000);
    
    secondsLeftRef.current = remainingSec;
    setSecondsLeft(remainingSec);

    if (remainingMs <= 0) {
      cancelRaf();
      setRunning(false);
      secondsLeftRef.current = 0;
      setSecondsLeft(0);
      handleComplete();
      return;
    }

    rafRef.current = requestAnimationFrame(rafLoop);
  };

  const startRaf = () => {
    const now = performance.now();
    endTimeRef.current = now + Math.max(0, secondsLeftRef.current) * 1000;
    cancelRaf();
    rafRef.current = requestAnimationFrame(rafLoop);
  };

  const startPause = () => {
    if (running) {
      cancelRaf();
      setRunning(false);
      endTimeRef.current = null;
    } else {
      startRaf();
      setRunning(true);
    }
  };

  const reset = () => {
    cancelRaf();
    setRunning(false);
    endTimeRef.current = null;
    setSecondsLeft(totalSeconds);
    secondsLeftRef.current = totalSeconds;
  };

  const switchMode = (newMode, autoStart = false) => {
      setMode(newMode);
      // Force new time immediately to avoid UI flicker
      let newTime = 25 * 60;
      if (newMode === 'work') newTime = (selectedTemplate?.work || 25) * 60;
      if (newMode === 'short') newTime = (selectedTemplate?.short || 5) * 60;
      if (newMode === 'long') newTime = (selectedTemplate?.long || 15) * 60;
      
      setSecondsLeft(newTime);
      secondsLeftRef.current = newTime;
      
      cancelRaf();
      endTimeRef.current = null;

      if (autoStart) {
          setRunning(true);
          const now = performance.now();
          endTimeRef.current = now + Math.max(0, newTime) * 1000;
          rafRef.current = requestAnimationFrame(rafLoop);
      } else {
          setRunning(false);
      }
  };

  const handleComplete = async () => {
    if (mode === "work") {
      // ANTI-ABUSE: Do not award immediately. Show claim modal.
      setShowClaimModal(true);
      // We stop here. User must click "I'm here" to proceed.
    } else {
      switchMode("work", false); 
      if("Notification" in window && Notification.permission === "granted")
          new Notification("Back to Work!", { body: "Ready to focus again? 🚀" });
    }
  };

  // Persistent Stats
  const [streak, setStreak] = useState(() => {
    if (typeof window !== "undefined") {
      return parseInt(localStorage.getItem("pomodoro_streak") || "0");
    }
    return 0;
  });
  const [sessionsToday, setSessionsToday] = useState(() => {
    if (typeof window !== "undefined") {
        const saved = localStorage.getItem("pomodoro_sessions_today");
        if (saved) {
            const parsed = JSON.parse(saved);
            const today = new Date().toISOString().split('T')[0];
            if (parsed.date === today) return parsed.count;
        }
    }
    return 0;
  });

  // Derived from sessionsToday for UI (or use completedPomodoros as ephemeral session)
  // We'll expose sessionsToday as the "Daily Count"
  
  // Anti-abuse & Completion
  const confirmClaim = async () => {
      setShowClaimModal(false);
      
      const newSessionCount = sessionsToday + 1;
      setSessionsToday(newSessionCount);
      localStorage.setItem("pomodoro_sessions_today", JSON.stringify({
          date: new Date().toISOString().split('T')[0],
          count: newSessionCount
      }));

      // Streak Logic
      const lastStudyDate = localStorage.getItem("pomodoro_last_study_date");
      const today = new Date().toISOString().split('T')[0];
      
      if (lastStudyDate !== today) {
          // If last study was yesterday, increment. If older, reset to 1. If today, do nothing (keep streak).
          // Check if yesterday
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          
          let newStreak = 1;
          if (lastStudyDate === yesterdayStr) {
              newStreak = streak + 1;
          } else if (lastStudyDate && lastStudyDate < yesterdayStr) {
             // Streak broken or new user
             newStreak = 1;
          } else if (!lastStudyDate) {
              newStreak = 1;
          } else {
             newStreak = streak; // Should be covered by !== today check but safety fallthrough
          }
          
          setStreak(newStreak);
          localStorage.setItem("pomodoro_streak", newStreak.toString());
          localStorage.setItem("pomodoro_last_study_date", today);
      }

      setCompletedPomodoros((c) => c + 1); // Ephemeral count
      setCycleCount((c) => c + 1);

      // --- GAMIFICATION ---
      const durationMinutes = selectedTemplate?.work || 25;
      if (auth.currentUser) {
        try {
          const result = await recordStudySession(auth.currentUser.uid, durationMinutes, "pomodoro");
          addXP(10, "Pomodoro Session"); 
          
          if (result.earnedCoins > 0 && "Notification" in window && Notification.permission === "granted") {
             const achievementMsg = result.unlocked.length > 0 ? ` and unlocked ${result.unlocked.length} achievements!` : '!';
             new Notification("Great Job!", {
                  body: `You finished a session and earned ${result.earnedCoins} Lumens${achievementMsg} 💡`,
              });
          }
          toast.success(`Session Complete! +${result.earnedCoins} Lumens, +10 XP`);

        } catch (error) {
          console.error("❌ Failed to update gamification data:", error);
          toast.error("Failed to save session stats.");
        }
      }
      // --------------------

      const nextIsLong = cycleCount + 1 >= (selectedTemplate?.cycles || 4);
      if (nextIsLong) {
        switchMode("long", true); 
        setCycleCount(0);
      } else {
        switchMode("short", true); 
      }

      if("Notification" in window && Notification.permission === "granted") 
          new Notification("Break Time!", { body: "Take a well-deserved break. ☕" });
  };

  // ... (Check-in effect) ...

  const value = {
      templateList, setTemplateList,
      selectedTemplateId, setSelectedTemplateId, selectedTemplate,
      mode, setMode: switchMode, 
      running, startPause, reset,
      secondsLeft, totalSeconds,
      completedPomodoros: sessionsToday, // Use persistent daily count instead of ephemeral
      streak, // Expose Streak
      formatTime: (s) => {
        const secs = Math.max(0, Math.ceil(s));
        const mm = Math.floor(secs / 60).toString().padStart(2, "0");
        const ss = Math.floor(secs % 60).toString().padStart(2, "0");
        return `${mm}:${ss}`;
      },
      showClaimModal, confirmClaim, 
  };

  return (
    <TimerContext.Provider value={value}>
      {children}
    </TimerContext.Provider>
  );
};
