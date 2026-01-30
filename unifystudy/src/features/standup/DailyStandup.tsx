// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  Plus, 
  X, 
  Sun, 
  Moon, 
  Sunset, 
  Calendar as CalendarIcon, 
  Clock, 
  Target, 
  Coffee,
  ArrowRight,
  ListTodo,
  AlertCircle,
  Play,
  Pin,
  PinOff
} from 'lucide-react';
import { db } from "@/services/firebaseConfig";
import { ref, onValue } from "firebase/database";
import { useUI } from "@/context/UIContext";
import { useTimer } from "@/features/pomodoro/TimerContext";
import './DailyStandup.scss';
import { toast } from 'sonner';

const DailyStandup = ({ user, onClose }) => {
  const { setFocusModeActive } = useUI();
  const { startPause, setMode } = useTimer();
  
  const [goals, setGoals] = useState(['', '', '']);
  const [completed, setCompleted] = useState(false);
  const [showGoalsInput, setShowGoalsInput] = useState(false);
  const [greeting, setGreeting] = useState({ text: 'Good Morning', icon: Sun, color: '#fbbf24' });
  const [mode, setDisplayMode] = useState('loading'); // 'loading', 'rundown', 'latenight', 'success'
  
  // Data State
  const [urgentTasks, setUrgentTasks] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Advanced Features State
  const [pinnedTaskId, setPinnedTaskId] = useState(null);
  const [workloadForecast, setWorkloadForecast] = useState("0h");

  useEffect(() => {
    // 1. Time-based Greeting & Mode Check
    const hour = new Date().getHours();
    
    // Late Night Logic (11 PM - 4 AM)
    if (hour >= 23 || hour < 4) {
        setDisplayMode('latenight');
        setGreeting({ text: 'It\'s Late', icon: Moon, color: '#6366f1' });
    } else {
        setDisplayMode('rundown');
        if (hour >= 4 && hour < 12) {
            setGreeting({ text: 'Good Morning', icon: Sun, color: '#fbbf24' });
        } else if (hour >= 12 && hour < 18) {
            setGreeting({ text: 'Good Afternoon', icon: Sunset, color: '#f97316' });
        } else {
            setGreeting({ text: 'Good Evening', icon: Moon, color: '#6366f1' });
        }
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    // Check if tasks already done today
    const today = new Date().toDateString();
    const lastStandup = localStorage.getItem(`standup_${user.uid}`);
    
    // Only skip if we are NOT in dev/testing or if we want to strictly enforce once-per-day
    // For this feature request, we want it to "greet you when you open the app for the first time"
    if (lastStandup === today) {
       onClose();
       return;
    }
    
    // Load Pinned Task
    const savedPin = localStorage.getItem(`daily_focus_task_${user.uid}`);
    if (savedPin) setPinnedTaskId(savedPin);

    // Fetch Data for Rundown
    const fetchRundownData = () => {
        // TASKS
        const tasksRef = ref(db, `users/${user.uid}/folders`);
        onValue(tasksRef, (snap) => {
            const data = snap.val();
            let allTasks = [];
            if (data) {
                Object.values(data).forEach(folder => {
                    if (folder.tasks) {
                        Object.values(folder.tasks).forEach(task => {
                            if (!task.completed) allTasks.push(task);
                        });
                    }
                });
            }
            
            // Filter: Due Today or Overdue, or High Priority
            const todayEnd = new Date(); 
            todayEnd.setHours(23, 59, 59, 999);

            const urgent = allTasks.filter(t => {
                if (!t.dueDate) return t.priority === 'high';
                const due = new Date(t.dueDate);
                return due <= todayEnd || t.priority === 'high';
            }).sort((a, b) => {
                // Sort by date then priority
               return new Date(a.dueDate || 9999999999999) - new Date(b.dueDate || 9999999999999);
            }).slice(0, 3);

            setUrgentTasks(urgent);
            
            // Calculate Forecast (Simple: 45m per high priority task, 30m otherwise)
            const minutes = urgent.reduce((acc, t) => acc + (t.priority === 'high' ? 45 : 30), 0);
            const hours = (minutes / 60).toFixed(1);
            setWorkloadForecast(`${hours}h`);
            
        }, { onlyOnce: true });

        // EVENTS
        const eventsRef = ref(db, `users/${user.uid}/events`);
        onValue(eventsRef, (snap) => {
            const data = snap.val();
            if (data) {
                const now = new Date();
                const currentHour = now.getHours();
                const todayName = now.toLocaleDateString('en-US', { weekday: 'long' });

                // Simple filter for "Upcoming Today/Tomorrow"
                // Assuming 'day' is stored as string like "Monday" or we have a full date
                // Base on existing Dashboard logic which uses 'day' string and 'start' float
                
                const events = Object.values(data)
                    .filter(e => e.day === todayName && e.start > currentHour) // Rest of today
                    .sort((a, b) => a.start - b.start)
                    .slice(0, 2);
                
                setUpcomingEvents(events);
            }
            setLoading(false);
        }, { onlyOnce: true });
    };

    fetchRundownData();

  }, [user, onClose]);

  const handleGoalChange = (index, value) => {
    const newGoals = [...goals];
    newGoals[index] = value;
    setGoals(newGoals);
  };

  const handleClose = (forceSleep = false) => {
    // Save to LocalStorage to prevent popping up again today
    const today = new Date().toDateString();
    localStorage.setItem(`standup_${user.uid}`, today);
    
    setCompleted(true);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const proceedFromLateNight = () => {
     setDisplayMode('rundown');
  };
  
  const handlePinTask = (taskId) => {
      if (pinnedTaskId === taskId) {
          setPinnedTaskId(null);
          localStorage.removeItem(`daily_focus_task_${user.uid}`);
          toast('Removed from Daily Focus');
      } else {
          setPinnedTaskId(taskId);
          localStorage.setItem(`daily_focus_task_${user.uid}`, taskId);
          toast.success('Pinned as Daily Focus!');
      }
  };

  const handleStartFocus = (task) => {
      // 1. Close modal
      handleClose();
      // 2. Open Focus Mode
      setFocusModeActive(true);
      // 3. Start Timer (Work Mode)
      setMode('work');
      // Ideally we would set the specific task, but Context doesn't support 'activeTask' yet.
      // Could modify TimerContext later. For now, just starting the flow is huge friction reduction.
      startPause(); 
      toast.success(`Focusing on: ${task.text}`);
  };

  const Icon = greeting.icon;

  if (loading && mode !== 'loading') return null; // Or spinner

  return (
    <div className="daily-standup-overlay">
      <motion.div 
        className={`standup-card ${mode === 'latenight' ? 'late-night-mode' : ''}`}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        {!completed ? (
          <>
            {/* --- HEADER --- */}
            <div className="standup-header">
               <div className="header-top">
                    <div className="icon-wrapper">
                        <Icon size={24} color={greeting.color} />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {workloadForecast !== "0.0h" && mode === 'rundown' && (
                            <span className="date-badge workload-badge">
                                <Clock size={10} style={{marginRight:'4px'}}/>
                                ~{workloadForecast} Work
                            </span>
                        )}
                        <span className="date-badge">
                            {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric'})}
                        </span>
                    </div>
               </div>
              <h2>{greeting.text}, {user.displayName?.split(' ')[0] || 'Friend'}</h2>
              <p className="subtitle">
                {mode === 'latenight' 
                    ? "Rest is the most important productivity tool." 
                    : "Here is your daily briefing."}
              </p>
            </div>

            {/* --- CONTENT AREA based on MODE --- */}
            {mode === 'latenight' ? (
                <div className="late-night-content">
                    <div className="moon-graphic">
                        <Moon size={64} color="#6366f1" fill="rgba(99,102,241,0.2)" />
                    </div>
                    <p>
                        It's quite late. Your brain needs time to consolidate memory 
                        and recharge for tomorrow. We assume you're wrapping up?
                    </p>
                    <div className="standup-footer">
                        <button className="start-day-btn sleep-btn" onClick={() => handleClose(true)}>
                            I'm going to sleep 😴
                        </button>
                        <button className="secondary-action" onClick={proceedFromLateNight}>
                            No, I'm pulling an all-nighter (Show Rundown)
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="rundown-conatiner">
                        {/* 1. URGENT TASKS */}
                        <div className="rundown-section">
                            <h3><AlertCircle size={14}/> Critical Today</h3>
                            <div className="task-list">
                                {urgentTasks.length > 0 ? urgentTasks.map((t, i) => (
                                    <div key={i} className={`rundown-item ${t.priority === 'high' ? 'urgent' : ''} ${pinnedTaskId === t.id ? 'pinned-focus' : ''}`}>
                                        <div className="item-time">
                                            {t.priority === 'high' ? '!!!' : 'TODO'}
                                        </div>
                                        <div className="item-content">
                                            <span className="item-title">{t.text}</span>
                                            <span className="item-meta">
                                                Due: {t.dueDate ? new Date(t.dueDate).toLocaleDateString(undefined, {month:'short', day:'numeric'}) : 'Today'}
                                            </span>
                                        </div>
                                        
                                        <div className="item-actions">
                                            <button 
                                                className={`action-btn pin-btn ${pinnedTaskId === t.id ? 'active' : ''}`}
                                                onClick={() => handlePinTask(t.id)}
                                                title={pinnedTaskId === t.id ? "Unpin Focus" : "Pin as Daily Focus"}
                                            >
                                                {pinnedTaskId === t.id ? <PinOff size={14}/> : <Pin size={14}/>}
                                            </button>
                                            <button 
                                                className="action-btn focus-btn" 
                                                onClick={() => handleStartFocus(t)}
                                                title="Start Focus Session"
                                            >
                                                <Play size={14} fill="currentColor"/>
                                            </button>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="empty-state">Nothing due immediately. Clear skies! 🌤️</div>
                                )}
                            </div>
                        </div>

                        {/* 2. UPCOMING EVENTS */}
                        <div className="rundown-section">
                            <h3><CalendarIcon size={14}/> On The Horizon</h3>
                            <div className="event-list">
                                {upcomingEvents.length > 0 ? upcomingEvents.map((e, i) => (
                                    <div key={i} className="rundown-item">
                                        <div className="item-time">
                                            {Math.floor(e.start)}:{((e.start % 1) * 60).toString().padStart(2, '0')}
                                        </div>
                                        <div className="item-content">
                                            <span className="item-title">{e.title}</span>
                                            <span className="item-meta">Today</span>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="empty-state">No events left for today. Time to focus?</div>
                                )}
                            </div>
                        </div>

                        {/* 3. OPTIONAL PRIORITIES */}
                        <div className="priorities-section">
                            {!showGoalsInput ? (
                                <button className="toggle-priorities-btn" onClick={() => setShowGoalsInput(true)}>
                                    <Plus size={16}/> Add Daily Focus Targets (Optional)
                                </button>
                            ) : (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    className="goals-input-list"
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                        <span style={{ fontSize: '12px', color: '#666', fontWeight: 600 }}>TOP PRIORITIES</span>
                                        <button onClick={() => setShowGoalsInput(false)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}><X size={14}/></button>
                                    </div>
                                    {goals.map((goal, index) => (
                                        <div key={index} className="goal-input-row">
                                        <span className="goal-number">{index + 1}</span>
                                        <input 
                                            type="text" 
                                            placeholder={`Priority #${index + 1}`}
                                            value={goal}
                                            onChange={(e) => handleGoalChange(index, e.target.value)}
                                            autoFocus={index === 0}
                                        />
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                        </div>
                    </div>

                    <div className="standup-footer">
                        <button className="start-day-btn" onClick={() => handleClose()}>
                            Let's Dive In <ArrowRight size={18}/>
                        </button>
                    </div>
                </>
            )}
          </>
        ) : (
          <div className="standup-success">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 10 }}
            >
              <CheckCircle size={64} color="#4caf50" />
            </motion.div>
            <h3>All Set!</h3>
            <p>Make it count.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default DailyStandup;
