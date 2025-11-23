// src/AppS.jsx
// Force reload
import React from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

import LandingPage from "./index/LandingPage";
import Dashboard from "./dashboard/Dashboard";
import SignUp from "./signUp/SignUp";
import Profile from "./profile/Profile";
import ResetPassword from "./passwordreset/ResetPassword";
import TdlOVERALL from "./tdl/TdlOVERALL";
import Pomodoro from "./pomodoro/Pomdoro";
import MyTimetable from "./myTimetable/MyTimetable";
import GlobalPlayer from "./global/GlobalPlayer";
import StickyWall from "./stickyWall/StickyWall";
import Grades from "./grades/Grades";
import Leaderboard from "./leaderboard/Leaderboard";
import Shop from "./shop/Shop";
import { TimerProvider } from "./pomodoro/TimerContext";
import TimerWidget from "./pomodoro/TimerWidget";

const AppS = ({ user, onLoginSuccess, onSignOut }) => {
  const location = useLocation();

  return (
    <TimerProvider>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              user ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.45, ease: "easeInOut" }}
                  className="full-size"
                >
                  <LandingPage />
                </motion.div>
              )
            }
          />

          <Route
            path="/dashboard"
            element={
              user ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.45, ease: "easeInOut" }}
                  className="full-size"
                >
                  <Dashboard user={user} />
                </motion.div>
              ) : (
                <Navigate to="/" replace />
              )
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

          <Route
            path="/notes"
            element={
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.45, ease: "easeInOut" }}
                className="full-size"
              >
                <StickyWall />
              </motion.div>
            }
          />

          <Route
            path="/grades"
            element={
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.45, ease: "easeInOut" }}
                className="full-size"
              >
                <Grades />
              </motion.div>
            }
          />

          <Route
            path="/leaderboard"
            element={
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.45, ease: "easeInOut" }}
                className="full-size"
              >
                <Leaderboard />
              </motion.div>
            }
          />

          <Route
            path="/shop"
            element={
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.45, ease: "easeInOut" }}
                className="full-size"
              >
                <Shop />
              </motion.div>
            }
          />
        </Routes>
      </AnimatePresence>
      {user && <GlobalPlayer />}
      {user && <TimerWidget />}
    </TimerProvider>
  );
};

export default AppS;
