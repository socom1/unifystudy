// @ts-nocheck
import React, { useState, useEffect } from "react";
import { db, auth } from "@/services/firebaseConfig";
import { ref, onValue, update, runTransaction } from "firebase/database";
import { motion } from "framer-motion";
import { THEMES } from "@/constants/themes";
import "./Shop.scss";

const PROFILE_TAGS = [
  { id: "scholar", name: "🎓 Scholar", description: "For the dedicated learner", price: 150, color: "#6c5ce7" },
  { id: "grinder", name: "⚡ Grinder", description: "Non-stop hustle", price: 250, color: "#ff0055" },
  { id: "night-owl", name: "🦉 Night Owl", description: "Studies past midnight", price: 200, color: "#4b6c82" },
  { id: "early-bird", name: "🌅 Early Bird", description: "Starts before dawn", price: 200, color: "#e17055" },
  { id: "champion", name: "🏆 Champion", description: "Top performer", price: 500, color: "#ffd700" },
  { id: "zen-master", name: "🧘 Zen Master", description: "Focused and calm", price: 300, color: "#00b894" },
];

const ICON_SETS = [
  { id: "default", name: "Classic", description: "Standard icon pack", price: 0, preview: "📚" },
  { id: "minimalist", name: "Minimalist Pro", description: "Clean, distraction-free", price: 1500, preview: "○" },
  { id: "neon", name: "Cyber Glow", description: "High-contrast neon", price: 2500, preview: "◆" },
  { id: "gold", name: "Luxury Gold", description: "Exclusive gold finish", price: 5000, preview: "⚜️" },
  { id: "retro", name: "Retro Pixel", description: "8-bit nostalgia", price: 1200, preview: "▣" },
];

const BANNERS = [
  { id: "default", name: "Default", type: "gradient", price: 0, preview: "#667eea" },
  // Emoji Banners
  { id: "rocket", name: "🚀 Rocket", type: "emoji", price: 50, preview: "🚀" },
  { id: "laptop", name: "💻 Laptop", type: "emoji", price: 50, preview: "💻" },
  { id: "moon", name: "🌙 Moon", type: "emoji", price: 75, preview: "🌙" },
  { id: "lightning", name: "⚡ Lightning", type: "emoji", price: 75, preview: "⚡" },
  { id: "fire", name: "🔥 Fire", type: "emoji", price: 100, preview: "🔥" },
  { id: "star", name: "⭐ Star", type: "emoji", price: 100, preview: "⭐" },
  { id: "brain", name: "🧠 Brain", type: "emoji", price: 120, preview: "🧠" },
  { id: "trophy", name: "🏆 Trophy", type: "emoji", price: 150, preview: "🏆" },
  // Solid Banners (formerly gradients)
  { id: "sunset", name: "Sunset", type: "gradient", price: 100, preview: "#f5576c" },
  { id: "ocean", name: "Ocean", type: "gradient", price: 100, preview: "#4facfe" },
  { id: "forest", name: "Forest", type: "gradient", price: 100, preview: "#43e97b" },
  { id: "aurora", name: "Aurora", type: "gradient", price: 150, preview: "#6c5ce7" },
  { id: "cyber", name: "Cyberpunk", type: "gradient", price: 200, preview: "#00d4ff" },
  { id: "matrix", name: "Matrix", type: "gradient", price: 200, preview: "#00ff41" },
];

