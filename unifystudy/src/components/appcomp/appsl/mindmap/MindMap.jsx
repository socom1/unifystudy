// MindMap.jsx
// React Flow implementation for UnifyStudy
import React, { useCallback, useEffect, useState, useMemo, useRef } from "react";
import ReactFlow, { 
  useNodesState, 
  useEdgesState, 
  addEdge, 
  Background, 
  Controls, 
  Handle, 
  Position,
  NodeResizer,
  applyNodeChanges,
  applyEdgeChanges
} from "reactflow";
import "reactflow/dist/style.css";
import "./MindMap.scss";
import { v4 as uuidv4 } from "uuid";

// -------------------
// Custom Node Component
// -------------------
const GlassNode = ({ data, selected }) => {
  const fontSizeClass = data.fontSize ? `text-${data.fontSize}` : 'text-md';
  
  return (
    <>
      <NodeResizer 
        color="#ff0071" 
        isVisible={selected} 
        minWidth={100} 
        minHeight={50} 
      />
      <div 
        className={`glass-node ${selected ? 'selected' : ''} ${fontSizeClass}`} 
        style={{ 
          backgroundColor: data.color || 'var(--bg-2)',
          color: data.textColor || '#ffffff',
          width: '100%',
          height: '100%'
        }}
      >
        {/* Target Handle (Input) */}
        <Handle type="target" position={Position.Top} className="glass-handle" />
        
        <div className="glass-node-content">
          {data.nodeType === 'image' ? (
            <img src={data.label} alt="Node" className="glass-node-image" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : data.nodeType === 'header' ? (
            <h3 className="glass-node-header">{data.label}</h3>
          ) : data.nodeType === 'subheader' ? (
            <h4 className="glass-node-subheader">{data.label}</h4>
          ) : (
            <span className="glass-node-text">{data.label}</span>
          )}
          
          {/* Paragraph Description Box */}
          {data.nodeType === 'paragraph' && data.description && (
            <div className="glass-node-description" style={{ color: data.textColor ? `${data.textColor}cc` : 'rgba(255,255,255,0.7)' }}>
                {data.description}
            </div>
          )}
        </div>

        {/* Source Handle (Output) */}
        <Handle type="source" position={Position.Bottom} className="glass-handle" />
      </div>
    </>
  );
};

// -------------------
// Storage utilities
// -------------------
const STORAGE_KEY = "unifystudy_mindmaps_v3";

const defaultData = {
  folders: [
    {
      id: "inbox",
      name: "My Maps",
      maps: [
        {
          id: "default-map",
          name: "Example Map",
          nodes: [
            {
              id: "root",
              position: { x: 400, y: 300 },
              data: { label: "Central Idea", type: "root", nodeType: "header", color: "#000000", textColor: "#ffffff", fontSize: "lg" },
              type: "glass",
            },
            {
              id: "child-1",
              position: { x: 700, y: 200 },
              data: { label: "Branch 1", type: "child", nodeType: "default", color: "#000000", textColor: "#ffffff", fontSize: "md" },
              type: "glass",
            },
          ],
          edges: [
            { id: "e1", source: "root", target: "child-1", animated: true },
          ],
        },
      ],
    },
  ],
};

function loadStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData;
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to load mindmap storage", err);
    return defaultData;
  }
}

function saveStorage(obj) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch (err) {
    console.error("Failed to save mindmap storage", err);
  }
}

