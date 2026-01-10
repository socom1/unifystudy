// @ts-nocheck
import { toast } from "sonner";
import React, { useState, useEffect } from "react";
import { db, auth } from "@/services/firebaseConfig";
import { ref, onValue, update, runTransaction } from "firebase/database";
import { motion, AnimatePresence } from "framer-motion";
import { useGamification } from "@/context/GamificationContext";
import { THEMES } from "@/constants/themes";
import { ShoppingBag, Star, Layout, Palette, Image as ImageIcon, Check, Sparkles } from "lucide-react";
import Modal from "@/components/common/Modal";

// Import real assets
import NeonPreview from "@/assets/shop/neon-pack.svg";
import ThreeDPreview from "@/assets/shop/3d-pack.svg";
import HandDrawnPreview from "@/assets/shop/hand-drawn.svg";
import CosmosBanner from "@/assets/shop/cosmos-banner.svg";
import CircuitBanner from "@/assets/shop/circuit-banner.svg";
import WavesBanner from "@/assets/shop/waves-banner.svg";

import "./Shop.scss";

// Cleaned up inventory as requested
const PROFILE_TAGS = [
  { id: "scholar", name: "🎓 Scholar", description: "For the dedicated learner", price: 150, color: "#6c5ce7" },
  { id: "champion", name: "🏆 Champion", description: "Top performer", price: 500, color: "#ffd700" },
  { id: "night-owl", name: "🦉 Night Owl", description: "Studies past midnight", price: 200, color: "#4b6c82" },
  { id: "early-bird", name: "🌅 Early Bird", description: "Starts before dawn", price: 200, color: "#e17055" },
  { id: "coffee-club", name: "☕ Coffee Club", description: "Fueled by caffeine", price: 100, color: "#6f4e37" },
  { id: "verified", name: "✅ Verified", description: "Official status", price: 1000, color: "#00b894" },
  { id: "vip", name: "💎 VIP", description: "Very Important Pupil", price: 2000, color: "#E91E63" },
  { id: "legend", name: "👑 Legend", description: "Study Legend", price: 5000, color: "#FFD700" },
  { id: "goat", name: "🐐 G.O.A.T", description: "Greatest of All Time", price: 7500, color: "#fff" },
  { id: "coder", name: "👨‍💻 Coder", description: "Born to code", price: 300, color: "#00ff41" },
];

const ICON_SETS = [
  { id: "neon", name: "Neon Glow", description: "High-contrast neon style", price: 2500, preview: NeonPreview, type: "pack" },
  { id: "3d-pack", name: "3D Render", description: "Modern 3D style icons", price: 3000, preview: ThreeDPreview, type: "pack" },
  { id: "hand-drawn", name: "Hand Drawn", description: "Sketchy, organic look", price: 1800, preview: HandDrawnPreview, type: "pack" },
  { id: "minimal", name: "Minimalist", description: "Clean lines, no fuss", price: 1200, preview: null, type: "pack" },
  { id: "retro", name: "Retro Pixel", description: "8-bit nostalgia", price: 2200, preview: null, type: "pack" },
];

const BANNERS = [
  { id: "cosmos", name: "Cosmos", type: "svg", price: 500, preview: CosmosBanner },
  { id: "circuit", name: "Circuit", type: "svg", price: 450, preview: CircuitBanner },
  { id: "waves", name: "Teal Waves", type: "svg", price: 350, preview: WavesBanner },
  { id: "cyber", name: "Cyberpunk", type: "gradient", price: 200, preview: "#00d4ff" },
  { id: "matrix", name: "Matrix", type: "gradient", price: 200, preview: "#00ff41" },
  { id: "sunset", name: "Sunset", type: "gradient", price: 200, preview: "#f5576c" },
  { id: "galaxy", name: "Galaxy", type: "gradient", price: 300, preview: "linear-gradient(to right, #654ea3, #eaafc8)" },
  { id: "fire", name: "Inferno", type: "gradient", price: 300, preview: "linear-gradient(to right, #f12711, #f5af19)" },
];

