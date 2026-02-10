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

import { BANNERS, PROFILE_TAGS } from "@/constants/shopItems";

import "./Shop.scss";

export default function Shop() {
  const { level } = useGamification();
  const [coins, setCoins] = useState(0);
  const [userId, setUserId] = useState(null);
  const [activeTab, setActiveTab] = useState("all");

  // Inventory State
  const [unlockedThemes, setUnlockedThemes] = useState(["default"]);
  const [unlockedTags, setUnlockedTags] = useState([]);
  const [unlockedBanners, setUnlockedBanners] = useState(["default"]);
  
  // Equipped State
  const [currentTheme, setCurrentTheme] = useState("default");
  const [equippedTag, setEquippedTag] = useState([]);
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
        setUnlockedBanners(data.unlockedBanners || ["default"]);
        
        const settings = data.settings || {};
        const customization = settings.customization || {};

        setCurrentTheme(customization.theme || settings.theme || "default");
        setEquippedTag(customization.profileTags || []); 
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
                    {selectedItem.itemType === 'theme' ? '🎨' : selectedItem.itemType === 'banner' ? '🖼️' : '🏷️'}
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
