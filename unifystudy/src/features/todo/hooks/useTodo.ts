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
  isHalfWidth?: boolean;
  tags?: Array<{ label: string; color: string }>;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: 'backlog' | 'in_progress' | 'review' | 'done';
  
  // Advanced Features
  checklist?: ChecklistItem[];
  comments?: Comment[];
  attachments?: Attachment[];
  assignees?: Assignee[];
  workspace?: string; // e.g. "Personal", "Work", "School"
  duration?: number; // in minutes
  label?: string; // e.g. "Feature", "Bug", "Enhancement"
  
  [key: string]: any;
};

export type Folder = {
  id: string;
  text: string;
  type: 'folder' | 'list';
  color: string;
  tasks?: Record<string, Task>;
  parentId: string | null;
  columns?: Array<{ id: string; label: string; color: string }>;
  members?: Array<{ email: string; role: 'viewer' | 'editor'; addedAt: number }>;
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
  const [priorityFilter, setPriorityFilter] = useState<'low' | 'medium' | 'high' | 'all'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<'me' | 'all'>('all');

  const [userProfile, setUserProfile] = useState<{ displayName?: string; photoURL?: string; avatarColor?: string }>({});

  // Load User & Profile
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((u) => {
        if (u) {
            setUserId(u.uid);
            // Fetch Custom Profile Settings
            const profileRef = databaseRef(db, `users/${u.uid}/settings/customization`);
            onValue(profileRef, (snap) => {
                const data = snap.val() || {};
                setUserProfile({
                    displayName: u.displayName || 'User',
                    photoURL: u.photoURL || undefined,
                    avatarColor: data.avatarColor || '#333' // Default or Custom
                });
            });
        } else {
            setUserId(null);
            setUserProfile({});
        }
    });
    return () => unsubAuth();
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
        columns: val.columns || null,
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

    if (currentFolderId) {
        console.log("Loading tasks for folder:", currentFolderId);
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
        const allTasks: Task[] = [];
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
        // Sort by order
        allTasks.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
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

  const updateFolder = async (folderId: string, payload: Partial<Folder>) => {
      if (!userId || !folderId) return;
      await update(databaseRef(db, `users/${userId}/folders/${folderId}`), payload);
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

  // Initialize Default Workspaces
  useEffect(() => {
      if (!userId) return;
      
      const initDefaults = async () => {
          const defaults = [
              { text: "Personal", color: "#e86e68" }, // Red
              { text: "Work", color: "#376cff" },     // Blue
              { text: "School", color: "#f8b724" }    // Yellow
          ];
          
          const foldersRef = databaseRef(db, `users/${userId}/folders`);
          
          // Check which defaults are missing
          // We can't rely solely on foldersFlat here as it might not be fully loaded yet?
          // Actually, we can check foldersFlat but we need to span a check.
          // Let's just do a check against current loaded state.
          
          for (const d of defaults) {
              const exists = foldersFlat.some(f => f.text === d.text && !f.parentId);
              if (!exists) {
                 // Double check simple existence to avoid duplicates on re-render race conditions
                 // (Though React strict mode might trigger this twice, Firebase handles keys)
                 // We'll trust the checked state.
                 await push(foldersRef, {
                      text: d.text,
                      type: 'folder',
                      color: d.color,
                      order: Date.now(),
                      createdAt: Date.now()
                  });
              }
          }
      };
      
      // Wait for initial load
      const t = setTimeout(() => {
          if (foldersFlat !== undefined) initDefaults();
      }, 1000);
      
      return () => clearTimeout(t);
  }, [userId, foldersFlat.length]);

  const addFolder = async (type: 'folder' | 'list' = 'folder', name: string = "New Folder", parentId: string | null = null) => {
      if (!userId) return;
      try {
          const foldersRef = databaseRef(db, `users/${userId}/folders`);
          const newFolderRef = await push(foldersRef, {
              text: name,
              type: type,
              parentId: parentId,
              color: '#' + Math.floor(Math.random()*16777215).toString(16),
              order: Date.now(),
              createdAt: Date.now()
          });
          toast.success("Folder created");
          return newFolderRef.key;
      } catch (err) {
          toast.error("Failed to create folder");
      }
  };

  const deleteFolder = async (folderId: string) => {
      if (!userId || !folderId) return;
      if (confirm("Are you sure you want to delete this folder and all its tasks?")) {
          await remove(databaseRef(db, `users/${userId}/folders/${folderId}`));
          if (currentFolderId === folderId) setCurrentFolderId(null);
          toast.success("Folder deleted");
      }
  };

  const addMember = async (folderId: string, email: string) => {
      if (!userId || !folderId) return;
      const folder = foldersFlat.find(f => f.id === folderId);
      if (!folder) return;
      
      const currentMembers = folder.members || [];
      if (currentMembers.some(m => m.email === email)) {
          toast.error("Member already added");
          return;
      }

      await update(databaseRef(db, `users/${userId}/folders/${folderId}`), {
          members: [...currentMembers, { email, role: 'editor', addedAt: Date.now() }]
      });
      toast.success(`Allocated ${email} to workspace`);
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

  const addAttachment = async (taskId: string, folderId: string, file: File, currentAttachments: Attachment[] = []) => {
      // In a real app, upload to Storage (Firebase Storage/S3) here.
      // For this demo, we'll simulate a successful upload and store metadata.
      if (!userId || !folderId) return;
      
      const newAttachment: Attachment = {
          id: Date.now().toString(),
          name: file.name,
          url: "#", // Placeholder
          type: file.type
      };

      const updatedAttachments = [...currentAttachments, newAttachment];
      await updateTask(taskId, folderId, { attachments: updatedAttachments });
      toast.success("Attachment added");
  };

  // --- Computed ---
  const filteredTasks = useMemo(() => {
      let res = [...tasks];
      
      // 1. Search Query
      if (searchQuery) {
          const q = searchQuery.toLowerCase();
          res = res.filter(t => t.text.toLowerCase().includes(q));
      }
      
      // 2. Tag Filter
      if (tagFilter) {
          res = res.filter(t => t.tags?.some(tag => tag.label === tagFilter));
      }

      // 3. Priority Filter
      if (priorityFilter !== 'all') {
          res = res.filter(t => (t.priority || 'low').toLowerCase() === priorityFilter.toLowerCase());
      }

      // 4. Assignee Filter
      if (assigneeFilter === 'me' && userId) {
          res = res.filter(t => t.assignees?.some(a => a.userId === userId || a.userId === 'me'));
      }

      return res;
  }, [tasks, searchQuery, tagFilter, priorityFilter, assigneeFilter, userId]);

  return {
    userId,
    userProfile,
    folders: foldersFlat,
    tasks: filteredTasks,
    // State
    activeView, setActiveView,
    currentFolderId, setCurrentFolderId,
    selectedTaskId, setSelectedTaskId,
    isSidebarOpen, setIsSidebarOpen,
    searchQuery, setSearchQuery,
    tagFilter, setTagFilter,
    priorityFilter, setPriorityFilter,
    assigneeFilter, setAssigneeFilter,
    // Actions
    addTask,
    updateTask,
    updateFolder,
    updateTaskStatus,
    deleteTask,
    moveTask,
    addChecklistItem,
    toggleChecklistItem,
    addComment,
    addFolder,
    deleteFolder,
    addMember,
    addAttachment
  };
}
