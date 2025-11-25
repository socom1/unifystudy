import React, { useState } from "react";
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
  User
} from "lucide-react";
import "./Sidebar.scss";

export default function Sidebar({ user, onSignOut }) {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" },
    { icon: Timer, label: "Pomodoro", to: "/pomodoro" },
    { icon: Calendar, label: "Timetable", to: "/timetable" },
    { icon: CheckSquare, label: "To-Do", to: "/todo" },
    { icon: StickyNote, label: "Notes", to: "/notes" },
    { icon: GraduationCap, label: "Grades", to: "/grades" },
    { icon: Trophy, label: "Leaderboard", to: "/leaderboard" },
    { icon: ShoppingBag, label: "Shop", to: "/shop" },
  ];

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
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to;
          return (
            <Link 
              key={item.to} 
              to={item.to} 
              className={`nav-item ${isActive ? "active" : ""}`}
              title={isCollapsed ? item.label : ""}
            >
              <Icon size={22} />
              {!isCollapsed && <span className="nav-label">{item.label}</span>}
            </Link>
          );
        })}
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
