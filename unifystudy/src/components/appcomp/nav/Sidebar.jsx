import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard,
  Timer,
  Calendar,
  CheckSquare,
  StickyNote,
  GraduationCap,
  Trophy,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Settings,
  User,
  MessageSquare,
  AlertCircle,
  Paperclip,
  File,
  MoreVertical,
  BrainCircuit,
  Library,
  Focus,
  CalendarRange,
  Users
} from "lucide-react";
import { db, auth } from "../appsl/firebase";
import { ref, onValue, runTransaction, query, limitToLast, onChildAdded } from "firebase/database";
import "./Sidebar.scss";

export default function Sidebar({ user, onSignOut }) {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isFocusMode, setIsFocusMode] = useState(false);

  // Focus Mode Toggle Handler
  const toggleFocusMode = () => {
    setIsFocusMode(!isFocusMode);
    // Dispatch event for AppS to handle
    window.dispatchEvent(new CustomEvent('toggle-focus-mode', { detail: !isFocusMode }));
  };

  // Section-organized menu items
  const generalItems = [
    { icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" },
    { icon: Timer, label: "Pomodoro", to: "/pomodoro" },
    { icon: Calendar, label: "Timetable", to: "/timetable" },
    { icon: CheckSquare, label: "To-Do", to: "/todo" },
    { icon: StickyNote, label: "Notes", to: "/notes" },
  ];

  const toolsItems = [
    { icon: GraduationCap, label: "Grades", to: "/grades" },
    { icon: Trophy, label: "Leaderboard", to: "/leaderboard" },
    { icon: ShoppingBag, label: "Shop", to: "/shop" },
    { icon: MessageSquare, label: "Chat", to: "/chat", badge: unreadCount },
  ];

  // Track unread messages
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    // Listen to user's unread count
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

    // Don't auto-request permission, only when sending notifications
    const listeners = [];
    const mountTime = Date.now();
    // Track channel subscriptions to avoid duplicates
    const channelSubs = {};

    // Helper to handle new messages
    const handleNewMessage = (snapshot) => {
      const msg = snapshot.val();
      if (!msg || !msg.timestamp) return;

      // Ignore messages older than mount time (prevent flood on reload)
      if (msg.timestamp < mountTime) return;

      // Ignore own messages
      if (msg.uid === user.uid) return;

      const isChatOpen = window.location.pathname === '/chat';
      const isHidden = document.hidden;

      if (!isChatOpen || isHidden) {
        // Increment unread count
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

    // 2. Listen to User's Channels (Private & Subjects)
    const userChannelsRef = ref(db, `users/${user.uid}/channels`);
    const unsubChannels = onValue(userChannelsRef, (snapshot) => {
      const channels = snapshot.val() || {};
      const currentIds = Object.keys(channels);

      // Subscribe to new channels
      currentIds.forEach(channelId => {
        if (!channelSubs[channelId]) {
          const isSubject = ['math', 'science', 'history', 'cs'].includes(channelId);
          const msgPath = isSubject ? `channels/${channelId}` : `channels/${channelId}/messages`;
          const channelMsgRef = query(ref(db, msgPath), limitToLast(1));

          // Store unsubscribe function
          // onChildAdded returns Unsubscribe in modular SDK
          channelSubs[channelId] = onChildAdded(channelMsgRef, handleNewMessage);
        }
      });

      // Unsubscribe removed channels (if any)
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
      // Cleanup all channel subs
      Object.values(channelSubs).forEach(unsub => {
        if (typeof unsub === 'function') unsub();
      });
    };
  }, [user]);

  const renderNavItem = (item) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.to;
    return (
      <Link
        key={item.to}
        to={item.to}
        className={`nav-item ${isActive ? "active" : ""}`}
        title={isCollapsed ? item.label : ""}
      >
        <div className="nav-icon-wrapper">
          <Icon size={22} />
          {item.badge && item.badge > 0 && (
            <span className="notification-badge">{item.badge > 99 ? '99+' : item.badge}</span>
          )}
        </div>
        {!isCollapsed && <span className="nav-label">{item.label}</span>}
      </Link>
    );
  };

  return (
    <div className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
      {/* Header / Logo */}
      <div className="sidebar-header">
        <div className="logo-container">
          {/* Terminal-style logo */}
          <div className="logo-icon">&gt;_</div>
          {!isCollapsed && <span className="logo-text">UnifyStudy</span>}
        </div>
        <button
          className="collapse-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        {/* GENERAL Section */}
        <div className="nav-section">
          {!isCollapsed && <div className="section-label">GENERAL</div>}
          {generalItems.map(renderNavItem)}
        </div>

        {/* TOOLS/RESOURCES Section */}
        <div className="nav-section">
          {!isCollapsed && <div className="section-label">TOOLS/RESOURCES</div>}
          {toolsItems.map(renderNavItem)}
        </div>

        {/* SETTINGS Section */}
        <div className="nav-section">
          {!isCollapsed && <div className="section-label">SETTINGS</div>}
          <button
            className={`nav-item ${isFocusMode ? 'active' : ''}`}
            onClick={toggleFocusMode}
            title={isCollapsed ? "Focus Mode" : ""}
          >
            <Focus size={22} />
            {!isCollapsed && <span>Focus Mode</span>}
          </button>

          <Link
            to="/calendar"
            className={`nav-item ${location.pathname === '/calendar' ? 'active' : ''}`}
            title={isCollapsed ? "Yearly Calendar" : ""}
          >
            <CalendarRange size={22} />
            {!isCollapsed && <span>Yearly Calendar</span>}
          </Link>

          <Link 
            to="/workspace" 
            className={`nav-item ${location.pathname === '/workspace' ? 'active' : ''}`}
            title={isCollapsed ? "Collaborative Workspace" : ""}
          >
            <Users size={22} />
            {!isCollapsed && <span>Workspace</span>}
          </Link>

          <Link 
            to="/study-buddy" 
            className={`nav-item ${location.pathname === '/study-buddy' ? 'active' : ''}`}
            title={isCollapsed ? "Find Study Buddy" : ""}
          >
            <GraduationCap size={22} />
            {!isCollapsed && <span>Study Buddy</span>}
          </Link>

          <Link
            to="/mindmap"
            className={`nav-item ${location.pathname === '/mindmap' ? 'active' : ''}`}
            title={isCollapsed ? "Mind Map" : ""}
          >
            <BrainCircuit size={22} />
            {!isCollapsed && <span>Mind Map</span>}
          </Link>

          <Link
            to="/profile"
            className={`nav-item ${location.pathname === '/profile' ? 'active' : ''}`}
            title={isCollapsed ? "Settings" : ""}
          >
            <Settings size={22} />
            {!isCollapsed && <span className="nav-label">Settings</span>}
          </Link>
        </div>
      </nav>

      {/* Footer / User Section */}
      <div className="sidebar-footer">
        {user ? (
          <div className="user-section">
            <Link to="/profile" className="user-info">
              <div className="avatar">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="User" />
                ) : (
                  <User size={20} />
                )}
              </div>
              {!isCollapsed && (
                <div className="user-details">
                  <span className="user-name">{user.displayName || "User"}</span>
                  <span className="user-role">Student</span>
                </div>
              )}
            </Link>
            <button className="logout-btn" onClick={onSignOut} title="Sign Out">
              <LogOut size={20} />
            </button>
          </div>
        ) : (
          <Link to="/signup" className="nav-item">
            <User size={22} />
            {!isCollapsed && <span>Sign In</span>}
          </Link>
        )}
      </div>
    </div>
  );
}
