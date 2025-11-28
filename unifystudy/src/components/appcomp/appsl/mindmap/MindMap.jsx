import React, { useState, useRef, useEffect } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { Plus, Minus, Move, Save, Trash2 } from 'lucide-react';
import './MindMap.scss';

const Node = ({ id, x, y, text, isRoot, onDelete, onUpdate, onConnectStart, onConnectEnd, isTarget }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(text);
  const nodeRef = useRef(null);

  const handleBlur = () => {
    setIsEditing(false);
    onUpdate(id, { text: value });
  };

  // Get node dimensions for accurate connection points
  const getNodeDimensions = () => {
    if (!nodeRef.current) return { width: 160, height: 50 };
    const rect = nodeRef.current.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  };

  return (
    <motion.div
      ref={nodeRef}
      className={`mind-map-node ${isRoot ? 'root' : ''} ${isTarget ? 'target-potential' : ''}`}
      style={{ left: x, top: y }}
      drag
      dragMomentum={false}
      dragElastic={0}
      onDrag={(e, info) => {
        // Update position in real-time during drag for smooth line updates
        const newX = x + info.offset.x;
        const newY = y + info.offset.y;
        onUpdate(id, { x: newX, y: newY }, true); // Pass true to indicate dragging
      }}
      onDragEnd={(e, info) => {
        const newX = x + info.offset.x;
        const newY = y + info.offset.y;
        onUpdate(id, { x: newX, y: newY });
      }}
      whileHover={{ scale: 1.05, zIndex: 10 }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="node-content">
        {isEditing ? (
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
          />
        ) : (
          <span onDoubleClick={() => setIsEditing(true)}>{text}</span>
        )}
      </div>
      
      {!isRoot && (
        <button className="delete-node-btn" onClick={() => onDelete(id)}>
          <Trash2 size={12} />
        </button>
      )}

      {/* Connection Points */}
      <div 
        className="connector-point right" 
        onMouseDown={(e) => onConnectStart(e, id)} 
        title="Drag to connect"
      />
      <div 
        className={`connector-point left ${isTarget ? 'highlight' : ''}`}
        onMouseUp={() => onConnectEnd(id)} 
      />
    </motion.div>
  );
};

const MindMap = () => {
  const [nodes, setNodes] = useState([
    { id: 'root', x: 400, y: 300, text: 'Central Idea', isRoot: true },
    { id: 'child1', x: 700, y: 200, text: 'Branch 1', isRoot: false }
  ]);
  const [connections, setConnections] = useState([
    { from: 'root', to: 'child1' }
  ]);
  const [scale, setScale] = useState(1);
  
  // Connection Logic
  const [connecting, setConnecting] = useState(null); // { nodeId, startX, startY, currentX, currentY }
  const containerRef = useRef(null);

  const addNode = () => {
    // Grid-based positioning for better organization
    const gridSize = 200;
    const existingPositions = nodes.map(n => `${Math.floor(n.x / gridSize)},${Math.floor(n.y / gridSize)}`);
    
    let x = 400, y = 300;
    // Find an empty grid position
    for (let i = 1; i < 20; i++) {
      const angle = (i * 45) * (Math.PI / 180);
      const distance = Math.ceil(i / 8) * gridSize;
      const testX = 400 + Math.cos(angle) * distance;
      const testY = 300 + Math.sin(angle) * distance;
      const gridPos = `${Math.floor(testX / gridSize)},${Math.floor(testY / gridSize)}`;
      
      if (!existingPositions.includes(gridPos) && testX >= 0 && testX <= 1400 && testY >= 0 && testY <= 800) {
        x = testX;
        y = testY;
        break;
      }
    }
    
    const newNode = {
      id: Date.now().toString(),
      x,
      y,
      text: 'New Idea',
      isRoot: false
    };
    setNodes([...nodes, newNode]);
  };

  const updateNode = (id, updates, isDragging = false) => {
    setNodes(nodes.map(n => n.id === id ? { ...n, ...updates } : n));
  };

  const deleteNode = (id) => {
    setNodes(nodes.filter(n => n.id !== id));
    setConnections(connections.filter(c => c.from !== id && c.to !== id));
  };

  const startConnection = (e, id) => {
    e.stopPropagation();
    e.preventDefault();
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    
    // Get actual node element to calculate accurate dimensions
    const nodeElement = document.querySelector(`[data-node-id="${id}"]`);
    const nodeWidth = nodeElement ? nodeElement.offsetWidth : 160;
    const nodeHeight = nodeElement ? nodeElement.offsetHeight : 50;
    
    const startX = node.x + nodeWidth;
    const startY = node.y + nodeHeight / 2;

    setConnecting({
      nodeId: id,
      startX,
      startY,
      currentX: startX,
      currentY: startY
    });
  };

  const onMouseMove = (e) => {
    if (!connecting || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    // Calculate mouse position relative to container, accounting for scale
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
    setConnecting(prev => ({ ...prev, currentX: x, currentY: y }));
  };

  const onMouseUp = () => {
    // If dropped on empty space, cancel
    if (connecting) {
      setConnecting(null);
    }
  };

  const endConnection = (id) => {
    if (connecting && connecting.nodeId !== id) {
      // Check if connection already exists
      const exists = connections.find(
        c => (c.from === connecting.nodeId && c.to === id) || 
             (c.from === id && c.to === connecting.nodeId)
      );
      
      if (!exists) {
        setConnections([...connections, { from: connecting.nodeId, to: id }]);
      }
    }
    setConnecting(null);
  };

  return (
    <div 
      className="mind-map-container" 
      ref={containerRef}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
    >
      <div className="mind-map-toolbar">
        <button onClick={addNode} title="Add Node"><Plus size={20} /></button>
        <div className="divider" />
        <button onClick={() => setScale(s => Math.min(s + 0.1, 2))}><Plus size={16} /></button>
        <span className="scale-label">{Math.round(scale * 100)}%</span>
        <button onClick={() => setScale(s => Math.max(s - 0.1, 0.5))}><Minus size={16} /></button>
        <div className="divider" />
        <button title="Save Map"><Save size={20} /></button>
      </div>

      <div className="mind-map-canvas" style={{ transform: `scale(${scale})`, transformOrigin: '0 0' }}>
        {/* Render Connections (SVG Lines) */}
        <svg className="connections-layer">
          {connections.map(conn => {
            const fromNode = nodes.find(n => n.id === conn.from);
            const toNode = nodes.find(n => n.id === conn.to);
            if (!fromNode || !toNode) return null;
            
            // Get actual node dimensions for accurate connection points
            const fromElement = document.querySelector(`[data-node-id="${conn.from}"]`);
            const toElement = document.querySelector(`[data-node-id="${conn.to}"]`);
            const fromWidth = fromElement ? fromElement.offsetWidth : 160;
            const fromHeight = fromElement ? fromElement.offsetHeight : 50;
            const toHeight = toElement ? toElement.offsetHeight : 50;
            
            // Calculate exact edge points
            const fromX = fromNode.x + fromWidth; // Right side of from node
            const fromY = fromNode.y + fromHeight / 2;  // Center Y of from node
            const toX = toNode.x;           // Left side of to node
            const toY = toNode.y + toHeight / 2;      // Center Y of to node

            // Straight line for minimalist look
            return (
              <line 
                key={`${conn.from}-${conn.to}`}
                x1={fromX}
                y1={fromY}
                x2={toX}
                y2={toY}
                stroke="var(--color-primary)" 
                strokeWidth="2"
                strokeLinecap="round"
              />
            );
          })}
          
          {/* Temporary Connection Line */}
          {connecting && (
            <line 
              x1={connecting.startX} y1={connecting.startY}
              x2={connecting.currentX} y2={connecting.currentY}
              stroke="var(--color-primary)" 
              strokeWidth="3" 
              strokeDasharray="5,5"
              strokeLinecap="round"
            />
          )}
        </svg>

        {nodes.map(node => (
          <div key={node.id} data-node-id={node.id}>
            <Node
              {...node}
              onUpdate={updateNode}
              onDelete={deleteNode}
              onConnectStart={startConnection}
              onConnectEnd={endConnection}
              isTarget={connecting && connecting.nodeId !== node.id}
            />
          </div>
        ))}
      </div>
      
      <div className="mind-map-hint">
        Double click to edit text • Drag from right dot to connect
      </div>
    </div>
  );
};

export default MindMap;
