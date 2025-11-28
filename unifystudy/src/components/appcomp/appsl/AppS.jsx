// src/AppS.jsx
// Force reload
import React, { useState, useEffect } from "react";
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
import UpdateNotification from "./update/UpdateNotification";
import NotificationManager from "./notifications/NotificationManager";
import StickyWall from "./stickyWall/StickyWall";
import Grades from "./grades/Grades";
import Leaderboard from "./leaderboard/Leaderboard";
import Shop from "./shop/Shop";
import MindMap from "./mindmap/MindMap";
import ResourceLibrary from "./resources/ResourceLibrary";
import FocusMode from "./focus/FocusMode";
import DailyStandup from "./standup/DailyStandup";
import OfflineIndicator from "./offline/OfflineIndicator";
import YearlyCalendar from "./calendar/YearlyCalendar";
import Workspace from "./collaboration/Workspace";
import StudyBuddy from "./social/StudyBuddy";
import Chat from "./chat/Chat";
import { TimerProvider } from "./pomodoro/TimerContext";
import TimerWidget from "./pomodoro/TimerWidget";

import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

const AppS = () => {
  const [user, setUser] = useState(null);
  const [focusModeActive, setFocusModeActive] = useState(false);
  const [showDailyStandup, setShowDailyStandup] = useState(true);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const handleFocusToggle = (e) => setFocusModeActive(e.detail);
    window.addEventListener('toggle-focus-mode', handleFocusToggle);
    return () => window.removeEventListener('toggle-focus-mode', handleFocusToggle);
  }, []);

  // Real Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        // User is signed in
        setUser(currentUser);
      } else {
        // User is signed out
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const onLoginSuccess = (userData) => {
    // Optional: State will update automatically via onAuthStateChanged
    // but we can set it here for immediate feedback if needed
    setUser(userData);
  };

  const onSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (loading) {
    return <div className="loading-screen" style={{ 
      height: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: '#121212',
      color: '#e0e0e0'
    }}>Loading UnifyStudy...</div>;
  }

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
                <Navigate to="/signup" replace />
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

          <Route
            path="/mindmap"
            element={
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.45, ease: "easeInOut" }}
                className="full-size"
              >
                <MindMap />
              </motion.div>
            }
          />

          <Route
            path="/resources"
            element={
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.45, ease: "easeInOut" }}
                className="full-size"
              >
                <ResourceLibrary />
              </motion.div>
            }
          />

          <Route
            path="/calendar"
            element={
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.45, ease: "easeInOut" }}
                className="full-size"
              >
                <YearlyCalendar />
              </motion.div>
            }
          />

          <Route
            path="/workspace"
            element={
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.45, ease: "easeInOut" }}
                className="full-size"
              >
                <Workspace user={user} />
              </motion.div>
            }
          />

          <Route
            path="/study-buddy"
            element={
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.45, ease: "easeInOut" }}
                className="full-size"
              >
                <StudyBuddy />
              </motion.div>
            }
          />

          <Route
            path="/chat"
            element={
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.45, ease: "easeInOut" }}
                className="full-size"
              >
                <Chat />
              </motion.div>
            }
          />

        </Routes>
      </AnimatePresence>
      {user && <TimerWidget />}
      {user && <NotificationManager user={user} />}
      {user && showDailyStandup && <DailyStandup user={user} onClose={() => setShowDailyStandup(false)} />}
      <OfflineIndicator />
      <AnimatePresence>
        {focusModeActive && <FocusMode isActive={focusModeActive} onClose={() => {
          setFocusModeActive(false);
          // Sync sidebar state if needed (optional, sidebar has local state)
        }} />}
      </AnimatePresence>
    </TimerProvider>
  );
};

export default AppS;
