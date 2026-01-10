import React, { useState, useEffect } from "react";
// import { motion, AnimatePresence } from "framer-motion"; // Removed local modal motion
import { subscribeToLeaderboard } from "@/services/leaderboardService";
import { useUI } from "@/context/UIContext"; // Import Global Context
import "./Leaderboard.scss";

interface LeaderboardUser {
  uid: string;
  isAnonymous: boolean;
  name: string;
  photoURL?: string | null;
  tag: string;
  score: number;
  rawTime: number;
  rawCurrency: number;
}

interface LeaderboardDataVal {
  settings?: {
    anonymousMode?: boolean;
    customization?: {
      profileTag?: string;
    };
  };
  displayName?: string;
  photoURL?: string;
  currency?: number;
  stats?: {
    totalStudyTime?: number;
  };
  study_sessions?: Record<string, { duration: number; timestamp: number }>;
}

export default function Leaderboard() {
  const [timeRange, setTimeRange] = useState("all"); // 'all', 'monthly', 'weekly'
  const [sortBy, setSortBy] = useState("time"); // 'time', 'currency'
  const [leaders, setLeaders] = useState<LeaderboardUser[]>([]);
  
  const { openProfile } = useUI(); // Use global profile opener

  // Preset banners for mapping (same as Profile.jsx)
  const presetBanners = [
    { id: "gradient-1", name: "Ocean", gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
    { id: "gradient-2", name: "Sunset", gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" },
    { id: "gradient-3", name: "Forest", gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" },
    { id: "gradient-4", name: "Aurora", gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" },
  ];

  useEffect(() => {
    // subscribeToLeaderboard expects a callback receiving 'data'
    // 'data' is the whole public_leaderboard object: Record<string, LeaderboardDataVal>
    const unsubscribe = subscribeToLeaderboard((data: any) => {
      
      if (data) {
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        const oneWeek = 7 * oneDay;
        const oneMonth = 30 * oneDay;

        // data is { uid: val, uid2: val2 ... }
        const typedData = data as Record<string, LeaderboardDataVal>;

        const arr = Object.entries(typedData).map(([uid, val]) => {
          let time = 0;
          const isAnonymous = val.settings?.anonymousMode === true;
          // ... (existing logic)
          const profileTag = val.settings?.customization?.profileTag || "";

          // Base user object
          const userObj: LeaderboardUser = {
            uid,
            isAnonymous,
            name: isAnonymous ? "Anonymous Student" : (val.displayName || "Unknown Student"),
            photoURL: isAnonymous ? null : val.photoURL,
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
              
              sessions.forEach((s) => {
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
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [timeRange, sortBy]);

  const formatScore = (val: number) => {
    if (sortBy === 'currency') return `💡 ${val}`;
    const h = Math.floor(val / 60);
    const m = Math.floor(val % 60);
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
          {leaders.map((user, i) => (
            <div 
              key={user.uid}
              className={`lb-item ${i < 3 ? 'top-3' : ''}`}
              onClick={() => !user.isAnonymous && openProfile(user.uid)}
              style={{ cursor: user.isAnonymous ? 'default' : 'pointer' }}
            >
                <div className="rank">
                  {i + 1}
                </div>
                
                <div className="lb-avatar">
                  {(user.isAnonymous || !user.photoURL) ? (
                    <div className="avatar-placeholder-q">?</div>
                  ) : (
                    <img 
                      src={user.photoURL || undefined} 
                      alt={user.name} 
                    />
                  )}
                </div>

                <div className="user-info">
                  <div className="name-row">
                    <span className="name">{user.name}</span>
                    {user.tag && <span className="user-tag">{user.tag}</span>}
                  </div>
                  <div className="tags">
                    {i === 0 && <span className="tag gold">👑 King</span>}
                    {i === 1 && <span className="tag silver">🥈 Elite</span>}
                    {i === 2 && <span className="tag bronze">🥉 Pro</span>}
                  </div>
                </div>
                <div className="score">
                  {formatScore(user.score)}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
