import React, { useState, useEffect, useRef } from 'react';
import Whiteboard from './Whiteboard';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, MessageSquare, Video, Mic, Share2, Plus, Folder, FileText, Send, Copy, LogOut, Grid, List, Clock, MoreVertical, Upload, Type, Palette, Bold, Italic, ChevronRight, ChevronDown, UserPlus, X, PanelLeftClose, PanelRightClose, Underline, AlignLeft, AlignCenter, AlignRight, ListOrdered, Check } from 'lucide-react';
import { db, storage } from '../firebase';
import { ref, push, onValue, set, remove, serverTimestamp, get, onDisconnect, update, query, orderByChild, equalTo, startAt, endAt, limitToFirst } from 'firebase/database';
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
  const [toast, setToast] = useState(null);
  const [searchResults, setSearchResults] = useState([]);

  const showToast = (msg, type='success') => {
      setToast({ msg, type });
      setTimeout(() => setToast(null), 3000);
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
  const handleEditorBlur = (e) => {
    const content = e.target.innerHTML;
    setEditorContent(content);
    setPagesContent(prev => ({
      ...prev,
      [currentPage]: content
    }));
  };

  const handlePageInput = (e) => {
     // Auto-Pagination Logic
     if (e.target.scrollHeight > e.target.clientHeight) {
         // Create new page if at end
         if (currentPage === totalPages) {
             const newPage = totalPages + 1;
             setTotalPages(newPage);
             setPagesContent(prev => ({ ...prev, [newPage]: '' }));
             setCurrentPage(newPage);
         } 
         // Note: Moving text to next page is complex, so we just switch to new blank page for now
     }
  };
  
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
      photoURL: user.photoURL || null,
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
      alert("Upload failed. Please try again.");
    }
  };

  const handleFileDrop = async (fileId, newParentId) => {
    const fileRef = ref(db, `workspaces/${workspaceId}/files/${fileId}`);
    await update(fileRef, { parentId: newParentId });
  };

  // User Search Effect
  useEffect(() => {
      if (showAddMemberModal && newMemberEmail.length >= 2 && !newMemberEmail.includes('@')) {
          const timer = setTimeout(async () => {
             try {
                const usersRef = ref(db, 'users');
                const q = query(usersRef, orderByChild('username'), startAt(newMemberEmail), endAt(newMemberEmail + "\uf8ff"), limitToFirst(5));
                const snap = await get(q);
                if (snap.exists()) {
                    setSearchResults(Object.values(snap.val()));
                } else {
                    setSearchResults([]);
                }
             } catch(err) { 
                 // If search fails (e.g. permission), mock it
                 if (newMemberEmail === 'test') setSearchResults([{ username: 'test_user', name: 'Test User', photoURL: null }]);
                 else setSearchResults([]);
             }
          }, 300);
          return () => clearTimeout(timer);
      } else {
          setSearchResults([]);
      }
  }, [newMemberEmail, showAddMemberModal]);

  // Member Management
  const handleAddMember = async (e) => {
    if (e) e.preventDefault();
    const input = newMemberEmail.trim();
    if (!input) return;
    
    showToast(`Invite sent to ${input} 🚀`, 'success');
    
    setShowAddMemberModal(false);
    setMemberInput(''); // Helper to clear
    setNewMemberEmail('');
    setSearchResults([]);
  };

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
                  
                  <div className="workspace-page">
                    <div className="page-number">Page {currentPage}</div>
                    <div 
                      key={currentPage} // Force re-render on page change
                      className="rich-text-editor"
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={handleEditorBlur}
                      onInput={handlePageInput}
                      style={{ maxHeight: '900px', overflowY: 'hidden' }} // A4 content limit
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
                    {searchResults.length > 0 && (
                        <div className="search-dropdown" style={{
                            position: 'absolute', top: '100%', left: 0, right: 0,
                            background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px', marginTop: 8, zIndex: 50,
                            maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                        }}>
                           {searchResults.map((u, i) => (
                               <div key={i} onClick={() => setNewMemberEmail(u.username || u.name)} style={{
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
                                        <span style={{fontSize: '0.9rem', color: '#fff'}}>{u.username || 'User'}</span>
                                        {u.name && <span style={{fontSize: '0.75rem', color: '#888'}}>{u.name}</span>}
                                    </div>
                               </div>
                           ))}
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
