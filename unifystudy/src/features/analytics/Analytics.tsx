// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from "@/services/firebaseConfig";
import { ref, onValue } from 'firebase/database';
import { 
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp, Clock, Award, BookOpen } from 'lucide-react';
import './Analytics.scss';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function Analytics() {
    const [userId, setUserId] = useState(null);

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.15 }
        }
    };
    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
    };
    const [studySessions, setStudySessions] = useState([]);
    const [grades, setGrades] = useState([]);
    const [period, setPeriod] = useState(7); // 7 or 30 days

    useEffect(() => {
        const unsub = auth.onAuthStateChanged((u) => setUserId(u ? u.uid : null));
        return () => unsub();
    }, []);

    // 1. Fetch Study Data
    useEffect(() => {
        if (!userId) return;
        const sessionsRef = ref(db, `users/${userId}/study_sessions`);
        const unsub = onValue(sessionsRef, (snap) => {
            const data = snap.val();
            if (data) {
                setStudySessions(Object.values(data));
            } else {
                setStudySessions([]);
            }
        });
        return () => unsub();
    }, [userId]);

    // 2. Fetch Grades
    useEffect(() => {
        if (!userId) return;
        const gradesRef = ref(db, `users/${userId}/grades`);
        const unsub = onValue(gradesRef, (snap) => {
            const data = snap.val();
            if (data) {
                const arr = Object.values(data).map(g => ({
                    name: g.name,
                    assessments: g.assessments ? Object.values(g.assessments) : []
                }));
                setGrades(arr);
            }
        });
        return () => unsub();
    }, [userId]);

    // --- Process Data for Charts ---

    // A. Daily Study Time (Bar Chart)
    const dailyStudyData = useMemo(() => {
        const data = [];
        const now = new Date();
        // Initialize last N days with 0
        for (let i = period - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            data.push({ date: dateStr, minutes: 0, fullDate: d.toDateString() });
        }

        studySessions.forEach(s => {
            const sDate = new Date(s.timestamp).toDateString();
            const dayEntry = data.find(d => d.fullDate === sDate);
            if (dayEntry) {
                dayEntry.minutes += s.duration;
            }
        });

        return data;
    }, [studySessions, period]);

    // B. Subject Performance (Radar/Bar)
    const subjectPerformanceData = useMemo(() => {
        return grades.map(sub => {
            if (!sub.assessments.length) return { subject: sub.name, score: 0 };
            
            let totalWeighted = 0;
            let totalWeight = 0;
            sub.assessments.forEach(a => {
                totalWeighted += (a.score / a.total) * 100 * a.weight;
                totalWeight += a.weight;
            });
            const avg = totalWeight ? (totalWeighted / totalWeight) : 0;
            return { subject: sub.name, score: Math.round(avg) };
        });
    }, [grades]);

    // C. Grade Distribution (Pie)
    const gradeDistributionData = useMemo(() => {
        const distribution = { 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 };
        subjectPerformanceData.forEach(s => {
             if (s.score >= 90) distribution['A']++;
             else if (s.score >= 80) distribution['B']++;
             else if (s.score >= 70) distribution['C']++;
             else if (s.score >= 60) distribution['D']++;
             else distribution['F']++;
        });
        return Object.entries(distribution)
            .filter(([k,v]) => v > 0)
            .map(([name, value]) => ({ name, value }));
    }, [subjectPerformanceData]);

    // D. Totals
    const totalStudyTime = useMemo(() => studySessions.reduce((acc, curr) => acc + curr.duration, 0), [studySessions]);
    const avgScore = useMemo(() => {
        if (!subjectPerformanceData.length) return 0;
        return Math.round(subjectPerformanceData.reduce((acc, curr) => acc + curr.score, 0) / subjectPerformanceData.length);
    }, [subjectPerformanceData]);


    return (
        <div className="analytics-root">
            <header className="analytics-header">
                <h1>Personal Analytics</h1>
                <div className="period-selector">
                    <button className={period === 7 ? 'active' : ''} onClick={() => setPeriod(7)}>7 Days</button>
                    <button className={period === 30 ? 'active' : ''} onClick={() => setPeriod(30)}>30 Days</button>
                </div>
            </header>

            <motion.div 
                className="analytics-grid"
                variants={containerVariants}
                initial="hidden"
                animate="show"
            >
                {/* 1. Study Volume Chart (Wide) */}
                <motion.div className="chart-card full-width" variants={itemVariants}>
                     <h3><Clock size={20} /> Study Volume (Past {period} Days)</h3>
                     <div className="stats-summary">
                         <div className="stat-item">
                             <span className="label">Total Minutes</span>
                             <span className="value">{totalStudyTime} min</span>
                         </div>
                         <div className="stat-item">
                             <span className="label">Avg Daily</span>
                             <span className="value">{Math.round(totalStudyTime / Math.max(1, studySessions.length))} min</span> 
                             {/* Note: simplistic avg per session, not per day, but good enough for now */}
                         </div>
                     </div>
                     <div className="chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dailyStudyData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                                <XAxis dataKey="date" stroke="var(--color-muted)" tick={{fontSize: 12}} />
                                <YAxis stroke="var(--color-muted)" tick={{fontSize: 12}} />
                                <Tooltip 
                                    contentStyle={{backgroundColor: 'var(--bg-2)', borderColor: 'var(--glass-border)', borderRadius: '8px'}}
                                    itemStyle={{color: 'var(--color-text)'}}
                                />
                                <Bar dataKey="minutes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                     </div>
                </motion.div>

                {/* 2. Subject Performance (Radar or Bar) */}
                <motion.div className="chart-card" variants={itemVariants}>
                    <h3><BookOpen size={20} /> Subject Proficiency</h3>
                    <div className="chart-container">
                        {subjectPerformanceData.length > 2 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={subjectPerformanceData}>
                                    <PolarGrid stroke="var(--glass-border)" />
                                    <PolarAngleAxis dataKey="subject" tick={{fill: 'var(--color-muted)', fontSize: 12}} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                    <Radar name="Score" dataKey="score" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                                    <Tooltip contentStyle={{backgroundColor: 'var(--bg-2)', borderColor: 'var(--glass-border)', borderRadius: '8px'}} />
                                </RadarChart>
                            </ResponsiveContainer>
                        ) : (
                             <div className="chart-container" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)', textAlign: 'center'}}>
                                 Need at least 3 subjects for Radar Chart.<br/>(Try adding more subjects in Grades)
                             </div>
                        )}
                    </div>
                </motion.div>

                {/* 3. Grade Dist (Pie) */}
                <motion.div className="chart-card" variants={itemVariants}>
                    <h3><Award size={20} /> Grade Distribution</h3>
                    <div className="stats-summary">
                        <div className="stat-item">
                             <span className="label">Class GPA</span>
                             <span className="value">{avgScore}%</span>
                         </div>
                    </div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={gradeDistributionData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {gradeDistributionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{backgroundColor: 'var(--bg-2)', borderColor: 'var(--glass-border)', borderRadius: '8px'}} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
}
