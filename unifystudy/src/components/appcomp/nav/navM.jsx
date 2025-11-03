import React from "react";
import "./styling/navm/navM.css";
const NavM = ({ isActive }) => {
  return (
    <div className="flex-container">
      <div id="navm" className={`${isActive ? "active" : ""}`}>
        <ul className="menu flex">
          <li>Home</li>
          <li>Pomodoro</li>
          <li>My Timetable</li>
          <li>To Do List</li>
        </ul>
      </div>
    </div>
  );
};

export default NavM;
