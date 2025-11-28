import React, { useEffect, useRef } from 'react';
import { getDatabase, ref, query, orderByChild, get } from 'firebase/database';

const NotificationManager = ({ user }) => {
  const lastBreakTime = useRef(Date.now());
  const hasShownDailyDigest = useRef(false);

  useEffect(() => {
    if (!user) return;

    const db = getDatabase();

    // 1. Break Reminders (Every 50 minutes)
    const breakInterval = setInterval(() => {
      const now = Date.now();
      if (now - lastBreakTime.current > 50 * 60 * 1000) {
        new Notification("Time for a Break!", {
          body: "You've been studying for 50 minutes. Take a 5-minute stretch!",
          icon: '/favicon.ico'
        });
        lastBreakTime.current = now;
      }
    }, 60 * 1000); // Check every minute

    // 2. Daily Digest (On Mount/Login)
    const checkDailyDigest = async () => {
      const today = new Date().toDateString();
      const lastDigestDate = localStorage.getItem(`daily_digest_${user.uid}`);

      if (lastDigestDate !== today && !hasShownDailyDigest.current) {
        // Fetch pending tasks count (mock logic or real if structure known)
        // Assuming tasks are at `users/${user.uid}/todos`
        try {
          const todosRef = ref(db, `users/${user.uid}/todos`);
          const snapshot = await get(todosRef);
          let taskCount = 0;
          if (snapshot.exists()) {
            // Count incomplete tasks
            snapshot.forEach(child => {
              if (!child.val().completed) taskCount++;
            });
          }

          if (taskCount > 0) {
            new Notification(`Good Morning, ${user.displayName || 'Scholar'}!`, {
              body: `You have ${taskCount} tasks scheduled for today. Let's get started!`,
              icon: '/favicon.ico'
            });
          } else {
             new Notification(`Welcome back, ${user.displayName || 'Scholar'}!`, {
              body: "Ready to set some goals for today?",
              icon: '/favicon.ico'
            });
          }
          
          localStorage.setItem(`daily_digest_${user.uid}`, today);
          hasShownDailyDigest.current = true;
        } catch (error) {
          console.error("Error fetching daily digest:", error);
        }
      }
    };

    checkDailyDigest();

    // 3. Deadline Alerts (Check every hour)
    const deadlineInterval = setInterval(async () => {
      try {
        const todosRef = ref(db, `users/${user.uid}/todos`);
        const snapshot = await get(todosRef);
        
        if (snapshot.exists()) {
          const now = Date.now();
          const oneDay = 24 * 60 * 60 * 1000;
          
          snapshot.forEach(child => {
            const task = child.val();
            if (!task.completed && task.dueDate) {
              const dueDate = new Date(task.dueDate).getTime();
              const timeDiff = dueDate - now;
              
              // Notify if due within 24 hours and hasn't been notified recently (simplified)
              if (timeDiff > 0 && timeDiff < oneDay) {
                // In a real app, we'd track "notified" state to avoid spam
                // For now, just a simple check or we rely on the interval being long (e.g. 4 hours)
                // Let's just log it for now to avoid browser spam in dev
                console.log(`Task due soon: ${task.title}`);
              }
            }
          });
        }
      } catch (error) {
        console.error("Error checking deadlines:", error);
      }
    }, 60 * 60 * 1000); // Check every hour

    return () => {
      clearInterval(breakInterval);
      clearInterval(deadlineInterval);
    };
  }, [user]);

  return null; // This component doesn't render anything visible
};

export default NotificationManager;
