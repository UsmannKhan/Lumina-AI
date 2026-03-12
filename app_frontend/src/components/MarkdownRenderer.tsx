'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';
import { cn } from '@/lib/utils';

// Generate a stable hash from string content (for consistent Mermaid IDs)
function stableHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
}

// Global counter to ensure uniqueness even with identical charts
let mermaidCounter = 0;

interface MermaidProps {
    chart: string;
}

const Mermaid = ({ chart }: MermaidProps) => {
    const [svg, setSvg] = useState<string>('');
    const [error, setError] = useState<boolean>(false);
    // Stable ID: hash of content + unique counter (set once on mount)
    const idRef = useRef(`m-${stableHash(chart)}-${mermaidCounter++}`);

    useEffect(() => {
        let isMounted = true;

        mermaid.initialize({
            startOnLoad: false,
            theme: 'default',
            securityLevel: 'loose',
        });

        const renderChart = async () => {
            try {
                // Remove any leftover element from a previous render attempt
                const existingEl = document.getElementById(idRef.current);
                if (existingEl) existingEl.remove();

                const { svg: renderedSvg } = await mermaid.render(idRef.current, chart);
                if (isMounted) setSvg(renderedSvg);
            } catch (err) {
                console.error('Mermaid rendering failed:', err);
                if (isMounted) setError(true);
            }
        };

        renderChart();

        return () => {
            isMounted = false;
        };
    // Only re-render if the actual chart content changes
    }, [chart]);

    if (error) {
        return (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm font-mono whitespace-pre-wrap overflow-x-auto my-4">
                Failed to render diagram:{'\n'}{chart}
            </div>
        );
    }

    if (!svg) {
        return <div className="p-4 text-gray-500 animate-pulse text-sm text-center my-4">Rendering diagram...</div>;
    }

    return (
        <div
            className="flex justify-center my-6 p-4 bg-white/50 rounded-lg border border-gray-100 overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
};

interface MarkdownRendererProps {
    content: string;
    className?: string;
}

export default function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
    // Memoize components object so ReactMarkdown doesn't re-create it every render
    const components = useMemo(() => ({
        // @ts-expect-error - ReactMarkdown types for components are complex
        code({ inline, className: codeClassName, children, ...props }) {
            const match = /language-(\w+)/.exec(codeClassName || '');
            const language = match ? match[1] : '';

            // Render mermaid diagram
            if (!inline && language === 'mermaid') {
                return <Mermaid chart={String(children).replace(/\n$/, '')} />;
            }

            // Standard code block
            return (
                <code className={cn(codeClassName, "bg-gray-100 rounded px-1.5 py-0.5 text-sm font-mono")} {...props}>
                    {children}
                </code>
            );
        },
        // Enhance tables
        table: ({ children }: { children: React.ReactNode }) => (
            <div className="overflow-x-auto my-6">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg shadow-sm">
                    {children}
                </table>
            </div>
        ),
        thead: ({ children }: { children: React.ReactNode }) => <thead className="bg-gray-50">{children}</thead>,
        th: ({ children }: { children: React.ReactNode }) => <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{children}</th>,
        td: ({ children }: { children: React.ReactNode }) => <td className="px-4 py-3 text-sm text-gray-700 border-t border-gray-100">{children}</td>,
    }), []);

    return (
        <div className={cn("markdown-content max-w-none", className)}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={components}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
