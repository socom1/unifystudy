// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import Whiteboard from './Whiteboard';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, MessageSquare, Video, Mic, Share2, Plus, Folder, FileText, Send, Copy, LogOut, Grid, List, Clock, MoreVertical, Upload, Type, Palette, Bold, Italic, ChevronRight, ChevronDown, UserPlus, X, PanelLeftClose, PanelRightClose, Underline, AlignLeft, AlignCenter, AlignRight, ListOrdered, Check } from 'lucide-react';
import { db, storage } from '@/services/firebaseConfig';
import { toast } from "sonner";
import { ref, push, onValue, set, remove, serverTimestamp, get, onDisconnect, update, query, orderByChild, equalTo, startAt, endAt, limitToFirst, limitToLast } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import './WorkspaceStyles.scss';

// Recursive File Tree Component
const FileTreeItem = ({ item, files, level = 0, onSelect, activeFileId, onDrop, onToggleFolder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const children = files.filter(f => f.parentId === item.id);
  const isFolder = item.type === 'folder';

  const handleDragStart = (e) => {
    e.dataTransfer.setData('fileId', item.id);
  };

  const handleDragOver = (e) => {
    if (isFolder) e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const fileId = e.dataTransfer.getData('fileId');
    if (fileId !== item.id) {
      onDrop(fileId, item.id);
    }
  };

  const handleClick = () => {
    if (isFolder) {
      setIsOpen(!isOpen);
    } else {
      onSelect(item);
    }
  };

  return (
    <div className="file-tree-item">
      <div 
        className={`file-row ${activeFileId === item.id ? 'active' : ''}`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {isFolder && (
          <span className="chevron">
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        )}
        <span className="icon">
          {isFolder ? (
            <Folder size={16} fill={isOpen ? "var(--color-secondary)" : "none"} color={isOpen ? "var(--color-secondary)" : "var(--color-muted)"} />
          ) : item.type === 'pdf' ? (
            <FileText size={16} color="#ef4444" />
          ) : (
            <FileText size={16} color="var(--color-text)" />
          )}
        </span>
        <span className="name">{item.name}</span>
      </div>
      {isFolder && isOpen && (
        <div className="file-children">
          {children.map(child => (
            <FileTreeItem 
              key={child.id} 
              item={child} 
              files={files} 
              level={level + 1} 
              onSelect={onSelect}
              activeFileId={activeFileId}
              onDrop={onDrop}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const Workspace = ({ user }) => {
  const [projects, setProjects] = useState([]);
  const [viewMode, setViewMode] = useState('dashboard');
  const [workspaceId, setWorkspaceId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [activeFileId, setActiveFileId] = useState(null);
  const [activeTab, setActiveTab] = useState('files'); // 'files' or 'whiteboard'
  const [fileSystem, setFileSystem] = useState({});
  const [pagesContent, setPagesContent] = useState({});
  const [wsLoading, setWsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [onlineMembers, setOnlineMembers] = useState({});
  const [notification, setNotification] = useState(null);
  const [searchResults, setSearchResults] = useState([]);

  const showNotification = (msg, type='success') => {
      setNotification({ msg, type });
      setTimeout(() => setNotification(null), 3000);
  };
  
  // Drag & Drop
  const [draggedFileId, setDraggedFileId] = useState(null);
  const [dragOverFolderId, setDragOverFolderId] = useState(null);

  const editorRef = useRef(null);
  
  // Editor State (retained from original, but some might be redundant with new state)
  const [activeUsers, setActiveUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [files, setFiles] = useState([]); // This might be replaced by fileSystem
  const [activeFile, setActiveFile] = useState(null);
  const [editorContent, setEditorContent] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  // Page navigation state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  // const [pagesContent, setPagesContent] = useState({ 1: '' }); // This is now defined above

  // Update pagesContent when editor blurs
  // Update pagesContent when editor blurs and save to Firebase


  // When activeFile changes, load its content into pagesContent/editor
  useEffect(() => {
      if (activeFile && activeFile.content) {
          // Assuming single-page content for now, or you'd parse it if you stored pages separately
          setPagesContent({ 1: activeFile.content });
          setEditorContent(activeFile.content);
          // If you stored page count, you'd load that too. For now reset to 1.
          setCurrentPage(1);
          setTotalPages(1);
      } else if (activeFile) {
           setPagesContent({ 1: '' });
           setEditorContent('');
           setCurrentPage(1);
      }
  }, [activeFile?.id]); // Only trigger when ID changes, not on every small update to the object



  // Real-time Page Content Sync
  useEffect(() => {
    if (!workspaceId || !activeFile) return;
    
    // Listen to changes on the current page
    const pageRef = ref(db, `projects/${workspaceId}/pages/${activeFile.id}/${currentPage}`);
    const unsub = onValue(pageRef, (snap) => {
        const val = snap.val();
        if (val !== null) {
             // Only update React state (and re-render DOM) if content is different from what we currently satisfy
             // AND we are not the ones who just typed it (approximation check)
             if (editorRef.current && editorRef.current.innerHTML !== val) {
                 setPagesContent(prev => ({ ...prev, [currentPage]: val }));
             } else if (!editorRef.current) {
                 setPagesContent(prev => ({ ...prev, [currentPage]: val }));
             }
        }
    });
    return () => unsub();
  }, [workspaceId, activeFile, currentPage]);

  const saveTimeoutRef = useRef(null);

  const handlePageInput = (e) => {
     // Do NOT update React state here. It causes re-renders and cursor jumps.
     // The DOM updates itself naturally via contentEditable.
     const newContent = e.target.innerHTML;
     
     // Debounced Save
     if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
     saveTimeoutRef.current = setTimeout(() => {
         if (workspaceId && activeFile) {
             const pageRef = ref(db, `projects/${workspaceId}/pages/${activeFile.id}/${currentPage}`);
             set(pageRef, newContent);
         }
     }, 100);
      
     // Auto-Pagination Logic
     if (e.target.scrollHeight > e.target.clientHeight) {
         if (currentPage === totalPages) {
             const newPage = totalPages + 1;
             setTotalPages(newPage);
             setPagesContent(prev => ({ ...prev, [newPage]: '' }));
             setCurrentPage(newPage);
         } 
     }
     
     // Trigger local cursor update on input
     document.dispatchEvent(new Event('selectionchange'));
  };

  const handleEditorBlur = () => {
      // Sync state on blur to be safe
      if (editorRef.current) {
          const content = editorRef.current.innerHTML;
          setPagesContent(prev => ({ ...prev, [currentPage]: content }));
          
          if (workspaceId && activeFile) {
             const pageRef = ref(db, `projects/${workspaceId}/pages/${activeFile.id}/${currentPage}`);
             set(pageRef, content);
          }
      }
  };

  // Cursor Logic Adjustment
   useEffect(() => {
     if (!workspaceId || !user) return;

     const handleSelection = () => {
         const sel = window.getSelection();
         if (sel.rangeCount > 0) {
             const range = sel.getRangeAt(0);
             const rect = range.getBoundingClientRect();
             
             // Reference: The Page Container (offset parent)
             const container = document.querySelector('.workspace-page');
             
             if (container && container.contains(sel.anchorNode)) {
                 const containerRect = container.getBoundingClientRect();
                 const relX = rect.left - containerRect.left;
                 const relY = rect.top - containerRect.top;

                 set(ref(db, `projects/${workspaceId}/cursors/${user.uid}`), {
                     x: relX,
                     y: relY,
                     height: rect.height,
                     name: user.displayName || 'Anon',
                     color: user.settings?.customization?.avatarColor || '#ff0000',
                     timestamp: serverTimestamp()
                 });
             }
         }
     };

     document.addEventListener('selectionchange', handleSelection);
     return () => document.removeEventListener('selectionchange', handleSelection);
  }, [workspaceId, user]);
  
  // Pagination
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 8;
  
  // UI Toggles
  const [showFileSidebar, setShowFileSidebar] = useState(true);
  const [showChatSidebar, setShowChatSidebar] = useState(true);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  
  // File/Folder creation modals
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showCreateFileModal, setShowCreateFileModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  if (!user) return <div className="workspace-loading">Loading user profile...</div>;

  // Load User's Projects
  useEffect(() => {
    if (!user) return;
    const projectsRef = ref(db, 'projects');
    const unsub = onValue(projectsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const projectList = Object.entries(data)
          .map(([id, val]) => ({ id, ...val }))
          .filter(p => p.members && p.members[user.uid]); // Only show projects user is a member of
        setProjects(projectList);
      } else {
        setProjects([]);
      }
    });
    return () => unsub();
  }, [user]);

  // Sync Legacy Projects to Chat (Self-Healing)
  useEffect(() => {
    if (!user || projects.length === 0) return;

    projects.forEach(async (project) => {
        const channelId = project.id;
        const channelMetaRef = ref(db, `channels/${channelId}/metadata`);
        const userChannelRef = ref(db, `users/${user.uid}/channels/${channelId}`);

        // Check if metadata exists (light check using get() is okay for a few projects)
        // Or simpler: Just blindly update it to ensure it's always fresh.
        // It's low cost for < 20 projects.
        
        try {
            await update(channelMetaRef, {
                name: project.name,
                type: 'collaboration',
                // Don't overwrite createdBy/createdAt if they exist, but update name if changed
            });

            await update(userChannelRef, {
                name: project.name,
                type: 'collaboration',
                joinedAt: project.createdAt || serverTimestamp()
            });
        } catch (err) {
            console.warn("Failed to sync project to chat:", err);
        }
    });
  }, [user, projects]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      const newProjectRef = push(ref(db, 'projects'));
      await set(newProjectRef, {
        name: newProjectName,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        members: { [user.uid]: true }
      });

      // CHANGED: Initialize Chat Channel Metadata
      const channelId = newProjectRef.key;
      await set(ref(db, `channels/${channelId}/metadata`), {
          name: newProjectName,
          createdBy: user.uid,
          type: 'collaboration', // Distinct type
          participants: { [user.uid]: true },
          createdAt: serverTimestamp()
      });
      
      // Add to creator's channel list immediately
      await set(ref(db, `users/${user.uid}/channels/${channelId}`), {
          type: 'collaboration',
          name: newProjectName,
          joinedAt: serverTimestamp()
      });

      setNewProjectName('');
      setShowCreateModal(false);
    } catch (error) {
      console.error("Error creating project:", error);
      // Show specific error to help user debug permissions/network
      toast.error(`Failed to create project: ${error.code || error.message || "Unknown error"}`);
    }
  };

  const enterWorkspace = (id) => {
    setWorkspaceId(id);
    setViewMode('editor');
  };

  // Presence, Chat & File Sync
  useEffect(() => {
    if (viewMode !== 'editor' || !workspaceId || !user) return;

    // User Presence
    const userRef = ref(db, `workspaces/${workspaceId}/users/${user.uid}`);
    const userData = {
      name: user.displayName || 'Anonymous',
      photoURL: user.photoURL || null,
      color: '#' + Math.floor(Math.random()*16777215).toString(16),
      status: 'online'
    };

    set(userRef, userData);
    onDisconnect(userRef).remove();

    // Listeners
    const usersRef = ref(db, `workspaces/${workspaceId}/users`);
    // CHANGED: Align with global Chat system
    const chatRef = query(ref(db, `channels/${workspaceId}/messages`), limitToLast(50));
    const filesRef = ref(db, `workspaces/${workspaceId}/files`);

    const unsubUsers = onValue(usersRef, (snap) => setActiveUsers(snap.val() ? Object.values(snap.val()) : []));
    const unsubChat = onValue(chatRef, (snap) => {
        const val = snap.val();
        if (val) {
            // Convert to array and sort
            const msgs = Object.entries(val).map(([id, data]) => ({ id, ...data }));
            msgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            setMessages(msgs);
        } else {
            setMessages([]);
        }
    });
    const unsubFiles = onValue(filesRef, (snap) => {
      const data = snap.val();
      if (data) {
        setFiles(Object.entries(data).map(([id, val]) => ({ id, ...val })));
      } else {
        setFiles([]);
      }
    });

    return () => {
      remove(userRef);
      onDisconnect(userRef).cancel();
      unsubUsers();
      unsubChat();
      unsubFiles();
    };
  }, [viewMode, workspaceId, user]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !workspaceId) return;

    // CHANGED: Align with global Chat system
    const chatRef = ref(db, `channels/${workspaceId}/messages`);
    push(chatRef, {
      text: newMessage,
      uid: user.uid, // Add UID
      displayName: user.displayName || 'Anonymous', // Use consistent naming
      photoURL: user.photoURL || null,
      timestamp: serverTimestamp(),
      type: "text"
    });
    setNewMessage('');
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(workspaceId);
    toast.success('Invite code copied: ' + workspaceId);
  };

  // File Operations
  const createFolder = async (e) => {
    e?.preventDefault();
    if (!newItemName.trim()) return;
    
    const filesRef = ref(db, `workspaces/${workspaceId}/files`);
    await push(filesRef, {
      name: newItemName,
      type: 'folder',
      parentId: null,
      createdAt: serverTimestamp(),
      createdBy: user.uid
    });
    
    setNewItemName('');
    setShowCreateFolderModal(false);
  };

  const createTextFile = async (e) => {
    e?.preventDefault();
    if (!newItemName.trim()) return;
    
    const filesRef = ref(db, `workspaces/${workspaceId}/files`);
    const fileName = newItemName.endsWith('.txt') ? newItemName : `${newItemName}.txt`;
    const newFileRef = await push(filesRef, {
      name: fileName,
      type: 'file',
      content: '',
      parentId: null,
      createdAt: serverTimestamp(),
      createdBy: user.uid
    });
    
    setActiveFile({ id: newFileRef.key, name: fileName, type: 'file', content: '' });
    setNewItemName('');
    setShowCreateFileModal(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const fileRef = storageRef(storage, `workspaces/${workspaceId}/${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);

      const filesRef = ref(db, `workspaces/${workspaceId}/files`);
      await push(filesRef, {
        name: file.name,
        type: 'pdf',
        url,
        parentId: null,
        createdAt: serverTimestamp(),
        createdBy: user.uid
      });
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Upload failed. Please try again.");
    }
  };

  const handleFileDrop = async (fileId, newParentId) => {
    const fileRef = ref(db, `workspaces/${workspaceId}/files/${fileId}`);
    await update(fileRef, { parentId: newParentId });
  };

  // Typing & Cursors
  const [typingUsers, setTypingUsers] = useState([]);
  const typingTimeoutRef = useRef(null);
  const [remoteCursors, setRemoteCursors] = useState({});

  // Chat Typing Handler
  const handleTyping = () => {
      if (!workspaceId || !user) return;
      
      const typingRef = ref(db, `projects/${workspaceId}/typing/${user.uid}`);
      set(typingRef, user.displayName || 'Someone');
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      
      typingTimeoutRef.current = setTimeout(() => {
          set(typingRef, null);
      }, 3000);
  };

  // Listen for Typing & Cursors
  useEffect(() => {
      if (!workspaceId) return;

      // Typing
      const typingRef = ref(db, `projects/${workspaceId}/typing`);
      const unsubTyping = onValue(typingRef, (snap) => {
          const data = snap.val() || {};
          const users = Object.entries(data)
              .filter(([uid]) => uid !== user?.uid)
              .map(([_, name]) => name);
          setTypingUsers(users);
      });

      // Cursors (Listen)
      const cursorsRef = ref(db, `projects/${workspaceId}/cursors`);
      const unsubCursors = onValue(cursorsRef, (snap) => {
          if (snap.exists()) {
              const data = snap.val();
              // Remove own cursor
              if (user?.uid) delete data[user.uid];
              setRemoteCursors(data);
          } else {
              setRemoteCursors({});
          }
      });

      return () => {
          unsubTyping();
          unsubCursors();
      };
  }, [workspaceId, user]);

 // Old cursor effect removed in favor of new one above

 // User Search Effect
  useEffect(() => {
      if (showAddMemberModal) {
          if (newMemberEmail === 'debug_users') {
              get(ref(db, 'public_leaderboard')).then(snap => {
                  console.log("DEBUG: public_leaderboard raw:", snap.val());
                  toast.success("Debug data logged to console");
              });
          }

          if (newMemberEmail.length >= 1) {
              const timer = setTimeout(async () => {
                 try {
                    const usersRef = ref(db, 'public_leaderboard');
                    let snap = await get(usersRef);
                    let allUsers = [];

                    if (snap.exists()) {
                        allUsers = Object.entries(snap.val()).map(([uid, data]) => ({ uid, ...data }));
                    } 

                    const term = newMemberEmail.toLowerCase();
                    const filtered = allUsers.filter(u => 
                        (u.username && u.username.toLowerCase().includes(term)) ||
                        (u.displayName && u.displayName.toLowerCase().includes(term)) ||
                        (String(u.name || '').toLowerCase().includes(term))
                    ).slice(0, 5);
                    
                    setSearchResults(filtered);
                 } catch(err) { 
                     console.error("Search failed:", err);
                     setSearchResults([]);
                 }
              }, 300);
              return () => clearTimeout(timer);
          } else {
              setSearchResults([]);
          }
      }
  }, [newMemberEmail, showAddMemberModal]);

  // Member Management
  const handleAddMember = async (e) => {
    if (e) e.preventDefault();
   
    let targetUser = null;
    
    // Check for exact match (case-insensitive)
    const lowerInput = newMemberEmail.toLowerCase().trim();
    targetUser = searchResults.find(u => 
        (u.username && u.username.toLowerCase() === lowerInput) || 
        (u.name && u.name.toLowerCase() === lowerInput) ||
        (u.displayName && u.displayName.toLowerCase() === lowerInput)
    );

    if (!targetUser && searchResults.length > 0) {
        targetUser = searchResults[0];
    }

    if (!targetUser) {
         toast.error(`User "${newMemberEmail}" not found. Try selecting from the dropdown.`);
         return;
    }
    
    try {
        if (!workspaceId) throw new Error("No active workspace");

        // CHANGED: Send Invitation instead of direct add
        const inviteRef = push(ref(db, `users/${targetUser.uid}/invitations`));
        await set(inviteRef, {
            projectId: workspaceId,
            projectName: projects.find(p => p.id === workspaceId)?.name || workspaceId,
            inviterId: user.uid,
            inviterName: user.displayName || 'A classmate',
            timestamp: serverTimestamp(),
            status: 'pending'
        });

        // Optional: Also send a notification
        const notifRef = push(ref(db, `users/${targetUser.uid}/notifications`));
        await set(notifRef, {
            type: 'project_invite',
            title: 'New Project Invitation',
            message: `${user.displayName || 'Someone'} invited you to join "${projects.find(p => p.id === workspaceId)?.name}"`,
            // link: '/workspace', // No direct link, they need to accept first
            timestamp: serverTimestamp(),
            read: false
        });

        showNotification(`Invitation sent to ${targetUser.username || targetUser.displayName}!`, 'success');
        setShowAddMemberModal(false);
        setNewMemberEmail('');
        setSearchResults([]);
    } catch (err) {
        console.error("Invite failed:", err);
        toast.error("Failed to send invite: " + err.message);
    }
  };
  
  // Removed old direct add logic to prevent confusion
  /*
        await update(ref(db, `projects/${workspaceId}/members`), {
            [targetUser.uid]: true
        });

        // Link to User's Channels for easy access
        await update(ref(db, `users/${targetUser.uid}/channels`), {
            [workspaceId]: {
                name: workspaceId,
                type: 'collaboration',
                joinedAt: serverTimestamp()
            }
        });
  */



  const setMemberInput = (val) => setNewMemberEmail(val);

  // Rich Text Operations
  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
  };

  if (viewMode === 'dashboard') {
    return (
      <motion.div 
        className="workspace-dashboard"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <motion.header 
          className="dashboard-header"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <h1>My Projects</h1>
          <button className="create-btn" onClick={() => setShowCreateModal(true)}>
            <Plus size={20} /> New Project
          </button>
        </motion.header>

        <div className="projects-grid">
          {projects
            .slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)
            .map((project, index) => (
            <motion.div 
              key={project.id} 
              className="project-card"
              initial={false}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.15 }}
              onClick={() => enterWorkspace(project.id)}
            >
              <div className="card-icon">
                <Folder size={32} color="var(--color-primary)" />
              </div>
              <div className="card-info">
                <h3>{project.name}</h3>
                <p>Last edited: Today</p>
              </div>
              <button className="more-options">
                <MoreVertical size={16} />
              </button>
            </motion.div>
          ))}
          
          {projects.length === 0 && (
            <div className="empty-state">
              <p>No projects yet. Create one to get started!</p>
            </div>
          )}
        </div>

        {projects.length > ITEMS_PER_PAGE && (
          <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--bg-2)', border: '1px solid var(--glass-border)', color: 'var(--color-text)', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}
            >
              Previous
            </button>
            <span style={{ display: 'flex', alignItems: 'center', color: 'var(--color-muted)' }}>
              Page {page} of {Math.ceil(projects.length / ITEMS_PER_PAGE)}
            </span>
            <button 
              onClick={() => setPage(p => Math.min(Math.ceil(projects.length / ITEMS_PER_PAGE), p + 1))}
              disabled={page === Math.ceil(projects.length / ITEMS_PER_PAGE)}
              style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--bg-2)', border: '1px solid var(--glass-border)', color: 'var(--color-text)', cursor: page === Math.ceil(projects.length / ITEMS_PER_PAGE) ? 'not-allowed' : 'pointer', opacity: page === Math.ceil(projects.length / ITEMS_PER_PAGE) ? 0.5 : 1 }}
            >
              Next
            </button>
          </div>
        )}

        <AnimatePresence>
          {showCreateModal && (
            <motion.div 
              className="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={(e) => e.target.classList.contains('modal-overlay') && setShowCreateModal(false)}
            >
              <motion.div 
                className="modal-content"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
              >
                <h2>Create New Project</h2>
                <form onSubmit={handleCreateProject}>
                  <input 
                    type="text" 
                    placeholder="Project Name" 
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    autoFocus
                  />
                  <div className="modal-actions">
                    <button type="button" onClick={() => setShowCreateModal(false)}>Cancel</button>
                    <button type="submit" className="primary">Create</button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // --- RENDER EDITOR ---
  const rootFiles = files.filter(f => !f.parentId);

  return (
    <motion.div 
      className="workspace-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <header className="workspace-header">
        <div className="file-info">
          <button className="back-btn" onClick={() => setViewMode('dashboard')}>
            <Grid size={16} />
          </button>
          <h2>Workspace: {workspaceId}</h2>
          <button className="copy-code" onClick={copyInviteCode} title="Copy Invite Code">
            <Copy size={14} />
          </button>
        </div>
        
        <div className="header-actions">
          <div className="tab-switcher" style={{ display: 'flex', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '2px', marginRight: '1rem' }}>
            <button 
                onClick={() => setActiveTab('files')}
                style={{ background: activeTab === 'files' ? 'var(--color-primary)' : 'transparent', border: 'none', padding: '4px 12px', borderRadius: '6px', color: 'white', cursor: 'pointer', fontSize: '0.85rem' }}
            >
                Files
            </button>
            <button 
                onClick={() => setActiveTab('whiteboard')}
                style={{ background: activeTab === 'whiteboard' ? 'var(--color-primary)' : 'transparent', border: 'none', padding: '4px 12px', borderRadius: '6px', color: 'white', cursor: 'pointer', fontSize: '0.85rem' }}
            >
                Whiteboard
            </button>
          </div>

          <div className="active-users">
            {activeUsers.map((u, i) => (
              <div 
                key={i} 
                className="user-avatar" 
                style={{ 
                  backgroundColor: u.color,
                  backgroundImage: u.photoURL ? `url(${u.photoURL})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }} 
                title={u.name}
              >
                {!u.photoURL && u.name[0]}
              </div>
            ))}
          </div>
          
          <div className="divider" />
          
          <button className="action-btn" onClick={() => setShowAddMemberModal(true)} title="Add Member">
            <UserPlus size={20} />
          </button>
          <button className="leave-btn" onClick={() => setViewMode('dashboard')}>
            <LogOut size={16} /> Exit
          </button>
        </div>
      </header>

      <div className="workspace-body">
        {showFileSidebar && (
          <motion.div 
            className="file-sidebar"
            initial={{ x: -250 }}
            animate={{ x: 0 }}
            exit={{ x: -250 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="sidebar-header">
              <h3>Explorer</h3>
              <div className="file-actions">
                <button onClick={() => { setNewItemName(''); setShowCreateFolderModal(true); }} title="New Folder"><Folder size={16} /></button>
                <button onClick={() => { setNewItemName(''); setShowCreateFileModal(true); }} title="New File"><FileText size={16} /></button>
                <button onClick={() => fileInputRef.current?.click()} title="Upload PDF"><Upload size={16} /></button>
                <button onClick={() => setShowFileSidebar(false)} title="Close Sidebar"><PanelLeftClose size={16} /></button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".pdf" 
                  style={{ display: 'none' }} 
                />
              </div>
            </div>
            <div className="file-list" onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleFileDrop(e.dataTransfer.getData('fileId'), null)}>
              {rootFiles.map(file => (
                <FileTreeItem 
                  key={file.id} 
                  item={file} 
                  files={files} 
                  onSelect={setActiveFile}
                  activeFileId={activeFile?.id}
                  onDrop={handleFileDrop}
                />
              ))}
              {files.length === 0 && <div className="empty-files">No files yet</div>}
            </div>
          </motion.div>
        )}

        {!showFileSidebar && (
           <div className="collapsed-sidebar" onClick={() => setShowFileSidebar(true)}>
             <Folder size={20} />
           </div>
        )}

        <div className="editor-area">
          {activeTab === 'whiteboard' ? (
             <Whiteboard sessionId={workspaceId} />
          ) : activeFile ? (
            activeFile.type === 'pdf' ? (
              <iframe src={activeFile.url} className="pdf-viewer" title="PDF Viewer" />
            ) : (
              <div className="rich-text-container">
                <div className="toolbar" onMouseDown={(e) => e.preventDefault()}>
                  <button onClick={() => execCommand('bold')} title="Bold"><Bold size={16} /></button>
                  <button onClick={() => execCommand('italic')} title="Italic"><Italic size={16} /></button>
                  <button onClick={() => execCommand('underline')} title="Underline"><Underline size={16} /></button>
                  <div className="v-divider" style={{width:1, height:20, background:'rgba(255,255,255,0.1)', margin:'0 4px'}} />
                  <button onClick={() => execCommand('justifyLeft')} title="Align Left"><AlignLeft size={16} /></button>
                  <button onClick={() => execCommand('justifyCenter')} title="Align Center"><AlignCenter size={16} /></button>
                  <button onClick={() => execCommand('justifyRight')} title="Align Right"><AlignRight size={16} /></button>
                  <div className="v-divider" style={{width:1, height:20, background:'rgba(255,255,255,0.1)', margin:'0 4px'}} />
                  <button onClick={() => execCommand('insertUnorderedList')} title="Bullet List"><List size={16} /></button>
                  <button onClick={() => execCommand('insertOrderedList')} title="Numbered List"><ListOrdered size={16} /></button>
                  <div className="v-divider" style={{width:1, height:20, background:'rgba(255,255,255,0.1)', margin:'0 4px'}} />
                  <select 
                      onChange={(e) => execCommand('fontSize', e.target.value)}
                      style={{
                          background: 'transparent', color: 'var(--color-text)', border: 'none', 
                          outline: 'none', cursor: 'pointer', fontSize: '14px', padding: '0 4px',
                          fontFamily: 'inherit'
                      }}
                      defaultValue="3"
                  >
                      <option value="1">Small</option>
                      <option value="3">Normal</option>
                      <option value="5">Large</option>
                      <option value="7">Title</option>
                  </select>
                  <div className="color-picker-wrapper">
                    <button onClick={() => setShowColorPicker(!showColorPicker)}><Palette size={16} /></button>
                    {showColorPicker && (
                      <div className="color-palette">
                        {['#e0e0e0', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'].map(color => (
                          <div 
                            key={color} 
                            className="color-swatch" 
                            style={{ backgroundColor: color }}
                            onClick={() => {
                              execCommand('foreColor', color);
                              setShowColorPicker(false);
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="workspace-document">
                  <div className="page-controls">
                    <div className="page-nav">
                      <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        ← Previous
                      </button>
                      <span className="page-indicator">Page {currentPage} of {totalPages}</span>
                      <button 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next →
                      </button>
                    </div>
                    <button 
                      className="new-page-btn"
                      onClick={() => {
                        const newPage = totalPages + 1;
                        setTotalPages(newPage);
                        setCurrentPage(newPage);
                        setPagesContent(prev => ({ ...prev, [newPage]: '' }));
                      }}
                    >
                      + New Page
                    </button>
                  </div>
                  
                  <div className="workspace-page" style={{position:'relative'}}>
                    {/* Remote Cursors */}
                    {Object.entries(remoteCursors).map(([uid, cursor]) => (
                         <div key={uid} style={{
                            position: 'absolute',
                            left: cursor.x,
                            top: cursor.y,
                            pointerEvents: 'none',
                            zIndex: 100,
                            transition: 'all 0.1s ease-out'
                        }}>
                             <div style={{
                                 width: 2, height: cursor.height || 20, background: cursor.color || 'red',
                                 boxShadow: '0 0 4px rgba(0,0,0,0.3)'
                             }} />
                             <div style={{
                                 background: cursor.color || 'red',
                                 color: 'white',
                                 fontSize: 10, padding: '2px 4px',
                                 borderRadius: 4, whiteSpace: 'nowrap',
                                 position: 'absolute', top: -16, left: 0
                             }}>
                                 {cursor.name}
                             </div>
                        </div>
                    ))}
                    
                    <div className="page-number">Page {currentPage}</div>
                    <div 
                      key={currentPage} 
                      ref={editorRef}
                      className="rich-text-editor"
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={handleEditorBlur}
                      onInput={handlePageInput}
                      style={{ maxHeight: '900px', overflowY: 'hidden' }}
                      dangerouslySetInnerHTML={{ __html: pagesContent[currentPage] || (currentPage === 1 ? `<h1>${activeFile.name}</h1><p>Start typing...</p>` : '') }}
                    />
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="no-file-selected">
              <Folder size={48} color="var(--color-muted)" />
              <p>Select a file to view or edit</p>
            </div>
          )}
        </div>
        
        {showChatSidebar && (
          <motion.div 
            className="chat-sidebar"
            initial={{ x: 300 }}
            animate={{ x: 0 }}
            exit={{ x: 300 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="sidebar-header">
              <h3>Team Chat</h3>
              <button onClick={() => setShowChatSidebar(false)} title="Close Chat"><PanelRightClose size={16} /></button>
            </div>
            <div className="chat-messages">
              {messages.map((msg, i) => (
                <div key={i} className={`message ${msg.sender === (user.displayName || 'Anonymous') ? 'own' : ''}`}>
                  <span className="author">{msg.sender}</span>
                  <p>{msg.text}</p>
                </div>
              ))}
              {/* Typing Indicator */}
              {typingUsers.length > 0 && (
                  <div className="typing-indicator" style={{padding: '8px 16px', fontSize: 12, color: '#888', fontStyle: 'italic'}}>
                      {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                  </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <form className="chat-input" onSubmit={sendMessage}>
              <input 
                type="text" 
                placeholder="Type a message..." 
                value={newMessage}
                onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                }}
              />
              <button type="submit"><Send size={16} /></button>
            </form>
          </motion.div>
        )}

        {!showChatSidebar && (
           <div className="collapsed-sidebar right" onClick={() => setShowChatSidebar(true)}>
             <MessageSquare size={20} />
           </div>
        )}
      </div>

      <AnimatePresence>
        {showAddMemberModal && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => e.target.classList.contains('modal-overlay') && setShowAddMemberModal(false)}
          >
            <motion.div 
              className="modal-content"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              style={{ maxWidth: 400, width: '90%' }} // Ensure decent width
            >
              <div className="modal-header-icon" style={{
                  background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))', 
                  width: 56, height: 56, borderRadius: '20px', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px', boxShadow: '0 8px 20px rgba(0,0,0,0.3)'
              }}>
                  <UserPlus size={28} color="white" />
              </div>
              <h2 style={{textAlign: 'center', marginBottom: 6, fontSize: '1.5rem'}}>Invite Member</h2>
              <p style={{textAlign: 'center', color: '#888', marginBottom: 24, fontSize: '0.9rem', lineHeight: 1.5}}>
                  Add team members to <strong>{workspaceId}</strong> to start collaborating.
              </p>
              
              <form onSubmit={handleAddMember}>
                <div className="input-group" style={{ marginBottom: 24, position: 'relative' }}>
                    <input 
                      type="text" 
                      placeholder="Enter Username or Email" 
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      autoFocus
                      style={{ 
                          width: '100%', 
                          padding: '14px', 
                          background: 'rgba(255,255,255,0.03)', 
                          border: '1px solid rgba(255,255,255,0.1)', 
                          borderRadius: '12px', 
                          color: 'var(--color-text)',
                          fontSize: '1rem',
                          outline: 'none'
                      }}
                    />
                    {newMemberEmail.length > 0 && (
                        <div className="search-dropdown" style={{
                            position: 'absolute', top: '100%', left: 0, right: 0,
                            background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px', marginTop: 8, zIndex: 9999,
                            maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                        }}>
                    {searchResults.length > 0 ? (
                       searchResults.map((u, i) => (
                           <div key={i} onClick={() => setNewMemberEmail(u.username || u.name || u.displayName)} style={{
                               padding: '12px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)',
                               display: 'flex', alignItems: 'center', gap: 12, transition: 'background 0.2s'
                           }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                           >
                                <div style={{width: 32, height: 32, borderRadius:'50%', background: '#333', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, color:'#fff'}}>
                                    {u.photoURL ? <img src={u.photoURL} alt="" style={{width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover'}} /> : (u.username?.[0] || 'U').toUpperCase()}
                                </div>
                                <div style={{display:'flex', flexDirection:'column'}}>
                                    <span style={{fontSize: '0.9rem', color: '#fff'}}>{u.username || u.displayName || 'User'}</span>
                                    {u.name && <span style={{fontSize: '0.75rem', color: '#888'}}>{u.name}</span>}
                                </div>
                           </div>
                       ))
                    ) : (
                        newMemberEmail.length >= 1 && (
                            <div style={{padding: '12px', color: '#888', fontStyle: 'italic', textAlign: 'center'}}>
                                No users found
                            </div>
                        )
                    )}
                    </div>
                )}
                </div>
                <div className="modal-actions" style={{ display: 'flex', gap: 12, width: '100%' }}>
                  <button type="button" onClick={() => setShowAddMemberModal(false)} style={{ 
                      flex: 1, padding: '12px', borderRadius: '12px', 
                      background: 'rgba(255,255,255,0.05)', border: 'none', 
                      color: 'var(--color-text)', cursor: 'pointer' 
                  }}>Cancel</button>
                  <button type="submit" style={{ 
                      flex: 1, padding: '12px', borderRadius: '12px', 
                      background: 'var(--color-primary)', border: 'none', 
                      color: 'white', fontWeight: 600, cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                  }}>Send Invite</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Folder Modal */}
      <AnimatePresence>
        {showCreateFolderModal && (
          <div className="modal-backdrop" onClick={() => setShowCreateFolderModal(false)}>
            <motion.div 
              className="event-form"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="header">
                <h3>Create New Folder</h3>
              </div>
              <form onSubmit={createFolder}>
                <div className="form-group">
                  <label>Folder Name</label>
                  <input 
                    type="text" 
                    placeholder="My Folder" 
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="form-buttons">
                  <button type="button" className="cancel-btn" onClick={() => setShowCreateFolderModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="save-btn">
                    <Plus size={16} />
                    Create
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create File Modal */}
      <AnimatePresence>
        {showCreateFileModal && (
          <div className="modal-backdrop" onClick={() => setShowCreateFileModal(false)}>
            <motion.div 
              className="event-form"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="header">
                <h3>Create New Text File</h3>
              </div>
              <form onSubmit={createTextFile}>
                <div className="form-group">
                  <label>File Name</label>
                  <input 
                    type="text" 
                    placeholder="notes.txt" 
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="form-buttons">
                  <button type="button" className="cancel-btn" onClick={() => setShowCreateFileModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="save-btn">
                    <Plus size={16} />
                    Create
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Workspace;
