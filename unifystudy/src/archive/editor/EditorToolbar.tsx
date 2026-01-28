import React from 'react';
import { Editor } from '@tiptap/react';
import { 
    Bold, Italic, Strikethrough, Code, 
    List, ListOrdered, Quote, Undo, Redo,
    Heading1, Heading2, Heading3
} from 'lucide-react';

interface EditorToolbarProps {
    editor: Editor;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor }) => {
    if (!editor) return null;

    const toggleBold = () => editor.chain().focus().toggleBold().run();
    const toggleItalic = () => editor.chain().focus().toggleItalic().run();
    const toggleStrike = () => editor.chain().focus().toggleStrike().run();
    const toggleCode = () => editor.chain().focus().toggleCode().run();
    const toggleBulletList = () => editor.chain().focus().toggleBulletList().run();
    const toggleOrderedList = () => editor.chain().focus().toggleOrderedList().run();
    const toggleBlockquote = () => editor.chain().focus().toggleBlockquote().run();
    const undo = () => editor.chain().focus().undo().run();
    const redo = () => editor.chain().focus().redo().run();
    
    // Headings
    const toggleH1 = () => editor.chain().focus().toggleHeading({ level: 1 }).run();
    const toggleH2 = () => editor.chain().focus().toggleHeading({ level: 2 }).run();
    const toggleH3 = () => editor.chain().focus().toggleHeading({ level: 3 }).run();

    interface ToolbarButtonProps {
        onClick: () => void;
        isActive?: boolean;
        disabled?: boolean;
        children: React.ReactNode;
        title: string;
    }

    const ToolbarButton: React.FC<ToolbarButtonProps> = ({ onClick, isActive = false, disabled = false, children, title }) => (
        <button
            onClick={onClick}
            onMouseDown={(e) => e.preventDefault()} // Prevent focus loss only for buttons
            disabled={disabled}
            className={`toolbar-btn ${isActive ? 'is-active' : ''}`}
            title={title}
        >
            {children}
        </button>
    );

    return (
        <div className="editor-toolbar">
            <div className="toolbar-group">
                <ToolbarButton onClick={undo} disabled={!editor.can().undo()} title="Undo">
                    <Undo size={18} />
                </ToolbarButton>
                <ToolbarButton onClick={redo} disabled={!editor.can().redo()} title="Redo">
                    <Redo size={18} />
                </ToolbarButton>
            </div>
            
            <div className="divider" />
            
            <div className="toolbar-group">
                <select 
                    className="toolbar-btn"
                    onChange={(e) => {
                        const val = e.target.value;
                        if (val) editor.chain().focus().setFontSize(val).run();
                        else editor.chain().focus().unsetFontSize().run();
                    }}
                    value={editor.getAttributes('textStyle').fontSize || ''}
                    style={{ 
                        appearance: 'none', 
                        paddingRight: '24px', 
                        minWidth: '60px',
                        textAlign: 'center',
                        backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23a1a1aa%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 8px center',
                        backgroundSize: '8px'
                    }}
                    title="Font Size"
                >
                    <option value="" disabled>Size</option>
                    {[11, 12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72].map(size => (
                        <option key={size} value={size}>{size}</option>
                    ))}
                </select>
            </div>
            
            <div className="divider" />
            
            <div className="toolbar-group">
                <ToolbarButton onClick={toggleH1} isActive={editor.isActive('heading', { level: 1 })} title="H1">
                    <Heading1 size={18} />
                </ToolbarButton>
                <ToolbarButton onClick={toggleH2} isActive={editor.isActive('heading', { level: 2 })} title="H2">
                    <Heading2 size={18} />
                </ToolbarButton>
                <ToolbarButton onClick={toggleH3} isActive={editor.isActive('heading', { level: 3 })} title="H3">
                    <Heading3 size={18} />
                </ToolbarButton>
            </div>
            
            <div className="divider" />

            <div className="toolbar-group">
                <ToolbarButton onClick={toggleBold} isActive={editor.isActive('bold')} title="Bold">
                    <Bold size={18} />
                </ToolbarButton>
                <ToolbarButton onClick={toggleItalic} isActive={editor.isActive('italic')} title="Italic">
                    <Italic size={18} />
                </ToolbarButton>
                <ToolbarButton onClick={toggleStrike} isActive={editor.isActive('strike')} title="Strikethrough">
                    <Strikethrough size={18} />
                </ToolbarButton>
                <ToolbarButton onClick={toggleCode} isActive={editor.isActive('code')} title="Code">
                    <Code size={18} />
                </ToolbarButton>
            </div>

            <div className="divider" />

            <div className="toolbar-group">
                <ToolbarButton onClick={toggleBulletList} isActive={editor.isActive('bulletList')} title="Bullet List">
                    <List size={18} />
                </ToolbarButton>
                <ToolbarButton onClick={toggleOrderedList} isActive={editor.isActive('orderedList')} title="Ordered List">
                    <ListOrdered size={18} />
                </ToolbarButton>
                <ToolbarButton onClick={toggleBlockquote} isActive={editor.isActive('blockquote')} title="Blockquote">
                    <Quote size={18} />
                </ToolbarButton>
            </div>
        </div>
    );
};

export default EditorToolbar;
