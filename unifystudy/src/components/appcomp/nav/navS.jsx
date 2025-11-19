import React from "react";
import "./styling/navs/navs.css";

const NavS = ({
  onToggle,
  activeComponent,
  isMobile,
  setActiveComponent,
  user,
}) => {
  const titles = {
    home: "Home",
    signIn: "Sign In",
    pomodoro: "Pomodoro",
    timetable: "MyTimetable",
    todo: "ToDoList",
  };

  const currentTitle = titles[activeComponent] || "ToDoList";

  return (
    <div id="nav">
      <div className="flexcontainer flex">
        <div className="left">
          <div className="logo">
            {currentTitle}
            <span style={{ color: "#afd4ed" }}>()</span>
          </div>
        </div>

        <div className="right">
          {isMobile ? (
            // Mobile toggle menu
            <div className="menuToggle">
              <button className="toggle" onClick={onToggle}>
                <span className="l1"></span>
                <span className="l2"></span>
                <span className="l3"></span>
              </button>
            </div>
          ) : (
            // Desktop full menu
            <ul className="desktopMenu">
              <li
                onClick={() => setActiveComponent(user ? "profile" : "signIn")}
              >
                {user ? user.displayName || user.email : "Sign In"}
              </li>
              <li onClick={() => setActiveComponent("home")}>Home</li>
              <li onClick={() => setActiveComponent("pomodoro")}>Pomodoro</li>
              <li onClick={() => setActiveComponent("timetable")}>
                My Timetable
              </li>
              <li onClick={() => setActiveComponent("todo")}>To Do List</li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default NavS;
