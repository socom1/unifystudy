
import React, { useState, useEffect, useRef } from "react";
import { db, auth, storage } from "../firebase"; // Added storage
import { 
  ref, 
  onValue, 
  push, 
  set, 
  serverTimestamp, 
  query, 
  orderByChild, 
  limitToLast,
  get 
} from "firebase/database";
import { 
  ref as storageRef, 
  uploadBytes, 
  getDownloadURL 
} from "firebase/storage"; // Storage functions
import { motion, AnimatePresence } from "framer-motion";
import { Send, Hash, Users, Code, Terminal, MoreVertical, Search, AlertCircle, Plus, Lock, Paperclip, File, Menu, X } from "lucide-react"; // Added Paperclip, File, Menu, X
import "./Chat.scss";

const UserAvatar = ({ photoURL, displayName, avatarColor, className }) => {
  const [imgFailed, setImgFailed] = useState(false);

  if (photoURL && !imgFailed) {
    return (
      <img 
        src={photoURL} 
        alt="avatar" 
        className={className} 
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div 
      className={`avatar-placeholder ${className}`} // Added className here
      style={{ background: avatarColor || '#21262d', color: 'white' }}
    >
      {displayName ? displayName[0] : "?"}
    </div>
  );
};

const Chat = () => { // Changed to functional component declaration
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [user, setUser] = useState(null);
  const [anonymousMode, setAnonymousMode] = useState(false);
  const [avatarColor, setAvatarColor] = useState("#333"); // Changed default avatar color
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null); // Ref for file input
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Channels State
  const [activeChannel, setActiveChannel] = useState("global"); // 'global', 'math', 'science', or private ID
  const [activeChannelName, setActiveChannelName] = useState("global-chat");
  const [privateChannels, setPrivateChannels] = useState([]);
  const [directMessages, setDirectMessages] = useState([]);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  
  // DM State
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false); // New state to distinguish mode
  const [allUsers, setAllUsers] = useState([]);
  const [userSearch, setUserSearch] = useState(""); // Search state for picker
  
  // Rename State
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  // Mobile State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // New state for mobile menu

  const subjects = [
    { id: "math", name: "mathematics" },
    { id: "science", name: "science" },
    { id: "history", name: "history" },
    { id: "cs", name: "computer-science" }
  ];

  // Track logged-in user & settings
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u) {
        // Fetch settings
        const settingsRef = ref(db, `users/${u.uid}/settings`);
        onValue(settingsRef, (snap) => {
          const val = snap.val();
          setAnonymousMode(val?.anonymousMode === true);
          if (val?.customization?.avatarColor) {
            setAvatarColor(val.customization.avatarColor);
          }
        });

        // Fetch user's channels (Private & DMs)
        const userChannelsRef = ref(db, `users/${u.uid}/channels`);
        onValue(userChannelsRef, (snap) => {
          const channelIds = snap.val() ? Object.keys(snap.val()) : [];
          if (channelIds.length > 0) {
            // Fetch details for each channel
            channelIds.forEach(cid => {
              onValue(ref(db, `channels/${cid}/metadata`), (metaSnap) => {
                if (metaSnap.exists()) {
                  const meta = metaSnap.val();
                  if (meta.type === 'dm') {
                    setDirectMessages(prev => {
                      const filtered = prev.filter(p => p.id !== cid);
                      return [...filtered, { id: cid, ...meta }];
                    });
                  } else {
                    setPrivateChannels(prev => {
                      const filtered = prev.filter(p => p.id !== cid);
                      return [...filtered, { id: cid, ...meta }];
                    });
                  }
                }
              });
            });
          }
        });
      } else {
        setPrivateChannels([]);
        setDirectMessages([]);
      }
    });
    return unsubscribe;
  }, []);

  // Fetch all users for DM picker
  useEffect(() => {
    if (showUserPicker) {
      get(ref(db, 'users')).then((snapshot) => {
        if (snapshot.exists()) {
          const usersList = Object.entries(snapshot.val()).map(([uid, data]) => ({
            uid,
            displayName: data.displayName || "Unknown",
            photoURL: data.photoURL,
            avatarColor: data.settings?.customization?.avatarColor
          })).filter(u => u.uid !== user?.uid); // Exclude self
          setAllUsers(usersList);
        }
      });
    }
  }, [showUserPicker, user]);

  // Load messages for active channel
  useEffect(() => {
    setError(null);
    setLoading(true);
    setMessages([]);
    setMobileMenuOpen(false); // Close mobile menu on channel switch

    let path = "global_chat";
    if (activeChannel !== "global" && !subjects.find(s => s.id === activeChannel)) {
      // It's a private channel or DM
      path = `channels/${activeChannel}/messages`;
    } else if (activeChannel !== "global") {
      // It's a subject channel
      path = `channels/${activeChannel}`; // e.g. channels/math
    }

    const chatRef = query(ref(db, path), orderByChild("timestamp"), limitToLast(50));
    
    const unsubscribe = onValue(chatRef, 
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const loadedMessages = Object.entries(data).map(([id, val]) => ({
            id,
            ...val,
          }));
          loadedMessages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
          
          // Check for new messages and increment unread for other participants
          // REMOVED: Logic moved to Sidebar.jsx for background notifications
          
          setMessages(loadedMessages);
        } else {
          setMessages([]);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Chat Error:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [activeChannel]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Clear unread messages when viewing chat
  useEffect(() => {
    if (user && messages.length > 0) {
      // Reset unread count when user is viewing chat
      const unreadRef = ref(db, `users/${user.uid}/unreadMessages`);
      set(unreadRef, 0).catch(err => console.error("Failed to clear unread:", err));
      
      // Update last seen timestamp
      const lastSeenRef = ref(db, `users/${user.uid}/lastSeenChat/${activeChannel}`);
      set(lastSeenRef, Date.now()).catch(err => console.error("Failed to update last seen:", err));
    }
  }, [messages, user, activeChannel]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    try {
      let path = "global_chat";
      if (activeChannel !== "global" && !subjects.find(s => s.id === activeChannel)) {
        path = `channels/${activeChannel}/messages`;
      } else if (activeChannel !== "global") {
        path = `channels/${activeChannel}`;
      }

      const chatRef = ref(db, path);
      const newMsgRef = push(chatRef);

      const messageData = {
        text: newMessage,
        uid: user.uid,
        displayName: anonymousMode ? "Anonymous Student" : (user.displayName || "Student"),
        photoURL: anonymousMode ? null : user.photoURL,
        avatarColor: anonymousMode ? "#333" : avatarColor,
        isAnonymous: anonymousMode,
        timestamp: serverTimestamp(),
        type: 'text' // Added type for text messages
      };

      await set(newMsgRef, messageData);
      setNewMessage("");
    } catch (err) {
      console.error("Send Error:", err);
      setError("Failed to send message: " + err.message);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    try {
      // Create storage ref
      const fileRef = storageRef(storage, `chat_uploads/${activeChannel}/${Date.now()}_${file.name}`);
      
      // Upload
      await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(fileRef);

      // Send message with type
      let path = "global_chat";
      if (activeChannel !== "global" && !subjects.find(s => s.id === activeChannel)) {
        path = `channels/${activeChannel}/messages`;
      } else if (activeChannel !== "global") {
        path = `channels/${activeChannel}`;
      }

      const chatRef = ref(db, path);
      const newMsgRef = push(chatRef);

      const messageData = {
        text: file.name, // Fallback text
        fileURL: downloadURL,
        fileName: file.name,
        type: file.type.startsWith('image/') ? 'image' : 'file',
        uid: user.uid,
        displayName: anonymousMode ? "Anonymous Student" : (user.displayName || "Student"),
        photoURL: anonymousMode ? null : user.photoURL,
        avatarColor: anonymousMode ? "#333" : avatarColor,
        isAnonymous: anonymousMode,
        timestamp: serverTimestamp(),
      };

      await set(newMsgRef, messageData);
      // Clear the file input after upload
      e.target.value = null;
    } catch (err) {
      console.error("Upload Error:", err);
      setError("Failed to upload file: " + err.message);
    }
  };

  const createPrivateChannel = async () => {
    if (!newChannelName.trim() || !user) return;
    try {
      const newChannelRef = push(ref(db, "channels"));
      const channelId = newChannelRef.key;
      
      // Set metadata
      await set(ref(db, `channels/${channelId}/metadata`), {
        name: newChannelName,
        createdBy: user.uid,
        type: 'private',
        participants: { [user.uid]: true },
        createdAt: serverTimestamp()
      });

      // Add to user's channels
      await set(ref(db, `users/${user.uid}/channels/${channelId}`), true);

      setNewChannelName("");
      setShowCreateChannel(false);
      setActiveChannel(channelId);
      setActiveChannelName(newChannelName);
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  const startDM = async (targetUser) => {
    if (!user) return;
    
    // Deterministic Channel ID
    const uid1 = user.uid < targetUser.uid ? user.uid : targetUser.uid;
    const uid2 = user.uid < targetUser.uid ? targetUser.uid : user.uid;
    const channelId = `dm_${uid1}_${uid2}`;

    try {
      // Check if exists (or just overwrite metadata, it's fine)
      await set(ref(db, `channels/${channelId}/metadata`), {
        type: 'dm',
        participants: {
          [user.uid]: true,
          [targetUser.uid]: true
        },
        lastUpdated: serverTimestamp()
      });

      // Add to both users' channels
      await set(ref(db, `users/${user.uid}/channels/${channelId}`), true);
      await set(ref(db, `users/${targetUser.uid}/channels/${channelId}`), true);

      setActiveChannel(channelId);
      setActiveChannelName(targetUser.displayName);
      setShowUserPicker(false);
      setUserSearch(""); // Reset search
    } catch (err) {
      console.error("Start DM Error:", err);
      setError(err.message);
    }
  };

  const addUserToChannel = async (targetUser) => {
    if (!user || activeChannel === 'global' || subjects.find(s => s.id === activeChannel)) return;
    
    try {
      // Add to channel participants
      await set(ref(db, `channels/${activeChannel}/metadata/participants/${targetUser.uid}`), true);
      
      // Add to user's channel list
      await set(ref(db, `users/${targetUser.uid}/channels/${activeChannel}`), true);
      
      setShowUserPicker(false);
      setIsAddingUser(false);
      setUserSearch(""); // Reset search
      alert(`${targetUser.displayName} added to channel!`);
    } catch (err) {
      console.error("Add User Error:", err);
      setError(err.message);
    }
  };

  const renameChat = async () => {
    if (!renameValue.trim() || !activeChannel) return;
    try {
      await set(ref(db, `channels/${activeChannel}/metadata/name`), renameValue);
      setActiveChannelName(renameValue);
      setShowRenameModal(false);
      setRenameValue("");
    } catch (err) {
      console.error("Rename Error:", err);
      setError(err.message);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isPrivateOrDM = activeChannel !== 'global' && !subjects.find(s => s.id === activeChannel);

  // Filter users based on search
  const filteredUsers = allUsers.filter(u => 
    u.displayName.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="chat-layout">
      {/* User Picker Modal */}
      <AnimatePresence>
        {showUserPicker && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setShowUserPicker(false); setIsAddingUser(false); setUserSearch(""); }}
          >
            <motion.div 
              className="user-picker-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <h3>{isAddingUser ? "Add People" : "Start a Conversation"}</h3>
              
              {/* Search Input */}
              <div className="create-channel-input" style={{ padding: '0 0.5rem 0.5rem 0.5rem' }}>
                <input 
                  autoFocus
                  placeholder="Search users..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #30363d', background: '#0d1117', color: '#c9d1d9' }}
                />
              </div>

              <div className="user-list">
                {filteredUsers.map(u => (
                  <div key={u.uid} className="user-item" onClick={() => isAddingUser ? addUserToChannel(u) : startDM(u)}>
                    <UserAvatar 
                      photoURL={u.photoURL} 
                      displayName={u.displayName} 
                      avatarColor={u.avatarColor}
                      className="picker-avatar"
                    />
                    <span>{u.displayName}</span>
                  </div>
                ))}
                {filteredUsers.length === 0 && (
                  <div style={{ padding: '1rem', textAlign: 'center', color: '#8b949e' }}>
                    No users found
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rename Modal */}
      <AnimatePresence>
        {showRenameModal && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowRenameModal(false)}
          >
            <motion.div 
              className="user-picker-modal" // Reusing style
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ height: 'auto', padding: '1rem' }}
            >
              <h3>Rename Channel</h3>
              <div className="create-channel-input" style={{ marginTop: '1rem' }}>
                <input 
                  autoFocus
                  placeholder="New Channel Name"
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && renameChat()}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', gap: '0.5rem' }}>
                <button className="btn" onClick={() => setShowRenameModal(false)} style={{ padding: '0.5rem 1rem', background: 'transparent', color: '#8b949e', border: '1px solid #30363d', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button className="btn primary" onClick={renameChat} style={{ padding: '0.5rem 1rem', background: '#238636', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Save</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left Sidebar - Channels */}
      <div className={`chat-sidebar ${mobileMenuOpen ? 'open' : ''}`}> {/* Added 'open' class for mobile */}
        <div className="sidebar-header">
          <div className="search-bar">
            <Search size={16} />
            <input type="text" placeholder="Search..." />
          </div>
          {/* Mobile Close Button */}
          <div className="mobile-close" onClick={() => setMobileMenuOpen(false)}>
            <X size={20} />
          </div>
        </div>
        
        <div className="channels-list">
          <div className="section-label">PUBLIC</div>
          <div 
            className={`channel-item ${activeChannel === 'global' ? 'active' : ''}`}
            onClick={() => { setActiveChannel('global'); setActiveChannelName('global-chat'); }}
          >
            <Hash size={18} />
            <span>global-chat</span>
          </div>
          
          <div className="section-label mt-4">SUBJECTS</div>
          {subjects.map(sub => (
            <div 
              key={sub.id}
              className={`channel-item ${activeChannel === sub.id ? 'active' : ''}`}
              onClick={() => { setActiveChannel(sub.id); setActiveChannelName(sub.name); }}
            >
              <Hash size={18} />
              <span>{sub.name}</span>
            </div>
          ))}

          <div className="section-label mt-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>PRIVATE</span>
            <Plus size={14} style={{ cursor: 'pointer' }} onClick={() => setShowCreateChannel(true)} />
          </div>
          
          {showCreateChannel && (
            <div className="create-channel-input">
              <input 
                autoFocus
                placeholder="Channel Name"
                value={newChannelName}
                onChange={e => setNewChannelName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createPrivateChannel()}
              />
            </div>
          )}

          {privateChannels.map(pc => (
            <div 
              key={pc.id}
              className={`channel-item ${activeChannel === pc.id ? 'active' : ''}`}
              onClick={() => { setActiveChannel(pc.id); setActiveChannelName(pc.name); }}
            >
              <Lock size={16} />
              <span>{pc.name}</span>
            </div>
          ))}

          <div className="section-label mt-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>DIRECT MESSAGES</span>
            <Plus size={14} style={{ cursor: 'pointer' }} onClick={() => { setIsAddingUser(false); setShowUserPicker(true); }} />
          </div>

          {directMessages.map(dm => {
            return (
              <div 
                key={dm.id}
                className={`channel-item ${activeChannel === dm.id ? 'active' : ''}`}
                onClick={() => { setActiveChannel(dm.id); setActiveChannelName("Direct Message"); }}
              >
                <Users size={16} />
                <span>Chat</span>
              </div>
            );
          })}

          {directMessages.length === 0 && (
            <div className="dm-placeholder">
              <span>No active chats</span>
            </div>
          )}
        </div>

        <div className="user-status-bar">
          <div className={`status-dot ${user ? 'online' : 'offline'}`}></div>
          <div className="user-info">
            <span className="name">{user ? (anonymousMode ? "Anonymous Mode" : (user.displayName || "User")) : "Guest"}</span>
            {!user && <span className="login-hint">Log in to chat</span>}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="chat-main">
        <div className="chat-header">
          <div className="mobile-menu-btn" onClick={() => setMobileMenuOpen(true)}>
            <Menu size={24} />
          </div>
          <div className="channel-info">
            {activeChannel === 'global' || subjects.find(s => s.id === activeChannel) ? <Hash size={20} className="text-muted" /> : <Lock size={20} className="text-muted" />}
            <h3>{activeChannelName}</h3>
            <span className="topic">
              {activeChannel === 'global' ? "General discussion" : 
               subjects.find(s => s.id === activeChannel) ? `Study help for ${activeChannelName}` : "Private Group"}
            </span>
          </div>
          <div className="header-actions">
            {isPrivateOrDM && (
              <>
                <Users size={20} onClick={() => { setIsAddingUser(true); setShowUserPicker(true); }} title="Add People" />
                <MoreVertical size={20} onClick={() => { setRenameValue(activeChannelName); setShowRenameModal(true); }} title="Rename Chat" />
              </>
            )}
          </div>
        </div>

        <div className="messages-container">
          {loading ? (
            <div className="loading">
              <div className="spinner"></div> {/* Updated loading spinner */}
              <p>Loading messages...</p> {/* Updated loading text */}
            </div>
          ) : error ? (
            <div className="error-state">
              <AlertCircle size={32} color="#f85149" />
              <h3>Connection Error</h3>
              <p>{error}</p>
              <p className="sub-text">Check your internet or database rules.</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="empty-state">
              <Hash size={48} color="#30363d" />
              <h3>Welcome to #{activeChannelName}!</h3>
              <p>Be the first to say hello.</p>
            </div>
          ) : (
            <div className="messages-list">
              {messages.map((msg, index) => {
                const isMe = user && msg.uid === user.uid;
                const showAvatar = index === 0 || messages[index - 1].uid !== msg.uid;
                
                return (
                  <motion.div
                    key={msg.id}
                    className={`message-group ${isMe ? "me" : ""}`}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {showAvatar && (
                      <div className="message-avatar">
                        <UserAvatar 
                          photoURL={msg.photoURL}
                          displayName={msg.displayName}
                          avatarColor={msg.avatarColor}
                        />
                      </div>
                    )}
                    
                    <div className="message-content">
                      {showAvatar && (
                        <div className="message-meta">
                          <span className="sender">{msg.displayName}</span>
                          <span className="timestamp">{formatTime(msg.timestamp)}</span>
                        </div>
                      )}
                      {msg.type === 'image' ? (
                        <div className="message-image">
                          <img src={msg.fileURL} alt="Uploaded content" />
                        </div>
                      ) : msg.type === 'file' ? (
                        <div className="message-file">
                          <File size={24} />
                          <a href={msg.fileURL} target="_blank" rel="noopener noreferrer">
                            {msg.fileName}
                          </a>
                        </div>
                      ) : (
                        <div className="message-bubble">
                          {msg.text}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <form className="input-area" onSubmit={sendMessage}>
          <div className={`input-wrapper ${!user ? 'disabled' : ''}`}>
            <div className="input-tools" onClick={() => fileInputRef.current?.click()}>
              <Paperclip size={20} />
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                onChange={handleFileUpload}
              />
            </div>
            <input
              type="text"
              placeholder={user ? `Message #${activeChannelName}` : "Please log in to chat"}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={!user}
            />
            <button type="submit" disabled={!user || !newMessage.trim()}>
              <Send size={18} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Chat;

