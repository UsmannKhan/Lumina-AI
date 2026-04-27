'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
    Search,
    X,
    Copy,
    Check,
    Maximize2,
    Minimize2,
    Moon,
    Sun,
    ChevronDown,
    Minus,
    Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Fuse from 'fuse.js';

// Zoom options for text size
const ZOOM_OPTIONS = [
    { label: '75%', value: 0.75 },
    { label: '100%', value: 1.0 },
    { label: '125%', value: 1.25 },
    { label: '150%', value: 1.5 },
    { label: '175%', value: 1.75 },
    { label: '200%', value: 2.0 },
];

// Split content into paragraphs for search indexing
interface ParagraphData {
    text: string;
    startIndex: number;
    paragraphNum: number;
}

// Search result type
interface SearchResult {
    text: string;
    paragraphNum: number;
    startIndex: number;
    isExact: boolean;
}

interface TextViewerProps {
    content: string;
    fileName?: string;
    onTextSelect?: (text: string, position: { x: number; y: number }) => void;
}

export default function TextViewer({ content, fileName, onTextSelect }: TextViewerProps) {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [copied, setCopied] = useState(false);
    const [zoom, setZoom] = useState(1.0);
    const [isZoomDropdownOpen, setIsZoomDropdownOpen] = useState(false);
    const [highlightText, setHighlightText] = useState('');
    const [highlightIndex, setHighlightIndex] = useState<number | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const zoomDropdownRef = useRef<HTMLDivElement>(null);

    // Split content into paragraphs for better search
    const paragraphs = useMemo((): ParagraphData[] => {
        const lines = content.split('\n');
        const result: ParagraphData[] = [];
        let currentIndex = 0;

        lines.forEach((line, idx) => {
            if (line.trim()) {
                result.push({
                    text: line,
                    startIndex: currentIndex,
                    paragraphNum: idx + 1,
                });
            }
            currentIndex += line.length + 1; // +1 for newline
        });

        return result;
    }, [content]);

    // Fuse.js instance for fuzzy search
    const fuse = useMemo(() => {
        if (paragraphs.length === 0) return null;
        return new Fuse(paragraphs, {
            keys: ['text'],
            threshold: 0.4,
            includeScore: true,
            includeMatches: true,
            minMatchCharLength: 3,
        });
    }, [paragraphs]);

    // Compute search results
    const searchResults = useMemo((): SearchResult[] => {
        if (!searchQuery.trim() || paragraphs.length === 0) return [];

        const query = searchQuery.toLowerCase();
        const results: SearchResult[] = [];
        const seenParagraphs = new Set<number>();

        // Exact matches first
        paragraphs.forEach((para) => {
            const lowerText = para.text.toLowerCase();
            const matchIndex = lowerText.indexOf(query);
            if (matchIndex !== -1) {
                const snippetStart = Math.max(0, matchIndex - 20);
                const snippetEnd = Math.min(para.text.length, matchIndex + 100);
                let snippet = para.text.slice(snippetStart, snippetEnd);
                if (snippetStart > 0) snippet = '...' + snippet;
                if (snippetEnd < para.text.length) snippet = snippet + '...';

                results.push({
                    text: snippet,
                    paragraphNum: para.paragraphNum,
                    startIndex: para.startIndex + matchIndex,
                    isExact: true,
                });
                seenParagraphs.add(para.paragraphNum);
            }
        });

        // Fuzzy matches (exclude paragraphs already found in exact)
        if (fuse && results.length < 10) {
            const fuseResults = fuse.search(searchQuery, { limit: 10 });
            fuseResults.forEach((result) => {
                if (!seenParagraphs.has(result.item.paragraphNum) && results.length < 10) {
                    const text = result.item.text;
                    const snippet = text.slice(0, 100) + (text.length > 100 ? '...' : '');
                    results.push({
                        text: `...${snippet}`,
                        paragraphNum: result.item.paragraphNum,
                        startIndex: result.item.startIndex,
                        isExact: false,
                    });
                    seenParagraphs.add(result.item.paragraphNum);
                }
            });
        }

        return results;
    }, [searchQuery, paragraphs, fuse]);

    // Handle search result click
    const handleSearchResultClick = (result: SearchResult) => {
        setIsSearchOpen(false);
        setHighlightIndex(result.startIndex);
        setHighlightText(searchQuery);

        // Scroll to the position
        if (contentRef.current) {
            // Estimate scroll position based on character index
            const totalChars = content.length;
            const scrollHeight = contentRef.current.scrollHeight;
            const scrollRatio = result.startIndex / totalChars;
            const targetScroll = scrollRatio * scrollHeight - 100;

            contentRef.current.scrollTo({
                top: Math.max(0, targetScroll),
                behavior: 'smooth',
            });
        }

        // Clear highlight after a few seconds
        setTimeout(() => {
            setHighlightIndex(null);
            setHighlightText('');
        }, 3000);
    };

    // Focus search input when modal opens
    useEffect(() => {
        if (isSearchOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isSearchOpen]);

    // Handle fullscreen
    const toggleFullscreen = useCallback(() => {
        if (!containerRef.current) return;

        if (!isFullscreen) {
            containerRef.current.requestFullscreen?.();
        } else {
            document.exitFullscreen?.();
        }
    }, [isFullscreen]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Close zoom dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (zoomDropdownRef.current && !zoomDropdownRef.current.contains(event.target as Node)) {
                setIsZoomDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                setIsSearchOpen(true);
            }
            if (e.key === 'Escape' && isSearchOpen) {
                setIsSearchOpen(false);
                setSearchQuery('');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSearchOpen]);

    // Copy all content
    const handleCopyAll = useCallback(async () => {
        await navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [content]);

    // Zoom controls
    const zoomIn = () => {
        const currentIndex = ZOOM_OPTIONS.findIndex(o => o.value === zoom);
        if (currentIndex < ZOOM_OPTIONS.length - 1) {
            setZoom(ZOOM_OPTIONS[currentIndex + 1].value);
        }
    };

    const zoomOut = () => {
        const currentIndex = ZOOM_OPTIONS.findIndex(o => o.value === zoom);
        if (currentIndex > 0) {
            setZoom(ZOOM_OPTIONS[currentIndex - 1].value);
        }
    };

    // Highlighted content with active highlight
    const highlightedContent = useMemo(() => {
        if (!highlightText || highlightIndex === null) {
            return content;
        }

        const start = content.substring(0, highlightIndex);
        const match = content.substring(highlightIndex, highlightIndex + highlightText.length);
        const end = content.substring(highlightIndex + highlightText.length);

        return (
            <>
                {start}
                <mark className="bg-yellow-300 text-black rounded px-0.5 animate-pulse">{match}</mark>
                {end}
            </>
        );
    }, [content, highlightText, highlightIndex]);

    // Base font size in pixels (scales with zoom)
    const baseFontSize = 14;
    const fontSize = baseFontSize * zoom;

    return (
        <div
            ref={containerRef}
            className={cn(
                "flex flex-col h-full overflow-hidden relative",
                isFullscreen && "fixed inset-0 z-50"
            )}
        >
            {/* Toolbar */}
            <div className={cn(
                "flex items-center justify-between px-2 py-1 2xl:px-3 2xl:py-2 border-b flex-shrink-0",
                isDarkMode ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"
            )}>
                {/* Left: Zoom Dropdown + Search */}
                <div className="flex items-center gap-1 2xl:gap-2">
                    {/* Zoom Dropdown */}
                    <div className="relative" ref={zoomDropdownRef}>
                        <button
                            onClick={() => setIsZoomDropdownOpen(!isZoomDropdownOpen)}
                            className={cn(
                                "flex items-center gap-1 2xl:gap-1.5 px-2 py-1 2xl:px-3 2xl:py-1.5 rounded-lg text-xs 2xl:text-sm font-medium transition-colors",
                                isDarkMode
                                    ? "text-gray-300 hover:bg-gray-800"
                                    : "text-gray-700 hover:bg-gray-100"
                            )}
                        >
                            {Math.round(zoom * 100)}%
                            <ChevronDown className={cn("w-3 h-3 2xl:w-3.5 2xl:h-3.5 transition-transform", isZoomDropdownOpen && "rotate-180")} />
                        </button>

                        {isZoomDropdownOpen && (
                            <div className={cn(
                                "absolute top-full left-0 mt-1 py-2 rounded-lg shadow-lg border z-50 min-w-[150px]",
                                isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                            )}>
                                {/* Custom zoom controls */}
                                <div className={cn(
                                    "flex items-center justify-center gap-2 px-3 py-1.5 border-b mb-1",
                                    isDarkMode ? "border-gray-700" : "border-gray-200"
                                )}>
                                    <button
                                        onClick={zoomOut}
                                        disabled={zoom <= ZOOM_OPTIONS[0].value}
                                        className={cn(
                                            "p-1 rounded transition-colors disabled:opacity-30",
                                            isDarkMode ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-600"
                                        )}
                                        title="Zoom out"
                                    >
                                        <Minus size={14} />
                                    </button>
                                    <input
                                        type="number"
                                        min="50"
                                        max="300"
                                        value={Math.round(zoom * 100)}
                                        onChange={(e) => {
                                            const value = parseInt(e.target.value);
                                            if (!isNaN(value) && value >= 50 && value <= 300) {
                                                setZoom(value / 100);
                                            }
                                        }}
                                        className={cn(
                                            "w-12 px-1 py-0.5 text-sm text-center border rounded focus:outline-none",
                                            isDarkMode
                                                ? "bg-gray-700 border-gray-600 text-white focus:border-gray-500"
                                                : "bg-white border-gray-200 text-gray-900 focus:border-[#007AFF]"
                                        )}
                                    />
                                    <span className={cn("text-xs", isDarkMode ? "text-gray-500" : "text-gray-500")}>%</span>
                                    <button
                                        onClick={zoomIn}
                                        disabled={zoom >= ZOOM_OPTIONS[ZOOM_OPTIONS.length - 1].value}
                                        className={cn(
                                            "p-1 rounded transition-colors disabled:opacity-30",
                                            isDarkMode ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-600"
                                        )}
                                        title="Zoom in"
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>
                                {/* Preset options */}
                                {ZOOM_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => {
                                            setZoom(option.value);
                                            setIsZoomDropdownOpen(false);
                                        }}
                                        className={cn(
                                            "w-full px-3 py-1.5 text-left text-sm transition-colors",
                                            zoom === option.value
                                                ? isDarkMode ? "bg-gray-700 font-medium text-white" : "bg-gray-100 font-medium text-gray-900"
                                                : isDarkMode ? "text-gray-300 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-100"
                                        )}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Search button */}
                    <button
                        onClick={() => setIsSearchOpen(true)}
                        className={cn(
                            "p-1 2xl:p-2 rounded-lg transition-colors",
                            isDarkMode
                                ? "text-gray-400 hover:bg-gray-800"
                                : "text-gray-600 hover:bg-gray-100"
                        )}
                        title="Search (Ctrl+F)"
                    >
                        <Search className="w-4 h-4 2xl:w-[18px] 2xl:h-[18px]" />
                    </button>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-0.5 2xl:gap-1">
                    <button
                        onClick={() => setIsDarkMode(d => !d)}
                        className={cn(
                            "p-1 2xl:p-2 rounded-lg transition-colors",
                            isDarkMode
                                ? "text-gray-400 hover:bg-gray-800"
                                : "text-gray-600 hover:bg-gray-100"
                        )}
                        title={isDarkMode ? "Light mode" : "Dark mode"}
                    >
                        {isDarkMode
                            ? <Sun className="w-4 h-4 2xl:w-[18px] 2xl:h-[18px]" />
                            : <Moon className="w-4 h-4 2xl:w-[18px] 2xl:h-[18px]" />
                        }
                    </button>

                    <button
                        onClick={handleCopyAll}
                        className={cn(
                            "p-1 2xl:p-2 rounded-lg transition-colors",
                            isDarkMode
                                ? "text-gray-400 hover:bg-gray-800"
                                : "text-gray-600 hover:bg-gray-100"
                        )}
                        title="Copy all text"
                    >
                        {copied
                            ? <Check className="w-4 h-4 2xl:w-[18px] 2xl:h-[18px] text-green-500" />
                            : <Copy className="w-4 h-4 2xl:w-[18px] 2xl:h-[18px]" />
                        }
                    </button>

                    <button
                        onClick={toggleFullscreen}
                        className={cn(
                            "p-1 2xl:p-2 rounded-lg transition-colors",
                            isDarkMode
                                ? "text-gray-400 hover:bg-gray-800"
                                : "text-gray-600 hover:bg-gray-100"
                        )}
                        title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                    >
                        {isFullscreen
                            ? <Minimize2 className="w-4 h-4 2xl:w-[18px] 2xl:h-[18px]" />
                            : <Maximize2 className="w-4 h-4 2xl:w-[18px] 2xl:h-[18px]" />
                        }
                    </button>
                </div>
            </div>

            {/* Content */}
            <div
                ref={contentRef}
                className={cn(
                    "flex-1 overflow-y-auto p-4 2xl:p-6",
                    isDarkMode ? "bg-gray-900" : "bg-white"
                )}
            >
                <pre
                    className={cn(
                        "whitespace-pre-wrap font-sans leading-relaxed",
                        isDarkMode ? "text-gray-200" : "text-gray-700"
                    )}
                    style={{ fontSize: `${fontSize}px` }}
                >
                    {highlightedContent}
                </pre>
            </div>

            {/* Search Modal */}
            {isSearchOpen && (
                <div className="absolute inset-0 z-50 flex items-start justify-center pt-20">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
                        onClick={() => {
                            setIsSearchOpen(false);
                            setSearchQuery('');
                        }}
                    />

                    {/* Modal */}
                    <div className="relative w-full max-w-md mx-4 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
                        {/* Search input */}
                        <div className="flex items-center gap-3 p-4 border-b border-gray-200">
                            <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search in document..."
                                className="flex-1 text-gray-900 placeholder-gray-400 outline-none text-base"
                            />
                            <button
                                onClick={() => {
                                    setIsSearchOpen(false);
                                    setSearchQuery('');
                                }}
                                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                                aria-label="Close search"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Search results */}
                        <div className="max-h-80 overflow-y-auto">
                            {searchQuery.trim() && searchResults.length === 0 && (
                                <div className="p-4 text-center text-gray-500">
                                    No results found for "{searchQuery}"
                                </div>
                            )}

                            {searchResults.length > 0 && (
                                <>
                                    {/* Exact matches */}
                                    {searchResults.filter(r => r.isExact).length > 0 && (
                                        <div className="p-3 pb-0">
                                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                                Exact Matches
                                            </h3>
                                            {searchResults.filter(r => r.isExact).map((result, i) => (
                                                <button
                                                    key={`exact-${i}`}
                                                    onClick={() => handleSearchResultClick(result)}
                                                    className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors mb-1"
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="text-sm text-gray-700 line-clamp-2">{result.text}</p>
                                                        <span className="flex-shrink-0 px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded-full">
                                                            ¶ {result.paragraphNum}
                                                        </span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Similar matches */}
                                    {searchResults.filter(r => !r.isExact).length > 0 && (
                                        <div className="p-3 pt-2">
                                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                                Similar Matches
                                            </h3>
                                            {searchResults.filter(r => !r.isExact).map((result, i) => (
                                                <button
                                                    key={`similar-${i}`}
                                                    onClick={() => handleSearchResultClick(result)}
                                                    className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors mb-1"
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="text-sm text-gray-600 line-clamp-2">{result.text}</p>
                                                        <span className="flex-shrink-0 px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded-full">
                                                            ¶ {result.paragraphNum}
                                                        </span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}

                            {!searchQuery.trim() && (
                                <div className="p-4 text-center text-gray-400 text-sm">
                                    Type to search in this document
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
