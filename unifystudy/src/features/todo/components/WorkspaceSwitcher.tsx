import React, { useState, useRef, useEffect } from 'react';
import { Folder, FileText, ChevronDown, Plus, Check, MoreHorizontal, Trash2, FolderOpen } from 'lucide-react';
import { Folder as FolderType } from '../hooks/useTodo';
import { motion, AnimatePresence } from 'framer-motion';

interface WorkspaceSwitcherProps {
  folders: FolderType[];
  currentFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  onAddFolder: (type: 'folder' | 'list', name: string, parentId: string | null) => void;
  onDeleteFolder: (id: string) => void;
}

export const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({
  folders,
  currentFolderId,
  onSelectFolder,
  onAddFolder,
  onDeleteFolder
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const currentFolder = folders.find(f => f.id === currentFolderId);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreate = (parentId: string | null) => {
    const name = prompt(parentId ? "Enter folder name:" : "Enter workspace name:");
    if (name) {
      onAddFolder('folder', name, parentId);
      setIsOpen(false);
    }
  };
  
  const rootFolders = folders.filter(f => !f.parentId);

  return (
    <div className="workspace-switcher" ref={containerRef} style={{ position: 'relative', zIndex: 100 }}>
      {/* Trigger Button */}
      <button 
        className="switcher-trigger"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-2)',
          border: '1px solid var(--glass-border)',
          color: 'var(--color-text)',
          cursor: 'pointer',
          transition: 'all 0.2s',
          fontSize: '14px',
          fontWeight: 500
        }}
      >
        <div className="icon-box" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            width: '20px', 
            height: '20px',
            borderRadius: '4px',
            background: currentFolder ? currentFolder.color : 'var(--color-primary)',
            color: '#fff'
        }}>
            {currentFolder ? (currentFolder.type === 'list' ? <FileText size={12} /> : <Folder size={12} />) : <FolderOpen size={12} />}
        </div>
        
        <span style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentFolder ? currentFolder.text : "All Tasks"}
        </span>
        
        <ChevronDown size={14} style={{ opacity: 0.5, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              width: '260px',
              background: 'var(--bg-1)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              padding: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}
          >
            {/* Header / All Tasks */}
            <div 
                className={`menu-item ${!currentFolderId ? 'active' : ''}`}
                onClick={() => { onSelectFolder(null); setIsOpen(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: !currentFolderId ? 'var(--color-primary)' : 'var(--color-text)',
                  background: !currentFolderId ? 'rgba(var(--color-primary-rgb), 0.1)' : 'transparent',
                }}
            >
               <div style={{ 
                    width: '24px', height: '24px', 
                    borderRadius: '6px', 
                    background: 'var(--bg-3)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center' 
               }}>
                   <FolderOpen size={14} color="var(--color-muted)" />
               </div>
               <span>All Tasks</span>
               {!currentFolderId && <Check size={14} style={{ marginLeft: 'auto' }} />}
            </div>

            <div style={{ height: '1px', background: 'var(--glass-border)', margin: '4px 0' }} />

            {/* Workspaces Hierachical List */}
            <div className="folder-list custom-scrollbar">
                <div style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                    padding: '4px 10px' 
                }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Workspaces</span>
                    <button 
                        onClick={() => handleCreate(null)}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-muted)', padding: 0 }}
                        title="New Workspace"
                    >
                        <Plus size={12} />
                    </button>
                </div>

                {rootFolders.map(root => (
                    <div key={root.id} style={{ marginBottom: '4px' }}>
                        {/* Root Header */}
                        <div 
                            className={`menu-item ${currentFolderId === root.id ? 'active' : ''}`}
                            onClick={() => { onSelectFolder(root.id); setIsOpen(false); }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '6px 10px',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                fontSize: '13px',
                                color: currentFolderId === root.id ? 'var(--color-text)' : 'var(--color-text)',
                                background: currentFolderId === root.id ? 'var(--bg-3)' : 'transparent',
                                fontWeight: 500
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-3)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = currentFolderId === root.id ? 'var(--bg-3)' : 'transparent'}
                        >
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: root.color }}></span>
                            <span style={{ flex: 1 }}>{root.text}</span>
                            
                            <div style={{ display: 'flex', gap: '4px' }}>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleCreate(root.id); }}
                                    style={{ border: 'none', background: 'transparent', color: 'var(--color-muted)', cursor: 'pointer', padding: '2px' }}
                                    title="Add Folder"
                                >
                                    <Plus size={12} />
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); if(confirm("Delete workspace?")) onDeleteFolder(root.id); }}
                                    style={{ border: 'none', background: 'transparent', color: 'var(--color-muted)', cursor: 'pointer', padding: '2px' }}
                                    title="Delete"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>

                        {/* Sub-Folders */}
                        <div style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {folders.filter(f => f.parentId === root.id).map(sub => (
                                <div 
                                    key={sub.id}
                                    className={`menu-item ${currentFolderId === sub.id ? 'active' : ''}`}
                                    onClick={() => { onSelectFolder(sub.id); setIsOpen(false); }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '4px 8px',
                                        borderRadius: 'var(--radius-sm)',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        color: currentFolderId === sub.id ? 'var(--color-text)' : 'var(--color-text-dim)',
                                        background: currentFolderId === sub.id ? 'var(--bg-3)' : 'transparent',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-3)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = currentFolderId === sub.id ? 'var(--bg-3)' : 'transparent'}
                                >
                                    <Folder size={12} style={{ opacity: 0.7 }} />
                                    <span style={{ flex: 1 }}>{sub.text}</span>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); if(confirm("Delete folder?")) onDeleteFolder(sub.id); }}
                                        style={{ border: 'none', background: 'transparent', color: 'var(--color-muted)', cursor: 'pointer', padding: 0 }}
                                    >
                                        <Trash2 size={10} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
