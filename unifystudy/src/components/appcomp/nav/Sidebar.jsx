import React, { useState, useEffect } from "react";
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
  MessageSquare
} from "lucide-react";
import { db, auth } from "../appsl/firebase";
import { ref, onValue } from "firebase/database";
import "./Sidebar.scss";

export default function Sidebar({ user, onSignOut }) {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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
          <Link 
            to="/settings" 
            className={`nav-item ${location.pathname === '/settings' ? 'active' : ''}`}
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
