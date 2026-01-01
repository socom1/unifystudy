// @ts-nocheck
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { useUI } from "@/context/UIContext";
import { db } from "@/services/firebaseConfig";
import { ref, onValue, set } from "firebase/database";
import { toast } from "sonner";
import { X } from "lucide-react";
import "./GlobalPlayer.scss";

export default function GlobalPlayer() {
  const { setShowMusicPlayer } = useUI();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState("spotify"); // 'spotify' or 'youtube'
  const [youtubeId, setYoutubeId] = useState("jfKfPfyJRdk"); // Default Lofi Girl
  const [inputVal, setInputVal] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);

  // Sync State
  const [syncSessionId, setSyncSessionId] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  const playerRef = React.useRef(null);
  const containerRef = React.useRef(null);
  const dragControls = useDragControls();

  const toggleOpen = () => setIsOpen(!isOpen);

  const togglePlay = () => {
    const newState = !isPlaying;
    if (mode === "youtube" && playerRef.current) {
      if (newState) playerRef.current.playVideo();
      else playerRef.current.pauseVideo();
    }
    setIsPlaying(newState);

    // Sync Update
    if (isSyncing && syncSessionId) {
      set(ref(db, `music_sessions/${syncSessionId}`), {
        videoId: youtubeId,
        isPlaying: newState,
        timestamp: Date.now()
      });
    }
  };

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Ignore if clicking on the toggle itself
      if (event.target.closest('.player-toggle')) return;

      if (isOpen && containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Load YouTube IFrame API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Initialize YouTube player when mode changes or video ID changes
  useEffect(() => {
    const initPlayer = () => {
      if (mode === "youtube" && window.YT && window.YT.Player) {
        const iframe = document.getElementById('youtube-player-iframe');
        if (iframe && !playerRef.current) {
          playerRef.current = new window.YT.Player('youtube-player-iframe', {
            events: {
              'onStateChange': (event) => {
                setIsPlaying(event.data === 1);
              }
            }
          });
        }
      }
    };

    // Small delay to ensure iframe is mounted
    const timer = setTimeout(initPlayer, 500);
    return () => {
      clearTimeout(timer);
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [mode, youtubeId]);

  // Sync Listener
  useEffect(() => {
    if (!isSyncing || !syncSessionId) return;

    const sessionRef = ref(db, `music_sessions/${syncSessionId}`);
    const unsub = onValue(sessionRef, (snap) => {
      const data = snap.val();
      if (data) {
        if (data.videoId && data.videoId !== youtubeId) setYoutubeId(data.videoId);
        if (data.isPlaying !== undefined && data.isPlaying !== isPlaying) {
          setIsPlaying(data.isPlaying);
          if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
            if (data.isPlaying) playerRef.current.playVideo();
            else playerRef.current.pauseVideo();
          }
        }
      }
    });
    return () => unsub();
  }, [isSyncing, syncSessionId]); // Reduced deps to avoid loops

  const handleSyncToggle = () => {
    if (isSyncing) {
      setIsSyncing(false);
      setSyncSessionId("");
      toast.success("Disconnected from session.");
    } else {
      const id = prompt("Enter Session ID to join/host (e.g. 'room1'):");
      if (id) {
        setSyncSessionId(id);
        setIsSyncing(true);
        toast.success(`Joined session '${id}'. Playback is now synced!`);
      }
    }
  };

  const handleYoutubeSubmit = (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    let id = inputVal;
    if (inputVal.includes("v=")) {
      id = inputVal.split("v=")[1].split("&")[0];
    } else if (inputVal.includes("youtu.be/")) {
      id = inputVal.split("youtu.be/")[1];
    }
    setYoutubeId(id);
    setInputVal("");
    setIsPlaying(false);

    // Sync Update
    if (isSyncing && syncSessionId) {
      set(ref(db, `music_sessions/${syncSessionId}`), {
        videoId: id,
        isPlaying: false,
        timestamp: Date.now()
      });
    }
  };

  return (
    <motion.div
      className="global-player"
      ref={containerRef}
      drag
      dragListener={false} // Disable default drag listener
      dragControls={dragControls}
      dragMomentum={false}
      initial={{ x: 0, y: 0 }}
      style={{ touchAction: 'none' }} // Prevent scrolling while dragging
    >
      <motion.div
        key="player-content"
        className="player-content"
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={isOpen ? { opacity: 1, scale: 1, y: 0, pointerEvents: "auto" } : { opacity: 0, scale: 0.95, y: 10, pointerEvents: "none" }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
      >
        <div
          className="player-header"
          onPointerDown={(e) => dragControls.start(e)}
          style={{ cursor: 'grab' }}
        >
          <div className="mode-switch">
            <button
              className={mode === "spotify" ? "active" : ""}
              onPointerDown={(e) => e.stopPropagation()} // Prevent drag on click
              onClick={() => setMode("spotify")}
            >
              Spotify
            </button>
            <button
              className={mode === "youtube" ? "active" : ""}
              onPointerDown={(e) => e.stopPropagation()} // Prevent drag on click
              onClick={() => setMode("youtube")}
            >
              YouTube
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {mode === "youtube" && (
              <button
                onClick={togglePlay}
                style={{
                  background: 'none',
                  border: 'none',
                  color: isPlaying ? 'var(--color-primary)' : 'var(--color-muted)',
                  cursor: 'pointer',
                  fontSize: '1.2rem'
                }}
                title={isPlaying ? "Pause" : "Play"}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {isPlaying ? "⏸" : "▶"}
              </button>
            )}
            <button
              onClick={() => setShowMusicPlayer(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-muted)',
                cursor: 'pointer',
                padding: '4px'
              }}
              title="Close Player"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="player-body">
          {mode === "spotify" ? (
            <iframe
              style={{ borderRadius: 12 }}
              src="https://open.spotify.com/embed/playlist/37i9dQZF1DWWQRwui0ExPn?utm_source=generator&theme=0"
              width="100%"
              height="152"
              frameBorder="0"
              allowFullScreen=""
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            ></iframe>
          ) : (
            <div className="youtube-player">
              <div className="sync-controls" style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleSyncToggle}
                  onPointerDown={(e) => e.stopPropagation()}
                  style={{
                    fontSize: '0.7rem',
                    padding: '2px 8px',
                    background: isSyncing ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)',
                    color: isSyncing ? '#000' : '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {isSyncing ? `Synced: ${syncSessionId}` : "Start Sync Party"}
                </button>
              </div>
              <iframe
                id="youtube-player-iframe"
                width="100%"
                height="200"
                src={`https://www.youtube.com/embed/${youtubeId}?enablejsapi=1&origin=${window.location.origin}`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
              <form onSubmit={handleYoutubeSubmit} className="yt-input">
                <input
                  placeholder="Paste YouTube URL or ID"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onPointerDown={(e) => e.stopPropagation()}
                />
                <button type="submit" onPointerDown={(e) => e.stopPropagation()}>Load</button>
              </form>
            </div>
          )}
        </div>
      </motion.div>

      {/* Always visible toggle button */}
      <motion.div
        key="player-toggle"
        className="player-toggle"
        onClick={toggleOpen}
        onPointerDown={(e) => dragControls.start(e)}
        initial={false}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        style={{ cursor: 'grab', touchAction: 'none' }}
      >
        {isOpen ? (
          <X size={24} color="var(--color-text)" />
        ) : (
          <div className={`music-bars ${isPlaying ? "playing" : "paused"}`}>
            <div className="bar"></div>
            <div className="bar"></div>
            <div className="bar"></div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
