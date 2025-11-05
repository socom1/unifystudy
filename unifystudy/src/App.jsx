import React, { useState } from "react";
import NavM from "./components/appcomp/nav/navM";
import NavS from "./components/appcomp/nav/navS";
import AppS from "./components/appcomp/appsl/AppS";

import "./App.css";
import "./components/appcomp/nav/styling/navm/navm.css";

function App() {
  const [isActive, setIsActive] = useState(false);
  const [activeComponent, setActiveComponent] = useState("todo");

  // Show NavM only when toggled open
  const showNavM = isActive;

  // When a menu item is clicked, switch component and close NavM
  const handleSetActiveComponent = (component) => {
    setActiveComponent(component);
    setIsActive(false); // Close menu after selection
  };

  return (
    <div className="app">
      <NavM isActive={isActive} setActiveComponent={handleSetActiveComponent} />
      <div className="container">
        <div className="navf">
          <NavS
            onToggle={() => setIsActive(!isActive)}
            activeComponent={activeComponent}
          />
        </div>
        <AppS activeComponent={activeComponent} />
      </div>
    </div>
  );
}

export default App;
