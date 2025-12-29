import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { ref, onValue, runTransaction, query, limitToLast, onChildAdded, DataSnapshot, Unsubscribe } from "firebase/database";
import { auth, db } from "@/services/firebaseConfig";
import { useAuth } from "./AuthContext";

interface NotificationContextType {
  unreadCount: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // Track unread messages count
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const unreadRef = ref(db, `users/${user.uid}/unreadMessages`);
    const unsubscribe = onValue(unreadRef, (snapshot) => {
      const count = snapshot.val() || 0;
      setUnreadCount(count);
    });

    return () => unsubscribe();
  }, [user]);

  // Handle Notifications & Background Listening
  useEffect(() => {
    if (!user) return;

    // Request permission on mount (optional, or wait for user action)
    if (Notification.permission === 'default') {
        // Notification.requestPermission(); 
    }

    const mountTime = Date.now();
    const channelSubs: Record<string, Unsubscribe> = {};

    const handleNewMessage = (snapshot: DataSnapshot) => {
      const msg = snapshot.val();
      if (!msg || !msg.timestamp) return;

      // Ignore messages older than mount time (prevent flood on reload)
      if (msg.timestamp < mountTime) return;

      // Ignore own messages
      if (msg.uid === user.uid) return;

      const isChatOpen = window.location.pathname === '/chat';
      const isHidden = document.hidden;

      if (!isChatOpen || isHidden) {
        // Increment unread count in DB
        const unreadRef = ref(db, `users/${user.uid}/unreadMessages`);
        runTransaction(unreadRef, (count) => (count || 0) + 1);

        // System Notification
        if (Notification.permission === "granted") {
          new Notification(`New message from ${msg.displayName}`, {
            body: msg.text || (msg.type === 'image' ? 'Sent an image' : 'Sent a file'),
            icon: '/favicon.ico'
          });
        }
      }
    };

    // 1. Listen to Global Chat
    const globalChatRef = query(ref(db, "global_chat"), limitToLast(1));
    const unsubGlobal = onChildAdded(globalChatRef, handleNewMessage);

    // 2. Listen to User's Channels
    const userChannelsRef = ref(db, `users/${user.uid}/channels`);
    const unsubChannels = onValue(userChannelsRef, (snapshot) => {
      const channels = snapshot.val() || {};
      const currentIds = Object.keys(channels);

      currentIds.forEach(channelId => {
        if (!channelSubs[channelId]) {
          const isSubject = ['math', 'science', 'history', 'cs'].includes(channelId);
          const msgPath = isSubject ? `channels/${channelId}` : `channels/${channelId}/messages`;
          const channelMsgRef = query(ref(db, msgPath), limitToLast(1));
          
          channelSubs[channelId] = onChildAdded(channelMsgRef, handleNewMessage);
        }
      });

      // Cleanup removed channels
      Object.keys(channelSubs).forEach(id => {
        if (!channels[id]) {
          if (typeof channelSubs[id] === 'function') channelSubs[id]();
          delete channelSubs[id];
        }
      });
    });

    return () => {
      unsubGlobal();
      unsubChannels();
      Object.values(channelSubs).forEach(unsub => {
        if (typeof unsub === 'function') unsub();
      });
    };
  }, [user]);

  return (
    <NotificationContext.Provider value={{ unreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
};
