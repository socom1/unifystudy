import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
import { motion } from "framer-motion";
import "./Leaderboard.scss";

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([]);

  useEffect(() => {
    console.log("🚀 Leaderboard: Setting up Firebase listener...");
    const usersRef = ref(db, 'users');
    
    const unsub = onValue(usersRef, (snap) => {
      console.log("📊 Leaderboard: Firebase callback fired!");
      const data = snap.val();
      console.log("📊 Leaderboard raw data:", data);
      console.log("📊 Data type:", typeof data, "Is null?", data === null);
      
      if (data) {
        const arr = Object.entries(data)
          .map(([uid, val]) => ({
            uid,
            name: val.displayName || "Anonymous",
            minutes: val.stats?.totalStudyTime || 0,
            tags: val.tags || []
          }));
        
        console.log("📊 Processed leaderboard entries:", arr);
        console.log("📊 Total users found:", arr.length);
        
        // Sort descending by minutes
        arr.sort((a, b) => b.minutes - a.minutes);
        setLeaders(arr.slice(0, 50)); // Top 50
      } else {
        console.warn("⚠️ No user data found in Firebase - data is null or undefined");
        setLeaders([]);
      }
    }, (error) => {
      console.error("❌ Firebase read error:", error);
      console.error("❌ Error code:", error.code);
      console.error("❌ Error message:", error.message);
    });
    
    return () => unsub();
  }, []);

  const formatTime = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="leaderboard-root">
      <header className="lb-header">
        <h1>Global Leaderboard</h1>
        <p>Top students by study time</p>
      </header>

      {leaders.length === 0 ? (
        <div className="empty-state">
          <p>No study sessions recorded yet. Start studying to appear on the leaderboard!</p>
        </div>
      ) : (
        <div className="lb-list">
          {leaders.map((user, index) => (
            <motion.div 
              key={user.uid}
              className={`lb-item ${index < 3 ? 'top-3' : ''}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="rank">
                {index + 1}
              </div>
              <div className="user-info">
                <span className="name">{user.name}</span>
                <div className="tags">
                  {index === 0 && <span className="tag gold">👑 King</span>}
                  {index === 1 && <span className="tag silver">🥈 Elite</span>}
                  {index === 2 && <span className="tag bronze">🥉 Pro</span>}
                </div>
              </div>
              <div className="score">
                {formatTime(user.minutes)}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
