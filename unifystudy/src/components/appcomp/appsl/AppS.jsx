// src/AppS.jsx
import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

import LandingPage from "./index/LandingPage";
import SignUp from "./signUp/SignUp";
import Profile from "./profile/Profile";
import ResetPassword from "./passwordreset/ResetPassword";
import TdlOVERALL from "./tdl/TdlOVERALL";
import Pomodoro from "./pomodoro/Pomdoro";
import MyTimetable from "./myTimetable/MyTimetable";

const AppS = ({ user, onLoginSuccess, onSignOut }) => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.45, ease: "easeInOut" }}
              className="full-size"
            >
              <LandingPage />
            </motion.div>
          }
        />

        <Route
          path="/signup"
          element={
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.45, ease: "easeInOut" }}
              className="full-size"
            >
              <SignUp onLoginSuccess={onLoginSuccess} />
            </motion.div>
          }
        />

        <Route
          path="/profile"
          element={
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.45, ease: "easeInOut" }}
              className="full-size"
            >
              <Profile user={user} onSignOut={onSignOut} />
            </motion.div>
          }
        />

        <Route
          path="/reset-password"
          element={
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.45, ease: "easeInOut" }}
              className="full-size"
            >
              <ResetPassword />
            </motion.div>
          }
        />

        <Route
          path="/todo"
          element={
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.45, ease: "easeInOut" }}
              className="full-size"
            >
              <TdlOVERALL />
            </motion.div>
          }
        />

        <Route
          path="/pomodoro"
          element={
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.45, ease: "easeInOut" }}
              className="full-size"
            >
              <Pomodoro />
            </motion.div>
          }
        />

        <Route
          path="/timetable"
          element={
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.45, ease: "easeInOut" }}
              className="full-size"
            >
              <MyTimetable user={user} />
            </motion.div>
          }
        />
      </Routes>
    </AnimatePresence>
  );
};

export default AppS;
