// @ts-nocheck
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/services/firebaseConfig";
import { ref, onValue, push, set } from "firebase/database";
import {
  getAchievementById,
  ACHIEVEMENTS,
} from "@/utils/achievements";
import { toast } from "sonner";
import { useGamification } from "@/context/GamificationContext";
import DailyQuests from "./components/DailyQuests";
import { 
  Lightbulb, 
  GraduationCap, 
  Star, 
  Flame, 
  Calendar, 
  CheckCircle2, 
  Quote, 
  Trophy,
  Zap,
  Clock,
  ArrowRight,
  BookOpen,
  Award,
  Medal,
  Target,
  Sparkles,
  ZapOff,
  AlertCircle
} from "lucide-react";
import "./Dashboard.scss";

const ACHIEVEMENT_ICONS = {
  "first-steps": <BookOpen size={20} color="var(--color-primary)" />,
  "getting-started": <Clock size={20} color="var(--color-primary)" />,
  "dedicated-learner": <BookOpen size={20} color="var(--color-primary)" />,
  "scholar": <GraduationCap size={20} color="var(--color-primary)" />,
  "master-student": <Trophy size={20} color="var(--color-primary)" />,
  "on-fire": <Flame size={20} color="#ff6b35" />,
  "unstoppable": <Zap size={20} color="#ffbe0b" />,
  "diamond-streak": <Sparkles size={20} color="#00d2d3" />,
  "focused": <Target size={20} color="#ff9f43" />,
  "iron-will": <Award size={20} color="#54a0ff" />,
  "legendary": <Medal size={20} color="#e58e26" />
};

const STUDY_TIPS = [
  "Take a 5-minute break every 25 minutes to stay focused.",
  "Teach what you've learned to someone else to reinforce understanding.",
  "Use active recall: test yourself instead of just re-reading.",
  "Sleep is crucial for memory consolidation. Get 7-9 hours.",
  "Break big tasks into small, manageable chunks.",
  "Stay hydrated! Your brain needs water to function well.",
  "Eliminate distractions. Put your phone in another room.",
  "Use mnemonics to remember complex lists or concepts.",
  "Vary your study locations to improve retention.",
  "Review your notes within 24 hours of taking them.",
  "Listen to instrumental music to help focus.",
  "Set a specific goal for each study session.",
  "Use color coding for different subjects to stay organized.",
  "Review your most difficult subjects first while your brain is fresh.",
  "Drink a glass of water before starting your study session.",
  "Use a physical planner to track your deadlines.",
  "Try the Feynman Technique: explain a concept in simple terms.",
  "Keep your workspace clean and decluttered.",
  "Reward yourself after finishing a major task.",
  "Don't multitask; focus on one subject at a time.",
  "Use noise-canceling headphones if you're in a loud environment.",
  "Join a study group for complex subjects.",
  "Take deep breaths if you start feeling overwhelmed.",
  "Ensure you have good lighting to avoid eye strain.",
  "Review your goals every morning.",
  "Use digital tools like flashcards for memorization.",
  "Stay consistent; even 15 minutes of study is better than none.",
  "Focus on understanding, not just memorizing.",
  "Draft an outline before you start writing an essay.",
  "Keep a healthy snack nearby to fuel your brain.",
  "Disable notifications on all your devices.",
  "Summarize each chapter in your own words."
];

const MOTIVATIONAL_QUOTES = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "Don’t stop when you’re tired. Stop when you’re done.", author: "Unknown" },
  { text: "Wake up with determination. Go to bed with satisfaction.", author: "Unknown" },
  { text: "Do something today that your future self will thank you for.", author: "Unknown" },
  { text: "Little things make big days.", author: "Unknown" },
  { text: "It’s going to be hard, but hard does not mean impossible.", author: "Unknown" }
];


