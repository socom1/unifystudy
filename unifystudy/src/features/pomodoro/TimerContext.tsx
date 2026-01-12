
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
  // BUT: We don't want to reset if we are just navigating around.
  // The issue is that totalSeconds changes if selectedTemplate changes or mode changes.
  // We should only reset if the USER explicitly changes these, not just on mount.
  // However, since this is a global provider, it mounts once. So this effect runs when dependencies change.
  // If we change mode via setMode, this runs.
  useEffect(() => {
    // If we are running, and totalSeconds changes, it might be weird.
    // Usually totalSeconds changes because we switched mode or template.
    // In those cases, we usually want to stop and reset.
    // We'll keep the logic from Pomdoro.jsx but be careful.
    // We need to track if this is a "fresh" change or just a re-render.
    // Actually, in the original code, this effect ran whenever totalSeconds changed.
    // Since this Provider is persistent, it won't unmount/remount on navigation.
    // So this logic holds: if mode changes, we reset.
    
    // Check if we are already consistent to avoid unnecessary resets?
    // No, if mode changes from work to short, totalSeconds changes, we MUST reset.
    // The only case is if we want to PERSIST the timer while changing templates? No, that's rare.
    
    // We need to avoid infinite loops or resetting on initial render if we want to load saved state?
    // For now, let's assume ephemeral state is fine (resets on page reload).
    
    // We only want to reset if the calculated totalSeconds is different from what we expect?
    // Or just trust the logic: Mode change -> Reset.
    
    // One catch: if we are running, we don't want to reset just because we navigated?
    // Navigation doesn't trigger this effect because Provider doesn't unmount.
    // So this is safe.
    
    // However, we need to be careful not to reset immediately on mount if we want to restore state later.
    // For now, standard behavior.
    
    if (secondsLeftRef.current > totalSeconds) {
        // If current time is more than new total, definitely reset.
        // Or just always reset on mode change like original.
    }
    
    // We'll use a ref to track if this is the FIRST run or a change.
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
      // The effect on totalSeconds isn't enough because we need to force the new time immediately
      // to avoid a frame of old time.
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
      // Break finished - pure auto-switch or manual?
      // Original logic was manual start for work... wait:
      // "switchMode("work", false)" -> manual start.
      switchMode("work", false); 
      if("Notification" in window && Notification.permission === "granted")
          new Notification("Back to Work!", { body: "Ready to focus again? 🚀" });
    }
  };

  const confirmClaim = async () => {
      setShowClaimModal(false);
      
      setCompletedPomodoros((c) => c + 1);
      setCycleCount((c) => c + 1);

      // --- GAMIFICATION ---
      const durationMinutes = selectedTemplate?.work || 25;
      if (auth.currentUser) {
        try {
          const result = await recordStudySession(auth.currentUser.uid, durationMinutes, "pomodoro");
          addXP(10, "Pomodoro Session"); // User requested XP too
          
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

  // Check-in Feature
  useEffect(() => {
    let checkInTimeout;
    if (running && mode === "work") {
      const minTime = 10 * 60 * 1000; 
      const maxTime = 20 * 60 * 1000;
      const randomTime = Math.floor(Math.random() * (maxTime - minTime + 1) + minTime);

      checkInTimeout = setTimeout(() => {
        // We need to be careful with confirm/alert in a global context as it blocks the thread.
        // But for now, we keep the requested behavior.
        if (window.confirm("Are you still studying? Click OK to continue earning Lumens.")) {
          // User checked in
        } else {
          startPause();
          window.alert("Timer paused due to inactivity check.");
        }
      }, randomTime);
    }
    return () => clearTimeout(checkInTimeout);
  }, [running, mode]);

  // Cleanup on unmount (app close)
  useEffect(() => {
      return () => cancelRaf();
  }, []);

  const value = {
      templateList, setTemplateList,
      selectedTemplateId, setSelectedTemplateId, selectedTemplate,
      mode, setMode: switchMode, // Use our wrapper
      running, startPause, reset,
      secondsLeft, totalSeconds,
      completedPomodoros,
      formatTime: (s) => {
        const secs = Math.max(0, Math.ceil(s));
        const mm = Math.floor(secs / 60).toString().padStart(2, "0");
        const ss = Math.floor(secs % 60).toString().padStart(2, "0");
        return `${mm}:${ss}`;
      },
      showClaimModal, confirmClaim, // Exposed for UI
  };

  return (
    <TimerContext.Provider value={value}>
      {children}
    </TimerContext.Provider>
  );
};
