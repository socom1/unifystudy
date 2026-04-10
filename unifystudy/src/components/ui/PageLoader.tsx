import React from "react";
import { motion } from "framer-motion";
import { GraduationCap } from "lucide-react";
import "./PageLoader.scss";

interface PageLoaderProps {
  message?: string;
}

const PageLoader: React.FC<PageLoaderProps> = ({ message = "Loading..." }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      width: '100vw',
      backgroundColor: '#0a0a0a', // UnifyStudy Dark bg
      color: '#e0e0e0',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: [0.8, 1.1, 1], opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut", repeat: Infinity, repeatType: "reverse" }}
        style={{
           background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 140, 0, 0.2))',
           padding: '24px',
           borderRadius: '50%',
           marginBottom: '1.5rem',
           boxShadow: '0 0 20px rgba(255, 215, 0, 0.1)'
        }}
      >
          <GraduationCap size={48} color="#ffd700" />
      </motion.div>
      
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{
          fontSize: '1.5rem',
          fontWeight: 600,
          background: 'linear-gradient(90deg, #ffd700, #ff8c00)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '0.5rem'
        }}
      >
        UnifyStudy
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ delay: 0.4 }}
        style={{ fontSize: '0.95rem' }}
      >
        {message}
      </motion.p>
    </div>
  );
};

export default PageLoader;
