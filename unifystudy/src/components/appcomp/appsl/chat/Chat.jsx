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
  get,
  onChildAdded,
} from "firebase/database";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage"; // Storage functions
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Hash,
  Users,
  Code,
  Terminal,
  MoreVertical,
  Search,
  AlertCircle,
  Plus,
  Lock,
  Paperclip,
  File,
  Menu,
  X,
  MessageSquare,
} from "lucide-react"; // Added Paperclip, File, Menu, X
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

  // Show "?" for anonymous or unknown users
  const isAnonymous = !displayName || displayName.toLowerCase() === 'anonymous' || displayName.trim() === '';
  const initial = isAnonymous ? '?' : displayName[0].toUpperCase();

  return (
    <div
      className={`avatar-placeholder ${className}`}
      style={{ background: avatarColor || "#21262d", color: "white" }}
    >
      {initial}
    </div>
  );
};

const Chat = () => {
  // Changed to functional component declaration
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

  // Notifications & Mentions
  const [unreadChannels, setUnreadChannels] = useState({}); // { channelId: count }
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);

  // Mobile State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // New state for mobile menu

  const subjects = [
    { id: "math", name: "mathematics" },
    { id: "science", name: "science" },
    { id: "history", name: "history" },
    { id: "cs", name: "computer-science" },
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
            channelIds.forEach((cid) => {
              onValue(ref(db, `channels/${cid}/metadata`), (metaSnap) => {
                if (metaSnap.exists()) {
                  const meta = metaSnap.val();
                  if (meta.type === "dm") {
                    // Find the other participant
                    const otherUid = Object.keys(meta.participants || {}).find(
                      (uid) => uid !== u.uid
                    );
                    if (otherUid) {
                      // Fetch other user's name
                      get(ref(db, `users/${otherUid}`)).then((userSnap) => {
                        if (userSnap.exists()) {
                          const userData = userSnap.val();
                          const dmName = userData.displayName || "Unknown User";
                          setDirectMessages((prev) => {
                            const filtered = prev.filter((p) => p.id !== cid);
                            return [...filtered, { id: cid, ...meta, name: dmName }];
                          });
                        }
                      });
                    }
                  } else {
                    setPrivateChannels((prev) => {
                      const filtered = prev.filter((p) => p.id !== cid);
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
      get(ref(db, "users")).then((snapshot) => {
        if (snapshot.exists()) {
          const usersList = Object.entries(snapshot.val())
            .map(([uid, data]) => ({
              uid,
              displayName: data.displayName || "Unknown",
              photoURL: data.photoURL,
              avatarColor: data.settings?.customization?.avatarColor,
            }))
            .filter((u) => u.uid !== user?.uid); // Exclude self
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
    if (
      activeChannel !== "global" &&
      !subjects.find((s) => s.id === activeChannel)
    ) {
      // It's a private channel or DM
      path = `channels/${activeChannel}/messages`;
    } else if (activeChannel !== "global") {
      // It's a subject channel
      path = `channels/${activeChannel}`; // e.g. channels/math
    }

    const chatRef = query(
      ref(db, path),
      orderByChild("timestamp"),
      limitToLast(50)
    );

    const unsubscribe = onValue(
      chatRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const loadedMessages = Object.entries(data).map(([id, val]) => ({
            id,
            ...val,
          }));
          loadedMessages.sort(
            (a, b) => (a.timestamp || 0) - (b.timestamp || 0)
          );

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

  // Listen for unread messages in background channels
  useEffect(() => {
    if (!user) return;
    
    // We need to listen to all channels to track unread counts
    // This is a simplified approach. Ideally, we'd have a separate listener for "lastMessage" of each channel.
    // For now, we'll rely on the global listener in Sidebar to handle the "Global" count,
    // but for specific channels, we can listen to `users/{uid}/unreadChannelCounts` if we implemented that,
    // OR we can just listen to the channels we know about.
    
    // Let's implement a local listener for unread counts if the user is in the Chat component
    const handleNewBackgroundMessage = (snapshot, channelId) => {
      if (channelId === activeChannel) return; // Already viewing
      
      const msg = snapshot.val();
      if (!msg || msg.uid === user.uid) return;
      
      setUnreadChannels(prev => ({
        ...prev,
        [channelId]: (prev[channelId] || 0) + 1
      }));
    };

    const listeners = [];
    
    // Listen to global
    const globalRef = query(ref(db, "global_chat"), limitToLast(1));
    const unsubGlobal = onChildAdded(globalRef, (snap) => handleNewBackgroundMessage(snap, "global"));
    listeners.push(unsubGlobal);
    
    // Listen to subjects
    subjects.forEach(sub => {
      const subRef = query(ref(db, `channels/${sub.id}`), limitToLast(1));
      const unsub = onChildAdded(subRef, (snap) => handleNewBackgroundMessage(snap, sub.id));
      listeners.push(unsub);
    });
    
    // Listen to private/DMs
    [...privateChannels, ...directMessages].forEach(ch => {
      const chRef = query(ref(db, `channels/${ch.id}/messages`), limitToLast(1));
      const unsub = onChildAdded(chRef, (snap) => handleNewBackgroundMessage(snap, ch.id));
      listeners.push(unsub);
    });
    
    return () => {
      listeners.forEach(unsub => unsub());
    };
  }, [user, activeChannel, privateChannels, directMessages]);

  // Clear unread for active channel
  useEffect(() => {
    if (activeChannel) {
      setUnreadChannels(prev => {
        const newCounts = { ...prev };
        delete newCounts[activeChannel];
        return newCounts;
      });
    }
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
      set(unreadRef, 0).catch((err) =>
        console.error("Failed to clear unread:", err)
      );

      // Update last seen timestamp
      const lastSeenRef = ref(
        db,
        `users/${user.uid}/lastSeenChat/${activeChannel}`
      );
      set(lastSeenRef, Date.now()).catch((err) =>
        console.error("Failed to update last seen:", err)
      );
    }
  }, [messages, user, activeChannel]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    try {
      let path = "global_chat";
      if (
        activeChannel !== "global" &&
        !subjects.find((s) => s.id === activeChannel)
      ) {
        path = `channels/${activeChannel}/messages`;
      } else if (activeChannel !== "global") {
        path = `channels/${activeChannel}`;
      }

      const chatRef = ref(db, path);
      const newMsgRef = push(chatRef);

      const messageData = {
        text: newMessage,
        uid: user.uid,
        displayName: anonymousMode
          ? "Anonymous Student"
          : user.displayName || "Student",
        photoURL: anonymousMode ? null : user.photoURL,
        avatarColor: anonymousMode ? "#333" : avatarColor,
        isAnonymous: anonymousMode,
        timestamp: serverTimestamp(),
        type: "text",
      };

      await set(newMsgRef, messageData);
      setNewMessage("");
      setShowMentionPicker(false);
    } catch (err) {
      console.error("Send Error:", err);
      setError("Failed to send message: " + err.message);
    }
  };



  const handleInputChange = (e) => {
    const val = e.target.value;
    setNewMessage(val);
    setCursorPosition(e.target.selectionStart);

    // Detect @mention
    const lastAt = val.lastIndexOf("@", e.target.selectionStart);
    if (lastAt !== -1) {
      const query = val.slice(lastAt + 1, e.target.selectionStart);
      if (!query.includes(" ")) {
        setMentionQuery(query);
        setShowMentionPicker(true);
        return;
      }
    }
    setShowMentionPicker(false);
  };

  const insertMention = (userName) => {
    const before = newMessage.slice(0, newMessage.lastIndexOf("@", cursorPosition));
    const after = newMessage.slice(cursorPosition);
    const newVal = `${before}@${userName} ${after}`;
    setNewMessage(newVal);
    setShowMentionPicker(false);
    // Focus back on input (ref needed)
  };

  const renderMessageText = (text) => {
    if (!text) return null;
    // Simple regex for @mentions
    const parts = text.split(/(@\w+(?:\s\w+)?)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        return <span key={i} className="mention-highlight">{part}</span>;
      }
      return part;
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    try {
      // Create storage ref
      const fileRef = storageRef(
        storage,
        `chat_uploads/${activeChannel}/${Date.now()}_${file.name}`
      );

      // Upload
      await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(fileRef);

      // Send message with type
      let path = "global_chat";
      if (
        activeChannel !== "global" &&
        !subjects.find((s) => s.id === activeChannel)
      ) {
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
        type: file.type.startsWith("image/") ? "image" : "file",
        uid: user.uid,
        displayName: anonymousMode
          ? "Anonymous Student"
          : user.displayName || "Student",
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
        type: "private",
        participants: { [user.uid]: true },
        createdAt: serverTimestamp(),
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
        type: "dm",
        participants: {
          [user.uid]: true,
          [targetUser.uid]: true,
        },
        lastUpdated: serverTimestamp(),
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
    if (
      !user ||
      activeChannel === "global" ||
      subjects.find((s) => s.id === activeChannel)
    )
      return;

    try {
      // Add to channel participants
      await set(
        ref(
          db,
          `channels/${activeChannel}/metadata/participants/${targetUser.uid}`
        ),
        true
      );

      // Add to user's channel list
      await set(
        ref(db, `users/${targetUser.uid}/channels/${activeChannel}`),
        true
      );

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
      await set(
        ref(db, `channels/${activeChannel}/metadata/name`),
        renameValue
      );
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
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const isPrivateOrDM =
    activeChannel !== "global" && !subjects.find((s) => s.id === activeChannel);

  // Filter users based on search
  const filteredUsers = allUsers.filter((u) =>
    u.displayName.toLowerCase().includes(userSearch.toLowerCase())
  );

  // Profile Card State
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);

  const handleProfileClick = (msgUser) => {
    setSelectedUserProfile(msgUser);
  };

  const handleStartDirectChat = () => {
    if (selectedUserProfile) {
      startDM(selectedUserProfile);
      setSelectedUserProfile(null);
    }
  };

  return (
    <div className="chat-layout">
      {/* Profile Card Modal */}
      <AnimatePresence>
        {selectedUserProfile && (
          <motion.div
            className="profile-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedUserProfile(null)}
            style={{ zIndex: 1100 }}
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
                style={{ 
                  background: selectedUserProfile.bannerGradient || 
                    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                }}
              />
              <div className="modal-content">
                <div className="modal-avatar">
                  <UserAvatar
                    photoURL={selectedUserProfile.photoURL}
                    displayName={selectedUserProfile.displayName}
                    avatarColor={selectedUserProfile.avatarColor}
                    className="profile-avatar-large"
                  />
                </div>
                <h2 className="modal-name">
                  {selectedUserProfile.displayName || 'Unknown User'}
                  {selectedUserProfile.tag && <span className="modal-tag">{selectedUserProfile.tag}</span>}
                </h2>
                <div className="modal-stats">
                  <div className="stat-item">
                    <span className="label">Status</span>
                    <span className="value">
                      {selectedUserProfile.isAnonymous ? "Anonymous" : "Online"}
                    </span>
                  </div>
                  {selectedUserProfile.totalTime !== undefined && (
                    <div className="stat-item">
                      <span className="label">Study Time</span>
                      <span className="value">{selectedUserProfile.totalTime}</span>
                    </div>
                  )}
                  {selectedUserProfile.currency !== undefined && (
                    <div className="stat-item">
                      <span className="label">Lumens</span>
                      <span className="value">💡 {selectedUserProfile.currency}</span>
                    </div>
                  )}
                </div>
                
                {user && user.uid !== selectedUserProfile.uid && (
                  <div className="profile-actions">
                    <button 
                      className="action-btn primary"
                      onClick={handleStartDirectChat}
                    >
                      <Send size={16} />
                      {directMessages.some(dm => dm.id.includes(selectedUserProfile.uid)) 
                        ? "Send Message" 
                        : "Start Chat"}
                    </button>
                  </div>
                )}
              </div>
              <button className="close-btn" onClick={() => setSelectedUserProfile(null)}>
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Picker Modal */}
      <AnimatePresence>
        {showUserPicker && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setShowUserPicker(false);
              setIsAddingUser(false);
              setUserSearch("");
            }}
          >
            <motion.div
              className="user-picker-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>{isAddingUser ? "Add People" : "Start a Conversation"}</h3>

              {/* Search Input */}
              <div
                className="create-channel-input"
                style={{ padding: "0 0.5rem 0.5rem 0.5rem" }}
              >
                <input
                  autoFocus
                  placeholder="Search users..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.6rem",
                    borderRadius: "6px",
                    border: "1px solid #30363d",
                    background: "#0d1117",
                    color: "#c9d1d9",
                  }}
                />
              </div>

              <div className="user-list">
                {filteredUsers.map((u) => (
                  <div
                    key={u.uid}
                    className="user-item"
                    onClick={() =>
                      isAddingUser ? addUserToChannel(u) : startDM(u)
                    }
                  >
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
                  <div
                    style={{
                      padding: "1rem",
                      textAlign: "center",
                      color: "#8b949e",
                    }}
                  >
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
              onClick={(e) => e.stopPropagation()}
              style={{ height: "auto", padding: "1rem" }}
            >
              <h3>Rename Channel</h3>
              <div
                className="create-channel-input"
                style={{ marginTop: "1rem" }}
              >
                <input
                  autoFocus
                  placeholder="New Channel Name"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && renameChat()}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: "1rem",
                  gap: "0.5rem",
                }}
              >
                <button
                  className="btn"
                  onClick={() => setShowRenameModal(false)}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "transparent",
                    color: "#8b949e",
                    border: "1px solid #30363d",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn primary"
                  onClick={renameChat}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "#238636",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left Sidebar - Channels */}
      <div className={`chat-sidebar ${mobileMenuOpen ? "open" : ""}`}>
        {" "}
        {/* Added 'open' class for mobile */}
        <div className="sidebar-header">
          <div className="search-bar">
            <Search size={16} />
            <input type="text" placeholder="Search..." />
          </div>
          {/* Mobile Close Button */}
          <div
            className="mobile-close"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X size={20} />
          </div>
        </div>
        <div className="channels-list">
          <div className="section-label">PUBLIC</div>
          <div
            className={`channel-item ${
              activeChannel === "global" ? "active" : ""
            }`}
            onClick={() => {
              setActiveChannel("global");
              setActiveChannelName("global-chat");
            }}
          >
            <Hash size={18} />
            <span>global-chat</span>
            {unreadChannels["global"] > 0 && (
              <span className="channel-badge">{unreadChannels["global"]}</span>
            )}
          </div>

          <div className="section-label mt-4">SUBJECTS</div>
          {subjects.map((sub) => (
            <div
              key={sub.id}
              className={`channel-item ${
                activeChannel === sub.id ? "active" : ""
              }`}
              onClick={() => {
                setActiveChannel(sub.id);
                setActiveChannelName(sub.name);
              }}
            >
              <Hash size={18} />
              <span>{sub.name}</span>
              {unreadChannels[sub.id] > 0 && (
                <span className="channel-badge">{unreadChannels[sub.id]}</span>
              )}
            </div>
          ))}

          <div
            className="section-label mt-4"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>PRIVATE</span>
            <Plus
              size={14}
              style={{ cursor: "pointer" }}
              onClick={() => setShowCreateChannel(true)}
            />
          </div>

          {showCreateChannel && (
            <div className="create-channel-input">
              <input
                autoFocus
                placeholder="Channel Name"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createPrivateChannel()}
              />
            </div>
          )}

          {privateChannels.map((pc) => (
            <div
              key={pc.id}
              className={`channel-item ${
                activeChannel === pc.id ? "active" : ""
              }`}
              onClick={() => {
                setActiveChannel(pc.id);
                setActiveChannelName(pc.name);
              }}
            >
              <Lock size={16} />
              <span>{pc.name}</span>
              {unreadChannels[pc.id] > 0 && (
                <span className="channel-badge">{unreadChannels[pc.id]}</span>
              )}
            </div>
          ))}

          <div
            className="section-label mt-4"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>DIRECT MESSAGES</span>
            <Plus
              size={14}
              style={{ cursor: "pointer" }}
              onClick={() => {
                setIsAddingUser(false);
                setShowUserPicker(true);
              }}
            />
          </div>

          {directMessages.map((dm) => {
            return (
              <div
                key={dm.id}
                className={`channel-item ${
                  activeChannel === dm.id ? "active" : ""
                }`}
                onClick={() => {
                  setActiveChannel(dm.id);
                  setActiveChannelName(dm.name || "Direct Message");
                }}
              >
                <Users size={16} />
                <span>{dm.name || "Chat"}</span>
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
          <div className={`status-dot ${user ? "online" : "offline"}`}></div>
          <div className="user-info">
            <span className="name">
              {user
                ? anonymousMode
                  ? "Anonymous Mode"
                  : user.displayName || "User"
                : "Guest"}
            </span>
            {!user && <span className="login-hint">Log in to chat</span>}
          </div>
        </div>
      </div>

      {/* Mention Picker */}
      <AnimatePresence>
        {showMentionPicker && (
          <motion.div
            className="mention-picker"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            {allUsers
              .filter(u => u.displayName.toLowerCase().includes(mentionQuery.toLowerCase()))
              .map(u => (
                <div 
                  key={u.uid} 
                  className="mention-item"
                  onClick={() => insertMention(u.displayName)}
                >
                  <UserAvatar 
                    photoURL={u.photoURL} 
                    displayName={u.displayName} 
                    avatarColor={u.avatarColor}
                    className="picker-avatar-small"
                  />
                  <span>{u.displayName}</span>
                </div>
              ))}
          </motion.div>
        )}
      </AnimatePresence>

    <div className="chat-container">
      {/* Chat Main */}
      <div className="chat-main">
        <div className="chat-header">
          <div className="header-left">
            <button 
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="channel-info">
              <h2>
                {isPrivateOrDM ? <Lock size={20} /> : <Hash size={20} />}
                {activeChannelName}
              </h2>
              <span className="channel-desc">
                {activeChannel === "global"
                  ? "Global chat room for all students"
                  : isPrivateOrDM
                  ? "Private conversation"
                  : `Discussion channel for ${activeChannelName}`}
              </span>
            </div>
          </div>
          <div className="header-actions">
            {isPrivateOrDM && (
              <button 
                className="action-btn"
                onClick={() => setShowRenameModal(true)}
                title="Rename Channel"
              >
                <MoreVertical size={20} />
              </button>
            )}
            <button 
              className="action-btn"
              onClick={() => {
                setIsAddingUser(true);
                setShowUserPicker(true);
              }}
              title="Add People"
            >
              <Users size={20} />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="messages-area">
          {loading && messages.length === 0 ? (
            <div className="loading-state">
              <div className="spinner" />
              <p>Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <MessageSquare size={48} />
              </div>
              <h3>No messages yet</h3>
              <p>Be the first to start the conversation!</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isOwn = user && msg.uid === user.uid;
              const showAvatar =
                !isOwn &&
                (index === 0 || messages[index - 1].uid !== msg.uid);

              return (
                <motion.div
                  key={msg.id}
                  className={`message-row ${isOwn ? "own" : ""}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {!isOwn && (
                    <div className="message-avatar">
                      {showAvatar && (
                        <div onClick={() => handleProfileClick(msg)} style={{ cursor: "pointer" }}>
                          <UserAvatar
                            photoURL={msg.photoURL}
                            displayName={msg.displayName}
                            avatarColor={msg.avatarColor}
                            className="msg-avatar"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="message-content">
                    {!isOwn && showAvatar && (
                      <div className="message-sender">
                        <span 
                          className="sender-name"
                          onClick={() => handleProfileClick(msg)}
                        >
                          {msg.displayName}
                        </span>
                        <span className="message-time">
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                    )}

                    <div className={`message-bubble ${msg.type || "text"}`}>
                      {msg.type === "image" ? (
                        <div className="media-content">
                          <img 
                            src={msg.fileURL} 
                            alt="Shared image" 
                            loading="lazy"
                            onClick={() => window.open(msg.fileURL, '_blank')}
                          />
                        </div>
                      ) : msg.type === "file" ? (
                        <div className="file-attachment">
                          <File size={24} />
                          <div className="file-info">
                            <span className="file-name">{msg.fileName}</span>
                            <a 
                              href={msg.fileURL} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="download-link"
                            >
                              Download
                            </a>
                          </div>
                        </div>
                      ) : (
                        <p>{renderMessageText(msg.text)}</p>
                      )}
                    </div>
                    
                    {isOwn && (
                      <div className="message-status">
                         {formatTime(msg.timestamp)}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form className="chat-input-area" onSubmit={sendMessage}>
          <div className="input-wrapper">
            <button
              type="button"
              className="attach-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip size={20} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleFileUpload}
            />
            
            <input
              className="message-input"
              placeholder={`Message #${activeChannelName}...`}
              value={newMessage}
              onChange={handleInputChange}
            />
            
            <button
              type="submit"
              className="send-btn"
              disabled={!newMessage.trim() && !loading}
            >
              <Send size={20} />
            </button>
          </div>
        </form>
      </div>
    </div>
    </div>
  );
};

export default Chat;
