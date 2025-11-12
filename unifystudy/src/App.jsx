import React, { useState } from "react";
import NavM from "./components/appcomp/nav/NavM";
import NavS from "./components/appcomp/nav/NavS";
import AppS from "./components/appcomp/appsl/appS";
import "./App.css";
// import "./components/appcomp/nav/styling/navm/navm.css";

function App() {
  const [isActive, setIsActive] = useState(false);
  const [activeComponent, setActiveComponent] = useState("signIn");
  const [user, setUser] = useState(null);

  // Handle navigation
  const handleSetActiveComponent = (component) => {
    setActiveComponent(component);
    setIsActive(false);
  };

  // Called when user logs in or signs up successfully
  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setActiveComponent("profile"); // redirect to profile
  };

  return (
    <div className="app">
      <NavM
        isActive={isActive}
        setActiveComponent={handleSetActiveComponent}
        user={user} // pass user to NavM so it shows name
      />

      <div className="container">
        <div className="navf">
          <NavS
            onToggle={() => setIsActive(!isActive)}
            activeComponent={activeComponent}
          />
        </div>

        <AppS
          activeComponent={activeComponent}
          user={user}
          onLoginSuccess={(user) => {
            setUser(user);
            setActiveComponent("profile");
          }}
          onSignOut={() => {
            setUser(null);
            setActiveComponent("signIn");
          }}
        />
      </div>
    </div>
  );
}

export default App;
