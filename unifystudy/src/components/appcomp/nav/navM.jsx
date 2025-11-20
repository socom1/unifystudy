import React from "react";
import { Link, useLocation } from "react-router-dom";
import "./styling/navm/navM.css";

const NavM = ({ isActive, user, isMobile }) => {
  const location = useLocation();

  const menuItems = [
    {
      label: user ? user.displayName || user.email : "Sign In",
      to: user ? "/profile" : "/signup",
      number: "01.",
    },
    { label: "Home", to: "/", number: "02." },
    { label: "Pomodoro", to: "/pomodoro", number: "03." },
    { label: "My Timetable", to: "/timetable", number: "04." },
    { label: "To Do List", to: "/todo", number: "05." },
  ];

  return (
    <div className="flex-container">
      <div id="navm" className={`${isMobile && isActive ? "active" : ""}`}>
        <ul className={`menu flex ${!isMobile ? "desktop-menu" : ""}`}>
          {menuItems.map((item, index) => (
            <li
              key={index}
              className={location.pathname === item.to ? "active" : ""}
            >
              <Link
                to={item.to}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <span style={{ color: "#4b6c82" }}>{item.number}</span>{" "}
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default NavM;
