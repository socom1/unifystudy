import React from 'react';
import { Folder, FileText, Plus, ChevronRight, ChevronDown, MoreVertical, Trash2 } from 'lucide-react';
import { useTodo, Folder as FolderType } from '../hooks/useTodo';

interface TodoSidebarProps {
  folders: FolderType[];
  currentFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  onAddFolder: (type: 'folder' | 'list') => void;
  onDeleteFolder: (id: string) => void;
}

export const TodoSidebar: React.FC<TodoSidebarProps> = ({ 
  folders, 
  currentFolderId, 
  onSelectFolder, 
  onAddFolder,
  onDeleteFolder
}) => {
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  };

  const renderItem = (item: FolderType, depth = 0) => {
    const isExpanded = expanded.has(item.id);
    const hasChildren = folders.some(f => f.parentId === item.id);
    const isSelected = currentFolderId === item.id;

    return (
      <div key={item.id}>
        <div 
          className={`sidebar-item ${isSelected ? 'active' : ''}`}
          style={{ paddingLeft: `${depth * 12 + 12}px` }}
          onClick={() => onSelectFolder(item.id)}
        >
          <button 
            className="chevron-btn" 
            onClick={(e) => toggleExpand(item.id, e)}
            style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          
          <span className="icon" style={{ color: item.color }}>
             {item.type === 'list' ? <FileText size={16} /> : <Folder size={16} />}
          </span>
          
          <span className="label truncate flex-1">{item.text}</span>
          
          <div className="actions">
             <button 
                className="delete-btn"
                onClick={(e) => { e.stopPropagation(); onDeleteFolder(item.id); }}
             >
                <Trash2 size={14} />
             </button>
          </div>
        </div>
        
        {isExpanded && (
            <div>
                {folders.filter(f => f.parentId === item.id).map(child => renderItem(child, depth + 1))}
            </div>
        )}
      </div>
    );
  };

  const rootFolders = folders.filter(f => !f.parentId);

  return (
    <div className="todo-sidebar">
      <div className="sidebar-header">
        <h3>Collections</h3>
        <div className="flex gap-1">
            <button onClick={() => onAddFolder('folder')} className="icon-btn" title="New Folder"><Plus size={16} /></button>
        </div>
      </div>
      
      <div className="sidebar-content custom-scrollbar">
         {rootFolders.map(f => renderItem(f))}
      </div>
    </div>
  );
};
