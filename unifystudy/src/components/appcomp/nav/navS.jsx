import React, { useState } from "react";

import "./styling/navs/navs.css";
const NavS = ({ onToggle }) => {
  return (
    <div id="nav">
      <div className="flexcontainer flex">
        <div className="left">
          <div className="logo">ToDoList()</div>
        </div>
        <div className="right">
          <div className="menuToggle">
            <button className="toggle" onClick={onToggle}>
              <span className="l1"></span>
              <span className="l2"></span>
              <span className="l3"></span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NavS;
