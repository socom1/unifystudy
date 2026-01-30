import React, { useRef, useState, useEffect } from 'react';
import { Filter, ChevronDown, Check, User, AlertCircle, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TaskFilterProps {
  priorityFilter: 'low' | 'medium' | 'high' | 'all';
  setPriorityFilter: (val: 'low' | 'medium' | 'high' | 'all') => void;
  assigneeFilter: 'me' | 'all';
  setAssigneeFilter: (val: 'me' | 'all') => void;
  tags: string[]; // List of available tags to filter by (optional extension)
}

export const TaskFilter: React.FC<TaskFilterProps> = ({
  priorityFilter,
  setPriorityFilter,
  assigneeFilter,
  setAssigneeFilter,
  tags
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasActiveFilters = priorityFilter !== 'all' || assigneeFilter !== 'all';

  return (
    <div className="task-filter-dropdown" ref={containerRef} style={{ position: 'relative', zIndex: 90 }}>
      {/* Trigger */}
      <button 
        className={`filter-trigger ${hasActiveFilters ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: 'var(--radius-md)',
          background: hasActiveFilters ? 'rgba(var(--color-primary-rgb), 0.15)' : 'var(--bg-2)',
          border: hasActiveFilters ? '1px solid var(--color-primary)' : '1px solid var(--glass-border)',
          color: hasActiveFilters ? 'var(--color-primary)' : 'var(--color-text)',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 500,
          transition: 'all 0.2s',
          height: '32px'
        }}
      >
        <Filter size={14} />
        <span>Filter</span>
        {hasActiveFilters && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-primary)' }} />}
        <ChevronDown size={14} style={{ opacity: 0.5, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {/* Dropdown */}
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
              right: 0, // Align right usually better for header tools
              width: '240px',
              background: 'var(--bg-1)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              padding: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
             {/* Section: Assignee */}
             <div className="filter-section">
                 <h4 style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: '6px', paddingLeft: '4px' }}>Assignee</h4>
                 <div className="filter-options" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                     <FilterOption 
                        label="All Tasks" 
                        active={assigneeFilter === 'all'} 
                        onClick={() => setAssigneeFilter('all')} 
                        icon={<span className="icon-placeholder">ALL</span>}
                     />
                     <FilterOption 
                        label="Assigned to Me" 
                        active={assigneeFilter === 'me'} 
                        onClick={() => setAssigneeFilter('me')} 
                        icon={<User size={13} />}
                     />
                 </div>
             </div>

             <div style={{ height: '1px', background: 'var(--glass-border)' }} />

             {/* Section: Priority */}
             <div className="filter-section">
                 <h4 style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: '6px', paddingLeft: '4px' }}>Priority</h4>
                 <div className="filter-options" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                     <FilterOption 
                        label="Any Priority" 
                        active={priorityFilter === 'all'} 
                        onClick={() => setPriorityFilter('all')}
                        icon={<span className="icon-placeholder">ANY</span>} 
                     />
                     <FilterOption 
                        label="High Priority" 
                        active={priorityFilter === 'high'} 
                        onClick={() => setPriorityFilter('high')} 
                        icon={<AlertCircle size={13} color="#ef4444" />}
                     />
                     <FilterOption 
                        label="Medium Priority" 
                        active={priorityFilter === 'medium'} 
                        onClick={() => setPriorityFilter('medium')} 
                        icon={<AlertCircle size={13} color="#f59e0b" />}
                     />
                     <FilterOption 
                        label="Low Priority" 
                        active={priorityFilter === 'low'} 
                        onClick={() => setPriorityFilter('low')} 
                        icon={<AlertCircle size={13} color="#10b981" />}
                     />
                 </div>
             </div>
             
             {/* Tag filtering could go here in future */}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FilterOption = ({ label, active, onClick, icon }: { label: string, active: boolean, onClick: () => void, icon?: React.ReactNode }) => (
    <div 
        onClick={onClick}
        style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '6px 8px',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            fontSize: '13px',
            color: active ? 'var(--color-text)' : 'var(--color-text-dim)',
            background: active ? 'var(--bg-3)' : 'transparent',
            transition: 'background 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-3)'}
        onMouseLeave={(e) => e.currentTarget.style.background = active ? 'var(--bg-3)' : 'transparent'}
    >
        <div style={{ 
            width: '20px', height: '20px', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '9px', fontWeight: 700, color: 'var(--color-muted)'
        }}>
            {icon}
        </div>
        <span style={{ flex: 1 }}>{label}</span>
        {active && <Check size={14} color="var(--color-primary)" />}
    </div>
);
