import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, FileText, Link as LinkIcon, Plus, Search, Trash2, ExternalLink, Video, Image, ChevronRight, Upload, ArrowLeft, X } from 'lucide-react';
import './ResourceLibrary.scss';

const ResourceLibrary = () => {
  const [currentFolder, setCurrentFolder] = useState(null); // null = root
  const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: 'Library' }]);
  const [resources, setResources] = useState([
    { id: 1, type: 'folder', name: 'Calculus 101', parentId: null, items: 3 },
    { id: 2, type: 'pdf', name: 'Lecture Notes - Week 1.pdf', parentId: null, tag: 'Math' },
    { id: 3, type: 'link', name: 'Khan Academy - Derivatives', parentId: null, url: 'https://khanacademy.org', tag: 'Math' },
    { id: 4, type: 'video', name: 'Physics - Newton Laws', parentId: null, tag: 'Physics' },
    // Inside Calculus 101
    { id: 5, type: 'pdf', name: 'Derivatives Cheat Sheet.pdf', parentId: 1, tag: 'Math' },
    { id: 6, type: 'pdf', name: 'Integrals Practice.pdf', parentId: 1, tag: 'Math' },
  ]);
  
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState('folder');
  
  const fileInputRef = useRef(null);

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

  const handleBreadcrumbClick = (index) => {
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(newBreadcrumbs);
    setCurrentFolder(newBreadcrumbs[newBreadcrumbs.length - 1].id);
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const newItem = {
      id: Date.now(),
      type: newItemType,
      name: newItemName,
      parentId: currentFolder,
      tag: 'New',
      items: 0
    };

    setResources([...resources, newItem]);
    setShowAddModal(false);
    setNewItemName('');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const newItem = {
        id: Date.now(),
        type: 'pdf', // Simplified for now
        name: file.name,
        parentId: currentFolder,
        tag: 'Upload'
      };
      setResources([...resources, newItem]);
    }
  };

  const filteredResources = resources.filter(res => {
    const isChild = res.parentId === currentFolder;
    const matchesSearch = res.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || res.type === filter;
    return isChild && matchesSearch && matchesFilter;
  });

  return (
    <div className="resource-library">
      <header className="library-header">
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
          <button className="add-btn secondary" onClick={() => fileInputRef.current.click()}>
            <Upload size={18} /> Upload
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={handleFileUpload}
            accept=".pdf,.doc,.docx,.png,.jpg"
          />
          <button className="add-btn primary" onClick={() => setShowAddModal(true)}>
            <Plus size={18} /> Create
          </button>
        </div>
      </header>

      <div className="library-controls">
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

      <div className="resources-grid">
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
              onClick={() => res.type === 'folder' && handleFolderClick(res)}
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
                    <span className="tag">{res.tag}</span>
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
                  setResources(resources.filter(r => r.id !== res.id));
                }}>
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

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
                <div className="modal-actions">
                  <button type="button" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="primary">Create</button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ResourceLibrary;
