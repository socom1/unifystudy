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
import Flashcards from "./flashcards/Flashcards";
import Analytics from "./analytics/Analytics";
import HabitTracker from "./habits/HabitTracker";
import { TimerProvider } from "./pomodoro/TimerContext";
import TimerWidget from "./pomodoro/TimerWidget";
import CommandPalette from "./navigation/CommandPalette";
import Settings from "./settings/Settings";
import Sidebar from "../nav/Sidebar";
import AuthWrapper from "./signUp/AuthWrapper"; 

import { auth, db } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { ref, onValue } from "firebase/database";

const AppS = () => {
  const [user, setUser] = useState(null);
  const [focusModeActive, setFocusModeActive] = useState(false);
  const [showDailyStandup, setShowDailyStandup] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  
  const location = useLocation();
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);



  useEffect(() => {
    const handleKeyDown = (e) => {
       if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
           e.preventDefault();
           setShowCommandPalette(prev => !prev);
       }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Theme Persistence
  useEffect(() => {
    if (user) {
      const themeRef = ref(db, `users/${user.uid}/settings/customization/theme`);
      const unsub = onValue(themeRef, (snapshot) => {
        const theme = snapshot.val();
        if (theme) {
          document.documentElement.setAttribute('data-theme', theme);
        }
      });
      return () => unsub();
    }
  }, [user]);

  const onLoginSuccess = (userData) => {
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

  const handleFocusToggle = (e) => {
     if(e && e.stopPropagation) e.stopPropagation();
     setFocusModeActive(!focusModeActive);
  };

  // Keyboard Shortcut for Command Palette
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check for Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading) {
    return <div className="loading-screen" style={{height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#121212', color:'#e0e0e0'}}>Loading UnifyStudy...</div>;
  }

  // Auth Routes Wrapper
  if (!user) {
      return (
          <div className="app-layout">
              <Routes>
                  <Route path="/signup" element={<SignUp onLoginSuccess={onLoginSuccess} />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="*" element={<AuthWrapper onSuccess={onLoginSuccess} />} />
              </Routes>
          </div>
      );
  }

  return (
    <TimerProvider>
      <div className="app-layout">
        <Sidebar
          user={user}
          onSignOut={onSignOut}
          isCollapsed={isNavCollapsed}
          setIsCollapsed={setIsNavCollapsed}
          isMobile={isMobile}
          onFocusToggle={handleFocusToggle}
          isFocusMode={focusModeActive}
        />

        <div className="main-content">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              
              <Route path="/" element={ <Navigate to="/dashboard" replace /> } />
              
              <Route path="/dashboard" element={
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.45 }} className="full-size">
                  <Dashboard user={user} />
                </motion.div>
              } />

              <Route path="/pomodoro" element={
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.45 }} className="full-size">
                  <Pomodoro />
                </motion.div>
              } />

              <Route path="/todo" element={
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.45 }} className="full-size">
                  <TdlOVERALL />
                </motion.div>
              } />

              <Route path="/mindmap" element={
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.45 }} className="full-size">
                  <MindMap />
                </motion.div>
              } />

              <Route path="/timetable" element={
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.45 }} className="full-size">
                  <MyTimetable user={user} />
                </motion.div>
              } />

               {/* Legacy Calendar Route */}
               <Route path="/calendar" element={
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.45 }} className="full-size">
                  <YearlyCalendar />
                </motion.div>
              } />

              <Route path="/grades" element={
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.45 }} className="full-size">
                  <Grades />
                </motion.div>
              } />

              <Route path="/leaderboard" element={
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.45 }} className="full-size">
                  <Leaderboard />
                </motion.div>
              } />

              <Route path="/shop" element={
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.45 }} className="full-size">
                  <Shop />
                </motion.div>
              } />

              <Route path="/workspace" element={
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.45 }} className="full-size">
                  <Workspace user={user} />
                </motion.div>
              } />

              <Route path="/profile" element={
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.45 }} className="full-size">
                  <Profile />
                </motion.div>
              } />

              <Route path="/chat" element={
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.45 }} className="full-size">
                  <Chat />
                </motion.div>
              } />

              <Route path="/flashcards" element={
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.45 }} className="full-size">
                  <Flashcards />
                </motion.div>
              } />

              <Route path="/analytics" element={
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.45 }} className="full-size">
                  <Analytics />
                </motion.div>
              } />

              <Route path="/habits" element={
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.45 }} className="full-size">
                  <HabitTracker />
                </motion.div>
              } />

              <Route path="/notes" element={
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.45 }} className="full-size">
                  <StickyWall />
                </motion.div>
              } />

              <Route path="/buddy" element={
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.45 }} className="full-size">
                  <StudyBuddy user={user} />
                </motion.div>
              } />

              <Route path="/resources" element={
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.45 }} className="full-size">
                  <ResourceLibrary user={user} />
                </motion.div>
              } />

              <Route path="/settings" element={<Navigate to="/profile" replace />} />

              {/* Catch all for authenticated users */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />

            </Routes>
          </AnimatePresence>
          
          <TimerWidget />
          {user && <NotificationManager user={user} />}
          {user && showDailyStandup && <DailyStandup user={user} onClose={() => setShowDailyStandup(false)} />}
          <OfflineIndicator />
          
          <AnimatePresence>
            {focusModeActive && (
              <FocusMode 
                 key="focus-mode-overlay"
                 isActive={true} 
                 onClose={() => setFocusModeActive(false)} 
              />
            )}
          </AnimatePresence>
          
          <CommandPalette isOpen={showCommandPalette} onClose={() => setShowCommandPalette(false)} user={user} />
        </div>
      </div>
    </TimerProvider>
  );
};

export default AppS;
