// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, FileText, Link as LinkIcon, Plus, Search, Trash2, ExternalLink, Video, Image, ChevronRight, Upload, X } from 'lucide-react';
import { db, storage } from "@/services/firebaseConfig";
import { ref, onValue, push, remove } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import './ResourceLibrary.scss';


const ResourceLibrary = ({ user }) => {
  const [currentFolder, setCurrentFolder] = useState(null); // null = root
  const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: 'Library' }]);
  const [resources, setResources] = useState([]);
  
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState('folder');
  const [newItemUrl, setNewItemUrl] = useState(''); // For links
  
  // File Upload State
  const [isUploading, setIsUploading] = useState(false);

  // Preview State
  const [previewFile, setPreviewFile] = useState(null);
  
  const fileInputRef = useRef(null);

  // Fetch Resources
  useEffect(() => {
    if (!user) return;
    const resourcesRef = ref(db, `users/${user.uid}/resources`);
    const unsub = onValue(resourcesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setResources(Object.entries(data).map(([id, val]) => ({ id, ...val })));
      } else {
        setResources([]);
      }
    });
    return () => unsub();
  }, [user]);

  const getIcon = (type) => {
    switch (type) {
      case 'folder': return <Folder className="icon folder" />;
      case 'pdf': return <FileText className="icon pdf" />;
      case 'link': return <LinkIcon className="icon link" />;
      case 'video': return <Video className="icon video" />;
      case 'image': return <Image className="icon image" />;
      default: return <FileText className="icon" />;
    }
  };

  const handleFolderClick = (folder) => {
    setCurrentFolder(folder.id);
    setBreadcrumbs([...breadcrumbs, { id: folder.id, name: folder.name }]);
  };

  const handleItemClick = (item) => {
    if (item.type === 'folder') {
      handleFolderClick(item);
    } else if (item.url) {
        if(item.type === 'pdf' || item.type === 'image') {
            setPreviewFile(item);
        } else {
            window.open(item.url, '_blank', 'noopener,noreferrer');
        }
    }
  };

  const handleBreadcrumbClick = (index) => {
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(newBreadcrumbs);
    setCurrentFolder(newBreadcrumbs[newBreadcrumbs.length - 1].id);
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItemName.trim() || !user) return;
    if (newItemType === 'link' && !newItemUrl.trim()) return;

    const resourcesRef = ref(db, `users/${user.uid}/resources`);
    await push(resourcesRef, {
      type: newItemType,
      name: newItemName,
      parentId: currentFolder,
      url: newItemType === 'link' ? newItemUrl : null,
      createdAt: Date.now()
    });

    setShowAddModal(false);
    setNewItemName('');
    setNewItemUrl('');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
        const fileRef = storageRef(storage, `users/${user.uid}/resources/${Date.now()}_${file.name}`);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        
        let type = 'file';
        if (file.type.includes('pdf')) type = 'pdf';
        else if (file.type.includes('image')) type = 'image';
        else if (file.type.includes('video')) type = 'video';

        const resourcesRef = ref(db, `users/${user.uid}/resources`);
        await push(resourcesRef, {
            type,
            name: file.name,
            parentId: currentFolder,
            url,
            storagePath: fileRef.fullPath, // Store path for deletion
            createdAt: Date.now()
        });
    } catch (error) {
        console.error("Upload failed", error);
        toast.error("Upload failed!");
    } finally {
        setIsUploading(false);
    }
  };
  
  const handleDelete = async (res) => {
      if(!window.confirm(`Delete ${res.name}?`)) return;
      
      // Delete from DB
      await remove(ref(db, `users/${user.uid}/resources/${res.id}`));
      
      // If it's a folder, recursively delete children (simplified: just list items)
      // For now, orphaned children will remain hidden but in DB. A recursive delete function is better.
      // We will just filter them out for now.
      
      // If file, delete from storage
      if (res.storagePath) {
          try {
              await deleteObject(storageRef(storage, res.storagePath));
          } catch(e) {
              console.warn("Storage delete failed", e);
          }
      }
  };

  const filteredResources = resources.filter(res => {
    const isChild = res.parentId === currentFolder;
    const matchesSearch = res.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || res.type === filter;
    return isChild && matchesSearch && matchesFilter;
  });

  return (
    <div className="resource-library" style={{ position: 'relative' }}>
        {/* Coming Soon Overlay */}
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 50,
            backdropFilter: 'blur(12px)',
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            textAlign: 'center'
        }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
            >
                <div style={{ 
                    background: 'var(--bg-1)', 
                    padding: '2rem', 
                    borderRadius: '24px', 
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                    border: '1px solid var(--color-primary)'
                }}>
                    <Folder size={64} style={{ marginBottom: '1rem', opacity: 0.9, color: 'var(--color-primary)' }} />
                    <h1 style={{ fontSize: '3rem', fontWeight: '800', marginBottom: '1rem', letterSpacing: '-0.02em' }}>Coming Soon</h1>
                    <p style={{ fontSize: '1.2rem', opacity: 0.8, maxWidth: '400px', lineHeight: '1.6' }}>
                        We're building a powerful resource library for you to store and organize your study materials. Stay tuned!
                    </p>
                </div>
            </motion.div>
        </div>

      <header className="library-header" style={{ opacity: 0.3, pointerEvents: 'none' }}>
        <div className="header-left">
          <h1>Resource Library</h1>
          <div className="breadcrumbs">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={crumb.id || 'root'}>
                {index > 0 && <ChevronRight size={16} />}
                <span 
                  className={index === breadcrumbs.length - 1 ? 'active' : ''}
                  onClick={() => handleBreadcrumbClick(index)}
                >
                  {crumb.name}
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="header-actions">
          <button className="add-btn secondary" onClick={() => fileInputRef.current.click()} disabled={isUploading}>
            <Upload size={18} /> {isUploading ? "Uploading..." : "Upload"}
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={handleFileUpload}
            accept=".pdf,.doc,.docx,.png,.jpg,.mp4"
          />
          <button className="add-btn primary" onClick={() => setShowAddModal(true)}>
            <Plus size={18} /> Create
          </button>
        </div>
      </header>

      <div className="library-controls" style={{ opacity: 0.3, pointerEvents: 'none' }}>
        <div className="search-bar">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search current folder..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filters">
          {['all', 'folder', 'pdf', 'link', 'video'].map(f => (
            <button 
              key={f} 
              className={`filter-chip ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="resources-grid" style={{ opacity: 0.3, pointerEvents: 'none' }}>
        <AnimatePresence mode="popLayout">
          {filteredResources.length === 0 && (
            <motion.div 
              className="empty-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Folder size={48} />
              <p>This folder is empty</p>
            </motion.div>
          )}
          
          {filteredResources.map(res => (
            <motion.div 
              key={res.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="resource-card"
              onClick={() => handleItemClick(res)}
            >
              <div className="card-icon">
                {getIcon(res.type)}
              </div>
              <div className="card-info">
                <h3>{res.name}</h3>
                <div className="meta">
                  {res.type === 'folder' ? (
                    <span>{resources.filter(r => r.parentId === res.id).length} items</span>
                  ) : (
                    <span className="date">{new Date(res.createdAt).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
              <div className="card-actions">
                {res.url && (
                  <a href={res.url} target="_blank" rel="noopener noreferrer" className="action-btn" onClick={e => e.stopPropagation()}>
                    <ExternalLink size={16} />
                  </a>
                )}
                <button className="action-btn delete" onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(res);
                }}>
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Creation Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h2>Create New</h2>
                <button onClick={() => setShowAddModal(false)}><X size={20} /></button>
              </div>
              <form onSubmit={handleAddItem}>
                <div className="form-group">
                  <label>Type</label>
                  <div className="type-selector">
                    <button 
                      type="button" 
                      className={newItemType === 'folder' ? 'active' : ''}
                      onClick={() => setNewItemType('folder')}
                    >
                      <Folder size={16} /> Folder
                    </button>
                    <button 
                      type="button" 
                      className={newItemType === 'link' ? 'active' : ''}
                      onClick={() => setNewItemType('link')}
                    >
                      <LinkIcon size={16} /> Link
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label>Name</label>
                  <input 
                    type="text" 
                    placeholder={newItemType === 'folder' ? "Folder Name" : "Link Title"}
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    autoFocus
                  />
                </div>
                {newItemType === 'link' && (
                    <div className="form-group">
                        <label>URL</label>
                        <input 
                            type="url" 
                            placeholder="https://example.com"
                            value={newItemUrl}
                            onChange={(e) => setNewItemUrl(e.target.value)}
                        />
                    </div>
                )}
                <div className="modal-actions">
                  <button type="button" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="primary">Create</button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File Preview Modal */}
        <AnimatePresence>
            {previewFile && (
                <div className="modal-backdrop" onClick={() => setPreviewFile(null)}>
                    <motion.div 
                        className="file-preview-modal"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        onClick={e => e.stopPropagation()}
                        style={{ width: '80%', height: '80%', background: 'var(--bg-2)', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
                    >
                        <header style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3>{previewFile.name}</h3>
                            <button onClick={() => setPreviewFile(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={24} /></button>
                        </header>
                        <div style={{ flex: 1, background: 'var(--bg-1)', position: 'relative' }}>
                             {previewFile.type === 'pdf' ? (
                                 <iframe src={previewFile.url} width="100%" height="100%" />
                             ) : (
                                 <img src={previewFile.url} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
                             )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    </div>
  );
};

export default ResourceLibrary;
