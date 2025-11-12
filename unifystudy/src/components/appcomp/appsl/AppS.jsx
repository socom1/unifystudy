import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import TdlOVERALL from "./tdl/TdlOVERALL";
import Pomodoro from "./pomodoro/Pomdoro";
import SignUp from "./signUp/SignUp";
import MyTimetable from "./myTimetable/MyTimetable";
import Profile from "./profile/profile";

const AppS = ({ activeComponent, user, onLoginSuccess, onSignOut }) => {
  // Check if we’re switching between sign-in and profile
  const shouldAnimate =
    activeComponent === "signIn" || activeComponent === "profile";

  const renderComponent = () => {
    switch (activeComponent) {
      case "todo":
        return <TdlOVERALL />;
      case "pomodoro":
        return <Pomodoro />;
      case "timetable":
        return <MyTimetable user={user} />;
      case "signIn":
        return <SignUp onLoginSuccess={onLoginSuccess} />;
      case "profile":
        return <Profile user={user} onSignOut={onSignOut} />;
      default:
        return <div>Select a section from the menu</div>;
    }
  };

  return (
    <div className="containerAppS">
      {shouldAnimate ? (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeComponent}
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.98 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            style={{ width: "100%", height: "100%" }}
          >
            {renderComponent()}
          </motion.div>
        </AnimatePresence>
      ) : (
        // No animation for other components
        <div style={{ width: "100%", height: "100%" }}>{renderComponent()}</div>
      )}
    </div>
  );
};

export default AppS;
