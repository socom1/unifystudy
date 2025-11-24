import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
import { ACHIEVEMENTS, getAchievementById } from "../../../../utils/achievements";
import "./Dashboard.scss";

export default function Dashboard({ user }) {
  const [stats, setStats] = useState({
    tasksDue: 0,
    activeTasks: 0,
    nextEvent: null,
    lumens: 0,
    gpa: "N/A",
    rank: "N/A"
  });

  const [recentSessions, setRecentSessions] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [streak, setStreak] = useState(0);
  const [unlockedAchievements, setUnlockedAchievements] = useState([]);
  const [achievementProgress, setAchievementProgress] = useState({});
  const [achievementsExpanded, setAchievementsExpanded] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Fetch tasks
    const tasksRef = ref(db, `users/${user.uid}/folders`);
    const unsubTasks = onValue(tasksRef, (snap) => {
      const data = snap.val() || {};
      let dueCount = 0;
      let activeCount = 0;
      const today = new Date().toISOString().split("T")[0];

      Object.values(data).forEach((folder) => {
        if (folder.tasks) {
          Object.values(folder.tasks).forEach((task) => {
            if (!task.isActive) {
              activeCount++;
              if (task.dueDate === today) dueCount++;
            }
          });
        }
      });
      setStats((prev) => ({
        ...prev,
        tasksDue: dueCount,
        activeTasks: activeCount,
      }));
    });

    // Fetch User Stats
    const userRef = ref(db, `users/${user.uid}`);
    const unsubUser = onValue(userRef, (snap) => {
        const data = snap.val();
        if (data) {
            // Calculate GPA
            let gpa = "N/A";
            if (data.grades) {
                let sum = 0;
                let count = 0;
                Object.values(data.grades).forEach(sub => {
                    if (sub.assessments) {
                        let totalW = 0;
                        let totalS = 0;
                        Object.values(sub.assessments).forEach(a => {
                            totalS += (a.score / a.total) * 100 * a.weight;
                            totalW += a.weight;
                        });
                        if (totalW > 0) {
                            sum += (totalS / totalW);
                            count++;
                        }
                    }
                });
                if (count > 0) gpa = (sum / count).toFixed(1) + "%";
            }

            setStats(prev => ({
                ...prev,
                lumens: data.currency || 0,
                gpa: gpa
            }));
        }
    });

    // Fetch Recent Study Sessions
    const sessionsRef = ref(db, `users/${user.uid}/study_sessions`);
    const unsubSessions = onValue(sessionsRef, (snap) => {
      const data = snap.val();
      if (data) {
        const sessions = Object.values(data)
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 5);
        setRecentSessions(sessions);

        // Calculate streak
        const sorted = Object.values(data).sort((a, b) => b.timestamp - a.timestamp);
        let currentStreak = 0;
        let lastDate = null;
        
        for (const session of sorted) {
          const sessionDate = new Date(session.timestamp).toDateString();
          if (!lastDate) {
            lastDate = sessionDate;
            currentStreak = 1;
          } else {
            const dayDiff = Math.floor((new Date(lastDate) - new Date(sessionDate)) / (1000 * 60 * 60 * 24));
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

    // Fetch Upcoming Events
    const eventsRef = ref(db, `users/${user.uid}/events`);
    const unsubEvents = onValue(eventsRef, (snap) => {
      const data = snap.val();
      if (data) {
        const now = new Date();
        const currentDay = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][now.getDay()];
        const currentHour = now.getHours();

        const upcoming = Object.values(data)
          .filter(evt => {
            if (evt.day !== currentDay) return false;
            return evt.start >= currentHour;
          })
          .sort((a, b) => a.start - b.start)
          .slice(0, 3);
        
        setUpcomingEvents(upcoming);
      }
    });

    // Fetch Rank
    const allUsersRef = ref(db, 'users');
    const unsubRank = onValue(allUsersRef, (snap) => {
        const data = snap.val();
        if (data) {
            const sorted = Object.entries(data)
                .map(([uid, val]) => ({ uid, time: val.stats?.totalStudyTime || 0 }))
                .sort((a, b) => b.time - a.time);
            const myRank = sorted.findIndex(u => u.uid === user.uid) + 1;
            setStats(prev => ({ ...prev, rank: myRank > 0 ? `#${myRank}` : "-" }));
        }
    });

    // Fetch Achievements
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

  return (
    <div className="dashboard-container">
      <header>
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {getGreeting()}, {user?.displayName || "Student"}.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Ready to focus? Here is your overview.
        </motion.p>
      </header>

      <div className="stats-grid">
        <motion.div
          className="stat-card highlight"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3>Lumens Balance</h3>
          <div className="value">💡 {stats.lumens}</div>
          <div className="sub">Earn more by studying!</div>
        </motion.div>

        <motion.div
          className="stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3>Overall GPA</h3>
          <div className="value">{stats.gpa}</div>
          <div className="sub">Keep it up!</div>
        </motion.div>

        <motion.div
          className="stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3>Global Rank</h3>
          <div className="value">{stats.rank}</div>
          <div className="sub">Based on study time</div>
        </motion.div>
        
        <motion.div
          className="stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3>Tasks Due</h3>
          <div className="value">{stats.tasksDue}</div>
          <div className="sub">Deadlines today</div>
        </motion.div>
      </div>

      <div className="dashboard-grid">
        <div className="main-col">
          <h2 style={{ marginBottom: "1.5rem", fontSize: "1.5rem" }}>
            Quick Actions
          </h2>
          <div className="actions-grid">
            <Link to="/pomodoro" className="action-btn">
              <span className="icon">⏱️</span>
              <span>Focus Timer</span>
            </Link>
            <Link to="/todo" className="action-btn">
              <span className="icon">📝</span>
              <span>Tasks</span>
            </Link>
            <Link to="/timetable" className="action-btn">
              <span className="icon">📅</span>
              <span>Schedule</span>
            </Link>
            <Link to="/notes" className="action-btn">
              <span className="icon">📌</span>
              <span>Sticky Wall</span>
            </Link>
            <Link to="/grades" className="action-btn">
              <span className="icon">🎓</span>
              <span>Grades</span>
            </Link>
            <Link to="/shop" className="action-btn">
              <span className="icon">🛒</span>
              <span>Shop</span>
            </Link>
          </div>

          <div className="dashboard-widgets-row">
            {upcomingEvents.length > 0 && (
              <div className="widget-card events-widget">
                <h3>Upcoming Today</h3>
                <div className="events-list">
                  {upcomingEvents.map((evt, i) => (
                    <div key={i} className="event-item">
                      <div className="event-time">{evt.start}:00</div>
                      <div className="event-title">{evt.title}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {recentSessions.length > 0 && (
              <div className="widget-card sessions-widget">
                <h3>Recent Sessions</h3>
                <div className="sessions-list">
                  {recentSessions.map((session, i) => (
                    <div key={i} className="session-item">
                      <div className="session-icon">⏱️</div>
                      <div className="session-info">
                        <div className="session-duration">{session.duration} min</div>
                        <div className="session-time">{formatDate(session.timestamp)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="quote-widget" style={{marginTop: '2rem'}}>
            <h3>Quote of the Day</h3>
            <blockquote style={{fontStyle: 'italic', color: 'var(--color-muted)', borderLeft: '3px solid var(--color-primary)', paddingLeft: '1rem'}}>
              "The secret of getting ahead is getting started."
            </blockquote>
          </div>
        </div>

        <div className="side-col">
          <div className="notes-widget">
            <h3>Quick Notes</h3>
            <textarea
              placeholder="Jot down something..."
              className="quick-notes-input"
              onChange={(e) => localStorage.setItem('quick_notes', e.target.value)}
              defaultValue={localStorage.getItem('quick_notes') || ""}
            />
          </div>

          <div className="streak-widget">
            <h3>Study Streak</h3>
            <div className="streak-value">
              <span className="fire-emoji">🔥</span>
              <span className="streak-number">{streak}</span>
              <span className="streak-label">{streak === 1 ? 'day' : 'days'}</span>
            </div>
          </div>

          {/* Achievements Widget */}
          <motion.div
            className="widget achievements-widget"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="achievements-header">
              <h2>🏆 Achievements</h2>
              <button 
                className="expand-toggle"
                onClick={() => setAchievementsExpanded(!achievementsExpanded)}
              >
                {achievementsExpanded ? "Show Less ▲" : "Show All ▼"}
              </button>
            </div>
            
            <div className="achievements-list">
              {ACHIEVEMENTS.slice(0, achievementsExpanded ? ACHIEVEMENTS.length : 3).map(achievement => {
                const isUnlocked = unlockedAchievements.includes(achievement.id);
                const progress = achievementProgress[achievement.id];
                
                return (
                  <div key={achievement.id} className={`achievement-item ${isUnlocked ? 'unlocked' : 'locked'}`}>
                    <div className="achievement-left">
                      <span className={`achievement-icon ${!isUnlocked ? 'grayscale' : ''}`}>
                        {achievement.icon}
                      </span>
                      <div className="achievement-details">
                        <div className="achievement-name">{achievement.name}</div>
                        <div className="achievement-desc">{achievement.description}</div>
                        {!isUnlocked && progress && (
                          <div className="achievement-progress-text">
                            {progress.current}/{progress.target} ({Math.floor(progress.percentage)}%)
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="achievement-right">
                      {isUnlocked ? (
                        <span className="achievement-check">✓</span>
                      ) : (
                        <span className="achievement-reward-badge">+{achievement.reward}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
