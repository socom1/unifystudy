// src/navS.jsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
import "./styling/navs/navs.scss"; // This path is from your file

// The 'isMobile' prop is no longer needed
const NavS = ({ onToggle, user }) => {
  const location = useLocation();

  const titles = {
    "/": "Home",
    "/signup": "SignIn",
    "/pomodoro": "Pomodoro",
    "/timetable": "MyTimetable",
    "/todo": "ToDoList",
    "/profile": "Profile",
    "/reset-password": "Reset",
  };

  const currentTitle = titles[location.pathname] || "ToDoList";

  return (
    <div id="nav">
      <div className="flexcontainer flex">
        <div className="left">
          <div className="logo">
            {currentTitle}
            {/* This span was hardcoded, you could use var(--accent2) if you prefer */}
            <span style={{ color: "#afd4ed" }}>()</span>
          </div>
        </div>

        <div className="right">
          {/* Both menus are rendered. 
            CSS will now control which one is visible.
          */}

          {/* Mobile toggle menu */}
          <div className="menuToggle">
            <button className="toggle" onClick={onToggle}>
              <span className="l1"></span>
              <span className="l2"></span>
              <span className="l3"></span>
            </button>
          </div>

          {/* Desktop full menu */}
          <ul className="desktopMenu">
            <li>
              <Link
                to={user ? "/profile" : "/"}
                style={{ textDecoration: "none" }}
              >
                {user ? user.displayName || user.email : "Sign In"}
              </Link>
            </li>
            <li>
              <Link to="/" style={{ textDecoration: "none" }}>
                Home
              </Link>
            </li>
            <li>
              <Link to="/pomodoro" style={{ textDecoration: "none" }}>
                Pomodoro
              </Link>
            </li>
            <li>
              <Link to="/timetable" style={{ textDecoration: "none" }}>
                My Timetable
              </Link>
            </li>
            <li>
              <Link to="/todo" style={{ textDecoration: "none" }}>
                To Do List
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default NavS;
