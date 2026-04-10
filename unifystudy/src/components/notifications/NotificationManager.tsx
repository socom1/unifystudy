import React, { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/firebaseConfig';
import { ref, onValue, query, orderByChild, startAt } from 'firebase/database';
import { toast } from 'sonner';

export default function NotificationManager() {
  const { user } = useAuth();
  const mountedRef = useRef(false);

  // Request Notification Permissions on mount
  useEffect(() => {
    if (!mountedRef.current && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
             toast.success("Desktop notifications enabled!");
          }
        });
      }
      mountedRef.current = true;
    }
  }, []);

  const sendNotification = (title: string, options?: NotificationOptions) => {
    if ('Notification' in window && Notification.permission === 'granted') {
       new Notification(title, { icon: '/favicon.ico', ...options });
    }
  };

  // Listen for Upcoming Events
  useEffect(() => {
      if (!user) return;
      const eventsRef = ref(db, `users/${user.uid}/events`);
      
      const unsub = onValue(eventsRef, (snap) => {
          const events = snap.val();
          if (!events) return;
          
          const now = new Date();
          const currentDay = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][now.getDay()];
          const currentHour = now.getHours() + now.getMinutes()/60;
          
          Object.values(events).forEach((evt: any) => {
              // Wait for exact match? That's tricky with onValue.
              // A better robust notification system would use a service worker or a SetInterval tick.
              // We'll trust this for now, though it's simplified.
          });
      });
      return () => unsub();
  }, [user]);

  // General Notification Ticker (Every minute, check if something is exactly starting within 5m)
  useEffect(() => {
      if (!user) return;
      const cachedEvents: any[] = [];
      const eventsRef = ref(db, `users/${user.uid}/events`);
      const unsub = onValue(eventsRef, (s) => {
          const val = s.val();
          if(val) {
             cachedEvents.length = 0;
             cachedEvents.push(...Object.values(val));
          }
      });

      const intervalId = setInterval(() => {
          const now = new Date();
          const currentDay = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][now.getDay()];
          const currentHour = now.getHours();
          const totalMins = now.getHours() * 60 + now.getMinutes();

          cachedEvents.forEach(evt => {
               if (evt.day === currentDay) {
                   const startMins = Math.round(evt.start * 60);
                   // Notify exactly 5 mins before
                   if (startMins - totalMins === 5) {
                       sendNotification(`Upcoming event in 5 mins: ${evt.title}`, {
                           body: evt.description || "Get ready!",
                       });
                   }
               }
          });
      }, 60000); // Check every minute

      return () => {
          unsub();
          clearInterval(intervalId);
      }
  }, [user]);

  return <></>; // Background invisible component
}
