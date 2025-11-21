import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./Nav.scss";

export default function Nav({ user, isMobile, isOpen, onClose, onSignOut }) {
  const location = useLocation();
  const [scrollActive, setScrollActive] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const menu = [
    { label: "Home()", to: "/", index: "01." },
    { label: "Pomodoro()", to: "/pomodoro", index: "02." },
    { label: "Timetable()", to: "/timetable", index: "03." },
    { label: "ToDo()", to: "/todo", index: "04." },
  ];

  const handleClick = () => {
    if (isMobile && onClose) onClose();
  };

  // Scroll underline activation
  useEffect(() => {
    const onScroll = () => {
      setScrollActive(window.scrollY > 20);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
        UnifyStudy
      </div>

      {/* Desktop Menu */}
      <ul className={`nav-menu ${isMobile ? (isOpen ? "show" : "hide") : ""}`}>
        {menu.map((item) => (
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
      </ul>

      {/* Right User Area */}
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

      {/* Burger button for mobile */}
      {isMobile && (
        <button className={`burger ${isOpen ? "open" : ""}`} onClick={onClose}>
          <span></span>
          <span></span>
          <span></span>
        </button>
      )}

      {/* MOBILE BOTTOM QUICK BAR */}
      {isMobile && (
        <div className="mobile-quickbar">
          <Link to="/" onClick={handleClick}>
            Home
          </Link>
          <Link to="/pomodoro" onClick={handleClick}>
            Timer
          </Link>
          <Link to="/todo" onClick={handleClick}>
            Tasks
          </Link>
          <Link to="/timetable" onClick={handleClick}>
            Schedule
          </Link>
        </div>
      )}
    </nav>
  );
}
