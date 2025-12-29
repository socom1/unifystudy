import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/services/firebaseConfig';
import { ref, onValue, update, remove, serverTimestamp } from 'firebase/database';
import { useAuth } from "@/context/AuthContext";
import { Check, X, Bell } from 'lucide-react';
import { toast } from 'sonner';

interface Invitation {
    key: string;
    projectId: string;
    projectName: string;
    inviterId: string;
    inviterName?: string;
    timestamp: number;
    status: string;
}

const InvitationModal: React.FC = () => {
    const { user } = useAuth();
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [currentInvite, setCurrentInvite] = useState<Invitation | null>(null);

    useEffect(() => {
        if (!user) return;
        const invitesRef = ref(db, `users/${user.uid}/invitations`);
        const unsub = onValue(invitesRef, (snap) => {
            const data = snap.val();
            if (data) {
                const list = Object.entries(data).map(([key, val]: [string, any]) => ({ 
                    key, 
                    ...val 
                })) as Invitation[];
                setInvitations(list);
                // Show the first one if we aren't already showing one
                setCurrentInvite(list.length > 0 ? list[0] : null);
            } else {
                setInvitations([]);
                setCurrentInvite(null);
            }
        });
        return () => unsub();
    }, [user]);

    const handleAccept = async () => {
        if (!currentInvite || !user) return;
        const { projectId, projectName, key } = currentInvite;

        try {
            // 1. Add to project members
            await update(ref(db, `projects/${projectId}/members`), {
                [user.uid]: true
            });

            // 2. Add to user channels
            await update(ref(db, `users/${user.uid}/channels`), {
                [projectId]: {
                    name: projectName,
                    type: 'collaboration',
                    joinedAt: serverTimestamp()
                }
            });

            // 3. Delete invitation
            await remove(ref(db, `users/${user.uid}/invitations/${key}`));
            
            toast.success(`Joined project "${projectName}" successfully! 🎉`);
            setCurrentInvite(null);
        } catch (err) {
            console.error(err);
            toast.error("Failed to join project.");
        }
    };

    const handleDecline = async () => {
        if (!currentInvite || !user) return;
        try {
            await remove(ref(db, `users/${user.uid}/invitations/${currentInvite.key}`));
            toast.info("Invitation declined.");
            setCurrentInvite(null);
        } catch (err) {
            console.error(err);
        }
    };

    if (!currentInvite) return null;

    return (
        <AnimatePresence>
            <motion.div 
                className="invitation-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 2000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <motion.div 
                    className="invitation-card"
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    style={{
                        background: '#1e293b',
                        padding: '24px',
                        borderRadius: '16px',
                        width: '90%',
                        maxWidth: '400px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                        textAlign: 'center'
                    }}
                >
                    <div className="icon-badge" style={{ 
                        width: '60px', height: '60px', borderRadius: '50%', 
                        background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 16px'
                    }}>
                        <Bell size={32} />
                    </div>
                    
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '8px', color: 'white' }}>Project Invitation</h2>
                    
                    <p style={{ color: '#94a3b8', marginBottom: '24px', lineHeight: '1.6' }}>
                        <strong style={{ color: 'white' }}>{currentInvite.inviterName || 'A classmate'}</strong> has invited you to join the project:
                        <br/>
                        <span style={{ fontSize: '1.1rem', color: '#60a5fa', fontWeight: 'bold' }}>{currentInvite.projectName}</span>
                    </p>

                    <div className="actions" style={{ display: 'flex', gap: '12px' }}>
                        <button 
                            onClick={handleDecline}
                            style={{
                                flex: 1,
                                padding: '12px',
                                borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'transparent',
                                color: '#ef4444',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <X size={18} /> Decline
                        </button>
                        <button 
                            onClick={handleAccept}
                            style={{
                                flex: 2,
                                padding: '12px',
                                borderRadius: '8px',
                                border: 'none',
                                background: '#3b82f6',
                                color: 'white',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <Check size={18} /> Accept Invite
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default InvitationModal;
