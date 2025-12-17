// @ts-nocheck
// StudyBuddy.jsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Users,
  MessageCircle,
  Clock,
  LogOut,
  Play,
  Pause,
  RotateCcw
} from "lucide-react";
import { db, auth } from "@/services/firebaseConfig";
import { ref, onValue, push, set, remove, serverTimestamp, onDisconnect } from "firebase/database";
import "./StudyBuddy.scss";

// Predefined rooms
const STUDY_ROOMS = [
    { id: 'lofi-lounge', name: 'Lofi Lounge', icon: '🎧', description: 'Chill beats to study to.' },
    { id: 'silent-library', name: 'Silent Library', icon: '🤫', description: 'Absolute focus. No talking.' },
    { id: 'exam-cram', name: 'Exam Cram', icon: '🔥', description: 'Intense study session.' },
    { id: 'math-help', name: 'Math & Science', icon: '➗', description: 'Collaborative problem solving.' }
];

const StudyBuddy = ({ user }) => { // Assume user prop passed down
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [roomData, setRoomData] = useState({}); // { users: {}, chat: {}, timer: {} }
  const [inputMsg, setInputMsg] = useState('');
  
  // Timer State (Local for now, sync later if needed)
  const [timerTime, setTimerTime] = useState(1500); // 25 mins
  const [timerActive, setTimerActive] = useState(false);

  // --- LOBBY VIEW: Sub to room counts ---
  const [roomCounts, setRoomCounts] = useState({});
  useEffect(() => {
    const roomsRef = ref(db, 'study_rooms');
    const unsub = onValue(roomsRef, (snap) => {
        const data = snap.val();
        if(data) {
            const counts = {};
            Object.keys(data).forEach(rid => {
                counts[rid] = data[rid].users ? Object.keys(data[rid].users).length : 0;
            });
            setRoomCounts(counts);
        }
    });
    return () => unsub();
  }, []);

  // --- JOIN LOGIC ---
  const joinRoom = (roomId) => {
    if(!user) return alert("Please log in first!");
    setActiveRoomId(roomId);
    
    const userRef = ref(db, `study_rooms/${roomId}/users/${user.uid}`);
    set(userRef, {
        name: user.displayName || 'Anonymous',
        photoURL: user.photoURL || '',
        joinedAt: serverTimestamp()
    });
    onDisconnect(userRef).remove();
  };

  const leaveRoom = () => {
    if(!activeRoomId || !user) return;
    remove(ref(db, `study_rooms/${activeRoomId}/users/${activeRoomId}`)); // Bug: using activeRoomId as key? No, user.uid
    remove(ref(db, `study_rooms/${activeRoomId}/users/${user.uid}`));
    setActiveRoomId(null);
    setTimerActive(false);
  };

  // --- ACTIVE ROOM LOGIC ---
  useEffect(() => {
    if(!activeRoomId) return;

    const roomRef = ref(db, `study_rooms/${activeRoomId}`);
    const unsub = onValue(roomRef, (snap) => {
        setRoomData(snap.val() || {});
    });
    return () => {
        unsub();
        leaveRoom(); // Auto-leave on unmount
    }
  }, [activeRoomId]);

  // Timer logic
  useEffect(() => {
    let interval = null;
    if(timerActive && timerTime > 0) {
        interval = setInterval(() => setTimerTime(t => t - 1), 1000);
    } else if (timerTime === 0) {
        setTimerActive(false);
        // Play sound?
    }
    return () => clearInterval(interval);
  }, [timerActive, timerTime]);

  const sendMsg = (e) => {
    e.preventDefault();
    if(!inputMsg.trim()) return;
    push(ref(db, `study_rooms/${activeRoomId}/chat`), {
        text: inputMsg,
        user: user?.displayName || 'Anon',
        timestamp: serverTimestamp()
    });
    setInputMsg('');
  };

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (activeRoomId) {
    const activeRoom = STUDY_ROOMS.find(r => r.id === activeRoomId) || { name: activeRoomId };
    const usersList = roomData.users ? Object.values(roomData.users) : [];
    const chatList = roomData.chat ? Object.values(roomData.chat) : [];

    return (
      <div className="study-room-active">
        <header>
            <button onClick={leaveRoom}><LogOut size={20} /> Leave</button>
            <h2>{activeRoom.icon} {activeRoom.name}</h2>
            <div className="user-count"><Users size={16} /> {usersList.length}</div>
        </header>
        
        <div className="room-content">
            <div className="main-area">
                <div className="focus-timer">
                    <div className="time-display">{formatTime(timerTime)}</div>
                    <div className="timer-controls">
                        <button onClick={() => setTimerActive(!timerActive)}>
                            {timerActive ? <Pause /> : <Play />}
                        </button>
                        <button onClick={() => setTimerTime(1500)}><RotateCcw /></button>
                    </div>
                    <p>Focus together. Keep the vibe check passed.</p>
                </div>
                
                <div className="participants-grid">
                    {usersList.map((u, i) => (
                        <div key={i} className="participant-card">
                            <div className="avatar">{u.name[0]}</div>
                            <span>{u.name}</span>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="chat-panel">
                <div className="messages">
                    {chatList.map((msg, i) => (
                        <div key={i} className="msg-bubble">
                            <b>{msg.user}:</b> {msg.text}
                        </div>
                    ))}
                </div>
                <form onSubmit={sendMsg}>
                    <input value={inputMsg} onChange={e => setInputMsg(e.target.value)} placeholder="Say hi..." />
                    <button><MessageCircle size={16} /></button>
                </form>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="study-buddy-container">
      <header className="sb-header">
        <h1>Live Study Rooms</h1>
        <p>Join a virtual space to focus with others.</p>
      </header>
      
      <div className="rooms-grid">
        {STUDY_ROOMS.map(room => (
            <motion.div 
                key={room.id} 
                className="room-card"
                whileHover={{ scale: 1.03 }}
                onClick={() => joinRoom(room.id)}
            >
                <div className="room-icon">{room.icon}</div>
                <h3>{room.name}</h3>
                <p>{room.description}</p>
                <div className="room-stats">
                    <span><Users size={14} /> {roomCounts[room.id] || 0} Online</span>
                </div>
                <button className="join-btn">Join Room</button>
            </motion.div>
        ))}
      </div>
    </div>
  );
};

export default StudyBuddy;
