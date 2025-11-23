import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./Nav.scss";

export default function Nav({ user, isMobile, isOpen, onClose, onSignOut }) {
  const location = useLocation();
  const [scrollActive, setScrollActive] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isNarrow, setIsNarrow] = useState(window.innerWidth < 1200);

  // All menu items
  const allMenuItems = [
    { label: "Dashboard()", to: "/dashboard", index: "01." },
    { label: "Pomodoro()", to: "/pomodoro", index: "02." },
    { label: "Timetable()", to: "/timetable", index: "03." },
    { label: "ToDo()", to: "/todo", index: "04." },
    { label: "StickyWall()", to: "/notes", index: "05." },
    { label: "Grades()", to: "/grades", index: "06." },
    { label: "Leaderboard()", to: "/leaderboard", index: "07." },
    { label: "Shop()", to: "/shop", index: "08." },
  ];

  // Responsive menu split
  const primaryMenu = isNarrow 
    ? allMenuItems.slice(0, 2)  // On narrow: Dashboard, Pomodoro
    : allMenuItems.slice(0, 4); // On wide: Dashboard, Pomodoro, Timetable, ToDo

  const moreMenu = isNarrow
    ? allMenuItems.slice(2)     // On narrow: everything else
    : allMenuItems.slice(4);    // On wide: StickyWall, Grades, Leaderboard, Shop

  const handleClick = () => {
    if (isMobile && onClose) onClose();
    setShowMoreMenu(false);
  };

  // Scroll underline activation
  useEffect(() => {
    const onScroll = () => {
      setScrollActive(window.scrollY > 20);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Responsive nav listener
  useEffect(() => {
    const handleResize = () => {
      setIsNarrow(window.innerWidth < 1200);
    };
    
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMoreMenuActive = moreMenu.some(item => location.pathname === item.to);

  return (
    <nav
      className={`nav-root ${
        location.pathname === "/" ? "route-home" : "route-default"
      } ${isMobile ? "mobile" : "desktop"} ${
        scrollActive ? "scroll-active" : ""
      }`}
    >
      {/* Terminal Title */}
      <div className="nav-title">
        <span className="nav-title-symbol">&gt;_</span>
        <span className="cursor-blink"></span>
        {isMobile ? "UnifyS" : "UnifyStudy"}
      </div>

      {/* Right side: Menu + Profile grouped together */}
      <div className="nav-right-group">
        {/* Desktop Menu */}
        <ul className={`nav-menu ${isMobile ? (isOpen ? "show" : "hide") : ""}`}>
          {primaryMenu.map((item) => (
            <li
              key={item.to}
              className={`nav-item ${
                location.pathname === item.to ? "active" : ""
              }`}
            >
              <Link to={item.to} onClick={handleClick}>
                <span className="nav-index">{item.index}</span>
                {item.label}
              </Link>
            </li>
          ))}
          
          {/* More Menu */}
          <li className={`nav-item more-menu ${isMoreMenuActive ? "active" : ""}`}>
            <button 
              className="more-toggle"
              onClick={() => setShowMoreMenu(!showMoreMenu)}
            >
              <span className="nav-index">+</span>
              More()
            </button>
            
            {showMoreMenu && (
              <ul className="more-dropdown">
                {moreMenu.map((item) => (
                  <li key={item.to}>
                    <Link 
                      to={item.to} 
                      onClick={handleClick}
                      className={location.pathname === item.to ? "active" : ""}
                    >
                      <span className="nav-index">{item.index}</span>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        </ul>

        {/* User Area */}
        <div className="nav-user">
          {user ? (
            <div className="user-wrapper">
              <span
                className="user-badge"
                onClick={() => setShowDropdown((prev) => !prev)}
              >
                {user.displayName || user.email}
              </span>

              {showDropdown && (
                <div className="user-dropdown">
                  <Link to="/profile" onClick={() => setShowDropdown(false)}>
                    Profile
                  </Link>
                  <button onClick={onSignOut}>Sign Out</button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/signup" className="user-badge">
              Guest
            </Link>
          )}
        </div>
      </div>

      {/* Burger button for mobile */}
      {isMobile && (
        <button className={`burger ${isOpen ? "open" : ""}`} onClick={onClose}>
          {isOpen ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          ) : (
            <>
              <span></span>
              <span></span>
              <span></span>
            </>
          )}
        </button>
      )}
    </nav>
  );
}
