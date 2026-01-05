// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { db, storage } from "@/services/firebaseConfig";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
// Remove auth, onAuthStateChanged imports as they're now in context
// @ts-ignore

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
  update,
  startAt,
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
  GraduationCap,
  Pencil,
  Trash2,
  Reply,
  ChevronDown,
  Circle,
  MinusCircle,
  Moon,
  Clock,
  CheckSquare
} from "lucide-react";
import "./ChatStyles.scss";
import PageLoader from "@/components/ui/PageLoader";
import EmptyState from "@/components/ui/EmptyState";
import { toast } from "sonner";
import VirtualMessageList from "./VirtualMessageList";
// I'll stick to PageLoader/EmptyState first.

const UserAvatar = ({ photoURL, displayName, avatarColor, className }) => {
  const [imgFailed, setImgFailed] = useState(false);

  // Determine initial
  const isAnonymous = !displayName || displayName.toLowerCase() === 'anonymous' || displayName.trim() === '';
  const initial = isAnonymous ? '?' : displayName[0].toUpperCase();

  // SCSS expects a wrapper with component class (e.g. message-avatar)
  // And inner element with .msg-avatar or .avatar-placeholder
  return (
    <div className={className}>
      {photoURL && !imgFailed ? (
        <img
          src={photoURL}
          alt="avatar"
          className="msg-avatar"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div
          className="avatar-placeholder"
          style={{ background: avatarColor || "#21262d", color: "white" }}
        >
          {initial}
        </div>
      )}
    </div>
  );
};

