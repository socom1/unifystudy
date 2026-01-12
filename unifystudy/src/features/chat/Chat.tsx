// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from "react";
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
  CheckSquare,
  Settings
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
  const [courseChannels, setCourseChannels] = useState([]); // Course Group Chats
  const [collabChannels, setCollabChannels] = useState([]); // Collaborative Works
  const [directMessages, setDirectMessages] = useState([]);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newCourseName, setNewCourseName] = useState("");

  // DM State
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false); // New state to distinguish mode
  const [allUsers, setAllUsers] = useState([]);
  const [userSearch, setUserSearch] = useState(""); // Search state for picker

  // Rename State
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  // Notifications & Mentions
  const [unreadChannels, setUnreadChannels] = useState({}); // { channelId: count }
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);

  // Mobile State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // New state for mobile menu
  const [channelSearch, setChannelSearch] = useState(""); // Channel Search

  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null); // ID of message being edited
  const [editValue, setEditValue] = useState("");

  const subjects = [
    { id: "math", name: "mathematics" },
    { id: "science", name: "science" },
    { id: "history", name: "history" },
    { id: "cs", name: "computer-science" },
  ];
  
  const createCourseChannel = async () => {
    if (!newCourseName.trim() || !user) return;
    
    // Default to the first verified university if available
    const userUni = uniChannels.length > 0 ? uniChannels[0] : null;
    if (!userUni) {
        toast.error("You must join a university channel first.");
        return;
    }

    const code = newCourseName.trim().toUpperCase().replace(/\s+/g, '');
    if (code.length < 3) {
        toast.error("Course code must be at least 3 characters (e.g. CS101)");
        return;
    }

    try {
      const channelId = `course_${userUni.id}_${code}`;
      const channelRef = ref(db, `channels/${channelId}/metadata`);
      const snapshot = await get(channelRef);

      if (snapshot.exists()) {
           // Channel exists, just join
           await set(ref(db, `users/${user.uid}/channels/${channelId}`), true);
           toast.success(`Joined existing course: ${code}`);
      } else {
           // Create new
           await set(ref(db, `channels/${channelId}/metadata`), {
                name: code,
                createdBy: user.uid,
                type: "course",
                universityId: userUni.id,
                participants: { [user.uid]: true },
                createdAt: serverTimestamp(),
            });
            await set(ref(db, `users/${user.uid}/channels/${channelId}`), true);
            toast.success(`Created course: ${code}`);
      }

      setNewCourseName("");
      setShowCreateCourse(false);
      setActiveChannel(channelId);
      setActiveChannelName(code);
    } catch (err) {
      console.error(err);
      toast.error("Failed to join/create course channel");
    }
  };

  // Filter channels based on search
  const filteredSubjects = subjects.filter(s => s.name.toLowerCase().includes(channelSearch.toLowerCase()));
  const filteredUniChannels = uniChannels.filter(c => c.name.toLowerCase().includes(channelSearch.toLowerCase()));
  const filteredCourseChannels = courseChannels.filter(c => c.name.toLowerCase().includes(channelSearch.toLowerCase()));
  const filteredCollabChannels = collabChannels.filter(c => c.name.toLowerCase().includes(channelSearch.toLowerCase()));
  const filteredPrivateChannels = privateChannels.filter(c => c.name.toLowerCase().includes(channelSearch.toLowerCase()));
  const filteredDirectMessages = directMessages.filter(c => c.name.toLowerCase().includes(channelSearch.toLowerCase()));
  const showGlobal = "global-chat".includes(channelSearch.toLowerCase());

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
      const emailsToCheck = [user.email];
      const settingsSnap = await get(ref(db, `users/${user.uid}/settings/additionalEmails`));
      if (settingsSnap.exists() && Array.isArray(settingsSnap.val())) {
          emailsToCheck.push(...settingsSnap.val());
      }
      
      let matchedUni = null;
      let matchedDomain = null;

      for (const email of emailsToCheck) {
          if (!email) continue;
          const domain = email.split('@')[1];
          if (uniDomains[domain]) {
              matchedUni = uniDomains[domain];
              matchedDomain = domain;
              break;
          }
      }

      if (matchedUni) {
          // Verify and Join
          try {
             const channelId = matchedUni.id;
             // Set Channel Metadata (if not exists)
             await set(ref(db, `channels/${channelId}/metadata`), {
                 name: matchedUni.name,
                 createdBy: 'system',
                 type: 'university',
                 icon: matchedUni.icon,
                 verifiedDomain: matchedDomain
             });

             // Add User to Channel
             await set(ref(db, `users/${user.uid}/channels/${channelId}`), true);
             
             // Update User Verification Status
             await set(ref(db, `users/${user.uid}/universityVerified`), {
                 uniId: matchedUni.id,
                 uniName: matchedUni.name,
                 domain: matchedDomain,
                 verifiedAt: serverTimestamp()
             });

             toast.success(`Welcome to the ${matchedUni.name} channel! 🎓`);
             setActiveChannel(channelId);
             setActiveChannelName(matchedUni.name);
          } catch (err) {
              console.error(err);
              toast.error("Error joining university channel.");
          }
      } else {
          toast.error("None of your emails (primary or additional) match a supported Irish University domain.");
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
                  } else if (meta.type === "course") {
                      setCourseChannels((prev) => {
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

  const renderMessageText = useCallback((text) => {
    if (!text) return null;
    // Simple regex for @mentions
    const parts = text.split(/(@\w+(?:\s\w+)?)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        return <span key={i} className="mention-highlight">{part}</span>;
      }
      return part;
    });
  }, []);

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

  const currentChannel = 
      uniChannels.find(c => c.id === activeChannel) ||
      courseChannels.find(c => c.id === activeChannel) ||
      collabChannels.find(c => c.id === activeChannel) ||
      privateChannels.find(c => c.id === activeChannel);

  const canManage = currentChannel && currentChannel.createdBy === user?.uid;

  const handleDeleteChannel = async () => {
    if (!activeChannel || !canManage) return;
    if (!window.confirm("Are you sure you want to delete this channel? This cannot be undone.")) return;

    try {
        const participants = currentChannel.participants || {};
        const updates = {};
        updates[`channels/${activeChannel}`] = null; // Delete actual channel data
        
        Object.keys(participants).forEach(uid => {
            updates[`users/${uid}/channels/${activeChannel}`] = null;
        });

        await update(ref(db), updates);

        toast.success("Channel deleted");
        setActiveChannel("global");
        setShowManageModal(false);
    } catch (err) {
        console.error(err);
        toast.error("Failed to delete channel");
    }
  };

  // Filter users based on search
  const filteredUsers = allUsers.filter((u) =>
    u.displayName.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="chat-layout">
      {/* Profile Card Modal Removed - Uses Global UIContext */}

      {/* Profile Card Modal Removed - Uses Global UIContext */}


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

      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="chat-backdrop" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Left Sidebar - Channels */}
      <div className={`chat-sidebar ${mobileMenuOpen ? "open" : ""}`}>
        {" "}
        {/* Added 'open' class for mobile */}
        <div className="sidebar-header">
          <div className="search-bar">
            <Search size={16} />
            <input 
              type="text" 
              placeholder="Search..." 
              value={channelSearch}
              onChange={(e) => setChannelSearch(e.target.value)}
            />
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
          {showGlobal && (
            <>
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
            </>
          )}

       {(channelSearch === "" && uniChannels.length === 0) && (
         <div className="section-label mt-4">UNIVERSITY</div>
       )}
       {channelSearch === "" && uniChannels.length === 0 && (  
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
       )}

          {/* Collaborative Works */}
        {(channelSearch === "" || filteredCollabChannels.length > 0) && (
            <div className="section-label" style={{ marginTop: '1.5rem' }}>
                <span>COLLABORATIVE WORKS</span>
            </div>
        )}
        
        {collabChannels.length === 0 && channelSearch === "" && (
            <div style={{ padding: '0 1rem', fontSize: '0.8rem', opacity: 0.5 }}>
                No pending works.
            </div>
        )}
             {filteredCollabChannels.map(ch => (
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

          
       {/* UNIVERSITY SECTION - Grouped */}
       {(uniChannels.length > 0) && (
           <>
            <div className="section-label mt-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ textTransform: 'uppercase' }}>
                    {uniChannels[0].name.replace(' (Student)', '').replace(' Student', '')}
                </span>
                <Plus 
                    size={14} 
                    style={{ cursor: 'pointer' }} 
                    onClick={() => setShowCreateCourse(true)} 
                    title="Add Course by Code"
                />
            </div>

            {/* Main University Channels */}
            {filteredUniChannels.map((uni) => (
                <div
                key={uni.id}
                className={`channel-item ${activeChannel === uni.id ? "active" : ""}`}
                onClick={() => {
                    setActiveChannel(uni.id);
                    setActiveChannelName(uni.name);
                }}
                >
                <div className="channel-icon-wrapper" style={{marginRight: 6}}>
                    <span style={{ fontSize: '1.1em' }}>{uni.icon}</span>
                </div>
                {/* Always display as "Global Chat" for the main university channel in this view */}
                <span className="channel-name-truncate">Global Chat</span>
                {unreadChannels[uni.id] > 0 && (
                    <span className="channel-badge">{unreadChannels[uni.id]}</span>
                )}
                </div>
            ))}

            {/* Course Channels */}
            {showCreateCourse && (
                <div className="create-channel-input">
                <input
                    autoFocus
                    placeholder="Enter Course Code (e.g. CS101)"
                    value={newCourseName}
                    onChange={(e) => setNewCourseName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && createCourseChannel()}
                />
                </div>
            )}

            {filteredCourseChannels.length > 0 && (
                <div style={{ marginTop: '4px', marginBottom: '8px' }}>
                    {filteredCourseChannels.map(ch => (
                        <div
                            key={ch.id}
                            className={`channel-item ${activeChannel === ch.id ? "active" : ""}`}
                            onClick={() => {
                                setActiveChannel(ch.id);
                                setActiveChannelName(ch.name);
                            }}
                            style={{ paddingLeft: '24px' }} // Indent courses slightly
                        >
                             <div className="channel-icon-wrapper" style={{marginRight: 6, display: 'flex', alignItems: 'center'}}>
                                <Hash size={13} className="text-secondary" />
                             </div>
                             <span>{ch.name}</span>
                             {unreadChannels[ch.id] > 0 && <span className="channel-badge">{unreadChannels[ch.id]}</span>}
                        </div>
                    ))}
                </div>
            )}
           </>
       )}

          {(channelSearch === "" || filteredSubjects.length > 0) && <div className="section-label mt-4">SUBJECTS</div>}
          {filteredSubjects.map((sub) => (
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
            {(channelSearch === "" || filteredPrivateChannels.length > 0) && <span>PRIVATE</span>}
            {channelSearch === "" && (
                <Plus
                size={14}
                style={{ cursor: "pointer" }}
                onClick={() => setShowCreateChannel(true)}
                />
            )}
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

          {filteredPrivateChannels.map((pc) => (
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

          {(directMessages.length > 0 && (channelSearch === "" || filteredDirectMessages.length > 0)) && (
              <div className="section-label mt-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>DIRECT MESSAGES</span>
                  {channelSearch === "" && <Plus size={14} style={{ cursor: 'pointer' }} onClick={() => setShowUserPicker(true)} />}
              </div>
          )}

          {filteredDirectMessages.map((dm) => (
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

      {/* Manage Channel Modal */}
      <AnimatePresence>
        {showManageModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowManageModal(false)}
            style={{ zIndex: 2000 }}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{ padding: '24px', width: '300px', maxWidth: '90%' }} // Inline style for override if needed
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '18px' }}>Manage Channel</h3>
                <button onClick={() => setShowManageModal(false)} style={{ background: 'none', border: 'none', color: 'var(--color-text)', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                 <button 
                    onClick={() => { setShowManageModal(false); setShowRenameModal(true); }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        background: 'var(--bg-3)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '8px',
                        color: 'var(--color-text)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: '14px'
                    }}
                 >
                    <Pencil size={18} />
                    <span>Rename Channel</span>
                 </button>

                 <button 
                    onClick={handleDeleteChannel}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        background: 'rgba(255, 77, 77, 0.1)',
                        border: '1px solid rgba(255, 77, 77, 0.3)',
                        borderRadius: '8px',
                        color: '#ff4d4d',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: '14px'
                    }}
                 >
                    <Trash2 size={18} />
                    <span>Delete Channel</span>
                 </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
            {canManage ? (
              <button 
                className="action-btn"
                onClick={() => setShowManageModal(true)}
                title="Manage Channel"
              >
                <Settings size={20} />
              </button>
            ) : (isPrivateOrDM && (
              <button 
                className="action-btn"
                onClick={() => setShowRenameModal(true)}
                title="Rename Channel"
              >
                <MoreVertical size={20} />
              </button>
            ))}
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
              renderRow={renderRow}
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
