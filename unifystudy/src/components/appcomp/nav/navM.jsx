import React from "react";
import "./styling/navm/navM.css";

const NavM = ({ isActive, setActiveComponent }) => {
  return (
    <div className="flex-container">
      <div id="navm" className={`${isActive ? "active" : ""}`}>
        <ul className="menu flex">
          <li onClick={() => setActiveComponent("home")}>
            <span style={{ color: "#4b6c82" }}>01.</span> Home
          </li>
          <li onClick={() => setActiveComponent("signIn")}>
            <span style={{ color: "#4b6c82" }}>02.</span> Sign In
          </li>
          <li onClick={() => setActiveComponent("pomodoro")}>
            <span style={{ color: "#4b6c82" }}>03.</span> Pomodoro
          </li>
          <li onClick={() => setActiveComponent("timetable")}>
            <span style={{ color: "#4b6c82" }}>04.</span> My Timetable
          </li>
          <li onClick={() => setActiveComponent("todo")}>
            <span style={{ color: "#4b6c82" }}>05.</span> To Do List
          </li>
        </ul>
      </div>
    </div>
  );
};

export default NavM;
