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
  ZapOff
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
  "Set a specific goal for each study session."
];

export default function Dashboard({ user }) {
  const navigate = useNavigate();
  const { xp, level, progress } = useGamification();
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

  useEffect(() => {
    // Select study tip based on day of year
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    setTodaysTip(STUDY_TIPS[dayOfYear % STUDY_TIPS.length]);
  }, []);

  useEffect(() => {
    if (!user) return;

    // Fetch tasks
    const tasksRef = ref(db, `users/${user.uid}/folders`);
    const unsubTasks = onValue(tasksRef, (snap) => {
      const data = snap.val() || {};
      let dueCount = 0;
      let activeCount = 0;
      const today = new Date().toISOString().split("T")[0];
      const allTasks = [];

      Object.entries(data).forEach(([folderId, folder]) => {
        if (folder.tasks) {
          Object.entries(folder.tasks).forEach(([taskId, task]) => {
            if (!task.isActive) {
              activeCount++;
              if (task.dueDate === today) dueCount++;
              allTasks.push({ ...task, id: taskId, folderId });
            }
          });
        }
      });
      setAllTasksForOpt(allTasks); // Save for optimizer

      // Sort tasks by due date and priority
      const sortedTasks = allTasks
        .sort((a, b) => {
          if (a.dueDate && b.dueDate)
            return new Date(a.dueDate) - new Date(b.dueDate);
          if (a.dueDate) return -1;
          if (b.dueDate) return 1;
          return 0;
        })
        .slice(0, 3);

      setUrgentTasks(sortedTasks);

      setStats((prev) => ({
        ...prev,
        tasksDue: dueCount,
        activeTasks: activeCount,
      }));
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
                
                // Naive approach: check existence of session for each previous day
                // Better approach: Iterate sessions and check continuity
                
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
  const [allTasksForOpt, setAllTasksForOpt] = useState([]);

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
      {/* 1. Header Section */}
      <header className="dashboard-header">
        <div className="header-left">
          <div className="user-welcome">
            <div className="avatar-circle">
              {user?.photoURL ? <img src={user.photoURL} alt="User" /> : "U"}
            </div>
            <div className="user-text">
              <span className="greeting">{getGreeting()}</span>
              <span className="username">{user?.displayName || "Student"}</span>
            </div>
          </div>
        </div>

        <div className="header-right">
          {/* <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input type="text" placeholder="Search..." />
          </div> */}
          <button className="icon-btn">🔔</button>
          <Link to="/settings" className="icon-btn">⚙️</Link>
        </div>
      </header>

      {/* 2. Top Section: Stats & Hero */}
      <div className="top-section">
        <div className="stats-column">
          <div className="section-title">
            <h2>Your Stats</h2>
            <span className="badge">3 Metrics</span>
          </div>

          <div className="stats-cards">
            {/* Stat 1: Lumens */}
            <motion.div
              className="stat-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="stat-icon-box lumens"><Lightbulb size={24} /></div>
              <div className="stat-info">
                <span className="stat-label">Lumens Balance</span>
                <span className="stat-value">{stats.lumens}</span>
                <span className="stat-change positive">
                  Earn more by studying
                </span>
              </div>
              <div className="stat-chart-mini"></div>
            </motion.div>

            {/* Stat 2: GPA */}
            <motion.div
              className="stat-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="stat-icon-box gpa"><GraduationCap size={24} /></div>
              <div className="stat-info">
                <span className="stat-label">Overall GPA</span>
                <span className="stat-value">{stats.gpa}</span>
                <span className="stat-change neutral">Keep it up!</span>
              </div>
              <div className="stat-chart-mini"></div>
            </motion.div>

            {/* Stat 3: Level (Gamification) */}
            <motion.div
              className="stat-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="stat-icon-box rank"><Star size={24} /></div>
              <div className="stat-info" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="stat-label">Level {level}</span>
                    <span className="stat-change" style={{ fontSize: '0.75rem' }}>{Math.round(xp)} XP</span>
                </div>
                
                <div className="xp-bar-container" style={{ 
                    height: '6px', 
                    background: 'rgba(255,255,255,0.1)', 
                    borderRadius: '10px', 
                    marginTop: '8px',
                    overflow: 'hidden'
                }}>
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        style={{ height: '100%', background: 'var(--color-primary)', borderRadius: '10px' }}
                    />
                </div>
                <span className="stat-change" style={{ marginTop: '4px', fontSize: '0.7rem', opacity: 0.7 }}>
                    {Math.round(progress)}% to Level {level + 1}
                </span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Hero Card: Focus Timer */}
        <div className="hero-column">
          <motion.div
            className="hero-card"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="hero-content">
              <div className="hero-header">
                <span className="hero-logo"><Clock size={24} color="#a78bfa" /></span>
              </div>
              <h2>Ready to Focus?</h2>
              <p>
                Start a Pomodoro session to boost your productivity and earn
                Lumens.
              </p>

              <div className="hero-actions">
                <div className="quick-start-buttons" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%' }}>
                  <Link to="/pomodoro" className="primary-btn" style={{ 
                      background: 'rgba(255,255,255,0.1)', 
                      color: 'var(--color-text)', 
                      border: '1px solid var(--glass-border)',
                      display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 
                  }}>
                    <span>Default</span>
                    <span style={{ fontSize: '0.8em', opacity: 0.6 }}>(25/5)</span>
                  </Link>
                  <Link to="/pomodoro" className="primary-btn" style={{ 
                      background: 'var(--color-primary)', 
                      color: 'white', 
                      border: 'none',
                      display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 
                  }}>
                    <span>Deep Work</span>
                    <span style={{ fontSize: '0.8em', opacity: 0.8 }}>(50/10)</span>
                  </Link>
                </div>
              </div>
            </div>
            <div className="hero-bg-effect"></div>
          </motion.div>
        </div>
      </div>

      {/* 4. Bottom Section: 3-Column Grid */}
      <div className="bottom-section">
        {/* Column 1: Weekly Activity (spans 2 columns) */}
        <div className="main-chart-area span-2">
          <div className="section-header">
            <h3>Weekly Activity</h3>
            <div className="streak-badge"><Flame size={16} fill="orange" stroke="orange" /> {streak} Day Streak</div>
          </div>

          <div className="activity-chart">
            {weeklyActivity.map((day, i) => {
              const maxMinutes = Math.max(
                ...weeklyActivity.map((d) => d.minutes),
                60 // Ensure at least 60m scale
              ) * 1.2; // Add 20% headroom
              const heightPercent = (day.minutes / maxMinutes) * 100;

              return (
                <div key={i} className="chart-bar-col">
                  <div className="bar-container">
                    <motion.div
                      className="bar-fill"
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPercent}%` }}
                      transition={{ delay: i * 0.1, duration: 0.5 }}
                    />
                    {day.minutes > 0 && (
                      <div className="bar-tooltip">{day.minutes}m</div>
                    )}
                  </div>
                  <span className="bar-label">{day.day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 2: Side Widgets Stack */}
        <div className="side-widgets-area">
          
          {/* Nova Assistant Widget */}
          <div className="widget-card nova-widget" style={{ borderColor: 'var(--color-primary)', background: 'linear-gradient(135deg, rgba(var(--color-primary-rgb),0.1), rgba(var(--bg-2-rgb), 0.8))' }}>
            <div className="widget-header">
                <h3><Sparkles size={18} fill="var(--color-primary)" style={{marginRight:8}}/> Nova Assistant</h3>
            </div>
            <div style={{ padding: '0 0.5rem 0.5rem 0.5rem' }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-muted)', marginBottom: '1rem' }}>
                    Need help organizing? Ask Nova to manage your tasks and schedule.
                </p>
                <div 
                    onClick={() => navigate('/nova')}
                    style={{ 
                        background: 'var(--bg-1)', 
                        border: '1px solid var(--glass-border)', 
                        borderRadius: '20px', 
                        padding: '0.8rem 1rem', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem', 
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
                    }}
                    className="nova-fake-input"
                >
                    <Sparkles size={16} color="var(--color-primary)" />
                    <span style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>Ask Nova something...</span>
                </div>
            </div>
          </div>

          {/* Smart Schedule Suggestions */}
          {scheduleSuggestions.length > 0 && (
            <div className="widget-card smart-plan-widget" style={{ borderColor: 'var(--color-secondary)' }}>
                <div className="widget-header">
                    <h3><Zap size={18} fill="var(--color-secondary)" style={{marginRight:8}}/> Smart Plan</h3>
                </div>
                <div className="suggestions-list">
                    {scheduleSuggestions.map((s, i) => (
                        <div key={i} className="suggestion-item" style={{ marginBottom: '10px', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{s.title}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>{s.start} - {s.end} today</span>
                                <button 
                                    onClick={() => handleAcceptSuggestion(s)}
                                    style={{ background: 'var(--color-primary)', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '2px 8px', fontSize: '0.8rem' }}
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          )}

          {/* Urgent Tasks */}
          <div className="widget-card task-widget">
            <div className="widget-header">
              <h3>Urgent Tasks</h3>
              <Link to="/todo" className="link">
                View All
              </Link>
            </div>
            <div className="tasks-list-compact">
              {urgentTasks.length > 0 ? (
                urgentTasks.map((task, i) => (
                  <div 
                    key={i} 
                    className="task-row clickable" 
                    onClick={() => navigate('/todo', { state: { taskId: task.id, folderId: task.folderId } })}
                    style={{ cursor: 'pointer' }}
                  >
                    <div
                      className={`priority-dot ${task.priority || "low"}`}
                    ></div>
                    <span className="task-title">{task.text}</span>
                    <span className="task-date">
                      {task.dueDate
                        ? new Date(task.dueDate).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })
                        : ""}
                    </span>
                  </div>
                ))
              ) : (
                <div className="empty-state">No urgent tasks! 🎉</div>
              )}
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="widget-card">
            <div className="widget-header">
              <h3>Upcoming</h3>
              <Link to="/timetable" className="link">
                View All
              </Link>
            </div>
            <div className="events-list-compact">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((evt, i) => (
                  <div key={i} className="event-row">
                    <span className="time">{evt.start}:00</span>
                    <span className="title">{evt.title}</span>
                  </div>
                ))
              ) : (
                <div className="empty-state">No events today</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Extra Widgets Row */}
      <div className="extra-widgets-row">
        {/* Quote of the Day */}
        <motion.div
          className="widget-card quote-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="quote-icon"><Quote size={24} /></div>
          <div className="quote-content">
            <p className="quote-text">
              "The secret of getting ahead is getting started."
            </p>
            <span className="quote-author">— Mark Twain</span>
          </div>
        </motion.div>

        {/* Recent Achievements */}
        <motion.div
          className="widget-card achievements-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <div className="widget-header">
            <h3>Recent Achievements</h3>
            <button 
              className="view-all-btn"
              onClick={() => setShowAchievementsModal(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--color-muted)' }}
            >
              View All
            </button>
          </div>
          <div className="achievements-mini-list">
            {unlockedAchievements.length > 0 ? (
              ACHIEVEMENTS.filter((a) => unlockedAchievements.includes(a.id))
                .slice(0, 3)
                .map((achievement, i) => (
                  <div key={i} className="achievement-mini">
                    <span className="achievement-icon-mini">
                    <span className="achievement-icon-mini">
                      {ACHIEVEMENT_ICONS[achievement.id] || <Trophy size={20} />}
                    </span>
                    </span>
                    <div className="achievement-info-mini">
                      <span className="achievement-name-mini">
                        {achievement.name}
                      </span>
                      <span className="achievement-reward-mini">
                        +{achievement.reward} 💡
                      </span>
                    </div>
                  </div>
                ))
            ) : (
              <div className="empty-state">
                Start studying to unlock achievements!
              </div>
            )}
          </div>
        </motion.div>

        {/* Study Tip */}
        <motion.div
          className="widget-card tip-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <div className="tip-icon"><Lightbulb size={24} /></div>
          <div className="tip-content">
            <h4>Study Tip</h4>
            <p>
              {todaysTip}
            </p>
          </div>
        </motion.div>
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
