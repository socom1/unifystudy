import React, { useState, useEffect } from "react";
import NavM from "./components/appcomp/nav/NavM";
import NavS from "./components/appcomp/nav/NavS";
import AppS from "./components/appcomp/appsl/AppS";
import "./App.css";

function App() {
  const [isActive, setIsActive] = useState(false);
  const [activeComponent, setActiveComponent] = useState("signIn");
  const [user, setUser] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Handle navigation
  const handleSetActiveComponent = (component) => {
    setActiveComponent(component);
    setIsActive(false); // close mobile menu if open
  };

  // Handle login
  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setActiveComponent("profile");
  };

  // Listen for window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="app">
      <NavM
        isActive={isActive}
        setActiveComponent={handleSetActiveComponent}
        user={user}
        isMobile={isMobile}
      />

      <div className="container">
        <div className="navf">
          <NavS
            onToggle={() => setIsActive(!isActive)}
            activeComponent={activeComponent}
            isMobile={isMobile}
            setActiveComponent={handleSetActiveComponent}
            user={user}
          />
        </div>

        <AppS
          activeComponent={activeComponent}
          user={user}
          onLoginSuccess={handleLoginSuccess}
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
