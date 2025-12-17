import React, { useState, useEffect, Suspense } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { User } from "@/types";

const LandingPage = React.lazy(() => import("@/features/landing/LandingPage"));
const Dashboard = React.lazy(() => import("@/features/dashboard/Dashboard"));
const SignUp = React.lazy(() => import("@/features/auth/signUp/SignUp"));
const Profile = React.lazy(() => import("@/features/profile/profile"));
const ResetPassword = React.lazy(() => import("@/features/auth/passwordreset/ResetPassword"));
const TdlOVERALL = React.lazy(() => import("@/features/todo/TdlOVERALL"));
const Pomodoro = React.lazy(() => import("@/features/pomodoro/Pomdoro"));
const MyTimetable = React.lazy(() => import("@/features/calendar/MyTimetable"));
const GlobalPlayer = React.lazy(() => import("@/components/global/GlobalPlayer"));
const StickyWall = React.lazy(() => import("@/features/notes/StickyWall"));
const Grades = React.lazy(() => import("@/features/grades/Grades"));
const Leaderboard = React.lazy(() => import("@/features/leaderboard/Leaderboard"));
const Shop = React.lazy(() => import("@/features/shop/Shop"));
const MindMap = React.lazy(() => import("@/features/mindmap/MindMap"));
const ResourceLibrary = React.lazy(() => import("@/features/resources/ResourceLibrary"));
const YearlyCalendar = React.lazy(() => import("@/features/calendar/YearlyCalendar"));
const Workspace = React.lazy(() => import("@/features/collaboration/Workspace"));
const StudyBuddy = React.lazy(() => import("@/features/social/StudyBuddy"));
const Chat = React.lazy(() => import("@/features/chat/Chat"));
const Flashcards = React.lazy(() => import("@/features/flashcards/Flashcards"));
const Analytics = React.lazy(() => import("@/features/analytics/Analytics"));
const HabitTracker = React.lazy(() => import("@/features/habits/HabitTracker"));
const NotificationManager = React.lazy(() => import("@/features/notifications/NotificationManager"));
const FocusMode = React.lazy(() => import("@/features/focus/FocusMode"));
const DailyStandup = React.lazy(() => import("@/features/standup/DailyStandup"));
const OfflineIndicator = React.lazy(() => import("@/components/offline/OfflineIndicator"));
const UpdateNotification = React.lazy(() => import("@/features/update/UpdateNotification"));
import { TimerProvider } from "@/features/pomodoro/TimerContext";
import TimerWidget from "@/features/pomodoro/TimerWidget";
import CommandPalette from "@/components/navigation/CommandPalette";
import Settings from "@/features/settings/Settings";
import Sidebar from "@/layout/Sidebar";
import AuthWrapper from "@/features/auth/signUp/AuthWrapper"; 

import { auth, db } from "@/services/firebaseConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { ref, onValue } from "firebase/database";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";

const AppLayout = () => {
  const { user, loading, setUser, signOut } = useAuth();
  
  const { 
    isNavCollapsed,
    isMobile,
    focusModeActive,
    setFocusModeActive,
    showCommandPalette,
    setShowCommandPalette
  } = useUI();
  
  const location = useLocation();

  const [showStandup, setShowStandup] = useState(true);

  // Theme Persistence
  // Keep this here or move to a separate ThemeContext/Provider later
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
  
  // Keyboard Shortcut for Command Palette
  // Moved logic to consume context
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
       if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
           e.preventDefault();
           setShowCommandPalette(!showCommandPalette);
       }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCommandPalette, setShowCommandPalette]);

  if (loading) {
    return <div className="loading-screen" style={{height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#121212', color:'#e0e0e0'}}>Loading UnifyStudy...</div>;
  }

  // Auth Routes Wrapper
  if (!user) {
      return (
          <div className="app-layout">
              <Routes>
                  <Route path="/signup" element={<SignUp onLoginSuccess={setUser} />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="*" element={<AuthWrapper onSuccess={setUser} />} />
              </Routes>
          </div>
      );
  }

  return (
    <TimerProvider>
      <div className="app-layout">
        <Sidebar />

        <div className={`main-content ${isNavCollapsed ? 'collapsed' : ''}`}>
          <AnimatePresence mode="wait">
            <Suspense fallback={<div className="loading-screen" style={{height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#121212', color:'#e0e0e0'}}>Loading...</div>}>
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
            </Suspense>
          </AnimatePresence>
          
          <TimerWidget />
          {user && <NotificationManager user={user} />}

          {/* Daily Standup Local State replacement - keeping simple for now or move to UI Context if needed */}
          {user && showStandup && <DailyStandup user={user} onClose={() => setShowStandup(false)} />} 
          <OfflineIndicator />
          {user && <GlobalPlayer />}
          <UpdateNotification />
          
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

export default AppLayout;
