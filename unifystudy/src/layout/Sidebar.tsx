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
  User as UserIcon, // Rename to avoid conflict with User type
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
import "./Sidebar.scss";
import { User } from "@/types";

import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { useNotification } from "@/context/NotificationContext";

/* 
// Props Removed - using Context
interface SidebarProps {
  user: User | null;
  onSignOut: () => Promise<void>;
  isFocusMode: boolean;
  onFocusToggle: (e?: any) => void;
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
  isMobile: boolean;
}
*/

interface NavItemConfig {
  icon?: React.ElementType;
  iconElement?: React.ReactNode;
  label: string;
  to: string;
  badge?: number;
}

interface NavItemProps {
  item: NavItemConfig;
  location: { pathname: string };
  isCollapsed: boolean;
  isMobile: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ item, location, isCollapsed, isMobile }) => {
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

interface SidebarContentProps {
  user: User | null;
  isCollapsed: boolean;
  isMobile: boolean;
  location: { pathname: string };
  unreadCount: number;
  isFocusMode: boolean;
  onFocusToggle: () => void;
  onSignOut: () => Promise<void>;
}

const SidebarContent = React.memo<SidebarContentProps>(({
  user,
  isCollapsed,
  isMobile,
  location,
  unreadCount,
  isFocusMode,
  onFocusToggle,
  onSignOut
}) => {

  const renderNavItem = (item: NavItemConfig) => (
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
            item={{ iconElement: <GraduationCap size={22} />, label: "Find Study Buddy", to: "/buddy" }}
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
            to="/settings"
            className={`nav-item ${location.pathname === '/settings' ? 'active' : ''}`}
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
                  <UserIcon size={20} />
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

export default function Sidebar() {
  const { user, signOut } = useAuth();
  const {
    isNavCollapsed: isCollapsed,
    setNavCollapsed: setIsCollapsed,
    isMobile,
    focusModeActive: isFocusMode,
    toggleFocusMode: onFocusToggle
  } = useUI();

  const onSignOut = signOut;

  const location = useLocation();
  // const [isCollapsed, setIsCollapsed] = useState(false); // REMOVED: Controlled by Context
  const { unreadCount } = useNotification();


  // Mobile Detection
  // const [isMobile, setIsMobile] = useState(window.innerWidth < 768); // REMOVED: Passed by AppS
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    // const handleResize = () => { ... } // Replaced by AppS logic
    if (window.innerWidth >= 768) {
      setIsMobileMenuOpen(false);
    }
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
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
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
                          <UserIcon size={32} />
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

                  {/* Internal Close Button Removed - handled by Top Bar Toggle */}
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