const Chat = () => {
  // Changed to functional component declaration
  const { user } = useAuth(); // Use context instead of local state
  const { openProfile } = useUI();
  const location = useLocation();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  // const [user, setUser] = useState(null); // Local state removed
  const [anonymousMode, setAnonymousMode] = useState(false);
  const [avatarColor, setAvatarColor] = useState("#333"); // Changed default avatar color
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null); // Ref for file input
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // User Status
  const [userStatus, setUserStatus] = useState("online");
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  const handleStatusChange = async (status) => {
    setUserStatus(status);
    setShowStatusPicker(false);
    if(user) {
        await update(ref(db, `users/${user.uid}`), { status });
    }
  };
  
  // Typing Indicators
  const [typingUsers, setTypingUsers] = useState([]);
  const typingTimeoutRef = useRef(null);

  // Channels State
  const [activeChannel, setActiveChannel] = useState("global"); // 'global', 'math', 'science', or private ID
  const [activeChannelName, setActiveChannelName] = useState("global-chat");
  const [privateChannels, setPrivateChannels] = useState([]);
  const [uniChannels, setUniChannels] = useState([]); // New state for Uni channels
  const [collabChannels, setCollabChannels] = useState([]); // Collaborative Works
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

  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null); // ID of message being edited
  const [editValue, setEditValue] = useState("");

  const subjects = [
    { id: "math", name: "mathematics" },
    { id: "science", name: "science" },
    { id: "history", name: "history" },
    { id: "cs", name: "computer-science" },
  ];

  // Irish University Domains (Updated for Students)
  const uniDomains = {
      'tcd.ie': { id: 'uni_tcd', name: 'Trinity College Dublin', icon: '🏰' },
      'myucd.ie': { id: 'uni_ucd', name: 'University College Dublin (Student)', icon: '🏛️' },
      'ucdconnect.ie': { id: 'uni_ucd', name: 'University College Dublin', icon: '🏛️' },
      'mail.dcu.ie': { id: 'uni_dcu', name: 'Dublin City University', icon: '⚡' },
      'dcu.ie': { id: 'uni_dcu', name: 'Dublin City University (Staff)', icon: '⚡' },
      'umail.ucc.ie': { id: 'uni_ucc', name: 'UCC Student', icon: '🎓' },
      'ucc.ie': { id: 'uni_ucc', name: 'University College Cork', icon: '🎓' },
      'nuigalway.ie': { id: 'uni_galway', name: 'University of Galway', icon: '🌊' },
      'universityofgalway.ie': { id: 'uni_galway', name: 'University of Galway', icon: '🌊' },
      'student.ul.ie': { id: 'uni_ul', name: 'UL Student', icon: '🐺' },
      'mumail.ie': { id: 'uni_maynooth', name: 'Maynooth Student', icon: '🏺' },
      'mytudublin.ie': { id: 'uni_tud', name: 'TU Dublin Student', icon: '🏙️' },
      'tudublin.ie': { id: 'uni_tud', name: 'TU Dublin', icon: '🏙️' }
  };


  const verifyUniversity = async () => {
      if (!user || !user.email) {
          toast.error("Please sign in with an email address.");
          return;
      }

      // Check for secondary email first
      let emailToCheck = user.email;
      const settingsSnap = await get(ref(db, `users/${user.uid}/settings/secondaryEmail`));
      if (settingsSnap.exists() && settingsSnap.val()) {
          emailToCheck = settingsSnap.val();
      }
      
      const domain = emailToCheck.split('@')[1];
      const uni = uniDomains[domain];

      if (uni) {
          // Verify and Join
          try {
             const channelId = uni.id;
             // Set Channel Metadata (if not exists)
             await set(ref(db, `channels/${channelId}/metadata`), {
                 name: uni.name,
                 createdBy: 'system',
                 type: 'university',
                 icon: uni.icon,
                 verifiedDomain: domain
             });

             // Add User to Channel
             await set(ref(db, `users/${user.uid}/channels/${channelId}`), true);
             
             // Update User Verification Status
             await set(ref(db, `users/${user.uid}/universityVerified`), {
                 uniId: uni.id,
                 uniName: uni.name,
                 domain: domain,
                 verifiedAt: serverTimestamp()
             });

             toast.success(`Welcome to the ${uni.name} channel! 🎓`);
             setActiveChannel(channelId);
             setActiveChannelName(uni.name);
          } catch (err) {
              console.error(err);
              toast.error("Error joining university channel.");
          }
      } else {
          toast.error("Your email domain isn't recognized as a supported Irish University. Please use your official college email.");
      }
  };

  // Track logged-in user & settings
  useEffect(() => {
    // const unsubscribe = auth.onAuthStateChanged((u) => { // Removed
    //  setUser(u); // Removed
      if (user) {
        // Fetch settings

        const settingsRef = ref(db, `users/${user.uid}/settings`);
        onValue(settingsRef, (snap) => {
          const val = snap.val();
          setAnonymousMode(val?.anonymousMode === true);
          if (val?.customization?.avatarColor) {
            setAvatarColor(val.customization.avatarColor);
          }
        });

        // Fetch user's channels (Private & DMs)
        const userChannelsRef = ref(db, `users/${user.uid}/channels`);
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
                      (uid) => uid !== user.uid
                    );
                    if (otherUid) {
                      // Fetch other user's name
                      get(ref(db, `public_leaderboard/${otherUid}`))
                        .then((userSnap) => {
                          if (userSnap.exists()) {
                            const userData = userSnap.val();
                            const dmName = userData.displayName || "Unknown User";
                            setDirectMessages((prev) => {
                              const filtered = prev.filter((p) => p.id !== cid);
                              return [...filtered, { id: cid, ...meta, name: dmName }];
                            });
                          }
                        })
                        .catch(err => console.warn("Failed to fetch DM user name", err));
                    }
                  } else if (meta.type === "university") {
                     setUniChannels((prev) => {
                        const filtered = prev.filter((p) => p.id !== cid);
                        return [...filtered, { id: cid, ...meta }];
                     });
                  } else if (meta.type === "collaboration") {
                      setCollabChannels((prev) => {
                          const filtered = prev.filter((p) => p.id !== cid);
                          return [...filtered, { id: cid, ...meta }];
                      });
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
    // });
    // return unsubscribe;
  }, [user]); // Depend on user from context

  // Fetch all users for DM picker
  useEffect(() => {
    if (showUserPicker) {
      get(ref(db, "public_leaderboard"))
        .then((snapshot) => {
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
        })
        .catch(err => console.warn("Failed to fetch users list", err));
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

  // Ref to track active channel without triggering effect re-runs
  const activeChannelRef = useRef(activeChannel);
  useEffect(() => {
      activeChannelRef.current = activeChannel;
  }, [activeChannel]);

  // Listen for unread messages in background channels
  useEffect(() => {
    if (!user) return;
    
    const handleNewBackgroundMessage = (snapshot, channelId) => {
      // Check against current active channel
      if (channelId === activeChannelRef.current) return;
      
      const msg = snapshot.val();
      if (!msg || msg.uid === user.uid) return;
      
      setUnreadChannels(prev => ({
        ...prev,
        [channelId]: (prev[channelId] || 0) + 1
      }));
    };

    const listeners = [];
    const now = Date.now(); // Only listen for messages arriving AFTER this point
    
    // Listen to global
    // Use startAt to avoid fetching existing history as "new"
    const globalRef = query(ref(db, "global_chat"), orderByChild('timestamp'), startAt(now));
    const unsubGlobal = onChildAdded(globalRef, (snap) => handleNewBackgroundMessage(snap, "global"));
    listeners.push(unsubGlobal);
    
    // Listen to subjects
    subjects.forEach(sub => {
      const subRef = query(ref(db, `channels/${sub.id}`), orderByChild('timestamp'), startAt(now));
      const unsub = onChildAdded(subRef, (snap) => handleNewBackgroundMessage(snap, sub.id));
      listeners.push(unsub);
    });
    
    // Listen to private/DMs
    [...privateChannels, ...directMessages].forEach(ch => {
      const chRef = query(ref(db, `channels/${ch.id}/messages`), orderByChild('timestamp'), startAt(now));
      const unsub = onChildAdded(chRef, (snap) => handleNewBackgroundMessage(snap, ch.id));
      listeners.push(unsub);
    });
    
    return () => {
      listeners.forEach(unsub => unsub());
    };
  }, [user, privateChannels, directMessages]); // Removed activeChannel dependency

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

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const handleReply = (msg) => {
    setReplyingTo(msg);
  };

  const handleEdit = (msg) => {
     // Check if < 5 mins
     const diff = Date.now() - msg.timestamp;
     if (diff > 5 * 60 * 1000) {
         toast.error("Message matches historical records and cannot be edited. (Limit: 5 mins)");
         return;
     }
     setEditingMessageId(msg.id);
     setEditValue(msg.text);
  };

  const saveEdit = async () => {
      if(!editingMessageId) return;
      let path = "global_chat";
      if (activeChannel !== "global" && !subjects.find((s) => s.id === activeChannel)) {
        path = `channels/${activeChannel}/messages`;
      } else if (activeChannel !== "global") {
        path = `channels/${activeChannel}`;
      }

      try {
          await update(ref(db, `${path}/${editingMessageId}`), {
              text: editValue,
              isEdited: true,
              editedAt: serverTimestamp() // Client timestamp for immediate UI update? No, server is safer.
          });
          setEditingMessageId(null);
          setEditValue("");
      } catch(err) {
          console.error("Edit failed", err);
      }
  };

  const handleDelete = async (msgId) => {
      if(!window.confirm("Delete this message?")) return;
      let path = "global_chat";
      if (activeChannel !== "global" && !subjects.find((s) => s.id === activeChannel)) {
        path = `channels/${activeChannel}/messages`;
      } else if (activeChannel !== "global") {
        path = `channels/${activeChannel}`;
      }
      try {
          // setting to null deletes it
          await set(ref(db, `${path}/${msgId}`), null);
      } catch(err) {
          console.error("Delete failed", err);
      }
  };

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
        role: uniChannels.length > 0 ? 'Verified Student' : 'Student', // Simple role logic
      };

      if (replyingTo) {
          messageData.replyTo = {
              id: replyingTo.id,
              displayName: replyingTo.displayName,
              text: replyingTo.text,
              uid: replyingTo.uid
          };
      }

      await set(newMsgRef, messageData);

      // Check for Mentions
      const mentionRegex = /@(\w+)/g;
      let match;
      const mentionedUsers = new Set();
      while ((match = mentionRegex.exec(newMessage)) !== null) {
          const mentionedName = match[1].toLowerCase();
          // Find user by name (case-insensitive partial match)
          const targetUser = allUsers.find(u => 
              u.displayName.toLowerCase().replace(/\s/g, '') === mentionedName ||
              u.displayName.toLowerCase().includes(mentionedName)
          );
          if (targetUser && targetUser.uid !== user.uid) {
              mentionedUsers.add(targetUser);
          }
      }

      // Send Notifications
      mentionedUsers.forEach(async (targetUser) => {
          const notifRef = push(ref(db, `users/${targetUser.uid}/notifications`));
          await set(notifRef, {
              type: 'mention',
              title: `New Mention in ${activeChannelName}`,
              message: `${messageData.displayName} mentioned you: "${newMessage}"`,
              channelId: activeChannel,
              timestamp: serverTimestamp(),
              read: false,
              link: '/chat'
          });
      });

      setNewMessage("");
      setShowMentionPicker(false);
      setReplyingTo(null); // Clear reply
    } catch (err) {
      setError("Failed to send message: " + err.message);
    }
  };

  const handleTyping = () => {
    if (!user || !activeChannel) return;

    // Determine path based on channel logic (reused from sendMessage)
    // Actually, let's just stick to a consistent path for typing metadata
    // For simplicity, we'll assume the same structure logic or just use a verified path
    // But `sendMessage` has complex path logic for 'global_chat' vs 'channels'.
    
    // We need a consistent "metadata/typing" path.
    // Let's use `channels/${activeChannel}/typing` for all channels, and `global_chat_typing` for global.
    let path = `channels/${activeChannel}/typing/${user.uid}`;
    if (activeChannel === "global") path = `global_chat_typing/${user.uid}`;
    else if (!subjects.find(s => s.id === activeChannel)) {
        // DM or private
        path = `channels/${activeChannel}/typing/${user.uid}`;
    }

    const typingRef = ref(db, path);
    // Anonymize in global chat
    const typingName = activeChannel === "global" ? "Someone" : (user.displayName || "Someone");
    
    set(typingRef, {
        name: typingName,
        timestamp: Date.now() // Use local for simpler client cleanup
    }).catch(err => {
        // Silently fail for typing indicators to avoid console spam if rules are outdated
        console.warn("Typing indicator failed:", err.code);
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
        set(typingRef, null);
    }, 3000);
  };

  // Listen for typing
  useEffect(() => {
    if (!activeChannel) return;
    
    let path = `channels/${activeChannel}/typing`;
    if (activeChannel === "global") path = `global_chat_typing`;

    const typingRef = ref(db, path);
    const unsub = onValue(typingRef, (snap) => {
        const data = snap.val();
        if (data && user) {
            const typers = Object.entries(data)
                .filter(([uid]) => uid !== user.uid)
                .map(([_, val]) => val.name);
            setTypingUsers(typers);
        } else {
            setTypingUsers([]);
        }
    });

    return () => unsub();
  }, [activeChannel, user]);





  const handleInputChange = (e) => {
    const val = e.target.value;
    setNewMessage(val);
    setCursorPosition(e.target.selectionStart);
    handleTyping();

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

      // Add to CURRENT user's channels (Self-write is allowed)
      await set(ref(db, `users/${user.uid}/channels/${channelId}`), true);
      
      // We CANNOT write to targetUser's channels directly due to security rules.
      // Instead, we send a notification. When they click it, THEY will write to their own channel list.
      const notifRef = push(ref(db, `users/${targetUser.uid}/notifications`));
      await set(notifRef, {
        type: 'dm_invite',
        title: 'New Message',
        message: `${user.displayName} started a chat with you.`,
        channelId: channelId,
        senderUid: user.uid,
        timestamp: serverTimestamp(),
        read: false
      });

      setActiveChannel(channelId);
      setActiveChannelName(targetUser.displayName);
      setShowUserPicker(false);
      setUserSearch(""); // Reset search
      console.log("DM Started Successfully:", channelId);
      toast.success(`Chat started with ${targetUser.displayName}`);
    } catch (err) {
      console.error("Start DM Error:", err);
      setError(err.message);
      toast.error(`Failed to start chat: ${err.message}`);
    }
  };

  // Handle incoming DM from Profile Modal
  useEffect(() => {
    console.log("Chat Init Check - User:", user?.uid, "State:", location.state);
    if (location.state?.dmUser && user) {
      console.log("Starting DM with:", location.state.dmUser);
      startDM(location.state.dmUser);
      // Clear state to avoid re-triggering
      navigate(location.pathname, { replace: true, state: {} });
    } else {
        console.log("Skipping DM init: User missing or No DM User state");
    }
  }, [location.state, user]);

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

      toast.success(`${targetUser.displayName} added to channel!`);
      setShowUserPicker(false);
      setIsAddingUser(false);
      setUserSearch(""); // Reset search
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

  // Profile Card State Removed
  // const [selectedUserProfile, setSelectedUserProfile] = useState(null);
  // handleProfileClick removed
  // handleStartDirectChat removed

  return (
    <div className="chat-layout">
      {/* Profile Card Modal Removed - Uses Global UIContext */}

      <div className="typing-indicator-area" style={{ 
          padding: '0 1rem', 
          height: '20px', 
          fontSize: '0.8rem', 
          color: 'var(--color-muted)',
          fontStyle: 'italic',
          display: 'flex',
          alignItems: 'center'
      }}>
        {typingUsers.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
            </motion.div>
        )}
      </div>

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

       <div className="section-label mt-4">UNIVERSITY</div>
          <button 
             onClick={verifyUniversity}
             style={{ 
                 width: '100%', 
                 marginBottom: '0.5rem', 
                 fontSize: '0.8rem',
                 padding: '6px',
                 background: 'rgba(57, 211, 83, 0.1)', 
                 color: '#39d353',
                 border: '1px solid rgba(57, 211, 83, 0.2)',
                 borderRadius: '6px',
                 cursor: 'pointer',
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 gap: '6px'
             }}
          >
             <GraduationCap size={14} /> Verify Email
          </button>

          {/* Collaborative Works */}
        <div className="section-label" style={{ marginTop: '1.5rem' }}>
            <span>COLLABORATIVE WORKS</span>
        </div>
        
        {collabChannels.length === 0 && (
            <div style={{ padding: '0 1rem', fontSize: '0.8rem', opacity: 0.5 }}>
                No pending works.
            </div>
        )}
             {collabChannels.map(ch => (
                 <div
                    key={ch.id}
                    className={`channel-item ${activeChannel === ch.id ? "active" : ""}`}
                    onClick={() => {
                        setActiveChannel(ch.id);
                        setActiveChannelName(ch.name);
                    }}
                 >
                     <div className="channel-icon-wrapper" style={{marginRight: 6, display: 'flex', alignItems: 'center'}}>
                        <Code size={14} />
                     </div>
                     <span>{ch.name}</span>
                     {unreadChannels[ch.id] > 0 && <span className="channel-badge">{unreadChannels[ch.id]}</span>}
                 </div>
             ))}

          
          {uniChannels.map((uni) => (
            <div
              key={uni.id}
              className={`channel-item ${activeChannel === uni.id ? "active" : ""}`}
              onClick={() => {
                setActiveChannel(uni.id);
                setActiveChannelName(uni.name);
              }}
            >
              <span style={{ marginRight: '6px' }}>{uni.icon}</span>
              <span className="channel-name-truncate">{uni.name}</span>
               {unreadChannels[uni.id] > 0 && (
                <span className="channel-badge">{unreadChannels[uni.id]}</span>
              )}
            </div>
          ))}

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

          {directMessages.length > 0 && (
              <div className="section-label mt-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>DIRECT MESSAGES</span>
                  <Plus size={14} style={{ cursor: 'pointer' }} onClick={() => setShowUserPicker(true)} />
              </div>
          )}

          {directMessages.map((dm) => (
             <div
               key={dm.id}
               className={`channel-item ${activeChannel === dm.id ? "active" : ""}`}
               onClick={() => {
                 setActiveChannel(dm.id);
                 setActiveChannelName(dm.name);
               }}
             >
               <div className="channel-icon-wrapper">
                 <img 
                    src={dm.photoURL || "https://ui-avatars.com/api/?background=random&name=" + dm.name} 
                    alt="avatar" 
                    style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover' }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                 />
                 <span style={{ fontSize: '10px', marginLeft: 4 }}>
                    {/* Fallback icon if img fails or is just loading, usually adjacent */}
                 </span>
               </div>
               <span>{dm.name}</span>
               {unreadChannels[dm.id] > 0 && (
                 <span className="channel-badge">{unreadChannels[dm.id]}</span>
               )}
               {/* 
                 Optional: Add status dot if we have user status 
               */}
             </div>
          ))}

        </div>
        
        {/* User Status Bar - Fixed at Bottom */}
        <div 
            className="user-status-bar" 
            onClick={() => setShowStatusPicker(!showStatusPicker)}
        >
              <div className={`status-dot ${userStatus}`}></div>
              <div className="user-info">
                <span className="name">
                  {user
                    ? anonymousMode
                      ? "Anonymous Mode"
                      : user.displayName || "User"
                    : "Guest"}
                </span>
                <span className="login-hint">
                    {userStatus === 'dnd' ? 'Do Not Disturb' : userStatus}
                </span>
              </div>
              <ChevronDown size={14} style={{marginLeft: 'auto', opacity: 0.5}}/>

              {showStatusPicker && (
                  <div className="status-picker-menu" onClick={(e) => { e.stopPropagation(); setShowStatusPicker(false); }}>
                      <div className="status-option" onClick={() => handleStatusChange('online')}>
                          <div className="status-dot online"/> Online
                      </div>
                      <div className="status-option" onClick={() => handleStatusChange('dnd')}>
                          <div className="status-dot dnd"/> Do Not Disturb
                      </div>
                      <div className="status-option" onClick={() => handleStatusChange('idle')}>
                          <div className="status-dot idle"/> Away
                      </div>
                      <div className="status-option" onClick={() => handleStatusChange('offline')}>
                          <div className="status-dot offline"/> Invisible
                      </div>
                  </div>
              )}
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
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
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
        <div className="messages-area" >
          {loading && messages.length === 0 ? (
            <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%'}}>
                 <PageLoader message="Loading messages..." />
            </div>
          ) : messages.length === 0 ? (
             <EmptyState 
                icon={<MessageSquare size={48}/>} 
                title="No messages yet" 
                description="Be the first to start the conversation!" 
             />
          ) : (
            <VirtualMessageList
              messages={messages}
              renderRow={(msg, index) => (
                    <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }} // Keep simple entrance
                    animate={{ opacity: 1, y: 0 }}
                    className={`message-row ${
                        msg.uid === user.uid ? "own" : ""
                    }`}
                    >
                     {!anonymousMode && (
                        <div 
                          className="avatar-wrapper"
                          onClick={() => !msg.isAnonymous && openProfile(msg.uid)}
                          style={{ cursor: msg.isAnonymous ? 'default' : 'pointer' }}
                        >
                          <UserAvatar
                          photoURL={msg.photoURL}
                          displayName={msg.displayName}
                          avatarColor={msg.avatarColor}
                          className="message-avatar"
                          />
                        </div>
                     )}

                    <div className="message-content">
                        <div className="message-sender">
                        <span
                            className={`sender-name ${
                            msg.role === "Verified Student" || msg.role === "Teacher" ? "verified" : ""
                            }`}
                            onClick={() => !msg.isAnonymous && openProfile(msg.uid)}
                            style={{ cursor: msg.isAnonymous ? 'default' : 'pointer' }}
                        >
                            {msg.displayName}
                            {msg.role === "Verified Student" && (
                            <span className="verified-badge" title="Verified Student">
                                ✓
                            </span>
                            )}
                        </span>
                        <span className="message-time">
                            {msg.timestamp
                            ? new Date(msg.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                            })
                            : "Sending..."}
                        </span>
                        {msg.isEdited && <span className="edited-tag">(edited)</span>}
                         </div>

                        {msg.replyTo && (
                            <div className="reply-context">
                                <div className="reply-bar"></div>
                                <div className="reply-content">
                                    <span className="reply-author">{msg.replyTo.displayName}</span>
                                    <span className="reply-text">{msg.replyTo.text}</span>
                                </div>
                            </div>
                        )}

                        <div className="message-bubble">
                        {msg.type === "image" ? (
                            <div className="image-attachment">
                                <img src={msg.fileURL} alt="attachment" onClick={() => window.open(msg.fileURL, '_blank')} />
                            </div>
                        ) : msg.type === "file" ? (
                             <div className="file-attachment">
                                <File size={20} />
                                <a href={msg.fileURL} target="_blank" rel="noopener noreferrer">
                                    {msg.fileName || "Download File"}
                                </a>
                            </div>
                        ) : (
                            renderMessageText(msg.text)
                        )}
                        </div>
                        
                        {/* Hover Actions */}
                        <div className="msg-actions">
                            <button onClick={() => handleReply(msg)} title="Reply"><Reply size={14} /></button>
                            {msg.uid === user.uid && (
                                <>
                                    <button onClick={() => handleEdit(msg)} title="Edit"><Pencil size={14} /></button>
                                    <button onClick={() => handleDelete(msg.id)} title="Delete" className="delete-btn"><Trash2 size={14} /></button>
                                </>
                            )}
                        </div>
                    </div>
                    </motion.div>
              )}
            />
          )}
        </div>

        {/* Input Area */}
        <form className="chat-input-area" onSubmit={editingMessageId ? (e) => { e.preventDefault(); saveEdit(); } : sendMessage}>
          {typingUsers.length > 0 && (
              <div className="typing-indicator">
                  <div className="typing-dots">
                      <span></span><span></span><span></span>
                  </div>
                  <span>
                      <strong>{typingUsers.slice(0, 3).join(", ")}</strong>
                      {typingUsers.length > 3 ? " and others" : ""} is typing...
                  </span>
              </div>
          )}
          {replyingTo && !editingMessageId && (
              <div className="reply-banner">
                  <div className="reply-info">
                      <Reply size={14}/>
                      <span>Replying to <strong>{replyingTo.displayName}</strong></span>
                  </div>
                  <button type="button" className="close-reply" onClick={cancelReply}>
                      <X size={16}/>
                  </button>
              </div>
          )}
          {editingMessageId && (
               <div className="reply-banner edit-mode">
                  <div className="reply-info">
                      <Pencil size={14}/>
                      <span>Editing message...</span>
                  </div>
                  <button type="button" className="close-reply" onClick={() => { setEditingMessageId(null); setEditValue(""); }}>
                      <X size={16}/>
                  </button>
              </div>
          )}

          <div className="input-wrapper">
            <button
              type="button"
              className="attach-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={!!editingMessageId} // Disable attachments when editing
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
              placeholder={editingMessageId ? "Edit your message..." : `Message #${activeChannelName}...`}
              value={editingMessageId ? editValue : newMessage}
              onChange={editingMessageId ? (e) => setEditValue(e.target.value) : handleInputChange}
            />
            
            <button
              type="submit"
              className="send-btn"
              disabled={editingMessageId ? !editValue.trim() : (!newMessage.trim() && !loading)}
            >
              {editingMessageId ? <CheckSquare size={20} /> : <Send size={20} />}
            </button>
          </div>
        </form>
      </div>
    </div>
    </div>
  );
};

export default Chat;
