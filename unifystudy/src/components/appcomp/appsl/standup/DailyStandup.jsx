import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Plus, X, Sun, Moon, Sunset } from 'lucide-react';
import './DailyStandup.scss';

const DailyStandup = ({ user, onClose }) => {
  const [goals, setGoals] = useState(['', '', '']);
  const [completed, setCompleted] = useState(false);
  const [greeting, setGreeting] = useState({ text: 'Good Morning', icon: Sun, color: '#fbbf24' });

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting({ text: 'Good Morning', icon: Sun, color: '#fbbf24' });
    } else if (hour >= 12 && hour < 18) {
      setGreeting({ text: 'Good Afternoon', icon: Sunset, color: '#f97316' });
    } else {
      setGreeting({ text: 'Good Evening', icon: Moon, color: '#6366f1' });
    }
  }, []);

  useEffect(() => {
    // Check if already done today
    const today = new Date().toDateString();
    const lastStandup = localStorage.getItem(`standup_${user.uid}`);
    
    if (lastStandup === today) {
      // If already done, don't show
      onClose(); 
    }
  }, [user, onClose]);

  const handleGoalChange = (index, value) => {
    const newGoals = [...goals];
    newGoals[index] = value;
    setGoals(newGoals);
  };

  const handleSubmit = () => {
    // Save to Firebase or LocalStorage
    const today = new Date().toDateString();
    localStorage.setItem(`standup_${user.uid}`, today);
    
    // Here you would typically save these goals to the user's todo list or a specific "Daily Goals" collection
    console.log("Goals for today:", goals.filter(g => g.trim()));
    
    setCompleted(true);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const Icon = greeting.icon;

  return (
    <div className="daily-standup-overlay">
      <motion.div 
        className="standup-card"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        {!completed ? (
          <>
            <div className="standup-header">
              <div className="icon-wrapper">
                <Icon size={32} color={greeting.color} />
              </div>
              <h2>{greeting.text}, {user.displayName?.split(' ')[0] || 'Scholar'}!</h2>
              <p>What are your top 3 priorities for today?</p>
            </div>

            <div className="goals-input-list">
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
            </div>

            <button className="start-day-btn" onClick={handleSubmit}>
              Let's Crush It! 🚀
            </button>
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
            <h3>You're all set!</h3>
            <p>Have a productive day.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default DailyStandup;
