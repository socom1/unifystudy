import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { db, auth } from "@/services/firebaseConfig";
import {
  ref as databaseRef,
  push,
  set,
  remove,
  onValue,
  update,
} from "firebase/database";
import { toast } from "sonner";
import { useGamification } from "@/context/GamificationContext";

// Types
export type ChecklistItem = { id: string; text: string; completed: boolean };
export type Comment = { id: string; userId: string; text: string; createdAt: number };
export type Attachment = { id: string; name: string; url: string; type: string };
export type Assignee = { userId: string; name: string; avatarUrl?: string };

export type Task = {
  id: string;
  text: string;
  isActive: boolean;
  order: number;
  description: string;
  color: string;
  folderId?: string;
  tags?: Array<{ label: string; color: string }>;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: 'backlog' | 'in_progress' | 'review' | 'done';
  
  // Advanced Features
  checklist?: ChecklistItem[];
  comments?: Comment[];
  attachments?: Attachment[];
  assignees?: Assignee[];
  
  [key: string]: any;
};

export type Folder = {
  id: string;
  text: string;
  type: 'folder' | 'list';
  color: string;
  tasks?: Record<string, Task>;
  parentId: string | null;
  [key: string]: any;
};

export function useTodo() {
  const [userId, setUserId] = useState<string | null>(null);
  const { addXP } = useGamification();
  
  // Data State
  const [foldersFlat, setFoldersFlat] = useState<Folder[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  
  // View State
  const [activeView, setActiveView] = useState("board");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  // Load User
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUserId(u ? u.uid : null));
    return () => unsub();
  }, []);

  // Load Folders
  useEffect(() => {
    if (!userId) {
      setFoldersFlat([]);
      return;
    }
    const foldersRef = databaseRef(db, `users/${userId}/folders`);
    const unsub = onValue(foldersRef, (snap) => {
      const data = snap.val() || {};
      const arr = Object.entries(data).map(([id, val]: [string, any]) => ({
        id,
        parentId: val.parentId ?? null,
        text: val.text,
        color: val.color,
        emoji: val.emoji,
        notes: val.notes,
        order: val.order ?? 0,
        createdAt: val.createdAt ?? 0,
        type: val.type || (val.tasks ? 'list' : 'folder'),
        tasks: val.tasks || {},
      }));
      // Sort
      arr.sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return (a.text || "").localeCompare(b.text || "");
      });
      setFoldersFlat(arr as Folder[]);
    });
    return () => unsub();
  }, [userId]);

  // Load Tasks (Active Folder or All for Global Views)
  useEffect(() => {
    if (!userId) return;

    if (activeView === 'folder' && currentFolderId) {
        const tasksRef = databaseRef(db, `users/${userId}/folders/${currentFolderId}/tasks`);
        const unsub = onValue(tasksRef, (snap) => {
             const data = snap.val() || {};
             const arr = Object.entries(data).map(([id, val]: [string, any]) => ({
                id,
                tags: val.tags || [],
                status: val.status || (val.isActive ? 'done' : 'backlog'),
                checklist: val.checklist || [],
                comments: val.comments || [],
                attachments: val.attachments || [],
                assignees: val.assignees || [],
                ...val,
             }));
             arr.sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
             setTasks(arr as Task[]);
        });
        return () => unsub();
    } else {
        let allTasks: Task[] = [];
        foldersFlat.forEach(f => {
            if (f.tasks) {
                Object.entries(f.tasks).forEach(([tid, t]: [string, any]) => {
                    allTasks.push({
                        id: tid,
                        folderId: f.id,
                        status: t.status || (t.isActive ? 'done' : 'backlog'),
                        checklist: t.checklist || [],
                        comments: t.comments || [],
                        attachments: t.attachments || [],
                        assignees: t.assignees || [],
                        ...t
                    });
                });
            }
        });
        // Sort by order/date if needed, currently raw order from folder iteration+push
        setTasks(allTasks);
    }
  }, [userId, currentFolderId, activeView, foldersFlat]); 

  
  // --- Actions ---

  const addTask = async (text: string, folderId: string | null = null, extra: Partial<Task> = {}) => {
      if (!userId) return;
      if (!text.trim()) {
          toast.error("Task name required");
          return;
      }
      
      let targetId = folderId || currentFolderId;
      if (!targetId) {
          const inbox = foldersFlat.find(f => f.text === "Inbox");
          if (inbox) {
              targetId = inbox.id;
          } else if (foldersFlat.length > 0) {
              targetId = foldersFlat[0].id; // Fallback
          } else {
               // No folders exist (brand new user). Create default Inbox.
               try {
                   const foldersRef = databaseRef(db, `users/${userId}/folders`);
                   const newFolderRef = await push(foldersRef, {
                       text: "Inbox",
                       type: 'folder',
                       color: 'var(--color-primary)',
                       order: 0,
                       createdAt: Date.now()
                   });
                   targetId = newFolderRef.key;
                   // Wait a tiny bit for local state to maybe update, though we have the ID now.
               } catch (err) {
                   console.error("Failed to create default Inbox", err);
                   toast.error("Failed to initialize Inbox");
                   return;
               }
          }
      }

      if (!targetId) return; // Should not happen now

      const targetFolder = foldersFlat.find(f => f.id === targetId);
      
      const newTask = {
          text: text.trim(),
          isActive: false, 
          status: 'backlog',
          order: Date.now(),
          description: "",
          color: targetFolder?.color || "var(--color-primary)",
          tags: [],
          dueDate: "",
          checklist: [],
          comments: [],
          ...extra
      };

      try {
          const tasksRef = databaseRef(db, `users/${userId}/folders/${targetId}/tasks`);
          await push(tasksRef, newTask);
          toast.success("Task added");
      } catch (err) {
          console.error(err);
          toast.error("Failed to add task");
      }
  };

  const updateTaskStatus = async (taskId: string, newStatus: Task['status'], folderId: string) => {
      if (!userId || !folderId) return;
      
      const isActive = newStatus === 'done';
      try {
           await update(databaseRef(db, `users/${userId}/folders/${folderId}/tasks/${taskId}`), {
               status: newStatus,
               isActive: isActive
           });
           
           if (newStatus === 'done') {
               addXP(5, "Task Completed");
           }
      } catch (err) {
          toast.error("Failed to update status");
      }
  };

  const updateTask = async (taskId: string, folderId: string, payload: Partial<Task>) => {
      if (!userId || !folderId) return;
      await update(databaseRef(db, `users/${userId}/folders/${folderId}/tasks/${taskId}`), payload);
  };

  const deleteTask = async (taskId: string, folderId: string) => {
      if (!userId || !folderId) return;
      await remove(databaseRef(db, `users/${userId}/folders/${folderId}/tasks/${taskId}`));
      toast.success("Task deleted");
  };

  const moveTask = async (taskId: string, sourceFolderId: string, targetFolderId: string) => {
       if (!userId || !taskId) return;
       if (sourceFolderId === targetFolderId) return;

       const sourceFolder = foldersFlat.find(f => f.id === sourceFolderId);
       const task = sourceFolder?.tasks?.[taskId];
       if (!task) return;

       await update(databaseRef(db, `users/${userId}/folders/${targetFolderId}/tasks/${taskId}`), task);
       await remove(databaseRef(db, `users/${userId}/folders/${sourceFolderId}/tasks/${taskId}`));
  };

  // --- Sub-Entity Actions ---

  const addChecklistItem = async (taskId: string, folderId: string, text: string, currentList: ChecklistItem[] = []) => {
      if (!userId || !folderId) return;
      const newItem: ChecklistItem = { id: Date.now().toString(), text, completed: false };
      const updatedList = [...currentList, newItem];
      await updateTask(taskId, folderId, { checklist: updatedList });
  };

  const toggleChecklistItem = async (taskId: string, folderId: string, itemId: string, currentList: ChecklistItem[] = []) => {
      const updatedList = currentList.map(item => 
          item.id === itemId ? { ...item, completed: !item.completed } : item
      );
      await updateTask(taskId, folderId, { checklist: updatedList });
  };

  const addComment = async (taskId: string, folderId: string, text: string, currentComments: Comment[] = []) => {
      if (!userId || !folderId) return;
      const newComment: Comment = { 
          id: Date.now().toString(), 
          userId, 
          text, 
          createdAt: Date.now() 
      };
      const updatedComments = [...currentComments, newComment];
      await updateTask(taskId, folderId, { comments: updatedComments });
  };

  // --- Computed ---
  const filteredTasks = useMemo(() => {
      let res = [...tasks];
      if (searchQuery) {
          const q = searchQuery.toLowerCase();
          res = res.filter(t => t.text.toLowerCase().includes(q));
      }
      if (tagFilter) {
          res = res.filter(t => t.tags?.some(tag => tag.label === tagFilter));
      }
      return res;
  }, [tasks, searchQuery, tagFilter]);

  return {
    userId,
    folders: foldersFlat,
    tasks: filteredTasks,
    // State
    activeView, setActiveView,
    currentFolderId, setCurrentFolderId,
    selectedTaskId, setSelectedTaskId,
    isSidebarOpen, setIsSidebarOpen,
    searchQuery, setSearchQuery,
    tagFilter, setTagFilter,
    // Actions
    addTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
    moveTask,
    addChecklistItem,
    toggleChecklistItem,
    addComment
  };
}
