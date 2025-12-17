// @ts-nocheck
// Whiteboard.jsx
import React, { useRef, useState, useEffect } from 'react';
import { ref, onChildAdded, push, set, remove } from 'firebase/database';
import { db } from '../firebase'; // Adjust path
import { Eraser, Pen, Trash2, Download } from 'lucide-react';
import './Whiteboard.scss';

const COLORS = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF'];

export default function Whiteboard({ sessionId }) {
    const canvasRef = useRef(null);
    const [color, setColor] = useState('#000000');
    const [isDrawing, setIsDrawing] = useState(false);
    const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

    // Firebase refs
    // Use sessionId (e.g. folderId or unique workspace ID) to segregate boards
    const boardRef = ref(db, `whiteboards/${sessionId || 'global'}/lines`);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        // Handle window resize (simple)
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        
        // Listen for new lines from other users
        const unsub = onChildAdded(boardRef, (snapshot) => {
            const line = snapshot.val();
            drawLine(ctx, line);
        });

        return () => unsub();
    }, [sessionId]);

    const drawLine = (ctx, line) => {
        ctx.beginPath();
        ctx.moveTo(line.x0, line.y0);
        ctx.lineTo(line.x1, line.y1);
        ctx.strokeStyle = line.color;
        ctx.lineWidth = line.width || 2;
        ctx.stroke();
        ctx.closePath();
    };

    const startDrawing = (e) => {
        const { offsetX, offsetY } = getCoords(e);
        setIsDrawing(true);
        setLastPos({ x: offsetX, y: offsetY });
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const { offsetX, offsetY } = getCoords(e);
        
        const newLine = {
            x0: lastPos.x,
            y0: lastPos.y,
            x1: offsetX,
            y1: offsetY,
            color: color,
            width: 2
        };

        // Draw locally instant
        const ctx = canvasRef.current.getContext('2d');
        drawLine(ctx, newLine);

        // Push to DB (throttling could be added here)
        push(boardRef, newLine);

        setLastPos({ x: offsetX, y: offsetY });
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const getCoords = (e) => {
        if (e.touches && e.touches[0]) {
            const rect = canvasRef.current.getBoundingClientRect();
            return {
                offsetX: e.touches[0].clientX - rect.left,
                offsetY: e.touches[0].clientY - rect.top
            };
        }
        return { offsetX: e.nativeEvent.offsetX, offsetY: e.nativeEvent.offsetY };
    };

    const clearBoard = async () => {
        if(window.confirm('Clear the board for everyone?')) {
             await remove(ref(db, `whiteboards/${sessionId || 'global'}`));
             // Local clear
             const ctx = canvasRef.current.getContext('2d');
             ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
    };

    const downloadBoard = () => {
        const link = document.createElement('a');
        link.download = 'whiteboard.png';
        link.href = canvasRef.current.toDataURL();
        link.click();
    };

    return (
        <div className="whiteboard-container">
            <div className="toolbar">
                <div className="colors">
                    {COLORS.map(c => (
                        <button 
                            key={c} 
                            style={{ background: c, border: color === c ? '2px solid white' : 'none' }}
                            onClick={() => setColor(c)}
                        />
                    ))}
                    <button onClick={() => setColor('eraser')}>
                         <Eraser size={18} />
                    </button>
                </div>
                <div className="actions">
                    <button onClick={clearBoard} title="Clear"><Trash2 size={18} /></button>
                    <button onClick={downloadBoard} title="Save"><Download size={18} /></button>
                </div>
            </div>
            <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseOut={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                style={{ touchAction: 'none', background: 'white', cursor: 'crosshair' }} // Whiteboard background usually white
            />
        </div>
    );
}
