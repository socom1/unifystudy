import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontSize } from './extensions/FontSize';
import { useYjsProvider } from './useYjsProvider';
import EditorToolbar from './EditorToolbar';
import './EditorStyles.scss';
import { User } from '@/types';

interface CollaborativeEditorProps {
    docId: string;
    user: User | null;
    initialContent?: string;
}

const CollaborativeEditor: React.FC<CollaborativeEditorProps> = ({ docId, user, initialContent }) => {
    const { ydoc, provider, isSynced } = useYjsProvider(docId, initialContent);

    if (!ydoc) {
        return <div className="editor-loading">Initializing document...</div>;
    }

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                history: false as any, // Yjs handles history, type definition might be missing this
            }),
            Collaboration.configure({
                document: ydoc,
            }),
            TextStyle,
            FontSize,
            ...(provider ? [
                CollaborationCursor.configure({
                    provider: provider,
                    user: {
                        name: user?.displayName || 'Anonymous',
                        color: '#ff0000' // This will be updated by provider awareness
                    },
                })
            ] : []),
        ],
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none max-w-none p-8 min-h-[500px]',
            },
        },
    }, [ydoc, provider]);

    useEffect(() => {
        // Update user info in awareness if it changes (e.g. they change their name)
        if (editor && provider && user) {
             // Provider handles this in the hook, but we can double check here or add dynamic color logic
        }
    }, [user, editor, provider]);

    if (!editor || !isSynced) {
        return <div className="editor-loading">Connecting to document...</div>;
    }

    return (
        <div className="collaborative-editor-container">
            <EditorToolbar editor={editor} />
            <div className="editor-scroller">
                <div className="editor-page-wrapper">
                    <EditorContent editor={editor} />
                </div>
            </div>
        </div>
    );
};

export default CollaborativeEditor;