export default function Dashboard({ user }) {
  const navigate = useNavigate();
  const { xp, level, progress } = useGamification();
  const [activeTab, setActiveTab] = useState('tasks');
  const [stats, setStats] = useState({
    tasksDue: 0,
    activeTasks: 0,
    nextEvent: null,
    lumens: 0,
    gpa: "N/A",
    rank: "N/A",
  });

  const [recentSessions, setRecentSessions] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [streak, setStreak] = useState(0);
  const [unlockedAchievements, setUnlockedAchievements] = useState([]);
  const [achievementProgress, setAchievementProgress] = useState({});
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const [achievementsExpanded, setAchievementsExpanded] = useState(false);
  const [weeklyActivity, setWeeklyActivity] = useState([]);
  const [urgentTasks, setUrgentTasks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [todaysTip, setTodaysTip] = useState("");
  const [todaysQuote, setTodaysQuote] = useState({ text: "", author: "" });
  const [allTasksForOpt, setAllTasksForOpt] = useState([]);

  useEffect(() => {
    // Select based on day of year
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    setTodaysTip(STUDY_TIPS[dayOfYear % STUDY_TIPS.length]);
    setTodaysQuote(MOTIVATIONAL_QUOTES[dayOfYear % MOTIVATIONAL_QUOTES.length]);
  }, []);

  // Check for Pinned Focus Task
  const [pinnedFocusTask, setPinnedFocusTask] = useState(null);
  const [nextStudySession, setNextStudySession] = useState(null);
  
  useEffect(() => {
     if(user) {
         const pinnedId = localStorage.getItem(`daily_focus_task_${user.uid}`);
         if(pinnedId) {
             // Retrieve task details (Optimized: we could just store text in localStorage, 
             // but simpler to fetch if we want status updates. 
             // For now, let's fetch from the folders ref if we don't have it.)
             // Actually, since we fetch all tasks anyway for the urgency list, we can just find it there.
         }
     }
  }, [user]);

  // Update pinned task when tasks change
  useEffect(() => {
     if(!allTasksForOpt.length || !user) return;
     const pinnedId = localStorage.getItem(`daily_focus_task_${user.uid}`);
     if(pinnedId) {
         const found = allTasksForOpt.find(t => t.id === pinnedId);
         if(found) setPinnedFocusTask(found);
     }
  }, [allTasksForOpt, user]);

  useEffect(() => {
    if (!user) return;

    // --- MOCK DATA FOR SCREENSHOT ---
    const MOCK_MODE = false; 

    if (MOCK_MODE) {
       // Set Mock Data once on mount
       setStats({
           lumens: 2450,
           gpa: "4.0",
           rank: "#3",
           totalStudyTime: "142.5h",
           tasksDue: 5,
           activeTasks: 3,
           completedTasks: 12
       });
       setStreak(15);
       setWeeklyActivity([
           { day: "Sun", minutes: 45 },
           { day: "Mon", minutes: 120 },
           { day: "Tue", minutes: 90 },
           { day: "Wed", minutes: 160 },
           { day: "Thu", minutes: 60 },
           { day: "Fri", minutes: 180 },
           { day: "Sat", minutes: 30 },
       ]);
       setUrgentTasks([
           { id: '1', text: 'Calculus III Problem Set', priority: 'high', dueDate: new Date().toISOString() },
           { id: '2', text: 'Physics Lab Report', priority: 'high', dueDate: new Date().toISOString() },
           { id: '3', text: 'Read Chapter 4-5', priority: 'medium', dueDate: new Date(Date.now() + 86400000).toISOString() },
       ]);
       setUpcomingEvents([
           { id: '1', title: 'Deep Work Session', start: '09', day: 'Monday' },
           { id: '2', title: 'Group Study', start: '14', day: 'Monday' },
       ]);
       setUnlockedAchievements(['focus-master', 'first-steps']);
       setSubjects(['Math', 'Physics', 'CS']);
       // Override local state for visualization testing if needed.
    }

    // Prevent real data fetching when in Mock Mode to avoid conflicts.

    if (MOCK_MODE) return; // Stop Real Fetching

    // ... (Original Fetching Logic) ...
    // Fetch tasks
    const tasksRef = ref(db, `users/${user.uid}/folders`);
    const unsubTasks = onValue(tasksRef, (snap) => {
      const data = snap.val();
      if (!data) {
          setStats(prev => ({...prev, tasksDue: 0, activeTasks: 0, completedTasks: 0}));
          setUrgentTasks([]);
          return;
      }
      
      let due = 0;
      let active = 0;
      let completed = 0;
      let allUrgent = [];
      let allTasks = [];

      Object.values(data).forEach((folder) => {
        if (folder.tasks) {
          Object.values(folder.tasks).forEach((task) => {
             allTasks.push(task);
            if (task.completed) {
              completed++;
            } else {
              active++;
              if (task.dueDate) {
                const dueTime = new Date(task.dueDate).getTime();
                const now = new Date().getTime();
                if (dueTime - now < 3 * 24 * 60 * 60 * 1000 && dueTime > now) { 
                  due++;
                  allUrgent.push({...task, folderId: folder.id});
                }
              }
            }
          });
        }
      });
      
      // Sort urgent by priority/date
      allUrgent.sort((a,b) => {
          const prioMap = { high: 3, medium: 2, low: 1 };
          if (prioMap[b.priority] !== prioMap[a.priority]) return prioMap[b.priority] - prioMap[a.priority];
          return new Date(a.dueDate) - new Date(b.dueDate);
      });

      setAllTasksForOpt(allTasks);
      setStats((prev) => ({ ...prev, tasksDue: due, activeTasks: active, completedTasks: completed }));
      setUrgentTasks(allUrgent.slice(0, 5));
    });

    // ... (User Stats fetch remains same) ...
    const userRef = ref(db, `users/${user.uid}`);
    const unsubUser = onValue(userRef, (snap) => {
      const data = snap.val();
      if (data) {
        // Calculate GPA
        let gpa = "N/A";
        if (data.grades) {
          let sum = 0;
          let count = 0;
          const subNames = [];
          Object.entries(data.grades).forEach(([key, sub]) => {
              // Extract subject name (key or name property)
              subNames.push(sub.name || key);

              if (sub.assessments) {
                let totalW = 0;
                let totalS = 0;
                Object.values(sub.assessments).forEach((a) => {
                  totalS += (a.score / a.total) * 100 * a.weight;
                  totalW += a.weight;
                });
                if (totalW > 0) {
                  sum += totalS / totalW;
                  count++;
                }
              }
          });
          if (count > 0) gpa = (sum / count).toFixed(1) + "%";
          setSubjects(subNames);
        }

        setStats((prev) => ({
          ...prev,
          lumens: data.currency || 0,
          gpa: gpa,
          totalStudyTime: data.stats?.totalStudyTime ? (data.stats.totalStudyTime / 60).toFixed(1) + "h" : "0h"
        }));
      }
    });

    // Fetch Recent Study Sessions & Calculate Weekly Activity
    const sessionsRef = ref(db, `users/${user.uid}/study_sessions`);
    const unsubSessions = onValue(sessionsRef, (snap) => {
      const data = snap.val();
      if (data) {
        const sessions = Object.values(data).sort(
          (a, b) => b.timestamp - a.timestamp
        );
        setRecentSessions(sessions.slice(0, 5));

        // Calculate Weekly Activity (Last 7 Days)
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          last7Days.push({
            day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()],
            date: d.toISOString().split("T")[0],
            minutes: 0,
          });
        }

        sessions.forEach((session) => {
          const sessionDate = new Date(session.timestamp)
            .toISOString()
            .split("T")[0];
          const dayStat = last7Days.find((d) => d.date === sessionDate);
          if (dayStat) {
            dayStat.minutes += session.duration || 0;
          }
        });
        setWeeklyActivity(last7Days);

        // Calculate streak
        // Logic: Streak is contiguous days ending today or yesterday.
        // If last session was before yesterday, streak is 0.
        let currentStreak = 0;
        const lastDate = null;
        
        // Ensure sorted descending
        const sortedSessions = [...sessions].sort((a,b) => b.timestamp - a.timestamp);
        
        // 1. Check if we have any sessions
        if (sortedSessions.length > 0) {
            const today = new Date().toDateString();
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toDateString();
            const lastSessionDate = new Date(sortedSessions[0].timestamp).toDateString();

            // If last session wasn't today or yesterday, streak is broken -> 0
            if (lastSessionDate === today || lastSessionDate === yesterdayStr) {
                // Count backwards
                let streakCount = 0;
                const checkDate = new Date(lastSessionDate);
                
                // Calculate consecutive days by iterating backwards
                
                const currentDatePointer = new Date(lastSessionDate);
                
                // Create a Set of session dates for easy lookup
                const sessionDates = new Set(
                    sortedSessions.map(s => new Date(s.timestamp).toDateString())
                );
                
                while (sessionDates.has(currentDatePointer.toDateString())) {
                    streakCount++;
                    currentDatePointer.setDate(currentDatePointer.getDate() - 1);
                }
                currentStreak = streakCount;
            }
        }
        
        setStreak(currentStreak);
      }
    });


    // ... (Events, Rank, Achievements fetch remain same) ...
    const eventsRef = ref(db, `users/${user.uid}/events`);
    const unsubEvents = onValue(eventsRef, (snap) => {
      const data = snap.val();
      if (data) {
        const eventsList = Object.values(data);
        setRawEvents(eventsList); // Save raw for optimizer

        const now = new Date();
        const currentDay = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ][now.getDay()];
        const currentHour = now.getHours();

        const upcoming = Object.values(data)
          .filter((evt) => {
            if (evt.day !== currentDay) return false;
            return evt.start >= currentHour;
          })
          .sort((a, b) => a.start - b.start)
          .slice(0, 3);

        setUpcomingEvents(upcoming);

        // Detect upcoming Study Session (within 1 hour)
        const studyEvents = eventsList.filter(e => e.type === 'Study' && e.day === currentDay);
        const nextStudy = studyEvents.find(e => {
            // Convert e.start (e.g. 14.5) to date object for comparison?
            // Simpler: Compare hours. 
            // If event is in future but within 1 hour.
            return e.start > (currentHour + now.getMinutes()/60) && e.start <= (currentHour + 1 + now.getMinutes()/60);
        });

        if (nextStudy) {
           // Calculate minutes until
           const diffHours = nextStudy.start - (currentHour + now.getMinutes()/60);
           const diffMins = Math.round(diffHours * 60);
           setNextStudySession({...nextStudy, minutesUntil: diffMins});
        } else {
           setNextStudySession(null);
        }
      }
    });

    const allUsersRef = ref(db, "users");
    const unsubRank = onValue(allUsersRef, (snap) => {
      const data = snap.val();
      if (data) {
        const sorted = Object.entries(data)
          .map(([uid, val]) => ({ uid, time: val.stats?.totalStudyTime || 0 }))
          .sort((a, b) => b.time - a.time);
        const myRank = sorted.findIndex((u) => u.uid === user.uid) + 1;
        setStats((prev) => ({
          ...prev,
          rank: myRank > 0 ? `#${myRank}` : "-",
        }));
      }
    });

    const achievementsRef = ref(db, `users/${user.uid}/achievements`);
    const unsubAchievements = onValue(achievementsRef, (snap) => {
      const data = snap.val();
      setUnlockedAchievements(data?.unlocked || []);
      setAchievementProgress(data?.progress || {});
    });

    return () => {
      unsubTasks();
      unsubUser();
      unsubSessions();
      unsubEvents();
      unsubRank();
      unsubAchievements();
    };
  }, [user]);

  // ... (helper functions remain same) ...
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  /* --- Smart Schedule Logic --- */
  const [scheduleSuggestions, setScheduleSuggestions] = useState([]);
  const [rawEvents, setRawEvents] = useState([]);

  // Optimize when tasks or events change
  useEffect(() => {
    if (allTasksForOpt.length > 0 && rawEvents.length >= 0) {
        import("@/utils/scheduleOptimizer").then(({ optimizeSchedule }) => {
            // Pass subjects to optimizer
            const suggestions = optimizeSchedule(allTasksForOpt, rawEvents, subjects);
            setScheduleSuggestions(suggestions);
        });
    }
  }, [allTasksForOpt, rawEvents, subjects]);

  const handleAcceptSuggestion = async (suggestion) => {
      if (!user) return;
      const newEventRef = push(ref(db, `users/${user.uid}/events`));
      
      // Parse start/end times "09:00" -> 9 (float/int)
      const [sh, sm] = suggestion.start.split(':').map(Number);
      const [eh, em] = suggestion.end.split(':').map(Number);
      
      const newEvent = {
          title: suggestion.title,
          day: suggestion.day, // e.g., "Monday"
          start: sh + sm/60,
          end: eh + em/60,
          color: "var(--color-primary)",
          description: "Smart Schedule Suggestion"
      };
      
      await set(newEventRef, newEvent);
      
      // Remove from local suggestions to avoid dupes
      setScheduleSuggestions(prev => prev.filter(s => s !== suggestion));
      toast.success("Added to Timetable!");
  };

  return (
    <div className="dashboard-container">
      {/* 1. Header / Intro */}
      <div className="dashboard-intro">
        <div className="intro-text">
            <h1>Welcome back, <span className="highlight">{user?.displayName || 'Student'}</span>! 👋</h1>
            <p className="subtitle">Here's your daily overview.</p>
        </div>
        <div className="intro-actions">
             {/* Optional: Add date or quick actions here if needed */}
             <span className="current-date">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>
      
      {/* PINNED DAILY FOCUS */}
      {pinnedFocusTask && !pinnedFocusTask.completed && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="pinned-focus-banner"
            onClick={() => navigate('/todo', { state: { taskId: pinnedFocusTask.id } })}
          >
             <div className="focus-label">
                 <Target size={16} /> 
                 <span>Daily Focus</span>
             </div>
             <div className="focus-text">
                 {pinnedFocusTask.text}
             </div>
             <button className="start-pinned-focus">
                <ArrowRight size={16}/>
             </button>
          </motion.div>
      )}

      {/* UPCOMING STUDY ALERT */}
      {nextStudySession && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="pinned-focus-banner study-alert"
            style={{ 
                background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%)',
                borderColor: 'rgba(245, 158, 11, 0.3)'
            }}
          >
             <div className="focus-label" style={{ color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)' }}>
                 <Clock size={16} /> 
                 <span>Study Time Soon</span>
             </div>
             <div className="focus-text">
                 {nextStudySession.title} starts in {nextStudySession.minutesUntil}m
             </div>
             <button className="start-pinned-focus" style={{ background: 'rgba(245, 158, 11, 0.8)' }}>
                <ArrowRight size={16}/>
             </button>
          </motion.div>
      )}

      <div className="dashboard-grid-layout">
        {/* === LEFT: MAIN CONTENT AREA === */}
        <div className="main-content-area">
            
            {/* Row 1: Stats Cards */}
            <div className="stats-row">
                <div className="stat-card">
                    <div className="stat-icon-box" style={{ background: 'rgba(255, 215, 0, 0.1)', color: '#ffd700' }}>
                        <Zap size={22} fill="#ffd700" />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.lumens}</span>
                        <span className="stat-label">Lumens</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon-box" style={{ background: 'rgba(162, 155, 254, 0.1)', color: '#a29bfe' }}>
                        <GraduationCap size={22} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.gpa}</span>
                        <span className="stat-label">Overall GPA</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon-box" style={{ background: 'rgba(9, 132, 227, 0.1)', color: '#0984e3' }}>
                        <Clock size={22} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.totalStudyTime || "0h"}</span>
                        <span className="stat-label">Total Study Time</span>
                    </div>
                </div>
            </div>

            {/* Row 2: Main Chart */}
            <div className="chart-section styled-card">
                <div className="section-header">
                    <h3>Weekly Focus</h3>
                    <div className="streak-badge"><Flame size={16} fill="orange" stroke="orange" /> {streak} Day Streak</div>
                </div>
                <div className="activity-chart">
                    {weeklyActivity.map((day, i) => {
                    const maxMinutes = Math.max(...weeklyActivity.map((d) => d.minutes), 60) * 1.2;
                    const heightPercent = (day.minutes / maxMinutes) * 100;
                    return (
                        <div key={i} className="chart-bar-col">
                        <div className="bar-container">
                            <motion.div
                            className="bar-fill"
                            initial={{ height: 0 }}
                            animate={{ height: `${heightPercent}%` }}
                            transition={{ duration: 0.3 }}
                            />
                            {day.minutes > 0 && <div className="bar-tooltip">{day.minutes}m</div>}
                        </div>
                        <span className="bar-label">{day.day}</span>
                        </div>
                    );
                    })}
                </div>
            </div>

            {/* Row 3: Bottom Widgets (Quote & Tip) */}
            <div className="bottom-widgets-row">
                {/* Quote */}
                <div className="widget-card quote-card styled-card">
                    <div className="card-decoration quote-deco"><Quote size={80} /></div>
                    <div className="quote-content">
                        <Quote size={20} className="small-icon" />
                        <p className="quote-text">"{todaysQuote.text}"</p>
                        <span className="quote-author">— {todaysQuote.author}</span>
                    </div>
                </div>
                {/* Tip */}
                <div className="widget-card tip-card styled-card">
                    <div className="card-decoration bulb-deco"><Lightbulb size={80} /></div>
                    <div className="tip-content">
                        <div className="tip-header"><Lightbulb size={18} /> Daily Tip</div>
                        <p>{todaysTip}</p>
                    </div>
                </div>
            </div>

            {/* Row 4: Daily Quests (Wide) */}
            <DailyQuests user={user} />
        </div>

        {/* === RIGHT: SIDEBAR === */}
        <div className="right-sidebar">
            
            {/* 1. Level / Gamification Widget (Replaces Profile) */}
            <div className="widget-card level-widget styled-card">
                <div className="widget-header">
                    <h3>Current Level</h3>
                    <span className="level-badge">Lvl {level}</span>
                </div>
                <div className="xp-container">
                    <div className="xp-info">
                        <span>XP Progress</span>
                        <span>{Math.floor(progress)}%</span>
                    </div>
                    <div className="xp-bar-bg">
                        <div className="xp-bar-fill" style={{ width: `${progress}%` }}></div>
                    </div>
                    <p className="xp-subtext">{Math.round((level + 1) * 1000 - xp)} XP to next level</p>
                </div>
            </div>



            {/* 2. Achievements Widget */}
            <div className="widget-card achievements-card styled-card">
                <div className="widget-header">
                    <h3>Last Achievement</h3>
                </div>
                <div className="achievements-spotlight">
                    {unlockedAchievements.length > 0 ? (
                        ACHIEVEMENTS.filter((a) => unlockedAchievements.includes(a.id))
                            .reverse()
                            .slice(0, 1)
                            .map((achievement, i) => (
                            <div key={i} className="achievement-mini spotlight">
                                <span className="achievement-icon-mini">
                                {ACHIEVEMENT_ICONS[achievement.id] || <Trophy size={24} />}
                                </span>
                                <div className="achievement-info-mini">
                                <span className="achievement-name-mini">
                                    {achievement.name}
                                </span>
                                <span className="achievement-desc-mini">
                                    {achievement.description}
                                </span>
                                </div>
                            </div>
                            ))
                        ) : (
                        <div className="empty-state">No achievements yet. Start studying!</div>
                    )}
                </div>
                <button 
                    onClick={() => setShowAchievementsModal(true)}
                    className="view-all-bottom"
                >
                    View All Achievements <ArrowRight size={14} />
                </button>
            </div>

            {/* 3. Tasks/Events Tabs Widget */}
            <div className="widget-card tabs-widget styled-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div className="tabs-header">
                    <button className={`tab-btn ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')}>Urgent Tasks</button>
                    <button className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`} onClick={() => setActiveTab('events')}>Upcoming</button>
                </div>
                <div className="tab-content" style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
                    {activeTab === 'tasks' ? (
                        <div className="tasks-list-compact">
                            {urgentTasks.length > 0 ? urgentTasks.map((task, i) => (
                                <div 
                                    key={i} 
                                    className="task-row clickable" 
                                    onClick={() => navigate('/todo', { state: { taskId: task.id, folderId: task.folderId } })}
                                >
                                    <div className={`priority-indicator ${task.priority || "low"}`}></div>
                                    <div className="task-content">
                                        <span className="task-title">{task.text}</span>
                                        <span className="task-subtext">{task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, {month: "short", day: "numeric"}) : "No date"}</span>
                                    </div>
                                    <div className="hover-arrow"><ArrowRight size={14}/></div>
                                </div>
                            )) : <div className="empty-state">All caught up! 🎉</div>}
                        </div>
                    ) : (
                        <div className="events-list-compact">
                            {upcomingEvents.length > 0 ? upcomingEvents.map((evt, i) => (
                                <div key={i} className="event-row">
                                    <div className="time-badge">
                                        <span>{evt.start}</span>
                                        <small>:00</small>
                                    </div>
                                    <div className="event-info">
                                        <span className="title">{evt.title}</span>
                                        <span className="day">{evt.day}</span>
                                    </div>
                                </div>
                            )) : <div className="empty-state">No events today</div>}
                        </div>
                    )}
                </div>
                {activeTab === 'tasks' ? (
                    <Link to="/todo" className="view-all-bottom" style={{ position: 'relative', zIndex: 100, cursor: 'pointer' }}>Go to Tasks <ArrowRight size={14}/></Link>
                ) : (
                    <Link to="/timetable" className="view-all-bottom" style={{ position: 'relative', zIndex: 100, cursor: 'pointer' }}>Go to Calendar <ArrowRight size={14}/></Link>
                )}
            </div>

        </div>
      </div>


      <AnimatePresence>
        {showAchievementsModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              if (e.target.className === "modal-overlay") setShowAchievementsModal(false);
            }}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
              zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <motion.div
              className="modal-content achievements-modal"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              style={{
                width: '90%', maxWidth: '600px', maxHeight: '80vh',
                background: 'var(--bg-2)', border: '1px solid var(--glass-border)',
                borderRadius: '16px', padding: '24px', overflowY: 'auto',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
              }}
            >
              <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h2>All Achievements</h2>
                <button 
                  onClick={() => setShowAchievementsModal(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--color-text)', cursor: 'pointer', fontSize: '1.5rem' }}
                >
                  &times;
                </button>
              </div>

              <div className="achievements-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
                {ACHIEVEMENTS.map((achievement) => {
                  const unlocked = unlockedAchievements.includes(achievement.id);
                  // Ensure progress is a number (handle object case)
                  const rawProgress = achievementProgress[achievement.id] || 0;
                  const progress = typeof rawProgress === 'object' ? (rawProgress.current || 0) : rawProgress;
                  
                  return (
                    <div 
                      key={achievement.id} 
                      className={`achievement-card ${unlocked ? 'unlocked' : 'locked'}`}
                      style={{
                        padding: '16px', borderRadius: '12px',
                        background: unlocked ? 'linear-gradient(135deg, rgba(var(--primary-rgb), 0.1), rgba(var(--primary-rgb), 0.05))' : 'rgba(255,255,255,0.03)',
                        border: unlocked ? '1px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.1)',
                        display: 'flex', flexDirection: 'column', gap: '8px',
                        opacity: unlocked ? 1 : 0.7
                      }}
                    >
                      <div className="ach-header" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '2rem', filter: unlocked ? 'none' : 'grayscale(1)' }}>
                            {ACHIEVEMENT_ICONS[achievement.id] || <Trophy size={24} />}
                        </span>
                        <div>
                          <div style={{ fontWeight: 'bold' }}>{achievement.name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>{achievement.description}</div>
                        </div>
                      </div>
                      
                      {unlocked ? (
                        <div style={{ marginTop: 'auto', color: 'var(--color-primary)', fontSize: '0.8rem', fontWeight: 'bold' }}>
                          ✓ Unlocked
                        </div>
                      ) : (
                        <div style={{ marginTop: 'auto' }}>
                          <div style={{ background: 'rgba(255,255,255,0.1)', height: '4px', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(100, (progress / achievement.target) * 100)}%`, background: 'var(--color-secondary)', height: '100%' }} />
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginTop: '4px', textAlign: 'right' }}>
                            {progress} / {achievement.target}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
