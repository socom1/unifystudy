// import { useState } from "react";
import React, { useState } from "react";
import NavM from "./components/appcomp/nav/navM";
import NavS from "./components/appcomp/nav/navS";
import AppS from "./components/appcomp/appsl/AppS";
import "./App.css";
// import "./components/jsfiles/app";
// import "./components/jsfiles/tdl";

function App() {
  const [isActive, setIsActive] = React.useState(false);
  return (
    <div className="app">
      <NavM isActive={isActive} />
      <div className="container">
        <div className="navf">
          <NavS onToggle={() => setIsActive(!isActive)} />
        </div>
        <AppS />
      </div>
    </div>
  );
}

export default App;
