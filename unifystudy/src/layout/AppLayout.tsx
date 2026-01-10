import React, { useState, useEffect, Suspense } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

import InvitationModal from "@/features/collaboration/InvitationModal";

const Dashboard = React.lazy(() => import("@/features/dashboard/Dashboard"));
const SignUp = React.lazy(() => import("@/features/auth/signUp/SignUp"));
const DesktopAuth = React.lazy(() => import("@/features/auth/DesktopAuth"));
const Profile = React.lazy(() => import("@/features/profile/profile"));
const ResetPassword = React.lazy(() => import("@/features/auth/passwordreset/ResetPassword"));
const TdlOVERALL = React.lazy(() => import("@/features/todo/tdlF"));
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
const SettingsPage = React.lazy(() => import("@/features/settings/SettingsPage"));

const FocusMode = React.lazy(() => import("@/features/focus/FocusMode"));
const DailyStandup = React.lazy(() => import("@/features/standup/DailyStandup"));
const OfflineIndicator = React.lazy(() => import("@/components/offline/OfflineIndicator"));
const UpdateNotification = React.lazy(() => import("@/features/update/UpdateNotification"));
import { TimerProvider } from "@/features/pomodoro/TimerContext";
import TimerWidget from "@/features/pomodoro/TimerWidget";
import CommandPalette from "@/components/navigation/CommandPalette";
import Sidebar from "@/layout/Sidebar";
import AuthWrapper from "@/features/auth/signUp/AuthWrapper";
import PageLoader from "@/components/ui/PageLoader";
import NotificationManager from "@/features/notifications/NotificationManager";
import PatchNotesModal from "@/components/PatchNotesModal/PatchNotesModal";
import { getLatestReleaseNote } from "@/data/releaseNotes";
import UserProfileModal from "@/features/profile/UserProfileModal";

import { auth, db } from "@/services/firebaseConfig";

import { ref, onValue } from "firebase/database";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";

const AppLayout = () => {
  const { user, loading, setUser } = useAuth();
  
  const {
    isNavCollapsed,
    setIsNavCollapsed, // Use setter from context
    focusModeActive,
    setFocusModeActive,
    showCommandPalette,
    setShowCommandPalette,
    showMusicPlayer
  } = useUI();

  const location = useLocation();

  const [showStandup, setShowStandup] = useState(true);
  const [showPatchNotes, setShowPatchNotes] = useState(false);
  const [iconSet, setIconSet] = useState("default"); // Local state for Icon Set
  const latestRelease = getLatestReleaseNote();

  useEffect(() => {
    // Check for version update
    const storedVersion = localStorage.getItem('app_version');
    if (storedVersion !== latestRelease.version) {
       setShowPatchNotes(true);
    }
  }, []);

  const handleClosePatchNotes = () => {
    localStorage.setItem('app_version', latestRelease.version);
    setShowPatchNotes(false);
  };

  // Theme & Icon Set Persistence
  useEffect(() => {
    if (user) {
      // Theme
      const themeRef = ref(db, `users/${user.uid}/settings/customization/theme`);
      const unsubTheme = onValue(themeRef, (snapshot) => {
        const theme = snapshot.val();
        if (theme) {
          document.documentElement.setAttribute('data-theme', theme);
        }
      });

      // Icon Set
      const iconRef = ref(db, `users/${user.uid}/settings/iconSet`);
      const unsubIcon = onValue(iconRef, (snapshot) => {
        const iconSetVal = snapshot.val();
        if (iconSetVal) {
           document.documentElement.setAttribute('data-icon-set', iconSetVal);
           setIconSet(iconSetVal);
        }
      });

      return () => {
        unsubTheme();
        unsubIcon();
      };
    }
  }, [user]);

  // Keyboard Shortcut for Command Palette
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
    return <PageLoader message="Initializing UnifyStudy..." />;
  }

  // Auth Routes Wrapper
  if (!user) {
    return (
      <div className="app-layout">
        <Routes>
          <Route path="/signup" element={<SignUp onLoginSuccess={setUser} />} />
          <Route path="/login" element={<SignUp onLoginSuccess={setUser} />} />
          <Route path="/desktop-auth" element={<DesktopAuth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<AuthWrapper onSuccess={setUser} />} />
        </Routes>
      </div>
    );
  }

  return (
    <TimerProvider>
      <div className="app-layout">
        <InvitationModal />
        
        {/* Use Context State for Sidebar */}
        <Sidebar />

        <div className={`main-content ${isNavCollapsed ? 'collapsed' : ''}`}>
          <AnimatePresence mode="wait">
            <Suspense fallback={<PageLoader message="Loading content..." />}>
              <Routes location={location} key={location.pathname}>

                <Route path="/" element={<Navigate to="/dashboard" replace />} />

                <Route path="/dashboard" element={
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.45 }} className="full-size scrollable">
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
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.45 }} className="full-size scrollable">
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
                    <StudyBuddy />
                  </motion.div>
                } />

                <Route path="/resources" element={
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.45 }} className="full-size">
                    <ResourceLibrary user={user} />
                  </motion.div>
                } />

                <Route path="/settings" element={
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.45 }} className="full-size scrollable">
                    <SettingsPage />
                  </motion.div>
                } />

                {/* Catch all for authenticated users */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />

              </Routes>
            </Suspense>
          </AnimatePresence>

          <TimerWidget />
          {user && <NotificationManager user={user} />}

          <Suspense fallback={null}>
            {user && showStandup && <DailyStandup user={user} onClose={() => setShowStandup(false)} />}
            <OfflineIndicator />
            {user && showMusicPlayer && <GlobalPlayer />}
            <UpdateNotification />
          </Suspense>
          
          <PatchNotesModal 
            isOpen={showPatchNotes} 
            onClose={handleClosePatchNotes} 
            releaseNote={latestRelease} 
          />

          <AnimatePresence>
            {focusModeActive && (
              <Suspense fallback={<div className="focus-loader" />}>
                <FocusMode
                  key="focus-mode-overlay"
                  isActive={true}
                  onClose={() => setFocusModeActive(false)}
                />
              </Suspense>
            )}
          </AnimatePresence>

          <CommandPalette isOpen={showCommandPalette} onClose={() => setShowCommandPalette(false)} user={user} />
          <UserProfileModal />
        </div>
      </div>
    </TimerProvider>
  );
};

export default AppLayout;