export default function Shop() {
  const [coins, setCoins] = useState(0);
  const [unlockedThemes, setUnlockedThemes] = useState(["default"]);
  const [unlockedTags, setUnlockedTags] = useState([]);
  const [unlockedIcons, setUnlockedIcons] = useState(["default"]);
  const [unlockedBanners, setUnlockedBanners] = useState(["default"]);
  const [currentTheme, setCurrentTheme] = useState("default");
  const [equippedTag, setEquippedTag] = useState(null);
  const [currentIconSet, setCurrentIconSet] = useState("default");
  const [currentBanner, setCurrentBanner] = useState("default");
  const [userId, setUserId] = useState(null);
  const [activeTab, setActiveTab] = useState("themes"); // "themes" | "tags" | "icons" | "banners"

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUserId(u ? u.uid : null));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const userRef = ref(db, `users/${userId}`);
    const unsub = onValue(userRef, (snap) => {
      const data = snap.val();
      if (data) {
        setCoins(data.currency || 0);
        setUnlockedThemes(data.unlockedThemes || ["default"]);
        setUnlockedTags(data.unlockedTags || []);
        setUnlockedIcons(data.unlockedIcons || ["default"]);
        setUnlockedBanners(data.unlockedBanners || ["default"]);
        setCurrentTheme(data.settings?.theme || "default");
        setEquippedTag(data.settings?.profileTag || null);
        setCurrentIconSet(data.settings?.iconSet || "default");
        setCurrentBanner(data.settings?.banner || "default");
      }
    });
    return () => unsub();
  }, [userId]);

  const buyItem = async (item, type) => {
    if (coins < item.price) {
      alert("Not enough Lumens!");
      return;
    }
    if (!confirm(`Buy ${item.name} for ${item.price} Lumens?`)) return;

    try {
      await runTransaction(ref(db, `users/${userId}`), (user) => {
        if (user) {
          if ((user.currency || 0) >= item.price) {
            user.currency -= item.price;
            
            if (type === "theme") {
              if (!user.unlockedThemes) user.unlockedThemes = ["default"];
              if (!user.unlockedThemes.includes(item.id)) {
                user.unlockedThemes.push(item.id);
              }
            } else if (type === "tag") {
              if (!user.unlockedTags) user.unlockedTags = [];
              if (!user.unlockedTags.includes(item.id)) {
                user.unlockedTags.push(item.id);
              }
            } else if (type === "icon") {
              if (!user.unlockedIcons) user.unlockedIcons = ["default"];
              if (!user.unlockedIcons.includes(item.id)) {
                user.unlockedIcons.push(item.id);
              }
            } else if (type === "banner") {
              if (!user.unlockedBanners) user.unlockedBanners = ["default"];
              if (!user.unlockedBanners.includes(item.id)) {
                user.unlockedBanners.push(item.id);
              }
            }
          }
        }
        return user;
      });
    } catch (error) {
      console.error("Purchase failed:", error);
      alert("Purchase failed. Please try again.");
    }
  };

  const equipTheme = (themeId) => {
    update(ref(db, `users/${userId}/settings`), { theme: themeId });
    document.body.className = `theme-${themeId}`;
  };

  const equipTag = (tagId) => {
    update(ref(db, `users/${userId}/settings`), { profileTag: tagId });
  };

  const equipIconSet = (iconSetId) => {
    update(ref(db, `users/${userId}/settings`), { iconSet: iconSetId });
  };

  const equipBanner = (bannerId) => {
    update(ref(db, `users/${userId}/settings`), { banner: bannerId });
  };

  return (
    <div className="shop-root">
      <header className="shop-header">
        <h1>Shop</h1>
        <div className="coin-balance">
          <span className="icon">💡</span>
          <span className="amount">{coins}</span>
        </div>
      </header>

      <div className="shop-tabs">
        <button 
          className={activeTab === "themes" ? "active" : ""}
          onClick={() => setActiveTab("themes")}
        >
          🎨 Themes
        </button>
        <button 
          className={activeTab === "tags" ? "active" : ""}
          onClick={() => setActiveTab("tags")}
        >
          🏷️ Profile Tags
        </button>
        <button 
          className={activeTab === "icons" ? "active" : ""}
          onClick={() => setActiveTab("icons")}
        >
          ✨ Icon Sets
        </button>
        <button 
          className={activeTab === "banners" ? "active" : ""}
          onClick={() => setActiveTab("banners")}
        >
          🎨 Banners
        </button>
      </div>

      {activeTab === "themes" && (
        <div className="items-grid">
          {THEMES.map(theme => {
            const isUnlocked = unlockedThemes.includes(theme.id);
            const isEquipped = currentTheme === theme.id;

            return (
              <motion.div 
                key={theme.id} 
                className={`item-card ${isEquipped ? 'equipped' : ''}`}
                whileHover={{ y: -5 }}
              >
                <div className="preview theme-preview" style={{ background: theme.color }}>
                  {isEquipped && <span className="badge">Equipped</span>}
                </div>
                <div className="info">
                  <h3>{theme.name}</h3>
                  <div className="price">
                    {isUnlocked ? "Owned" : `${theme.price} Lumens`}
                  </div>
                </div>
                <div className="actions">
                  {isUnlocked ? (
                    <button 
                      className="equip-btn" 
                      disabled={isEquipped}
                      onClick={() => equipTheme(theme.id)}
                    >
                      {isEquipped ? "Active" : "Equip"}
                    </button>
                  ) : (
                    <button 
                      className="buy-btn"
                      onClick={() => buyItem(theme, "theme")}
                    >
                      Buy
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {activeTab === "tags" && (
        <div className="items-grid">
          {PROFILE_TAGS.map(tag => {
            const isUnlocked = unlockedTags.includes(tag.id);
            const isEquipped = equippedTag === tag.id;

            return (
              <motion.div 
                key={tag.id} 
                className={`item-card ${isEquipped ? 'equipped' : ''}`}
                whileHover={{ y: -5 }}
              >
                <div className="preview tag-preview" style={{ borderColor: tag.color }}>
                  <span style={{ fontSize: '3rem' }}>{tag.name.split(' ')[0]}</span>
                  {isEquipped && <span className="badge">Equipped</span>}
                </div>
                <div className="info">
                  <h3>{tag.name}</h3>
                  <p className="description">{tag.description}</p>
                  <div className="price">
                    {isUnlocked ? "Owned" : `${tag.price} Lumens`}
                  </div>
                </div>
                <div className="actions">
                  {isUnlocked ? (
                    <button 
                      className="equip-btn" 
                      disabled={isEquipped}
                      onClick={() => equipTag(tag.id)}
                    >
                      {isEquipped ? "Active" : "Equip"}
                    </button>
                  ) : (
                    <button 
                      className="buy-btn"
                      onClick={() => buyItem(tag, "tag")}
                    >
                      Buy
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {activeTab === "icons" && (
        <div className="items-grid">
          {ICON_SETS.map(iconSet => {
            const isUnlocked = unlockedIcons.includes(iconSet.id);
            const isEquipped = currentIconSet === iconSet.id;

            return (
              <motion.div 
                key={iconSet.id} 
                className={`item-card ${isEquipped ? 'equipped' : ''}`}
                whileHover={{ y: -5 }}
              >
                <div className="preview icon-preview">
                  <span style={{ fontSize: '4rem' }}>{iconSet.preview}</span>
                  {isEquipped && <span className="badge">Equipped</span>}
                </div>
                <div className="info">
                  <h3>{iconSet.name}</h3>
                  <p className="description">{iconSet.description}</p>
                  <div className="price">
                    {isUnlocked ? "Owned" : `${iconSet.price} Lumens`}
                  </div>
                </div>
                <div className="actions">
                  {isUnlocked ? (
                    <button 
                      className="equip-btn" 
                      disabled={isEquipped}
                      onClick={() => equipIconSet(iconSet.id)}
                    >
                      {isEquipped ? "Active" : "Equip"}
                    </button>
                  ) : (
                    <button 
                      className="buy-btn"
                      onClick={() => buyItem(iconSet, "icon")}
                    >
                      Buy
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {activeTab === "banners" && (
        <div className="items-grid">
          {BANNERS.map(banner => {
            const isUnlocked = unlockedBanners.includes(banner.id);
            const isEquipped = currentBanner === banner.id;

            return (
              <motion.div 
                key={banner.id} 
                className={`item-card ${isEquipped ? 'equipped' : ''}`}
                whileHover={{ y: -5 }}
              >
                <div 
                  className="preview banner-preview" 
                  style={{
                    background: banner.type === 'gradient' ? banner.preview : '#1e1e1e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: banner.type === 'emoji' ? '5rem' : '1rem'
                  }}
                >
                  {banner.type === 'emoji' ? banner.preview : ''}
                  {isEquipped && <span className="badge">Equipped</span>}
                </div>
                <div className="info">
                  <h3>{banner.name}</h3>
                  <div className="price">
                    {isUnlocked ? "Owned" : `${banner.price} Lumens`}
                  </div>
                </div>
                <div className="actions">
                  {isUnlocked ? (
                    <button 
                      className="equip-btn" 
                      disabled={isEquipped}
                      onClick={() => equipBanner(banner.id)}
                    >
                      {isEquipped ? "Active" : "Equip"}
                    </button>
                  ) : (
                    <button 
                      className="buy-btn"
                      onClick={() => buyItem(banner, "banner")}
                    >
                      Buy
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
