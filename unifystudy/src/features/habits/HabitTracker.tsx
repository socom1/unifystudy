// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { db, auth } from "@/services/firebaseConfig";
import { ref, onValue, push, set, remove, update } from 'firebase/database';
import { Plus, Trash2, Check, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGamification } from '@/context/GamificationContext';
import './HabitTracker.scss';

export default function HabitTracker() {
  const [userId, setUserId] = useState(null);
  const [habits, setHabits] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#10b981');
  const [daysCount, setDaysCount] = useState(7);
  const { addXP } = useGamification();

  // Days to show (dynamic)
  const days = Array.from({length: daysCount}, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - ((daysCount - 1) - i));
      return d;
  });

  const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };
  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0, transition: { duration: 0.3 } }
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
        setHabits(Object.entries(data).map(([id, val]) => ({ id, ...val })));
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
          history: {}
      });
      setNewHabitName('');
      setShowAddModal(false);
  };

  const deleteHabit = async (id) => {
      if(!confirm("Delete this habit?")) return;
      await remove(ref(db, `users/${userId}/habits/${id}`));
  };

  const toggleDay = async (habitId, dateObj) => {
      const dateKey = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
      const habit = habits.find(h => h.id === habitId);
      if (!habit) return;

      const currentStatus = habit.history?.[dateKey] || false;
      
      // Toggle
      await update(ref(db, `users/${userId}/habits/${habitId}/history`), {
          [dateKey]: !currentStatus
      });

      if (!currentStatus) {
         addXP(10, "Habit Completed");
      }
  };

  const getStreak = (habit) => {
       if (!habit.history) return 0;
       const today = new Date().toISOString().split('T')[0];
       
       let streak = 0;
       const d = new Date();
       
       // If done today, start from today. If not, check yesterday.
       const todayKey = d.toISOString().split('T')[0];
       if (!habit.history[todayKey]) {
           d.setDate(d.getDate() - 1);
       }
       
       while (true) {
           const key = d.toISOString().split('T')[0];
           if (habit.history[key]) {
               streak++;
               d.setDate(d.getDate() - 1);
           } else {
               break;
           }
       }
       return streak;
  };

  const getConsistency = (habit) => {
      if (!habit.history) return 0;
      
      // Calculate over last 30 days for a monthly consistency score
      let count = 0;
      const total = 30; 
      const now = new Date();
      
      for(let i=0; i<30; i++) {
          const d = new Date();
          d.setDate(now.getDate() - i);
          const key = d.toISOString().split('T')[0];
          if(habit.history[key]) count++;
      }
      
      return Math.round((count / total) * 100);
  };

  const todayDate = new Date().toISOString().split('T')[0];
  const totalHabits = habits.length;
  const completedToday = habits.filter(h => h.history?.[todayDate]).length;
  const dailyProgress = totalHabits > 0 ? (completedToday / totalHabits) * 100 : 0;

  return (
    <div className="habits-root">
       <header className="habits-header">
           <div className="header-left">
               <h1>Habit Tracker</h1>
               <p className="subtitle">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
           </div>
           <div className="header-right">
                <div className="daily-stats">
                    <div className="stat-pill">
                        <span className="label">Today</span>
                        <span className="value">{Math.round(dailyProgress)}%</span>
                        <div className="mini-progress" style={{background: `conic-gradient(var(--color-primary) ${dailyProgress}%, rgba(255,255,255,0.1) 0)`}}></div>
                    </div>
                </div>
                <div className="view-selector" style={{ marginRight: '0.5rem' }}>
                    <select 
                        value={daysCount} 
                        onChange={(e) => setDaysCount(Number(e.target.value))}
                        style={{ 
                            padding: '8px 12px', 
                            borderRadius: '12px', 
                            background: 'var(--bg-2)', 
                            border: '1px solid var(--glass-border)', 
                            color: 'var(--color-muted)',
                            fontWeight: 500,
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <option value={7}>Last 7 Days</option>
                        <option value={14}>Last 14 Days</option>
                        <option value={30}>Last 30 Days</option>
                        <option value={60}>Last 60 Days</option>
                    </select>
                </div>
                <button onClick={() => setShowAddModal(true)}><Plus size={18} /> New Habit</button>
           </div>
       </header>

       <div className="habits-grid-container">
           {habits.length === 0 ? (
               <div className="empty-state">
                   <Zap size={48} style={{color: 'var(--color-muted)', marginBottom: '1rem'}}/>
                   <p>Start a new routine today!</p>
               </div>
           ) : (
               <table className="habits-table">
                   <thead>
                       <tr>
                           <th style={{width: '200px'}}>Habit</th>
                           <th style={{width: '80px'}}>Streak</th>
                           <th style={{width: '90px'}}>Consistency</th>
                           {days.map(d => (
                               <th key={d.toISOString()} className="day-col">
                                   <div className={`day-label ${d.getDate() === new Date().getDate() ? 'today' : ''}`}>
                                       <span>{d.toLocaleDateString(undefined, {weekday: 'short'})}</span>
                                       <span>{d.getDate()}</span>
                                   </div>
                               </th>
                           ))}
                           <th style={{width: '50px'}}></th>
                       </tr>
                   </thead>
                   <tbody>
                       {habits.map(habit => (
                           <tr key={habit.id}>
                               <td>
                                   <div className="habit-name">
                                       <div className="habit-color" style={{background: habit.color}}></div>
                                       {habit.name}
                                   </div>
                               </td>
                               <td style={{textAlign: 'center', fontWeight: 'bold', color: habit.color}}>
                                   {getStreak(habit)} 🔥
                               </td>
                               <td style={{textAlign: 'center', color: 'var(--color-muted)', fontSize: '0.9rem'}}>
                                   {getConsistency(habit)}%
                               </td>
                               {days.map(d => {
                                   const dateKey = d.toISOString().split('T')[0];
                                   const isDone = habit.history?.[dateKey];
                                   return (
                                       <td key={dateKey} className="check-cell" onClick={() => toggleDay(habit.id, d)}>
                                           <div className={`checkbox ${isDone ? 'checked' : ''}`} style={{background: isDone ? habit.color : ''}}>
                                               {isDone && <Check size={14} strokeWidth={3} />}
                                           </div>
                                       </td>
                                   );
                               })}
                               <td>
                                   <button className="habit-delete" onClick={() => deleteHabit(habit.id)}><Trash2 size={16}/></button>
                               </td>
                           </tr>
                       ))}
                   </tbody>
               </table>
           )}
       </div>

       {/* Add Modal */}
       <AnimatePresence>
            {showAddModal && (
                <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowAddModal(false)}>
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="modal-content"
                        style={{ background: 'var(--bg-2)', padding: '2rem', borderRadius: '16px', width: '400px', border: '1px solid var(--glass-border)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h2 style={{ marginTop: 0 }}>New Habit</h2>
                        <form onSubmit={addHabit}>
                            <input 
                                placeholder="Habit Name (e.g. Read 10 pages)" 
                                value={newHabitName} 
                                onChange={e => setNewHabitName(e.target.value)}
                                style={{ width: '100%', padding: '0.8rem', marginBottom: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--bg-1)', color: 'white' }}
                                autoFocus 
                            />
                            
                            <div style={{display: 'flex', gap: '8px', marginBottom: '1.5rem'}}>
                                {COLORS.map(c => (
                                    <div 
                                        key={c}
                                        onClick={() => setSelectedColor(c)}
                                        style={{
                                            width: '24px', height: '24px', borderRadius: '50%', background: c,
                                            cursor: 'pointer', border: selectedColor === c ? '2px solid white' : 'none',
                                            boxShadow: selectedColor === c ? '0 0 0 2px var(--color-primary)' : 'none' 
                                        }}
                                    />
                                ))}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                <button type="button" onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: 'var(--color-muted)', cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" style={{ background: 'var(--color-primary)', border: 'none', padding: '0.5rem 1.5rem', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>Create</button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
       </AnimatePresence>
    </div>
  );
}
