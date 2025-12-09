import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
// Force rebuild
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
  Users,
  Menu,
  X,
  Zap,
  BarChart2,
  Activity
} from "lucide-react";
import { db, auth } from "../appsl/firebase";
import { ref, onValue, runTransaction, query, limitToLast, onChildAdded } from "firebase/database";
import "./Sidebar.scss";

// Extracted NavItem component to avoid re-creation
const NavItem = ({ item, location, isCollapsed, isMobile }) => {
  const Icon = item.icon;
  const isActive = location.pathname === item.to;
  return (
    <Link
      to={item.to}
      className={`nav-item ${isActive ? "active" : ""}`}
      title={isCollapsed && !isMobile ? item.label : ""}
    >
      <div className="nav-icon-wrapper">
        {Icon ? <Icon size={22} /> : item.iconElement}
        {item.badge && item.badge > 0 && (
          <span className="notification-badge">{item.badge > 99 ? '99+' : item.badge}</span>
        )}
      </div>
      {(!isCollapsed || isMobile) && <span className="nav-label">{item.label}</span>}
    </Link>
  );
};

// Extracted SidebarContent to prevent re-renders causing scroll reset
const SidebarContent = React.memo(({ 
  user, 
  isCollapsed, 
  isMobile, 
  location, 
  unreadCount, 
  isFocusMode, 
  onFocusToggle, 
  onSignOut 
}) => {
  
  const renderNavItem = (item) => (
    <NavItem 
      key={item.to} 
      item={item} 
      location={location} 
      isCollapsed={isCollapsed} 
      isMobile={isMobile} 
    />
  );

  return (
    <>
      {/* Navigation Links */}
      <nav className="sidebar-nav">
        {/* DASHBOARD */}
        <div className="nav-section">
          {renderNavItem({ icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" })}
        </div>

        {/* PRODUCTIVITY Section */}
        <div className="nav-section">
          {(!isCollapsed || isMobile) && <div className="section-label">PRODUCTIVITY</div>}
          {renderNavItem({ icon: Timer, label: "Pomodoro", to: "/pomodoro" })}
          {renderNavItem({ icon: Calendar, label: "Timetable", to: "/timetable" })}
          {renderNavItem({ icon: CheckSquare, label: "To-Do", to: "/todo" })}
          {renderNavItem({ icon: StickyNote, label: "Notes", to: "/notes" })}
          
           <NavItem 
              item={{ iconElement: <CalendarRange size={22} />, label: "Yearly Calendar", to: "/calendar" }}
              location={location}
              isCollapsed={isCollapsed}
              isMobile={isMobile}
           />
        </div>

        {/* STUDY & COLLAB Section */}
        <div className="nav-section">
          {(!isCollapsed || isMobile) && <div className="section-label">STUDY & COLLAB</div>}
          
           <NavItem 
              item={{ iconElement: <Zap size={22} />, label: "Flashcards", to: "/flashcards" }}
              location={location}
              isCollapsed={isCollapsed}
              isMobile={isMobile}
           />
           <NavItem 
              item={{ iconElement: <BrainCircuit size={22} />, label: "Mind Map", to: "/mindmap" }}
              location={location}
              isCollapsed={isCollapsed}
              isMobile={isMobile}
           />
           <NavItem 
              item={{ iconElement: <Library size={22} />, label: "Resource Library", to: "/resources" }}
              location={location}
              isCollapsed={isCollapsed}
              isMobile={isMobile}
           />
           <NavItem 
              item={{ iconElement: <Users size={22} />, label: "Collaborative Workspace", to: "/workspace" }}
              location={location}
              isCollapsed={isCollapsed}
              isMobile={isMobile}
           />
           <NavItem 
              item={{ iconElement: <GraduationCap size={22} />, label: "Find Study Buddy", to: "/study-buddy" }}
              location={location}
              isCollapsed={isCollapsed}
              isMobile={isMobile}
           />

          {renderNavItem({ icon: MessageSquare, label: "Chat", to: "/chat", badge: unreadCount })}
        </div>

        {/* PROGRESS Section */}
        <div className="nav-section">
          {(!isCollapsed || isMobile) && <div className="section-label">PROGRESS</div>}
           <NavItem 
              item={{ iconElement: <BarChart2 size={22} />, label: "Analytics", to: "/analytics" }}
              location={location}
              isCollapsed={isCollapsed}
              isMobile={isMobile}
           />
           <NavItem 
              item={{ iconElement: <Activity size={22} />, label: "Habit Tracker", to: "/habits" }}
              location={location}
              isCollapsed={isCollapsed}
              isMobile={isMobile}
           />

          {renderNavItem({ icon: GraduationCap, label: "Grades", to: "/grades" })}
          {renderNavItem({ icon: Trophy, label: "Leaderboard", to: "/leaderboard" })}
          {renderNavItem({ icon: ShoppingBag, label: "Shop", to: "/shop" })}
        </div>

        {/* SETTINGS Section */}
        <div className="nav-section">
          {(!isCollapsed || isMobile) && <div className="section-label">SETTINGS</div>}
          <Link
            to="#"
            className={`nav-item ${isFocusMode ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              onFocusToggle();
            }}
            title={isCollapsed && !isMobile ? "Focus Mode" : ""}
          >
            <div className="nav-icon-wrapper">
               <Focus size={22} />
            </div>
            {(!isCollapsed || isMobile) && <span className="nav-label">Focus Mode</span>}
          </Link>

          <Link
            to="/profile"
            className={`nav-item ${location.pathname === '/profile' ? 'active' : ''}`}
            title={isCollapsed && !isMobile ? "Settings" : ""}
          >
            <div className="nav-icon-wrapper">
                <Settings size={22} />
            </div>
            {(!isCollapsed || isMobile) && <span className="nav-label">Settings</span>}
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
              {(!isCollapsed || isMobile) && (
                <div className="user-details">
                  <span className="user-name">{user.displayName || "Student"}</span>
                  <span className="user-role">Pro Plan</span>
                </div>
              )}
            </Link>
            {(!isCollapsed || isMobile) && (
              <button onClick={onSignOut} className="logout-btn" title="Sign Out">
                <LogOut size={20} />
              </button>
            )}
          </div>
        ) : (
          <div className="user-section">
            <Link to="/login" className="nav-item">
               <div className="nav-icon-wrapper">
                   <LogOut size={20} />
               </div>
              {(!isCollapsed || isMobile) && <span>Sign In</span>}
            </Link>
          </div>
        )}
      </div>
    </>
  );
});

export default function Sidebar({ user, onSignOut, isFocusMode, onFocusToggle }) {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);


  // Mobile Detection
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);



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

  if (isMobile) {
    return (
      <>
        {/* Mobile Top Bar */}
        <div className="mobile-top-bar">
          <div className="logo-container">
            <div className="logo-icon">&gt;_</div>
            <span className="logo-text">UnifyStudy</span>
          </div>
          <button
            className="mobile-menu-btn"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu size={24} />
          </button>
        </div>

        {/* Mobile Drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div
                className="drawer-backdrop"
                onClick={() => setIsMobileMenuOpen(false)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
              <motion.div 
                className="mobile-drawer"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <div className="drawer-header">
                  {/* User Profile at Top */}
                  {user ? (
                    <div className="mobile-user-profile">
                      <div className="avatar-large">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt="User" />
                        ) : (
                          <User size={32} />
                        )}
                      </div>
                      <div className="user-info-large">
                        <span className="user-name-large">{user.displayName || "Student"}</span>
                        <span className="user-role-large">Free Plan</span>
                      </div>
                    </div>
                  ) : (
                     <div className="logo-container">
                      <div className="logo-icon">&gt;_</div>
                      <span className="logo-text">UnifyStudy</span>
                    </div>
                  )}
                  
                  <button
                    className="close-drawer-btn"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <X size={24} />
                  </button>
                </div>

                <SidebarContent 
                  user={user}
                  isCollapsed={false}
                  isMobile={true}
                  location={location}
                  unreadCount={unreadCount}
                  isFocusMode={isFocusMode}
                  onFocusToggle={onFocusToggle}
                  onSignOut={onSignOut}
                />

                {/* Upgrade to Pro Card */}
                <div className="pro-card">
                  <div className="pro-icon">
                    <img src="https://images.unsplash.com/photo-1633409361618-c73427e4e206?q=80&w=2080&auto=format&fit=crop" alt="Pro" />
                  </div>
                  <div className="pro-content">
                    <h3>Upgrade to PRO</h3>
                    <p>One year support, monthly updates for up to 5 team members.</p>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </>
    );
  }

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

      <SidebarContent 
        user={user}
        isCollapsed={isCollapsed}
        isMobile={false}
        location={location}
        unreadCount={unreadCount}
        isFocusMode={isFocusMode}
        onFocusToggle={onFocusToggle}
        onSignOut={onSignOut}
      />
    </div>
  );
}
