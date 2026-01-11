import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Clock } from 'lucide-react';
import './Nova.scss';

export default function Nova() {
    return (
        <div className="nova-coming-soon">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="content-wrapper"
            >
                <div className="icon-badge">
                    <Sparkles size={48} />
                </div>
                <h1>Nova Assistant</h1>
                <p className="status">Run by Google Gemini 2.0 Flash</p>
                <p className="description">
                    We're working hard to bring you the ultimate AI study companion.
                    <br />
                    Stay tuned for intelligent task management and scheduling.
                </p>
                
                <div className="status-pill">
                    <Clock size={16} />
                    <span>Coming Soon</span>
                </div>
            </motion.div>
        </div>
    );
}
