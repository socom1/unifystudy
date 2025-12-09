import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { db } from "../firebase";
import { ref, onValue, push, set } from "firebase/database";
import {
  ACHIEVEMENTS,
  getAchievementById,
} from "../../../../utils/achievements";
import "./Dashboard.scss";

export default function Dashboard({ user }) {
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
  const [achievementsExpanded, setAchievementsExpanded] = useState(false);
  const [weeklyActivity, setWeeklyActivity] = useState([]);
  const [urgentTasks, setUrgentTasks] = useState([]);

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

      Object.values(data).forEach((folder) => {
        if (folder.tasks) {
          Object.values(folder.tasks).forEach((task) => {
            if (!task.isActive) {
              activeCount++;
              if (task.dueDate === today) dueCount++;
              allTasks.push(task);
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
          Object.values(data.grades).forEach((sub) => {
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
        // ... (streak logic remains same) ...
        let currentStreak = 0;
        let lastDate = null;

        for (const session of sessions) {
          const sessionDate = new Date(session.timestamp).toDateString();
          if (!lastDate) {
            lastDate = sessionDate;
            currentStreak = 1;
          } else {
            const dayDiff = Math.floor(
              (new Date(lastDate) - new Date(sessionDate)) /
                (1000 * 60 * 60 * 24)
            );
            if (dayDiff === 1) {
              currentStreak++;
              lastDate = sessionDate;
            } else if (dayDiff > 1) {
              break;
            }
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
        import("../../../../utils/scheduleOptimizer").then(({ optimizeSchedule }) => {
            const suggestions = optimizeSchedule(allTasksForOpt, rawEvents);
            setScheduleSuggestions(suggestions);
        });
    }
  }, [allTasksForOpt, rawEvents]);

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
      alert("Added to Timetable!");
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
              <div className="stat-icon-box lumens">💡</div>
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
              <div className="stat-icon-box gpa">🎓</div>
              <div className="stat-info">
                <span className="stat-label">Overall GPA</span>
                <span className="stat-value">{stats.gpa}</span>
                <span className="stat-change neutral">Keep it up!</span>
              </div>
              <div className="stat-chart-mini"></div>
            </motion.div>

            {/* Stat 3: Rank */}
            <motion.div
              className="stat-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="stat-icon-box rank">🏆</div>
              <div className="stat-info">
                <span className="stat-label">Global Rank</span>
                <span className="stat-value">{stats.rank}</span>
                <span className="stat-change">Based on time</span>
              </div>
              <div className="stat-chart-mini"></div>
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
                <span className="hero-logo">⏱️</span>
                <span className="hero-badge">New Session</span>
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
            <div className="streak-badge">🔥 {streak} Day Streak</div>
          </div>

          <div className="activity-chart">
            {weeklyActivity.map((day, i) => {
              const maxMinutes = Math.max(
                ...weeklyActivity.map((d) => d.minutes),
                1 // Use 1 to ensure some scale, but effectively fill height
              );
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
          
          {/* Smart Schedule Suggestions */}
          {scheduleSuggestions.length > 0 && (
            <div className="widget-card smart-plan-widget" style={{ borderColor: 'var(--color-secondary)' }}>
                <div className="widget-header">
                    <h3>✨ Smart Plan</h3>
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
                  <div key={i} className="task-row">
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
          <div className="quote-icon">💭</div>
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
            <Link to="/profile" className="link">
              View All
            </Link>
          </div>
          <div className="achievements-mini-list">
            {unlockedAchievements.length > 0 ? (
              ACHIEVEMENTS.filter((a) => unlockedAchievements.includes(a.id))
                .slice(0, 3)
                .map((achievement, i) => (
                  <div key={i} className="achievement-mini">
                    <span className="achievement-icon-mini">
                      {achievement.icon}
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
          <div className="tip-icon">💡</div>
          <div className="tip-content">
            <h4>Study Tip</h4>
            <p>
              Take a 5-minute break every 25 minutes to stay focused and retain
              information better.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
