'use client';

import React, { useEffect, useCallback, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { Link as LinkExtension } from '@tiptap/extension-link';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import MathExtension from './MathExtension';
import Image from '@tiptap/extension-image';
import 'katex/dist/katex.min.css';
import {
    Bold,
    Italic,
    Strikethrough,
    List,
    ListOrdered,
    Heading1,
    Heading2,
    Heading3,
    Undo,
    Redo,
    Cloud,
    CloudOff,
    Loader2,
    Table as TableIcon,
    Plus,
    Minus,
    Trash2,
    SeparatorHorizontal,
    Quote,
    Link2,
    X,
    Code2,
    ChevronDown,
    Sigma,
    ImageIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Create lowlight instance with common languages
const lowlight = createLowlight(common);

// Supported languages for the dropdown
const CODE_LANGUAGES = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'cpp', label: 'C++' },
    { value: 'c', label: 'C' },
    { value: 'java', label: 'Java' },
    { value: 'css', label: 'CSS' },
    { value: 'html', label: 'HTML' },
    { value: 'json', label: 'JSON' },
    { value: 'bash', label: 'Bash' },
    { value: 'sql', label: 'SQL' },
    { value: 'plaintext', label: 'Plain Text' },
];

interface ManualNotesEditorProps {
    chatId: number;
    initialContent: string;
    onSave: (content: string) => Promise<void>;
}

/**
 * ManualNotesEditor - A rich text editor using Tiptap
 * 
 * Features:
 * - Formatting toolbar (bold, italic, headings, lists)
 * - Auto-save with debounce (saves after 1.5s of inactivity)
 * - Save status indicator (Saved/Saving/Error)
 */
