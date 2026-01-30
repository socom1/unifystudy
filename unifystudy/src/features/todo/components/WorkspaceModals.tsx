import React, { useState, useEffect } from 'react';
import Modal from '@/components/common/Modal';
import { User, Check, Search, Plus } from 'lucide-react';
import { toast } from 'sonner';

// Mock Data for "Friends"
const MOCK_USERS = [
  { id: 'u1', name: 'Alice Johnson', email: 'alice@example.com', avatar: 'AJ', color: '#ff6b6b' },
  { id: 'u2', name: 'Bob Smith', email: 'bob@example.com', avatar: 'BS', color: '#4ecdc4' },
  { id: 'u3', name: 'Charlie Brown', email: 'charlie@example.com', avatar: 'CB', color: '#ffe66d' },
  { id: 'u4', name: 'David Lee', email: 'david@example.com', avatar: 'DL', color: '#1a535c' },
  { id: 'u5', name: 'Eve Wilson', email: 'eve@example.com', avatar: 'EW', color: '#ff9f1c' },
  { id: 'u6', name: 'Frank White', email: 'frank@example.com', avatar: 'FW', color: '#2ec4b6' },
  { id: 'u7', name: 'Grace Hopper', email: 'grace@example.com', avatar: 'GH', color: '#e71d36' },
  { id: 'u8', name: 'Henry Ford', email: 'henry@example.com', avatar: 'HF', color: '#011627' },
];

interface WorkspaceModalsProps {
  activeModal: 'workspace' | 'folder' | 'member' | null;
  onClose: () => void;
  onSubmitWorkspace: (name: string, color: string) => void;
  onSubmitFolder: (name: string) => void;
  onSubmitMember: (email: string) => void;
}

export const WorkspaceModals: React.FC<WorkspaceModalsProps> = ({
  activeModal,
  onClose,
  onSubmitWorkspace,
  onSubmitFolder,
  onSubmitMember
}) => {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#376cff"); // Default Blue
  
  // Member Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState(MOCK_USERS);

  // Reset state on open
  useEffect(() => {
    if (activeModal) {
        setName("");
        setSearchQuery("");
        setFilteredUsers(MOCK_USERS);
        // Random default color for workspace
        if (activeModal === 'workspace') {
            const colors = ['#e86e68', '#376cff', '#f8b724', '#10b981', '#8b5cf6'];
            setColor(colors[Math.floor(Math.random() * colors.length)]);
        }
    }
  }, [activeModal]);

  // Search Logic
  useEffect(() => {
    const q = searchQuery.toLowerCase();
    setFilteredUsers(MOCK_USERS.filter(u => 
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    ));
  }, [searchQuery]);

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (activeModal === 'workspace') {
          if (!name.trim()) return toast.error("Workspace name required");
          onSubmitWorkspace(name, color);
          onClose();
      } else if (activeModal === 'folder') {
          if (!name.trim()) return toast.error("Folder name required");
          onSubmitFolder(name);
          onClose();
      }
  };

  const colors = ['#e86e68', '#376cff', '#f8b724', '#10b981', '#8b5cf6', '#ec4899', '#6366f1'];

  return (
    <>
        {/* Create Workspace / Folder Modal */}
        {(activeModal === 'workspace' || activeModal === 'folder') && (
            <Modal
                isOpen={true}
                onClose={onClose}
                title={activeModal === 'workspace' ? "New Workspace" : "New Folder"}
                size="sm"
                footer={null}
            >
                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="form-group">
                        <label>Name</label>
                        <input 
                            autoFocus
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={activeModal === 'workspace' ? "e.g. Work, Personal" : "e.g. Project Alpha"}
                            className="w-full p-2 rounded bg-white/5 border border-white/10 focus:border-primary outline-none"
                        />
                    </div>

                    {activeModal === 'workspace' && (
                        <div className="form-group mt-4">
                            <label className="block mb-2 text-sm text-gray-400">Color Tag</label>
                            <div className="flex gap-2 flex-wrap">
                                {colors.map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setColor(c)}
                                        className={`w-6 h-6 rounded-full transition-transform ${color === c ? 'scale-110 ring-2 ring-white' : 'hover:scale-110'}`}
                                        style={{ background: c }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="modal-actions mt-6 flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded hover:bg-white/5">Cancel</button>
                        <button type="submit" className="px-4 py-2 rounded bg-primary text-white font-medium">Create</button>
                    </div>
                </form>
            </Modal>
        )}

        {/* Add Member Modal */}
        {activeModal === 'member' && (
             <Modal
                isOpen={true}
                onClose={onClose}
                title="Add Members"
                size="md"
                footer={null}
            >
                <div className="member-search-container">
                    <div className="relative mb-4">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input 
                            autoFocus
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search friends by name or email..."
                            className="w-full pl-9 pr-4 py-2 rounded bg-white/5 border border-white/10 focus:border-primary outline-none text-sm"
                        />
                    </div>

                    <div className="user-list max-h-[300px] overflow-y-auto space-y-1 custom-scrollbar">
                        {filteredUsers.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 text-sm">
                                No users found matching "{searchQuery}"
                            </div>
                        ) : (
                            filteredUsers.map(user => (
                                <div 
                                    key={user.id} 
                                    className="flex items-center justify-between p-2 rounded hover:bg-white/5 group transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div 
                                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm"
                                            style={{ background: user.color }}
                                        >
                                            {user.avatar}
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-gray-200">{user.name}</div>
                                            <div className="text-xs text-gray-500">{user.email}</div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => { onSubmitMember(user.email); onClose(); }}
                                        className="opacity-0 group-hover:opacity-100 px-3 py-1 text-xs bg-primary/20 text-primary border border-primary/30 rounded hover:bg-primary/30 transition-all flex items-center gap-1"
                                    >
                                        <Plus size={12} /> Add
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </Modal>
        )}
    </>
  );
};
