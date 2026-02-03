// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { db, auth } from "@/services/firebaseConfig";
import { ref, onValue, push, set, remove, update } from 'firebase/database';
import { Plus, Trash2, Check, Zap, Flame, Calendar as CalendarIcon, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGamification } from '@/context/GamificationContext';
import './HabitTracker.scss';
import { calculateCurrentStreak, getCompletionRate, isHabitDue, dateKey, FrequencyType } from './HabitUtils';

export default function HabitTracker() {
  const [userId, setUserId] = useState(null);
  const [habits, setHabits] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // New Habit Form State
  const [newHabitName, setNewHabitName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#10b981');
  const [frequency, setFrequency] = useState<FrequencyType>('daily');
  const [customDays, setCustomDays] = useState<number[]>([]); // 0=Sun
  
  const { addXP } = useGamification();

  const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1'];
  
  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
  };

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUserId(u ? u.uid : null));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const habitsRef = ref(db, `users/${userId}/habits`);
    const unsub = onValue(habitsRef, (snap) => {
      const data = snap.val();
      if (data) {
        setHabits(Object.entries(data).map(([id, val]) => ({ 
            id, 
            ...val,
            // Default legacy habits to daily
            frequency: val.frequency || 'daily',
            customDays: val.customDays || []
        })));
      } else {
        setHabits([]);
      }
    });
    return () => unsub();
  }, [userId]);

  const addHabit = async (e) => {
      e.preventDefault();
      if (!newHabitName.trim() || !userId) return;
      
      const newRef = push(ref(db, `users/${userId}/habits`));
      await set(newRef, {
          name: newHabitName,
          color: selectedColor,
          frequency,
          customDays: frequency === 'custom' ? customDays : [],
          history: {},
          createdAt: Date.now()
      });
      
      // Reset Form
      setNewHabitName('');
      setFrequency('daily');
      setCustomDays([]);
      setShowAddModal(false);
  };

  const deleteHabit = async (id) => {
      if(!confirm("Delete this habit forever?")) return;
      await remove(ref(db, `users/${userId}/habits/${id}`));
  };

  const toggleToday = async (habitId) => {
      const today = new Date();
      const k = dateKey(today);
      const habit = habits.find(h => h.id === habitId);
      if (!habit) return;

      const currentStatus = habit.history?.[k] || false;
      const newStatus = !currentStatus;

      await update(ref(db, `users/${userId}/habits/${habitId}/history`), {
          [k]: newStatus
      });

      if (newStatus) {
         // Add XP if completed
         addXP(15, "Habit Completed");
         
         // Trigger local confetti or sound effect if we had one
      }
  };

  const toggleCustomDay = (dayIndex: number) => {
      if (customDays.includes(dayIndex)) {
          setCustomDays(customDays.filter(d => d !== dayIndex));
      } else {
          setCustomDays([...customDays, dayIndex]);
      }
  };

  const todayDate = new Date();
  
  // Calculate specific stats for specific habits
  const habitsWithStats = habits.map(h => ({
      ...h,
      streak: calculateCurrentStreak(h),
      rate: getCompletionRate(h),
      isDueToday: isHabitDue(h, todayDate),
      completedToday: !!h.history?.[dateKey(todayDate)]
  }));

  const dueTodayCount = habitsWithStats.filter(h => h.isDueToday).length;
  const completedTodayCount = habitsWithStats.filter(h => h.isDueToday && h.completedToday).length;
  const dailyProgress = dueTodayCount > 0 ? (completedTodayCount / dueTodayCount) * 100 : 0;

  return (
    <div className="habits-root">
       <header className="habits-header">
           <div className="header-left">
               <h1>Habit Tracker</h1>
               <div className="date-badge">
                   <CalendarIcon size={14} />
                   <span>{todayDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
               </div>
           </div>
           
           <div className="header-right">
                <div className="daily-stats-card">
                    <div className="stats-info">
                        <span className="label">Daily Goals</span>
                        <div className="value-group">
                            <span className="value">{completedTodayCount}/{dueTodayCount}</span>
                            <span className="percentage">{Math.round(dailyProgress)}%</span>
                        </div>
                    </div>
                    <div className="progress-bar">
                        <motion.div 
                            className="fill" 
                            initial={{ width: 0 }}
                            animate={{ width: `${dailyProgress}%` }}
                            transition={{ duration: 1, ease: "circOut" }}
                        />
                    </div>
                </div>
                <button className="add-btn" onClick={() => setShowAddModal(true)}>
                    <Plus size={18} /> New Habit
                </button>
           </div>
       </header>

       <motion.div 
            className="habits-grid"
            variants={containerVariants}
            initial="hidden"
            animate="show"
       >
           {habitsWithStats.length === 0 ? (
               <div className="empty-state">
                   <div className="icon-circle">
                        <Zap size={32} />
                   </div>
                   <h3>No habits yet</h3>
                   <p>Start building your dream routine today.</p>
                   <button onClick={() => setShowAddModal(true)}>Create First Habit</button>
               </div>
           ) : (
               habitsWithStats.map(habit => (
                   <motion.div 
                        key={habit.id} 
                        className={`habit-card ${habit.completedToday ? 'completed' : ''} ${!habit.isDueToday ? 'not-due' : ''}`}
                        variants={itemVariants}
                        layout
                   >
                       <div className="card-header">
                           <div className="habit-identity">
                               <div className="color-dot" style={{background: habit.color, boxShadow: `0 0 10px ${habit.color}40`}} />
                               <span className="habit-name">{habit.name}</span>
                           </div>
                           <button className="delete-btn" onClick={(e) => { e.stopPropagation(); deleteHabit(habit.id); }}>
                               <Trash2 size={14} />
                           </button>
                       </div>

                       <div className="card-body">
                           <div className="stats-row">
                               <div className="stat" title="Current Streak">
                                   <Flame size={16} className={habit.streak > 0 ? 'active-flame' : ''} />
                                   <span>{habit.streak} day{habit.streak !== 1 ? 's' : ''}</span>
                               </div>
                               <div className="stat" title="Monthly Consistency">
                                   <TrendingUp size={16} />
                                   <span>{habit.rate}%</span>
                               </div>
                           </div>
                           
                           <div className="frequency-badge">
                               {habit.frequency === 'daily' && 'Every Day'}
                               {habit.frequency === 'weekdays' && 'Weekdays'}
                               {habit.frequency === 'weekends' && 'Weekends'}
                               {habit.frequency === 'custom' && 'Custom Days'}
                           </div>
                       </div>

                       <div className="card-actions">
                           {habit.isDueToday ? (
                               <button 
                                   className={`check-btn ${habit.completedToday ? 'checked' : ''}`}
                                   onClick={() => toggleToday(habit.id)}
                                   style={{
                                       '--habit-color': habit.color
                                   } as React.CSSProperties}
                               >
                                   {habit.completedToday ? (
                                       <>
                                           <Check size={20} strokeWidth={3} />
                                           <span>Completed!</span>
                                       </>
                                   ) : (
                                       <span>Mark Complete</span>
                                   )}
                               </button>
                           ) : (
                               <div className="rest-day-msg">
                                   <span>Rest Day 💤</span>
                               </div>
                           )}
                       </div>
                   </motion.div>
               ))
           )}
       </motion.div>

       {/* Add Habit Modal */}
       <AnimatePresence>
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <motion.div 
                        initial={{ scale: 0.95, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 10 }}
                        className="modal-content"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="modal-header">
                            <h2>Create New Habit</h2>
                            <button className="close-btn" onClick={() => setShowAddModal(false)}>×</button>
                        </div>
                        
                        <form onSubmit={addHabit}>
                            <div className="form-group">
                                <label>Habit Name</label>
                                <input 
                                    className="input-field"
                                    placeholder="e.g. Read 10 pages" 
                                    value={newHabitName} 
                                    onChange={e => setNewHabitName(e.target.value)}
                                    autoFocus 
                                />
                            </div>

                            <div className="form-group">
                                <label>Frequency</label>
                                <div className="frequency-options">
                                    {(['daily', 'weekdays', 'weekends', 'custom'] as const).map(f => (
                                        <button
                                            key={f}
                                            type="button"
                                            className={`freq-chip ${frequency === f ? 'active' : ''}`}
                                            onClick={() => setFrequency(f)}
                                        >
                                            {f.charAt(0).toUpperCase() + f.slice(1)}
                                        </button>
                                    ))}
                                </div>
                                {frequency === 'custom' && (
                                    <div className="day-selector">
                                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                                            <button
                                                key={d}
                                                type="button"
                                                className={`day-chip ${customDays.includes(i) ? 'active' : ''}`}
                                                onClick={() => toggleCustomDay(i)}
                                            >
                                                {d}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            <div className="form-group">
                                <label>Color Code</label>
                                <div className="color-picker">
                                    {COLORS.map(c => (
                                        <div 
                                            key={c}
                                            onClick={() => setSelectedColor(c)}
                                            className={`color-swatch ${selectedColor === c ? 'selected' : ''}`}
                                            style={{ background: c }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="cancel-btn" onClick={() => setShowAddModal(false)}>Cancel</button>
                                <button type="submit" className="submit-btn" disabled={!newHabitName.trim()}>Create Habit</button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
       </AnimatePresence>
    </div>
  );
}