export default function Shop() {
  const { level } = useGamification();
  const [coins, setCoins] = useState(0);
  const [userId, setUserId] = useState(null);
  const [activeTab, setActiveTab] = useState("all");

  // Inventory State
  const [unlockedThemes, setUnlockedThemes] = useState(["default"]);
  const [unlockedTags, setUnlockedTags] = useState([]);
  const [unlockedIcons, setUnlockedIcons] = useState(["default"]);
  const [unlockedBanners, setUnlockedBanners] = useState(["default"]);
  
  // Equipped State
  const [currentTheme, setCurrentTheme] = useState("default");
  const [equippedTag, setEquippedTag] = useState([]);
  const [currentIconSet, setCurrentIconSet] = useState("default");
  const [currentBanner, setCurrentBanner] = useState("default");

  // Purchase Modal State
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

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
        
        const settings = data.settings || {};
        const customization = settings.customization || {};

        setCurrentTheme(settings.theme || "default");
        setEquippedTag(customization.profileTags || []); 
        setCurrentIconSet(settings.iconSet || "default");
        setCurrentBanner(customization.profileBanner || "default");
      }
    });
    return () => unsub();
  }, [userId]);

  const initiatePurchase = (item, type) => {
    if (coins < item.price) {
      toast.error("Not enough Lumens!", { icon: "💎" });
      return;
    }
    setSelectedItem({ ...item, itemType: type });
    setShowPurchaseModal(true);
  };

  const confirmPurchase = async () => {
    if (!selectedItem || !userId) return;

    try {
      const { itemType, ...item } = selectedItem;

      await runTransaction(ref(db, `users/${userId}`), (user) => {
        if (user) {
          if ((user.currency || 0) >= item.price) {
            user.currency -= item.price;
            
            if (itemType === "theme") {
              if (!user.unlockedThemes) user.unlockedThemes = ["default"];
              if (!user.unlockedThemes.includes(item.id)) user.unlockedThemes.push(item.id);
            } else if (itemType === "tag") {
              if (!user.unlockedTags) user.unlockedTags = [];
              if (!user.unlockedTags.includes(item.id)) user.unlockedTags.push(item.id);
            } else if (itemType === "icon") {
              if (!user.unlockedIcons) user.unlockedIcons = ["default"];
              if (!user.unlockedIcons.includes(item.id)) user.unlockedIcons.push(item.id);
            } else if (itemType === "banner") {
              if (!user.unlockedBanners) user.unlockedBanners = ["default"];
              if (!user.unlockedBanners.includes(item.id)) user.unlockedBanners.push(item.id);
            }
          }
        }
        return user;
      });
      toast.success(`Purchased ${item.name}!`, { icon: "🎉" });
      setShowPurchaseModal(false);
      setSelectedItem(null);
    } catch (error) {
      console.error("Purchase failed:", error);
      toast.error("Purchase failed. Please try again.");
    }
  };

  const equipItem = async (type, id) => {
    if (!userId) return;
    
    try {
        if (type === 'theme') {
            await update(ref(db, `users/${userId}/settings`), { theme: id });
             await update(ref(db, `users/${userId}/settings/customization`), { theme: id });
            document.documentElement.setAttribute('data-theme', id);
        } else if (type === 'banner') {
            await update(ref(db, `users/${userId}/settings/customization`), { profileBanner: id });
        } else if (type === 'icon') {
            await update(ref(db, `users/${userId}/settings`), { iconSet: id });
        } else if (type === 'tag') {
            toast.info("Go to Profile to manage active tags!");
            return;
        }
        toast.success("Equipped!");
    } catch(e) {
        console.error(e);
        toast.error("Failed to equip item.");
    }
  };

  const renderItemCard = (item, type, isUnlocked, isEquipped) => (
    <motion.div 
      layout
      key={`${type}-${item.id}`} 
      className={`marketplace-card ${isEquipped ? 'equipped' : ''} ${isUnlocked ? 'owned' : ''}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
    >
        <div className={`card-preview preview-${type}`} style={{
            background: type === 'theme' ? item.color : 
                        type === 'banner' && item.type === 'gradient' ? item.preview : 'var(--bg-2)'
        }}>
           {/* SVG / Image asset rendering */}
           {type === 'icon' && item.preview && (
              <img src={item.preview} alt={item.name} className="asset-preview" />
           )}
           {type === 'icon' && !item.preview && (
              <span className="icon-display">📚</span>
           )}
           
           {/* Banner SVG Rendering */}
           {type === 'banner' && item.type === 'svg' && (
              <img src={item.preview} alt={item.name} className="asset-preview banner-asset" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
           )}

           {type === 'tag' && <span className="tag-display" style={{borderColor: item.color}}>{item.name.split(' ')[0]}</span>}
             
           {isEquipped && <div className="status-badge"><Check size={12} /> Active</div>}
        </div>
        
        <div className="card-content">
            <div className="card-header">
                <h3>{item.name}</h3>
                <span className="item-type-badge">{type}</span>
            </div>
            <p className="description">{item.description || `${type} item`}</p>
            
            <div className="card-footer">
                {!isUnlocked ? (
                    <button className="btn-buy" onClick={() => initiatePurchase(item, type)}>
                        <span className="price">{item.price}</span>
                        <span className="currency-icon">💡</span>
                    </button>
                ) : (
                    <button className="btn-equip" disabled={isEquipped} onClick={() => equipItem(type, item.id)}>
                        {isEquipped ? "Equipped" : "Equip"}
                    </button>
                )}
            </div>
        </div>
    </motion.div>
  );

  return (
    <div className="shop-marketplace">
      <header className="marketplace-header">
        <div className="header-content">
            <div className="title-section">
                <h1>Marketplace</h1>
                <p>Updated Marketplace Inventory</p>
            </div>
            
            <div className="balance-card">
                <div className="lumens-display">
                    <Sparkles className="icon-sparkle" size={20} />
                    <span className="amount">{coins}</span>
                    <span className="label">Lumens</span>
                </div>
            </div>
        </div>
      </header>

      {/* --- Responsive Navigation that wraps --- */}
      <nav className="marketplace-nav">
         <button className={activeTab === 'all' ? 'active' : ''} onClick={() => setActiveTab('all')}>
            <Star size={18} /> All
         </button>
         <button className={activeTab === 'themes' ? 'active' : ''} onClick={() => setActiveTab('themes')}>
            <Palette size={18} /> Themes
         </button>
         <button className={activeTab === 'icons' ? 'active' : ''} onClick={() => setActiveTab('icons')}>
            <Layout size={18} /> Icon Sets
         </button>
         <button className={activeTab === 'banners' ? 'active' : ''} onClick={() => setActiveTab('banners')}>
            <ImageIcon size={18} /> Banners
         </button>
         <button className={activeTab === 'tags' ? 'active' : ''} onClick={() => setActiveTab('tags')}>
            <ShoppingBag size={18} /> Tags
         </button>
      </nav>

      <main className="marketplace-content">
         <motion.div className="grid-layout" layout>
             <AnimatePresence>
                {(activeTab === 'all' || activeTab === 'themes') && THEMES
                    .filter(i => i.id !== 'default')
                    .map(i => renderItemCard(i, 'theme', unlockedThemes.includes(i.id), currentTheme === i.id))}
                
                {(activeTab === 'all' || activeTab === 'icons') && ICON_SETS
                    .filter(i => i.id !== 'default')
                    .map(i => renderItemCard(i, 'icon', unlockedIcons.includes(i.id), currentIconSet === i.id))}
                
                {(activeTab === 'all' || activeTab === 'banners') && BANNERS
                    .filter(i => i.id !== 'default')
                    .map(i => renderItemCard(i, 'banner', unlockedBanners.includes(i.id), currentBanner === i.id))}
                
                {(activeTab === 'all' || activeTab === 'tags') && PROFILE_TAGS.map(i => {
                    const isEquipped = Array.isArray(equippedTag) && equippedTag.includes(i.id);
                    return renderItemCard(i, 'tag', unlockedTags.includes(i.id), isEquipped);
                })}
             </AnimatePresence>
         </motion.div>
      </main>

      <Modal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        title="Confirm Purchase"
        footer={
          <div style={{ display: 'flex', gap: '10px', width: '100%', justifyContent: 'flex-end' }}>
             <button 
                className="btn-secondary" 
                onClick={() => setShowPurchaseModal(false)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#ccc', cursor: 'pointer' }}
             >
                Cancel
             </button>
             <button 
                className="btn-primary" 
                onClick={confirmPurchase}
                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: 'var(--color-primary)', color: '#000', fontWeight: 'bold', cursor: 'pointer' }}
             >
                Confirm Purchase
             </button>
          </div>
        }
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
           {selectedItem && (
               <>
                 <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                    {selectedItem.itemType === 'theme' ? '🎨' : selectedItem.itemType === 'icon' ? '📚' : selectedItem.itemType === 'banner' ? '🖼️' : '🏷️'}
                 </div>
                 <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{selectedItem.name}</h2>
                 <p style={{ color: 'var(--color-muted)', marginBottom: '1.5rem' }}>
                    Are you sure you want to purchase this item for <strong>{selectedItem.price} Lumens</strong>?
                 </p>
                 <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', display: 'inline-block' }}>
                    Your new balance will be: <strong style={{ color: 'var(--color-primary)' }}>{coins - selectedItem.price}</strong>
                 </div>
               </>
           )}
        </div>
      </Modal>
    </div>
  );
}
