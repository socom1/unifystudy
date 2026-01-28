import { useEffect, useState, useMemo } from 'react';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { IndexeddbPersistence } from 'y-indexeddb';
import { db } from '@/services/firebaseConfig';
import { ref, get, set, serverTimestamp, onValue } from 'firebase/database';
import { useAuth } from '@/context/AuthContext';

const COLORS = [
  '#958DF1', '#F98181', '#FBBC88', '#FAF594', '#70CFF8', '#94FADB', '#B9F18D',
];

const toBase64 = (bytes: Uint8Array) => {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

const fromBase64 = (base64: string) => {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes;
};

export const useYjsProvider = (docId: string, initialContent: string = '') => {
  const { user } = useAuth();
  
  // Create Yjs document
  // Use useMemo to ensure stable reference across renders (critical for StrictMode)
  // We do NOT explicitly destroy the doc here because useMemo might reuse it in StrictMode remounts.
  // We rely on provider destruction and GC.
  const ydoc = useMemo(() => new Y.Doc(), [docId]);
  
  const [provider, setProvider] = useState<WebrtcProvider | null>(null);
  const [isSynced, setIsSynced] = useState(false);

  useEffect(() => {
    if (!docId || !user) return;

    // 1. WebRTC Provider (Real-time P2P)
    let webrtcProvider: WebrtcProvider | null = null;
    try {
        webrtcProvider = new WebrtcProvider(`unifystudy-v1-${docId}`, ydoc, {
            signaling: ['wss://signaling.yjs.dev', 'wss://y-webrtc-signaling-eu.herokuapp.com', 'wss://y-webrtc-signaling-us.herokuapp.com'],
        });
    } catch (e) {
        console.warn('WebRTC Provider failed (likely insecure operation):', e);
    }

    // 2. IndexedDB Persistence (Offline Support)
    let indexeddbProvider: IndexeddbPersistence | null = null;
    try {
      indexeddbProvider = new IndexeddbPersistence(`unifystudy-${docId}`, ydoc);
    } catch (e) {
      console.warn('IndexedDB unavailable (likely in private mode or restricted environment):', e);
    }

    // 3. User Awareness (Cursors)
    if (webrtcProvider) {
        const awareness = webrtcProvider.awareness;
        const userColor = COLORS[Math.floor(Math.random() * COLORS.length)];
        
        awareness.setLocalStateField('user', {
        name: user.displayName || 'Anonymous',
        color: userColor,
        colorLight: userColor + '30', // 30% opacity
        });
    }

    // 4. Firebase Backup Logic (Debounced)
    let saveTimeout: any;
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const saveToFirebase = () => {
      const update = Y.encodeStateAsUpdate(ydoc);
      const blob = toBase64(update);
      
      const docRef = ref(db, `projects/documents/${docId}`);
      set(docRef, {
        blob,
        updatedAt: serverTimestamp(),
        lastAuthor: user.uid
      });
    };

    // Initial Load from Firebase (if IndexedDB is empty or stale)
    if (indexeddbProvider) {
        indexeddbProvider.on('active', async () => {
            // Only load if this is a fresh session
            const docRef = ref(db, `projects/documents/${docId}`);
            const snapshot = await get(docRef);
            if (snapshot.exists()) {
                const data = snapshot.val();
                if (data.blob) {
                    const update = fromBase64(data.blob);
                    Y.applyUpdate(ydoc, update);
                }
            }
            setIsSynced(true);
        });
    } else {
        // Fallback: Just load from Firebase directly if IDB failed
        // AND keep listening if WebRTC also failed (double fallback)
        const docRef = ref(db, `projects/documents/${docId}`);
        
        // Initial load
        get(docRef).then((snapshot) => {
             if (snapshot.exists()) {
                 const data = snapshot.val();
                 if (data.blob) {
                     const update = fromBase64(data.blob);
                     Y.applyUpdate(ydoc, update);
                 }
             }
             setIsSynced(true);
        });

        // If WebRTC failed, we MUST listen to Firebase for real-time updates from others
        if (!webrtcProvider) {
            const unsub = onValue(docRef, (snapshot: any) => {
                const data = snapshot.val();
                if (data && data.blob && data.lastAuthor !== user.uid) {
                     // Check if it's an update from someone else
                     // Note: This is a heavy update (full doc replacement) but necessary for fallback
                     const update = fromBase64(data.blob);
                     Y.applyUpdate(ydoc, update, 'firebase-fallback');
                }
            });
            // Cleanup listener on unmount (only needed if component unmounts for this specific scenario)
             return () => {
                 unsub();
             };
        }
    }

    // Listen for updates to save to Firebase
    ydoc.on('update', (_update: any, origin: any) => {
        // Prevent infinite loops: only save if change came from local user (not from Firebase listener)
        if (origin !== 'firebase-fallback') {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(saveToFirebase, 2000); // Save every 2 seconds max
        }
    });

    setProvider(webrtcProvider);

    return () => {
      if (webrtcProvider) webrtcProvider.destroy();
      if (indexeddbProvider) indexeddbProvider.destroy();
    };
  }, [docId, user, ydoc]);

  return { ydoc, provider, isSynced };
};