export default function ManualNotesEditor({
    chatId,
    initialContent,
    onSave
}: ManualNotesEditorProps) {
    // Save status: 'idle' | 'saving' | 'saved' | 'error'
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
    // Force re-render counter - used to update toolbar button states immediately
    const [, forceUpdate] = useState(0);
    // Link popover state
    const [showLinkPopover, setShowLinkPopover] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    // Code block popover state
    const [showCodePopover, setShowCodePopover] = useState(false);
    // Image popover state
    const [showImagePopover, setShowImagePopover] = useState(false);
    const [imageUrl, setImageUrl] = useState('');

    // Initialize the Tiptap editor
    const editor = useEditor({
        // Fix for Next.js SSR - don't render on server
        immediatelyRender: false,
        extensions: [
            // StarterKit includes: Bold, Italic, Strike, Headings, Lists, etc.
            // Disable codeBlock since we're using CodeBlockLowlight
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
                codeBlock: false,
            }),
            // Placeholder shows when editor is empty
            Placeholder.configure({
                placeholder: 'Start writing your notes here...',
            }),
            // Table extensions
            Table.configure({
                resizable: true,
            }),
            TableRow,
            TableHeader,
            TableCell,
            // Link extension
            LinkExtension.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-blue-600 underline hover:text-blue-800',
                },
            }),
            // Code block with syntax highlighting
            CodeBlockLowlight.configure({
                lowlight,
                defaultLanguage: 'javascript',
            }),
            // Math equations with KaTeX
            MathExtension,
            // Images
            Image.configure({
                HTMLAttributes: {
                    class: 'tiptap-image',
                },
            }),
        ],
        content: initialContent || '',
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] 2xl:min-h-[300px]',
            },
        },
        // Called every time content changes
        onUpdate: ({ editor }) => {
            // Clear any existing timeout
            if (saveTimeout) {
                clearTimeout(saveTimeout);
            }

            // Set a new timeout - save after 1.5 seconds of inactivity
            const timeout = setTimeout(() => {
                handleSave(editor.getHTML());
            }, 1500);

            setSaveTimeout(timeout);
            setSaveStatus('idle');
        },
        // Force toolbar to re-render on any transaction (selection change, mark toggle, etc.)
        onTransaction: () => {
            forceUpdate(n => n + 1);
        },
    });

    // Save function
    const handleSave = useCallback(async (content: string) => {
        try {
            setSaveStatus('saving');
            await onSave(content);
            setSaveStatus('saved');

            // Reset to idle after 2 seconds
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
            console.error('Failed to save notes:', error);
            setSaveStatus('error');
        }
    }, [onSave]);

    // Update editor content when initialContent changes (e.g., switching chats)
    useEffect(() => {
        if (editor && initialContent !== undefined) {
            // Only update if content is different to avoid cursor jumping
            const currentContent = editor.getHTML();
            if (currentContent !== initialContent && initialContent !== '') {
                editor.commands.setContent(initialContent);
            }
        }
    }, [editor, initialContent]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (saveTimeout) {
                clearTimeout(saveTimeout);
            }
        };
    }, [saveTimeout]);

    if (!editor) {
        return (
            <div className="flex items-center justify-center h-48">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        );
    }

    // Toolbar button component
    const ToolbarButton = ({
        onClick,
        isActive,
        children,
        title
    }: {
        onClick: () => void;
        isActive?: boolean;
        children: React.ReactNode;
        title: string;
    }) => (
        <button
            type="button"
            onClick={onClick}
            // Prevent button from stealing focus from editor
            onMouseDown={(e) => e.preventDefault()}
            title={title}
            className={cn(
                'p-1.5 2xl:p-2 rounded-lg transition-colors',
                isActive
                    ? 'bg-gray-200 text-gray-800'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            )}
        >
            {children}
        </button>
    );

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div
                className="flex items-center gap-0.5 2xl:gap-1 p-2 2xl:p-3 flex-wrap border-b border-gray-200"
                style={{ background: 'rgba(255, 255, 255, 0.6)' }}
            >
                {/* Text formatting */}
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    isActive={editor.isActive('bold')}
                    title="Bold (Ctrl+B)"
                >
                    <Bold size={16} className="2xl:w-5 2xl:h-5" />
                </ToolbarButton>

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    isActive={editor.isActive('italic')}
                    title="Italic (Ctrl+I)"
                >
                    <Italic size={16} className="2xl:w-5 2xl:h-5" />
                </ToolbarButton>

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    isActive={editor.isActive('strike')}
                    title="Strikethrough"
                >
                    <Strikethrough size={16} className="2xl:w-5 2xl:h-5" />
                </ToolbarButton>

                {/* Link Button with Popover */}
                <div className="relative">
                    <ToolbarButton
                        onClick={() => {
                            if (editor.isActive('link')) {
                                // If already a link, remove it
                                editor.chain().focus().unsetLink().run();
                            } else {
                                // Show popover to enter URL
                                setLinkUrl('');
                                setShowLinkPopover(true);
                            }
                        }}
                        isActive={editor.isActive('link')}
                        title={editor.isActive('link') ? 'Remove Link' : 'Add Link'}
                    >
                        <Link2 size={16} className="2xl:w-5 2xl:h-5" />
                    </ToolbarButton>

                    {/* Link URL Popover */}
                    {showLinkPopover && (
                        <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-2 flex items-center gap-2">
                            <input
                                type="url"
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                                placeholder="https://..."
                                className="w-48 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-gray-500"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && linkUrl) {
                                        editor.chain().focus().setLink({ href: linkUrl }).run();
                                        setShowLinkPopover(false);
                                        setLinkUrl('');
                                    } else if (e.key === 'Escape') {
                                        setShowLinkPopover(false);
                                        setLinkUrl('');
                                    }
                                }}
                            />
                            <button
                                onClick={() => {
                                    if (linkUrl) {
                                        editor.chain().focus().setLink({ href: linkUrl }).run();
                                        setShowLinkPopover(false);
                                        setLinkUrl('');
                                    }
                                }}
                                className="px-2 py-1 text-xs font-medium text-white bg-gray-500 rounded hover:bg-gray-600"
                            >
                                Add
                            </button>
                            <button
                                onClick={() => {
                                    setShowLinkPopover(false);
                                    setLinkUrl('');
                                }}
                                className="p-1 text-gray-400 hover:text-gray-600"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    )}
                </div>

                <div className="w-px h-5 bg-gray-300 mx-1" />

                {/* Headings */}
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    isActive={editor.isActive('heading', { level: 1 })}
                    title="Heading 1"
                >
                    <Heading1 size={16} className="2xl:w-5 2xl:h-5" />
                </ToolbarButton>

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    isActive={editor.isActive('heading', { level: 2 })}
                    title="Heading 2"
                >
                    <Heading2 size={16} className="2xl:w-5 2xl:h-5" />
                </ToolbarButton>

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    isActive={editor.isActive('heading', { level: 3 })}
                    title="Heading 3"
                >
                    <Heading3 size={16} className="2xl:w-5 2xl:h-5" />
                </ToolbarButton>

                <div className="w-px h-5 bg-gray-300 mx-1" />

                {/* Lists */}
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    isActive={editor.isActive('bulletList')}
                    title="Bullet List"
                >
                    <List size={16} className="2xl:w-5 2xl:h-5" />
                </ToolbarButton>

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    isActive={editor.isActive('orderedList')}
                    title="Numbered List"
                >
                    <ListOrdered size={16} className="2xl:w-5 2xl:h-5" />
                </ToolbarButton>

                {/* Quote */}
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    isActive={editor.isActive('blockquote')}
                    title="Quote Block"
                >
                    <Quote size={16} className="2xl:w-5 2xl:h-5" />
                </ToolbarButton>

                <div className="w-px h-5 bg-gray-300 mx-1" />

                {/* Table */}
                <ToolbarButton
                    onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                    isActive={editor.isActive('table')}
                    title="Insert Table (3x3)"
                >
                    <TableIcon size={16} className="2xl:w-5 2xl:h-5" />
                </ToolbarButton>

                {/* Horizontal Divider */}
                <ToolbarButton
                    onClick={() => editor.chain().focus().setHorizontalRule().run()}
                    title="Insert Divider"
                >
                    <SeparatorHorizontal size={16} className="2xl:w-5 2xl:h-5" />
                </ToolbarButton>

                {/* Code Block Button with Language Selector */}
                <div className="relative">
                    <ToolbarButton
                        onClick={() => setShowCodePopover(!showCodePopover)}
                        isActive={editor.isActive('codeBlock')}
                        title="Insert Code Block"
                    >
                        <Code2 size={16} className="2xl:w-5 2xl:h-5" />
                    </ToolbarButton>

                    {/* Language Selector Popover */}
                    {showCodePopover && (
                        <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-1 min-w-[140px] max-h-[200px] overflow-y-auto">
                            {CODE_LANGUAGES.map((lang) => (
                                <button
                                    key={lang.value}
                                    onClick={() => {
                                        editor.chain().focus().toggleCodeBlock({ language: lang.value }).run();
                                        setShowCodePopover(false);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
                                >
                                    {lang.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Math Equation */}
                <ToolbarButton
                    onClick={() => {
                        editor.chain().focus().insertContent({
                            type: 'mathBlock',
                            attrs: { latex: 'E = mc^2' },
                        }).run();
                    }}
                    isActive={editor.isActive('mathBlock')}
                    title="Insert Math Equation"
                >
                    <Sigma size={16} className="2xl:w-5 2xl:h-5" />
                </ToolbarButton>

                {/* Image Button with Popover */}
                <div className="relative">
                    <ToolbarButton
                        onClick={() => {
                            setImageUrl('');
                            setShowImagePopover(!showImagePopover);
                        }}
                        isActive={editor.isActive('image')}
                        title="Insert Image"
                    >
                        <ImageIcon size={16} className="2xl:w-5 2xl:h-5" />
                    </ToolbarButton>

                    {/* Image URL Popover */}
                    {showImagePopover && (
                        <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-2 flex items-center gap-2">
                            <input
                                type="url"
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                                placeholder="Image URL..."
                                className="w-48 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-gray-500"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && imageUrl) {
                                        editor.chain().focus().setImage({ src: imageUrl }).run();
                                        setShowImagePopover(false);
                                        setImageUrl('');
                                    } else if (e.key === 'Escape') {
                                        setShowImagePopover(false);
                                        setImageUrl('');
                                    }
                                }}
                            />
                            <button
                                onClick={() => {
                                    if (imageUrl) {
                                        editor.chain().focus().setImage({ src: imageUrl }).run();
                                        setShowImagePopover(false);
                                        setImageUrl('');
                                    }
                                }}
                                className="px-2 py-1 text-xs font-medium text-white bg-gray-500 rounded hover:bg-gray-600"
                            >
                                Add
                            </button>
                            <button
                                onClick={() => {
                                    setShowImagePopover(false);
                                    setImageUrl('');
                                }}
                                className="p-1 text-gray-400 hover:text-gray-600"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    )}
                </div>

                <div className="w-px h-5 bg-gray-300 mx-1" />

                {/* Undo/Redo */}
                <ToolbarButton
                    onClick={() => editor.chain().focus().undo().run()}
                    title="Undo (Ctrl+Z)"
                >
                    <Undo size={16} className="2xl:w-5 2xl:h-5" />
                </ToolbarButton>

                <ToolbarButton
                    onClick={() => editor.chain().focus().redo().run()}
                    title="Redo (Ctrl+Y)"
                >
                    <Redo size={16} className="2xl:w-5 2xl:h-5" />
                </ToolbarButton>

                {/* Save Status - pushed to right */}
                <div className="ml-auto flex items-center gap-1.5 text-xs 2xl:text-sm">
                    {saveStatus === 'saving' && (
                        <>
                            <Loader2 size={14} className="animate-spin text-gray-400" />
                            <span className="text-gray-400">Saving...</span>
                        </>
                    )}
                    {saveStatus === 'saved' && (
                        <>
                            <Cloud size={14} className="text-green-500" />
                            <span className="text-green-600">Saved</span>
                        </>
                    )}
                    {saveStatus === 'error' && (
                        <>
                            <CloudOff size={14} className="text-red-500" />
                            <span className="text-red-500">Error saving</span>
                        </>
                    )}
                </div>
            </div>

            {/* Editor content area */}
            <div
                className="flex-1 overflow-y-auto p-4 2xl:p-6"
                style={{ background: 'rgba(255, 255, 255, 0.4)' }}
            >
                {/* Table Controls BubbleMenu */}
                <BubbleMenu
                    editor={editor}
                    shouldShow={() => editor.isActive('table')}
                >
                    <div className="flex items-center gap-1 p-1.5 rounded-lg shadow-lg border border-gray-200 bg-white opacity-50 hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => editor.chain().focus().addRowAfter().run()}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                            title="Add Row Below"
                        >
                            <Plus size={12} />
                            Row
                        </button>
                        <button
                            onClick={() => editor.chain().focus().addColumnAfter().run()}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                            title="Add Column Right"
                        >
                            <Plus size={12} />
                            Col
                        </button>
                        <div className="w-px h-4 bg-gray-300" />
                        <button
                            onClick={() => editor.chain().focus().deleteRow().run()}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                            title="Delete Row"
                        >
                            <Minus size={12} />
                            Row
                        </button>
                        <button
                            onClick={() => editor.chain().focus().deleteColumn().run()}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                            title="Delete Column"
                        >
                            <Minus size={12} />
                            Col
                        </button>
                        <div className="w-px h-4 bg-gray-300" />
                        <button
                            onClick={() => editor.chain().focus().deleteTable().run()}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete Table"
                        >
                            <Trash2 size={12} />
                            Table
                        </button>
                    </div>
                </BubbleMenu>
                <EditorContent editor={editor} />
            </div>
        </div>
    );
}