// -------------------
// Folder + Map Sidebar
// -------------------
const Sidebar = ({ state, actions }) => {
  const { folders, activeFolderId, activeMapId } = state;
  const {
    createFolder,
    createMap,
    selectFolder,
    selectMap,
    deleteMap,
    renameMap,
  } = actions;

  const activeFolder =
    folders.find((f) => f.id === activeFolderId) || folders[0];

  return (
    <aside className="mm-sidebar">
      <div className="mm-sidebar-top">
        <h3>Maps & Folders</h3>
        <div className="mm-sidebar-actions">
          <button onClick={() => createFolder()}>New Folder</button>
          <button onClick={() => createMap(activeFolder.id)}>New Map</button>
        </div>
      </div>

      <div className="mm-folders">
        {folders.map((f) => (
          <div
            key={f.id}
            className={`mm-folder ${f.id === activeFolderId ? "active" : ""}`}
          >
            <div className="mm-folder-header">
              <button
                className="mm-folder-name"
                onClick={() => selectFolder(f.id)}
              >
                {f.name}
              </button>
            </div>
            <div className="mm-maps-list">
              {f.maps.map((m) => (
                <div
                  key={m.id}
                  className={`mm-map-item ${
                    m.id === activeMapId ? "active" : ""
                  }`}
                >
                  <button onClick={() => selectMap(f.id, m.id)}>
                    {m.name}
                  </button>
                  <div className="mm-map-actions">
                    <button onClick={() => renameMap(f.id, m.id)}>
                      Rename
                    </button>
                    <button onClick={() => deleteMap(f.id, m.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {f.maps.length === 0 && <div className="mm-empty">No maps</div>}
            </div>
          </div>
        ))}
      </div>

      <div className="mm-sidebar-footer">
        <small>Shift+Click connection to delete</small>
      </div>
    </aside>
  );
};

// -------------------
// ReactFlow Map Editor
// -------------------
const MapEditor = ({ map, onChange, onEditNode }) => {
  const [nodes, setNodes] = useNodesState([]);
  const [edges, setEdges] = useEdgesState([]);
  const isInternalUpdate = useRef(false);

  const nodeTypes = useMemo(() => ({ glass: GlassNode }), []);

  // 1. Sync Down (Parent -> Local)
  useEffect(() => {
    if (isInternalUpdate.current) {
        isInternalUpdate.current = false;
        return;
    }
    setNodes(map.nodes || []);
    setEdges(map.edges || []);
  }, [map.id, map.nodes, map.edges, setNodes, setEdges]);

  // 2. Handle User Changes (Local)
  const onNodesChange = useCallback((changes) => {
    isInternalUpdate.current = true;
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, [setNodes]);

  const onEdgesChange = useCallback((changes) => {
    isInternalUpdate.current = true;
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, [setEdges]);

  const onConnect = useCallback((params) => {
    isInternalUpdate.current = true;
    setEdges((eds) => addEdge({ ...params, animated: true }, eds));
  }, [setEdges]);

  const onEdgeClick = useCallback((evt, edge) => {
      if (evt.shiftKey) {
          isInternalUpdate.current = true;
          setEdges((eds) => eds.filter(e => e.id !== edge.id));
      }
  }, [setEdges]);

  const onNodeDoubleClick = useCallback((event, node) => {
    if (onEditNode) onEditNode(node);
  }, [onEditNode]);

  // 3. Sync Up (Local -> Parent)
  useEffect(() => {
      if (isInternalUpdate.current) {
          onChange({ nodes, edges });
      }
  }, [nodes, edges, onChange]);

  return (
    <div className="mm-editor-container">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        onNodeDoubleClick={onNodeDoubleClick}
        fitView
        attributionPosition="bottom-right"
        deleteKeyCode={['Backspace', 'Delete']}
      >
        <Background className="mm-background" color="#ffffff" gap={20} size={2} variant="dots" />
        <Controls />
      </ReactFlow>
    </div>
  );
};

// Simple Modal Component
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="mm-modal-overlay">
      <div className="mm-modal">
        <div className="mm-modal-header">
          <h3>{title}</h3>
          <button onClick={onClose}>×</button>
        </div>
        <div className="mm-modal-content">{children}</div>
      </div>
    </div>
  );
};

// -------------------
// Main App
// -------------------
const MindMapApp = () => {
  const [store, setStore] = useState(() => loadStorage());
  const [activeFolderId, setActiveFolderId] = useState(
    () => store.folders[0]?.id || "inbox"
  );
  const [activeMapId, setActiveMapId] = useState(
    () => store.folders[0]?.maps[0]?.id || null
  );

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null); 
  const [modalInput, setModalInput] = useState("");
  const [modalDescription, setModalDescription] = useState(""); 
  const [modalColor, setModalColor] = useState("#000000"); 
  const [modalTextColor, setModalTextColor] = useState("#ffffff");
  const [modalNodeType, setModalNodeType] = useState("default"); 
  const [modalFontSize, setModalFontSize] = useState("md"); 
  const [targetId, setTargetId] = useState(null); 

  useEffect(() => {
    const f = store.folders.find((x) => x.id === activeFolderId) || store.folders[0];
    if (!f) setActiveFolderId(store.folders[0]?.id);
    const m = f?.maps?.find((mm) => mm.id === activeMapId) || f?.maps?.[0];
    if (m && m.id !== activeMapId) setActiveMapId(m.id);
  }, [store, activeFolderId, activeMapId]);

  useEffect(() => saveStorage(store), [store]);

  const openModal = (type, initialValue = "", id = null, initialColor = "", initialType = "default", initialDesc = "", initialSize = "md", initialTextColor = "") => {
    setModalType(type);
    setModalInput(initialValue);
    setModalDescription(initialDesc || "");
    setModalColor(initialColor || "#000000");
    setModalTextColor(initialTextColor || "#ffffff");
    setModalNodeType(initialType || "default");
    setModalFontSize(initialSize || "md");
    setTargetId(id);
    setModalOpen(true);
  };

  const handleModalSubmit = (e) => {
    e.preventDefault();
    if (!modalInput.trim() && modalType !== "createNode" && modalType !== "editNode") return; 

    if (modalType === "createFolder") {
      const folder = { id: uuidv4(), name: modalInput, maps: [] };
      setStore((s) => ({ ...s, folders: [...s.folders, folder] }));
      setActiveFolderId(folder.id);
    } else if (modalType === "createMap") {
      const map = {
        id: uuidv4(),
        name: modalInput,
        nodes: [
          {
            id: uuidv4(),
            position: { x: 400, y: 300 },
            data: { label: "Central Idea", type: "root", nodeType: "header", color: "#000000", textColor: "#ffffff", fontSize: "lg" },
            type: "glass",
          },
        ],
        edges: [],
      };
      setStore((s) => ({
        ...s,
        folders: s.folders.map((f) =>
          f.id === activeFolderId ? { ...f, maps: [...f.maps, map] } : f
        ),
      }));
      setActiveMapId(map.id);
    } else if (modalType === "renameMap") {
      setStore((s) => ({
        ...s,
        folders: s.folders.map((f) =>
          f.id === activeFolderId
            ? {
                ...f,
                maps: f.maps.map((m) =>
                  m.id === targetId ? { ...m, name: modalInput } : m
                ),
              }
            : f
        ),
      }));
    } else if (modalType === "createNode") {
        const newNode = {
            id: uuidv4(),
            position: { x: 400 + Math.random() * 50, y: 300 + Math.random() * 50 },
            data: { 
                label: modalInput, 
                description: modalDescription,
                type: "child", 
                nodeType: modalNodeType, 
                color: modalColor,
                textColor: modalTextColor,
                fontSize: modalFontSize
            },
            type: "glass",
        };
        
        setStore((s) => ({
            ...s,
            folders: s.folders.map((f) => ({
              ...f,
              maps: f.maps.map((m) => {
                if (m.id === activeMapId) {
                    return {
                        ...m,
                        nodes: [...m.nodes, newNode]
                    };
                }
                return m;
              })
            }))
        }));
    } else if (modalType === "editNode") {
      setStore((s) => ({
        ...s,
        folders: s.folders.map((f) => ({
          ...f,
          maps: f.maps.map((m) => {
            if (m.id === activeMapId) {
                return {
                    ...m,
                    nodes: m.nodes.map(n => 
                        n.id === targetId 
                        ? { ...n, data: { ...n.data, label: modalInput, description: modalDescription, color: modalColor, textColor: modalTextColor, nodeType: modalNodeType, fontSize: modalFontSize } }
                        : n
                    )
                };
            }
            return m;
          })
        }))
      }));
    }

    setModalOpen(false);
    setModalInput("");
    setModalDescription("");
    setModalColor("#000000");
    setModalTextColor("#ffffff");
    setModalNodeType("default");
    setModalFontSize("md");
    setTargetId(null);
  };

  const createFolder = () => openModal("createFolder", `Folder ${store.folders.length + 1}`);
  const createMap = (folderId) => {
    setActiveFolderId(folderId);
    openModal("createMap", "Untitled Map");
  };

  const selectFolder = (folderId) => {
    setActiveFolderId(folderId);
    const f = store.folders.find((x) => x.id === folderId);
    setActiveMapId(f?.maps?.[0]?.id || null);
  };

  const selectMap = (folderId, mapId) => {
    setActiveFolderId(folderId);
    setActiveMapId(mapId);
  };

  const deleteMap = (folderId, mapId) => {
    if (!window.confirm("Delete this map?")) return;
    setStore((s) => ({
      ...s,
      folders: s.folders.map((f) =>
        f.id === folderId
          ? { ...f, maps: f.maps.filter((m) => m.id !== mapId) }
          : f
      ),
    }));
    setActiveMapId(null);
  };

  const renameMap = (folderId, mapId) => {
    const f = store.folders.find(f => f.id === folderId);
    const m = f?.maps.find(m => m.id === mapId);
    if (m) openModal("renameMap", m.name, mapId);
  };

  const updateActiveMapData = (payload) => {
    // payload: { nodes, edges }
    setStore((s) => ({
      ...s,
      folders: s.folders.map((f) => ({
        ...f,
        maps: f.maps.map((m) =>
          m.id === activeMapId
            ? { ...m, nodes: payload.nodes, edges: payload.edges }
            : m
        ),
      })),
    }));
  };

  const exportMap = () => {
    const f = store.folders.find((x) => x.id === activeFolderId);
    const m = f?.maps?.find((mm) => mm.id === activeMapId);
    if (!m) return alert("No map selected");
    const data = JSON.stringify(m, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${m.name.replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importMap = async () => {
    const file = await new Promise((res) => {
      const inp = document.createElement("input");
      inp.type = "file";
      inp.accept = ".json,application/json";
      inp.onchange = (e) => res(e.target.files?.[0]);
      inp.click();
    });
    if (!file) return;
    const text = await file.text();
    try {
      const json = JSON.parse(text);
      const map = {
        id: uuidv4(),
        name: json.name || "Imported Map",
        nodes: json.nodes || [],
        edges: json.edges || [], // Renamed from connections
      };
      setStore((s) => ({
        ...s,
        folders: s.folders.map((f) =>
          f.id === activeFolderId ? { ...f, maps: [...f.maps, map] } : f
        ),
      }));
      setActiveMapId(map.id);
    } catch (err) {
      alert("Invalid JSON");
    }
  };

  const folders = store.folders;
  const activeFolder = folders.find((f) => f.id === activeFolderId) || folders[0];
  const activeMap = activeFolder?.maps?.find((m) => m.id === activeMapId) || activeFolder?.maps?.[0] || null;

  return (
    <div className="mm-app">
      <Sidebar
        state={{ folders, activeFolderId, activeMapId }}
        actions={{
          createFolder,
          createMap,
          selectFolder,
          selectMap,
          deleteMap,
          renameMap,
        }}
      />

      <main className="mm-main">
        <div className="mm-header">
          <h2>{activeMap ? activeMap.name : "No map selected"}</h2>
          <div className="mm-header-actions">
            <button 
              onClick={() => {
                if (activeMap) {
                    openModal("createNode", "New Node");
                }
              }}
              disabled={!activeMap}
            >
              Add Node
            </button>
            <button onClick={exportMap} disabled={!activeMap}>
              Export
            </button>
            <button onClick={importMap}>Import</button>
            <button
              onClick={() => {
                localStorage.removeItem(STORAGE_KEY);
                setStore(defaultData);
              }}
            >
              Reset Storage
            </button>
          </div>
        </div>

        <div className="mm-canvas-area">
          {activeMap ? (
            <MapEditor
              map={activeMap}
              onChange={updateActiveMapData}
              onEditNode={(node) => openModal("editNode", node.data.label, node.id, node.data.color, node.data.nodeType, node.data.description, node.data.fontSize, node.data.textColor)}
            />
          ) : (
            <div className="mm-no-map">
              Create or select a map from the left
            </div>
          )}
        </div>
      </main>

      {/* Modal */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={
            modalType === "createFolder"
              ? "New Folder"
              : modalType === "createMap"
              ? "New Map"
              : modalType === "editNode"
              ? "Edit Node"
              : modalType === "createNode"
              ? "Add New Node"
              : "Rename Map"
          }
        >
          <form onSubmit={handleModalSubmit}>
            <input
              autoFocus
              value={modalInput}
              onChange={(e) => setModalInput(e.target.value)}
              placeholder={(modalType === "editNode" || modalType === "createNode") && modalNodeType === "image" ? "Image URL..." : "Enter name..."}
              className="mm-modal-input"
            />
            
            {(modalType === "editNode" || modalType === "createNode") && (
              <>
                <div className="mm-modal-type-picker">
                    <label>Node Type:</label>
                    <select value={modalNodeType} onChange={(e) => setModalNodeType(e.target.value)}>
                        <option value="default">Default</option>
                        <option value="header">Header</option>
                        <option value="subheader">Subheader</option>
                        <option value="paragraph">Paragraph</option>
                        <option value="image">Image</option>
                    </select>
                </div>

                {modalNodeType === 'image' && (
                  <div className="mm-modal-type-picker">
                    <label>Image URL:</label>
                    <input 
                      value={modalInput} 
                      onChange={(e) => setModalInput(e.target.value)}
                      placeholder="https://example.com/image.png"
                      className="mm-modal-input"
                    />
                  </div>
                )}
                
                {modalNodeType === 'paragraph' && (
                    <div className="mm-modal-type-picker">
                        <label>Description / Content:</label>
                        <textarea 
                            value={modalDescription} 
                            onChange={(e) => setModalDescription(e.target.value)}
                            className="mm-modal-input"
                            style={{ minHeight: '80px', resize: 'vertical' }}
                            placeholder="Enter paragraph content..."
                        />
                    </div>
                )}

                <div className="mm-modal-type-picker">
                  <label>Font Size:</label>
                  <select value={modalFontSize} onChange={(e) => setModalFontSize(e.target.value)}>
                    <option value="sm">Small</option>
                    <option value="md">Medium</option>
                    <option value="lg">Large</option>
                    <option value="xl">Extra Large</option>
                  </select>
                </div>

                <div className="mm-modal-color-picker">
                  <label>Node Color:</label>
                  <div className="color-options">
                    {["#ffffff", "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#a855f7", "#ec4899", "#000000"].map(c => (
                      <div 
                        key={c}
                        className={`color-option ${modalColor === c ? 'selected' : ''}`}
                        style={{ backgroundColor: c, border: c === '#000000' ? '1px solid #333' : 'none' }}
                        onClick={() => setModalColor(c)}
                      />
                    ))}
                  </div>
                </div>

                <div className="mm-modal-color-picker">
                  <label>Text Color:</label>
                  <div className="color-options">
                    {["#ffffff", "#000000", "#ef4444", "#3b82f6", "#22c55e"].map(c => (
                      <div 
                        key={c}
                        className={`color-option ${modalTextColor === c ? 'selected' : ''}`}
                        style={{ backgroundColor: c, border: c === '#000000' ? '1px solid #333' : '1px solid #ddd' }}
                        onClick={() => setModalTextColor(c)}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
            <div className="mm-modal-actions">
              <button type="button" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="primary">
                {modalType === "createNode" ? "Add Node" : "Save"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default MindMapApp;
