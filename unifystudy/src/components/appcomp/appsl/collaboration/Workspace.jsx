import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, MessageSquare, Video, Mic, Share2, Plus, Folder, FileText, Send, Copy, LogOut, Grid, List, Clock, MoreVertical, Upload, Type, Palette, Bold, Italic, ChevronRight, ChevronDown, UserPlus, X, PanelLeftClose, PanelRightClose } from 'lucide-react';
import { db, storage } from '../firebase';
import { ref, push, onValue, set, remove, serverTimestamp, get, onDisconnect, update } from 'firebase/database';
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
  const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard' | 'editor'
  const [workspaceId, setWorkspaceId] = useState(null);
  const [projects, setProjects] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  
  // Editor State
  const [activeUsers, setActiveUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [files, setFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [editorContent, setEditorContent] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  // UI Toggles
  const [showFileSidebar, setShowFileSidebar] = useState(true);
  const [showChatSidebar, setShowChatSidebar] = useState(true);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');

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

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      const newProjectRef = push(ref(db, 'projects'));
      await set(newProjectRef, {
        name: newProjectName,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        members: { [user.uid]: true }
      });

      setNewProjectName('');
      setShowCreateModal(false);
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Failed to create project. Please check your permissions or internet connection.");
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
      color: '#' + Math.floor(Math.random()*16777215).toString(16),
      status: 'online'
    };

    set(userRef, userData);
    onDisconnect(userRef).remove();

    // Listeners
    const usersRef = ref(db, `workspaces/${workspaceId}/users`);
    const chatRef = ref(db, `workspaces/${workspaceId}/chat`);
    const filesRef = ref(db, `workspaces/${workspaceId}/files`);

    const unsubUsers = onValue(usersRef, (snap) => setActiveUsers(snap.val() ? Object.values(snap.val()) : []));
    const unsubChat = onValue(chatRef, (snap) => setMessages(snap.val() ? Object.values(snap.val()) : []));
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

    const chatRef = ref(db, `workspaces/${workspaceId}/chat`);
    push(chatRef, {
      text: newMessage,
      sender: user.displayName || 'Anonymous',
      timestamp: serverTimestamp()
    });
    setNewMessage('');
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(workspaceId);
    alert('Invite code copied: ' + workspaceId);
  };

  // File Operations
  const createFolder = async () => {
    const name = prompt("Enter folder name:");
    if (!name) return;
    const filesRef = ref(db, `workspaces/${workspaceId}/files`);
    await push(filesRef, {
      name,
      type: 'folder',
      parentId: null, // Root level by default
      createdAt: serverTimestamp(),
      createdBy: user.uid
    });
  };

  const createTextFile = async () => {
    const name = prompt("Enter file name:");
    if (!name) return;
    const filesRef = ref(db, `workspaces/${workspaceId}/files`);
    const newFileRef = await push(filesRef, {
      name: name.endsWith('.txt') ? name : `${name}.txt`,
      type: 'file',
      content: '',
      parentId: null,
      createdAt: serverTimestamp(),
      createdBy: user.uid
    });
    setActiveFile({ id: newFileRef.key, name, type: 'file', content: '' });
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
      alert("Upload failed. Please try again.");
    }
  };

  const handleFileDrop = async (fileId, newParentId) => {
    const fileRef = ref(db, `workspaces/${workspaceId}/files/${fileId}`);
    await update(fileRef, { parentId: newParentId });
  };

  // Member Management
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMemberEmail.trim()) return;
    
    // In a real app, you'd look up the user by email to get their UID.
    // For this demo, we'll just simulate it or require UID.
    // Since we don't have an email-to-uid index, we'll just show an alert.
    alert(`Invite sent to ${newMemberEmail} (Simulation)`);
    setShowAddMemberModal(false);
    setNewMemberEmail('');
  };

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
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <h1>My Projects</h1>
          <button className="create-btn" onClick={() => setShowCreateModal(true)}>
            <Plus size={20} /> New Project
          </button>
        </motion.header>

        <div className="projects-grid">
          {projects.map((project, index) => (
            <motion.div 
              key={project.id} 
              className="project-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              whileHover={{ y: -5, scale: 1.02 }}
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
          <div className="active-users">
            {activeUsers.map((u, i) => (
              <div key={i} className="user-avatar" style={{ backgroundColor: u.color }} title={u.name}>
                {u.name[0]}
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
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="sidebar-header">
              <h3>Explorer</h3>
              <div className="file-actions">
                <button onClick={createFolder} title="New Folder"><Folder size={16} /></button>
                <button onClick={createTextFile} title="New File"><FileText size={16} /></button>
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
          {activeFile ? (
            activeFile.type === 'pdf' ? (
              <iframe src={activeFile.url} className="pdf-viewer" title="PDF Viewer" />
            ) : (
              <div className="rich-text-container">
                <div className="toolbar" onMouseDown={(e) => e.preventDefault()}>
                  <button onClick={() => execCommand('bold')}><Bold size={16} /></button>
                  <button onClick={() => execCommand('italic')}><Italic size={16} /></button>
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
                <div 
                  className="rich-text-editor"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => setEditorContent(e.target.innerHTML)}
                >
                  <h1>{activeFile.name}</h1>
                  <p>Start typing...</p>
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
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
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
              <div ref={messagesEndRef} />
            </div>
            <form className="chat-input" onSubmit={sendMessage}>
              <input 
                type="text" 
                placeholder="Type a message..." 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
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
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <h2>Add Member</h2>
              <form onSubmit={handleAddMember}>
                <input 
                  type="email" 
                  placeholder="Member Email" 
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  autoFocus
                />
                <div className="modal-actions">
                  <button type="button" onClick={() => setShowAddMemberModal(false)}>Cancel</button>
                  <button type="submit" className="primary">Invite</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Workspace;
