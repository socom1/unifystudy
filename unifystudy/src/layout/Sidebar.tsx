import React, { useState, useEffect } from "react";
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
  BrainCircuit,
  Library,
  Focus,
  CalendarRange,
  Users,
  Menu,
  X,
  Zap,
  BarChart2,
  Activity,
  Sparkles
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

const SidebarContent = React.memo(({
  user,
  location,
  unreadCount,
  onSignOut
}: {
  user: User | null;
  location: { pathname: string };
  unreadCount: number;
  onSignOut: () => Promise<void>;
}) => {
  const { 
    isNavCollapsed, 
    focusModeActive,
    setFocusModeActive 
  } = useUI();

  // Mobile check hook locally if not in context
  const [localIsMobile, setLocalIsMobile] = useState(window.innerWidth < 1082);
  useEffect(() => {
      const handler = () => setLocalIsMobile(window.innerWidth < 1082);
      window.addEventListener('resize', handler);
      return () => window.removeEventListener('resize', handler);
  }, []);

  const isCollapsed = isNavCollapsed;
  const isMobileState = localIsMobile;

  const renderNavItem = (item: NavItemConfig) => (
    <NavItem
      key={item.to}
      item={item}
      location={location}
      isCollapsed={isCollapsed}
      isMobile={isMobileState}
    />
  );

  return (
    <>
      <nav className="sidebar-nav">
        {/* DASHBOARD */}
        <div className="nav-section">
          {renderNavItem({ icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" })}
        </div>

        {/* PRODUCTIVITY Section */}
        <div className="nav-section">
          {(!isCollapsed || isMobileState) && <div className="section-label">PRODUCTIVITY</div>}
          {renderNavItem({ icon: Timer, label: "Pomodoro", to: "/pomodoro" })}
          {renderNavItem({ icon: Calendar, label: "Timetable", to: "/timetable" })}
          {renderNavItem({ icon: CheckSquare, label: "To-Do", to: "/todo" })}
          {renderNavItem({ icon: StickyNote, label: "Notes", to: "/notes" })}

          <NavItem
            item={{ iconElement: <CalendarRange size={22} />, label: "Yearly Calendar", to: "/calendar" }}
            location={location}
            isCollapsed={isCollapsed}
            isMobile={isMobileState}
          />
{/* Nova Assistant Removed */}
        </div>

        {/* STUDY & COLLAB Section */}
        <div className="nav-section">
          {(!isCollapsed || isMobileState) && <div className="section-label">STUDY & COLLAB</div>}

          <NavItem
            item={{ iconElement: <Zap size={22} />, label: "Flashcards", to: "/flashcards" }}
            location={location}
            isCollapsed={isCollapsed}
            isMobile={isMobileState}
          />
          <NavItem
            item={{ iconElement: <BrainCircuit size={22} />, label: "Mind Map", to: "/mindmap" }}
            location={location}
            isCollapsed={isCollapsed}
            isMobile={isMobileState}
          />
          <NavItem
            item={{ iconElement: <Library size={22} />, label: "Resource Library", to: "/resources" }}
            location={location}
            isCollapsed={isCollapsed}
            isMobile={isMobileState}
          />
          {/* <NavItem
            item={{ iconElement: <Users size={22} />, label: "Collaborative Workspace", to: "/workspace" }}
            location={location}
            isCollapsed={isCollapsed}
            isMobile={isMobileState}
          /> */}


          {renderNavItem({ icon: MessageSquare, label: "Chat", to: "/chat", badge: unreadCount })}
        </div>

        {/* PROGRESS Section */}
        <div className="nav-section">
          {(!isCollapsed || isMobileState) && <div className="section-label">PROGRESS</div>}
          <NavItem
            item={{ iconElement: <BarChart2 size={22} />, label: "Analytics", to: "/analytics" }}
            location={location}
            isCollapsed={isCollapsed}
            isMobile={isMobileState}
          />
          <NavItem
            item={{ iconElement: <Activity size={22} />, label: "Habit Tracker", to: "/habits" }}
            location={location}
            isCollapsed={isCollapsed}
            isMobile={isMobileState}
          />

          {renderNavItem({ icon: GraduationCap, label: "Grades", to: "/grades" })}
          {renderNavItem({ icon: Trophy, label: "Leaderboard", to: "/leaderboard" })}
          {renderNavItem({ icon: ShoppingBag, label: "Shop", to: "/shop" })}
        </div>

        {/* SETTINGS Section */}
        <div className="nav-section">
          {(!isCollapsed || isMobileState) && <div className="section-label">SETTINGS</div>}
          <Link
            to="#"
            className={`nav-item ${focusModeActive ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              setFocusModeActive(!focusModeActive);
            }}
            title={isCollapsed && !isMobileState ? "Focus Mode" : ""}
          >
            <div className="nav-icon-wrapper">
              <Focus size={22} />
            </div>
            {(!isCollapsed || isMobileState) && <span className="nav-label">Focus Mode</span>}
          </Link>

          <Link
            to="/settings"
            className={`nav-item ${location.pathname === '/settings' ? 'active' : ''}`}
            title={isCollapsed && !isMobileState ? "Settings" : ""}
          >
            <div className="nav-icon-wrapper">
              <Settings size={22} />
            </div>
            {(!isCollapsed || isMobileState) && <span className="nav-label">Settings</span>}
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
                  <div style={{ 
                    width: '100%', 
                    height: '100%', 
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'white'
                  }}>
                    {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {(!isCollapsed || isMobileState) && (
                <div className="user-details">
                  <span className="user-name">{user.displayName || "Student"}</span>
                  <span className="user-role">Pro Plan</span>
                </div>
              )}
            </Link>
            {(!isCollapsed || isMobileState) && (
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
              {(!isCollapsed || isMobileState) && <span>Sign In</span>}
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
    isNavCollapsed,
    setIsNavCollapsed,
  } = useUI();
  
  // Local Mobile State
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1082);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  useEffect(() => {
    const handleResize = () => {
        setIsMobile(window.innerWidth < 1082);
        if (window.innerWidth >= 1082) {
             setIsMobileMenuOpen(false);
        }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const location = useLocation();
  const { unreadCount } = useNotification();

  // Close menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  if (isMobile) {
    return (
      <>
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
                  {user ? (
                    <div className="mobile-user-profile">
                      <div className="avatar-large">
                        {user.photoURL ? ( 
                          <img src={user.photoURL} alt="User" /> 
                        ) : (
                          <div style={{ 
                            width: '100%', 
                            height: '100%', 
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            fontWeight: 600,
                            color: 'white'
                          }}>
                            {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                          </div>
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
                </div>

                <SidebarContent
                  user={user}
                  location={location}
                  unreadCount={unreadCount}
                  onSignOut={signOut}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <div className={`sidebar ${isNavCollapsed ? "collapsed" : ""}`}>
      <div className="sidebar-header">
        <div className="logo-container">
          <div className="logo-icon">&gt;_</div>
          {!isNavCollapsed && <span className="logo-text">UnifyStudy</span>}
        </div>
        <button
          className="collapse-btn"
          onClick={() => setIsNavCollapsed(!isNavCollapsed)}
        >
          {isNavCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <SidebarContent
        user={user}
        location={location}
        unreadCount={unreadCount}
        onSignOut={signOut}
      />
    </div>
  );
}
