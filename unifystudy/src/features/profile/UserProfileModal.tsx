// @ts-nocheck
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUI } from "@/context/UIContext";
import { db } from "@/services/firebaseConfig";
import { ref, onValue } from "firebase/database";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Send } from "lucide-react";

// Asset Imports - Match Shop.tsx
import CosmosBanner from "@/assets/shop/cosmos-banner.svg?url";
import CircuitBanner from "@/assets/shop/circuit-banner.svg?url";
import WavesBanner from "@/assets/shop/waves-banner.svg?url";

import "./UserProfileModal.scss";

// Lookup tables (Should strictly ideally be shared constant, but duplicating for safety)
const BANNERS = {
  "default": { type: "gradient", value: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
  "cyber": { type: "gradient", value: "linear-gradient(135deg, #00d4ff 0%, #005bea 100%)" },
  "matrix": { type: "gradient", value: "linear-gradient(135deg, #00ff41 0%, #008f11 100%)" },
  "sunset": { type: "gradient", value: "linear-gradient(135deg, #f5576c 0%, #f093fb 100%)" },
  
  // SVGs
  "cosmos": { type: "svg", value: CosmosBanner },
  "circuit": { type: "svg", value: CircuitBanner },
  "waves": { type: "svg", value: WavesBanner },
};

const PROFILE_TAGS = {
  "scholar": "🎓 Scholar",
  "champion": "🏆 Champion",
  "night-owl": "🦉 Night Owl",
  "early-bird": "🌅 Early Bird",
  "coffee-club": "☕ Coffee Club",
  "verified": "✅ Verified",
};

export default function UserProfileModal() {
  const { selectedUserId, closeProfile } = useUI();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedUserId) {
        setUserData(null);
        return;
    }

    setLoading(true);
    setLoading(true);
    // Use public_leaderboard as it contains the synced public profile data
    const userRef = ref(db, `public_leaderboard/${selectedUserId}`);
    
    const unsub = onValue(userRef, (snap) => {
        const val = snap.val();
        if (val) {
            setUserData(val);
        }
        setLoading(false);
    });

    return () => unsub();
  }, [selectedUserId]);

  if (!selectedUserId) return null;

  // Derived Data
  const isAnonymous = userData?.settings?.anonymousMode;
  const displayName = isAnonymous ? "Anonymous User" : (userData?.displayName || "Unknown");
  const photoURL = isAnonymous ? null : userData?.photoURL;
  const avatarColor = userData?.settings?.customization?.avatarColor || "#333";
  
  const status = userData?.status || "offline"; // online, dnd, offline
  const level = userData?.stats?.level || 1;
  const totalTime = userData?.stats?.totalStudyTime || 0;

  // Customization
  const bannerId = userData?.settings?.customization?.profileBanner || "default";
  const bannerDef = BANNERS[bannerId] || BANNERS["default"];
  
  // Tags (Array)
  const userTagIds = userData?.settings?.customization?.profileTags || [];
  const displayTags = Array.isArray(userTagIds) 
      ? userTagIds.map(id => PROFILE_TAGS[id]).filter(Boolean) 
      : (userTagIds ? [PROFILE_TAGS[userTagIds]] : []).filter(Boolean); // Handle legacy single string

  const formatTime = (vars) => {
      const h = Math.floor(vars / 60);
      return h + "h";
  }

  return (
    <AnimatePresence>
      <motion.div 
        className="profile-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={closeProfile}
      >
        <motion.div 
            className="profile-modal-card"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
        >
            <button className="close-btn" onClick={closeProfile}><X size={18} /></button>
            
            {/* Banner */}
            <div className={`modal-banner ${bannerDef.type === 'svg' ? 'has-image' : ''}`} style={{
                background: bannerDef.type === 'gradient' ? bannerDef.value : 'var(--bg-2)'
            }}>
                {bannerDef.type === 'svg' && <img src={bannerDef.value} alt="banner" />}
            </div>

            <div className="modal-content">
                {/* Avatar */}
                <div className="modal-avatar">
                    {photoURL ? (
                        <img src={photoURL} alt={displayName} />
                    ) : (
                        <div className="avatar-placeholder" style={{background: avatarColor}}>
                            {displayName[0]}
                        </div>
                    )}
                </div>

                {/* User Info */}
                <div className="modal-user-info">
                    <h2>
                        {displayName}
                        {displayTags.includes("✅ Verified") && <Check size={18} className="verified-badge" />}
                    </h2>
                    
                    <div className={`status-pill ${status}`}>
                        <span className="dot">•</span> {status === 'dnd' ? 'Do Not Disturb' : status}
                    </div>

                    <div className="modal-tags">
                        {displayTags.filter(t => t !== "✅ Verified").map(tag => (
                            <span key={tag} className="profile-tag">{tag}</span>
                        ))}
                    </div>
                </div>

                {/* Stats */}
                <div className="modal-stats">
                    <div className="stat">
                        <span className="label">Level</span>
                        <span className="value">{level}</span>
                    </div>
                    <div className="stat">
                        <span className="label">Hours</span>
                        <span className="value">{formatTime(totalTime)}</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="profile-actions">
                  <button 
                    className="action-btn primary"
                    onClick={() => {
                      closeProfile();
                      navigate("/chat", { state: { dmUser: { uid: selectedUserId, displayName, photoURL } } });
                    }}
                  >
                    <Send size={16} />
                    Send Message
                  </button>
                </div>
            </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
