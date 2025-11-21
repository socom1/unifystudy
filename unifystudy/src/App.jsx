import React, { useState, useEffect } from "react";
import { BrowserRouter as Router } from "react-router-dom";

import Nav from "./components/appcomp/nav/Nav"; // <-- NEW unified nav
import AppS from "./components/appcomp/appsl/AppS";
import "./App.css";

function App() {
  const [isActive, setIsActive] = useState(false);
  const [user, setUser] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Handle login
  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  // Handle sign out
  const handleSignOut = () => {
    setUser(null);
  };

  // Listen for window resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <Router>
      <div className="app">
        {/* Terminal Nav — works for BOTH desktop and mobile */}
        <Nav
          user={user}
          isMobile={isMobile}
          isOpen={isActive}
          onClose={() => setIsActive(!isActive)}
          onSignOut={handleSignOut}
        />

        <div className="container">
          {/* All page content */}
          <AppS
            user={user}
            onLoginSuccess={handleLoginSuccess}
            onSignOut={handleSignOut}
          />
        </div>
      </div>
    </Router>
  );
}

export default App;
