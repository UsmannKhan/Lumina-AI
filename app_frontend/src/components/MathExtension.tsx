'use client';

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import katex from 'katex';
import React, { useState, useEffect, useRef } from 'react';

// Component to render the math equation
const MathNodeView: React.FC<NodeViewProps> = ({ node, updateAttributes, selected }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [latex, setLatex] = useState(node.attrs.latex || '');
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setLatex(node.attrs.latex || '');
    }, [node.attrs.latex]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    // Render KaTeX
    const renderMath = () => {
        try {
            return katex.renderToString(latex || 'E = mc^2', {
                throwOnError: false,
                displayMode: true,
            });
        } catch {
            return '<span style="color: red;">Invalid LaTeX</span>';
        }
    };

    const handleSave = () => {
        updateAttributes({ latex });
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            setLatex(node.attrs.latex || '');
            setIsEditing(false);
        }
    };

    return (
        <NodeViewWrapper className="math-node-wrapper">
            <div
                ref={containerRef}
                className={`math-node ${selected ? 'selected' : ''}`}
                onClick={() => !isEditing && setIsEditing(true)}
            >
                {isEditing ? (
                    <div className="math-editor">
                        <textarea
                            ref={inputRef}
                            value={latex}
                            onChange={(e) => setLatex(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={handleSave}
                            placeholder="Enter LaTeX (e.g., x^2 + y^2 = z^2)"
                            className="math-input"
                            rows={1}
                        />
                        <div className="math-preview">
                            <span className="math-preview-label">Preview:</span>
                            <div
                                className="math-rendered"
                                dangerouslySetInnerHTML={{ __html: renderMath() }}
                            />
                        </div>
                    </div>
                ) : (
                    <div
                        className="math-display"
                        dangerouslySetInnerHTML={{ __html: renderMath() }}
                    />
                )}
            </div>
        </NodeViewWrapper>
    );
};

// Tiptap Math Extension
export const MathExtension = Node.create({
    name: 'mathBlock',

    group: 'block',

    atom: true,

    addAttributes() {
        return {
            latex: {
                default: 'E = mc^2',
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-type="math-block"]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'math-block' }), 0];
    },

    addNodeView() {
        return ReactNodeViewRenderer(MathNodeView);
    },
});

export default MathExtension;
