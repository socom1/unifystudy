import React, { useEffect, useRef } from 'react';
import { ref, get } from 'firebase/database';
import { db } from '@/services/firebaseConfig';
import { User } from '@/types';

interface NotificationManagerProps {
  user: User;
}

const NotificationManager: React.FC<NotificationManagerProps> = ({ user }) => {
  const lastBreakTime = useRef(Date.now());
  const hasShownDailyDigest = useRef(false);

  useEffect(() => {
    if (!user) return;

    // 1. Break Reminders (Every 50 minutes) - Disabled
    
    // 2. Daily Digest (On Mount/Login)
    const checkDailyDigest = async () => {
      const today = new Date().toDateString();
      const lastDigestDate = localStorage.getItem(`daily_digest_${user.uid}`);

      if (lastDigestDate !== today && !hasShownDailyDigest.current) {
        try {
          const todosRef = ref(db, `users/${user.uid}/todos`);
          const snapshot = await get(todosRef);
          let taskCount = 0;
          if (snapshot.exists()) {
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
              
              if (timeDiff > 0 && timeDiff < oneDay) {
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
      clearInterval(deadlineInterval);
    };
  }, [user]);

  return null;
};

export default NotificationManager;
