import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
import { motion, AnimatePresence } from "framer-motion";
import "./Leaderboard.scss";

export default function Leaderboard() {
  const [timeRange, setTimeRange] = useState("all"); // 'all', 'monthly', 'weekly'
  const [sortBy, setSortBy] = useState("time"); // 'time', 'currency'
  const [leaders, setLeaders] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  // Preset banners for mapping (same as Profile.jsx)
  const presetBanners = [
    { id: "gradient-1", name: "Ocean", gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
    { id: "gradient-2", name: "Sunset", gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" },
    { id: "gradient-3", name: "Forest", gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" },
    { id: "gradient-4", name: "Aurora", gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" },
  ];

  useEffect(() => {
    const usersRef = ref(db, 'users');
    
    const unsub = onValue(usersRef, (snap) => {
      const data = snap.val();
      
      if (data) {
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        const oneWeek = 7 * oneDay;
        const oneMonth = 30 * oneDay;

        const arr = Object.entries(data).map(([uid, val]) => {
          let time = 0;
          const isAnonymous = val.settings?.anonymousMode === true;
          const bannerId = val.settings?.customization?.profileBanner || "gradient-1";
          const bannerGradient = presetBanners.find(b => b.id === bannerId)?.gradient || presetBanners[0].gradient;
          const profileTag = val.settings?.customization?.profileTag || "";

          // Base user object
          const userObj = {
            uid,
            isAnonymous,
            name: isAnonymous ? "Anonymous Student" : (val.displayName || "Unknown Student"),
            photoURL: isAnonymous ? null : val.photoURL,
            bannerGradient: isAnonymous ? presetBanners[0].gradient : bannerGradient,
            tag: isAnonymous ? "" : profileTag,
            score: 0,
            rawTime: val.stats?.totalStudyTime || 0,
            rawCurrency: val.currency || 0
          };

          if (sortBy === 'currency') {
            userObj.score = val.currency || 0;
          } else {
            // Calculate time based on range
            if (timeRange === 'all') {
              time = val.stats?.totalStudyTime || 0;
            } else {
              const sessions = val.study_sessions ? Object.values(val.study_sessions) : [];
              const cutoff = timeRange === 'weekly' ? now - oneWeek : now - oneMonth;
              
              sessions.forEach(s => {
                if (s.timestamp >= cutoff) {
                  time += (s.duration || 0);
                }
              });
            }
            userObj.score = time;
          }

          return userObj;
        });
        
        // Sort descending by score
        arr.sort((a, b) => b.score - a.score);
        setLeaders(arr.slice(0, 50)); // Top 50
      } else {
        setLeaders([]);
      }
    });
    
    return () => unsub();
  }, [timeRange, sortBy]);

  const formatScore = (val) => {
    if (sortBy === 'currency') return `💡 ${val}`;
    const h = Math.floor(val / 60);
    const m = val % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const formatTime = (val) => {
    const h = Math.floor(val / 60);
    const m = val % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="leaderboard-root">
      <header className="lb-header">
        <h1>Global Leaderboard</h1>
        <p>Top students by {sortBy === 'currency' ? 'Lumens' : 'study time'}</p>
        
        <div className="lb-controls">
          <div className="lb-tabs">
            <button 
              className={sortBy === 'time' ? 'active' : ''} 
              onClick={() => setSortBy('time')}
            >
              ⏱️ Time
            </button>
            <button 
              className={sortBy === 'currency' ? 'active' : ''} 
              onClick={() => setSortBy('currency')}
            >
              💡 Lumens
            </button>
          </div>

          {sortBy === 'time' && (
            <div className="lb-tabs secondary">
              <button 
                className={timeRange === 'weekly' ? 'active' : ''} 
                onClick={() => setTimeRange('weekly')}
              >
                Weekly
              </button>
              <button 
                className={timeRange === 'monthly' ? 'active' : ''} 
                onClick={() => setTimeRange('monthly')}
              >
                Monthly
              </button>
              <button 
                className={timeRange === 'all' ? 'active' : ''} 
                onClick={() => setTimeRange('all')}
              >
                All Time
              </button>
            </div>
          )}
        </div>
      </header>

      {leaders.length === 0 ? (
        <div className="empty-state">
          <p>No data found for this category yet. Start studying!</p>
        </div>
      ) : (
        <div className="lb-list">
          <AnimatePresence mode="wait">
            {leaders.map((user, index) => (
              <motion.div 
                layout
                key={user.uid}
                className={`lb-item ${index < 3 ? 'top-3' : ''}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.03, type: "spring", stiffness: 300, damping: 30 }}
                onClick={() => setSelectedUser(user)}
              >
                <div className="rank">
                  {index + 1}
                </div>
                
                <div className="lb-avatar">
                  <img 
                    src={user.photoURL || "/avatar-placeholder.png"} 
                    alt={user.name} 
                  />
                </div>

                <div className="user-info">
                  <div className="name-row">
                    <span className="name">{user.name}</span>
                    {user.tag && <span className="user-tag">{user.tag}</span>}
                  </div>
                  <div className="tags">
                    {index === 0 && <span className="tag gold">👑 King</span>}
                    {index === 1 && <span className="tag silver">🥈 Elite</span>}
                    {index === 2 && <span className="tag bronze">🥉 Pro</span>}
                  </div>
                </div>
                <div className="score">
                  {formatScore(user.score)}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Profile Card Modal */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div 
            className="profile-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedUser(null)}
          >
            <motion.div 
              className="profile-modal-card"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div 
                className="modal-banner" 
                style={{ background: selectedUser.bannerGradient }}
              />
              <div className="modal-content">
                <div className="modal-avatar">
                  <img 
                    src={selectedUser.photoURL || "/avatar-placeholder.png"} 
                    alt={selectedUser.name} 
                  />
                </div>
                <h2 className="modal-name">
                  {selectedUser.name}
                  {selectedUser.tag && <span className="modal-tag">{selectedUser.tag}</span>}
                </h2>
                <div className="modal-stats">
                  <div className="stat-item">
                    <span className="label">Total Time</span>
                    <span className="value">{formatTime(selectedUser.rawTime)}</span>
                  </div>
                  <div className="stat-item">
                    <span className="label">Lumens</span>
                    <span className="value">{selectedUser.rawCurrency}</span>
                  </div>
                </div>
                {selectedUser.isAnonymous && (
                  <p className="modal-note">This user is anonymous.</p>
                )}
              </div>
              <button className="close-btn" onClick={() => setSelectedUser(null)}>
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
