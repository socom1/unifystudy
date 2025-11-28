import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, BookOpen, MessageCircle, UserPlus } from 'lucide-react';
import './StudyBuddy.scss';

const StudyBuddy = () => {
  return (
    <div className="study-buddy-container coming-soon">
      <div className="coming-soon-content">
        <div className="icon-wrapper">
          <UserPlus size={64} color="#6366f1" />
        </div>
        <h1>Study Buddy Matching</h1>
        <p>We're building the ultimate platform for you to find your perfect study partner.</p>
        <div className="features-preview">
          <div className="feature">
            <MapPin size={20} />
            <span>University Matching</span>
          </div>
          <div className="feature">
            <BookOpen size={20} />
            <span>Subject Filtering</span>
          </div>
          <div className="feature">
            <MessageCircle size={20} />
            <span>Direct Messaging</span>
          </div>
        </div>
        <span className="badge">Coming Soon...</span>
      </div>
    </div>
  );
};

export default StudyBuddy;
