'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import {
    ChevronLeft,
    ChevronRight,
    Download,
    Loader2,
    ChevronDown,
    Minus,
    Plus,
    Search,
    X,
    RotateCw,
    Maximize2,
    Minimize2,
    Moon,
    Sun,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Fuse from 'fuse.js';

// Import CSS for text layer (v9.x path)
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Configure PDF.js worker for v4.x (using unpkg which mirrors npm)
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Zoom options
const ZOOM_OPTIONS = [
    { label: 'Page fit', value: 'fit' },
    { label: '50%', value: 0.5 },
    { label: '75%', value: 0.75 },
    { label: '100%', value: 1.0 },
    { label: '125%', value: 1.25 },
    { label: '150%', value: 1.5 },
    { label: '200%', value: 2.0 },
];

// Type for storing page text content
interface PageText {
    pageNum: number;
    text: string;
}

// Type for search results
interface SearchResult {
    text: string;
    pageNum: number;
    isExact: boolean;
    matchIndex: number; // Position in original text for highlighting
}

interface PdfViewerProps {
    pdfUrl: string;
    onTextSelect?: (selectedText: string, position: { x: number; y: number }) => void;
}

export default function PdfViewer({ pdfUrl, onTextSelect }: PdfViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [numPages, setNumPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageInputValue, setPageInputValue] = useState('1'); // Local state for typing
    const [zoomValue, setZoomValue] = useState<'fit' | number>('fit');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [containerWidth, setContainerWidth] = useState(0);
    const [containerHeight, setContainerHeight] = useState(0);
    const [isZoomDropdownOpen, setIsZoomDropdownOpen] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const zoomDropdownRef = useRef<HTMLDivElement>(null);

    // Search state
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [pdfTextContent, setPdfTextContent] = useState<PageText[]>([]);
    const [highlightPage, setHighlightPage] = useState<number | null>(null);
    const [highlightText, setHighlightText] = useState<string>('');
    const searchInputRef = useRef<HTMLInputElement>(null);
    const pdfDocRef = useRef<pdfjs.PDFDocumentProxy | null>(null);

    // Rotation state (0, 90, 180, 270 degrees)
    const [rotation, setRotation] = useState(0);

    // Dark mode state for PDF
    const [isDarkMode, setIsDarkMode] = useState(false);

    // Fullscreen state
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Toggle fullscreen
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    // Sync fullscreen state with browser
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Sync page input with currentPage
    useEffect(() => {
        setPageInputValue(String(currentPage));
    }, [currentPage]);

    // Calculate dimensions for fit mode
    useEffect(() => {
        const updateDimensions = () => {
            if (contentRef.current) {
                setContainerWidth(contentRef.current.clientWidth);
                setContainerHeight(contentRef.current.clientHeight);
            }
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    // Close zoom dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (zoomDropdownRef.current && !zoomDropdownRef.current.contains(e.target as Node)) {
                setIsZoomDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Track scroll position to update current page
    useEffect(() => {
        const handleScroll = () => {
            // Skip tracking during navigation animation
            if (!contentRef.current || numPages === 0 || isNavigating) return;

            const container = contentRef.current;
            const containerHeight = container.clientHeight;

            // Find which page is most visible
            for (let i = 1; i <= numPages; i++) {
                const pageElement = document.getElementById(`pdf-page-${i}`);
                if (pageElement) {
                    const rect = pageElement.getBoundingClientRect();
                    const containerRect = container.getBoundingClientRect();

                    // If page top is in view or page fills the view
                    if (rect.top <= containerRect.top + containerHeight / 3 &&
                        rect.bottom > containerRect.top) {
                        setCurrentPage(i);
                    }
                }
            }
        };

        const content = contentRef.current;
        if (content) {
            content.addEventListener('scroll', handleScroll);
            return () => content.removeEventListener('scroll', handleScroll);
        }
    }, [numPages, isNavigating]);

    // Handle text selection
    useEffect(() => {
        const handleMouseUp = () => {
            const selection = window.getSelection();
            if (selection && selection.toString().trim()) {
                const selectedText = selection.toString().trim();
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();

                if (onTextSelect) {
                    onTextSelect(selectedText, {
                        x: rect.left + rect.width / 2,
                        y: rect.top
                    });
                }
            }
        };

        const content = contentRef.current;
        if (content) {
            content.addEventListener('mouseup', handleMouseUp);
            return () => content.removeEventListener('mouseup', handleMouseUp);
        }
    }, [onTextSelect]);

    const onDocumentLoadSuccess = useCallback(async ({ numPages: loadedNumPages }: { numPages: number }) => {
        setNumPages(loadedNumPages);
        setIsLoading(false);
        setError(null);

        // Extract text from all pages for search
        try {
            const pdf = await pdfjs.getDocument(pdfUrl).promise;
            pdfDocRef.current = pdf;
            const textContent: PageText[] = [];

            for (let i = 1; i <= loadedNumPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const pageText = (content.items as any[])
                    .filter((item) => item.str)
                    .map((item) => item.str)
                    .join(' ');
                textContent.push({ pageNum: i, text: pageText });
            }

            setPdfTextContent(textContent);
        } catch (err) {
            console.error('Failed to extract PDF text:', err);
        }
    }, [pdfUrl]);

    const onDocumentLoadError = useCallback((error: Error) => {
        console.error('PDF load error:', error);
        setError(`Failed to load PDF: ${error.message}`);
        setIsLoading(false);
    }, []);

    // Scroll to page function
    const scrollToPage = (pageNum: number) => {
        setIsNavigating(true);
        setCurrentPage(pageNum);
        const pageElement = document.getElementById(`pdf-page-${pageNum}`);
        if (pageElement) {
            pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        // Resume scroll tracking after animation completes
        setTimeout(() => setIsNavigating(false), 500);
    };

    const handlePrevPage = () => {
        const newPage = Math.max(1, currentPage - 1);
        scrollToPage(newPage);
    };

    // Fuse.js instance for fuzzy search
    const fuse = useMemo(() => {
        if (pdfTextContent.length === 0) return null;
        return new Fuse(pdfTextContent, {
            keys: ['text'],
            threshold: 0.4, // Lower = stricter matching
            includeScore: true,
            includeMatches: true,
            minMatchCharLength: 3,
        });
    }, [pdfTextContent]);

    // Compute search results
    const searchResults = useMemo((): SearchResult[] => {
        if (!searchQuery.trim() || pdfTextContent.length === 0) return [];

        const query = searchQuery.toLowerCase();
        const results: SearchResult[] = [];
        const seenPages = new Set<number>();

        // Exact matches first
        pdfTextContent.forEach((page) => {
            const lowerText = page.text.toLowerCase();
            const matchIndex = lowerText.indexOf(query);
            if (matchIndex !== -1) {
                // Get snippet starting from match position (match + 100 chars after)
                const end = Math.min(page.text.length, matchIndex + 120);
                const snippet = page.text.slice(matchIndex, end);
                results.push({
                    text: snippet.length < page.text.length - matchIndex ? `${snippet}...` : snippet,
                    pageNum: page.pageNum,
                    isExact: true,
                    matchIndex,
                });
                seenPages.add(page.pageNum);
            }
        });

        // Fuzzy matches (exclude pages already found in exact)
        if (fuse && results.length < 10) {
            const fuseResults = fuse.search(searchQuery, { limit: 10 });
            fuseResults.forEach((result) => {
                if (!seenPages.has(result.item.pageNum) && results.length < 10) {
                    const text = result.item.text;
                    const snippet = text.slice(0, 100);
                    results.push({
                        text: `...${snippet}...`,
                        pageNum: result.item.pageNum,
                        isExact: false,
                        matchIndex: 0,
                    });
                    seenPages.add(result.item.pageNum);
                }
            });
        }

        return results;
    }, [searchQuery, pdfTextContent, fuse]);

    // Handle search result click
    const handleSearchResultClick = (result: SearchResult) => {
        setIsSearchOpen(false);
        setHighlightPage(result.pageNum);
        setHighlightText(searchQuery);
        scrollToPage(result.pageNum);
        // Clear highlight after a few seconds
        setTimeout(() => {
            setHighlightPage(null);
            setHighlightText('');
        }, 3000);
    };

    // Focus search input when modal opens
    useEffect(() => {
        if (isSearchOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isSearchOpen]);

    // Highlight matching text in the page
    useEffect(() => {
        if (!highlightPage || !highlightText) return;

        const pageElement = document.getElementById(`pdf-page-${highlightPage}`);
        if (!pageElement) return;

        const textLayer = pageElement.querySelector('.react-pdf__Page__textContent');
        if (!textLayer) return;

        // Get all text spans
        const spans = textLayer.querySelectorAll('span');
        const query = highlightText.toLowerCase();

        spans.forEach((span) => {
            const text = span.textContent?.toLowerCase() || '';
            if (text.includes(query)) {
                // Add highlight background
                (span as HTMLElement).style.background = 'rgba(255, 230, 0, 0.5)';
                (span as HTMLElement).style.borderRadius = '2px';
            }
        });

        // Clear highlights when state resets
        return () => {
            spans.forEach((span) => {
                (span as HTMLElement).style.background = '';
                (span as HTMLElement).style.borderRadius = '';
            });
        };
    }, [highlightPage, highlightText]);

    const handleNextPage = () => {
        const newPage = Math.min(numPages, currentPage + 1);
        scrollToPage(newPage);
    };

    const handleZoomChange = (value: 'fit' | number) => {
        setZoomValue(value);
        setIsZoomDropdownOpen(false);
    };

    const handleZoomIn = () => {
        const current = zoomValue === 'fit' ? getScale() || 1.0 : zoomValue;
        const newZoom = Math.min(3.0, current + 0.1);
        setZoomValue(Math.round(newZoom * 10) / 10);
    };

    const handleZoomOut = () => {
        const current = zoomValue === 'fit' ? getScale() || 1.0 : zoomValue;
        const newZoom = Math.max(0.25, current - 0.1);
        setZoomValue(Math.round(newZoom * 10) / 10);
    };

    const handleCustomZoom = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value);
        if (!isNaN(value) && value >= 25 && value <= 300) {
            setZoomValue(value / 100);
        }
    };

    const getCurrentZoomLabel = () => {
        if (zoomValue === 'fit') return 'Page fit';
        return `${Math.round(zoomValue * 100)}%`;
    };

    const getScale = () => {
        if (zoomValue === 'fit') {
            // Fit page width in viewport - use width-based scaling
            // Standard PDF page width at scale 1.0 is ~612px (8.5 inches * 72 DPI)
            if (containerWidth > 0) {
                const targetWidth = containerWidth - 40; // 40px padding for scrollbar and margins
                const scale = targetWidth / 612;
                return Math.min(scale, 2.0); // Cap at 200% for very wide containers
            }
            return 1.0;
        }
        return zoomValue;
    };

    const getWidth = () => {
        // Only use width for fixed zoom levels, not for fit
        return undefined;
    };

    return (
        <div className="flex flex-col h-full bg-white" ref={containerRef}>
            {/* Custom Minimal Toolbar */}
            <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-gray-200 flex-shrink-0">
                {/* Left: Zoom Dropdown + Search */}
                <div className="flex items-center gap-2">
                    <div className="relative" ref={zoomDropdownRef}>
                        <button
                            onClick={() => setIsZoomDropdownOpen(!isZoomDropdownOpen)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                            <span>{getCurrentZoomLabel()}</span>
                            <ChevronDown size={14} className={cn("transition-transform", isZoomDropdownOpen && "rotate-180")} />
                        </button>

                        {isZoomDropdownOpen && (
                            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[150px] z-50">
                                {/* Custom zoom controls */}
                                <div className="flex items-center justify-center gap-2 px-3 py-1.5 border-b border-gray-200 mb-1">
                                    <button
                                        onClick={handleZoomOut}
                                        className="p-1 rounded hover:bg-gray-100 text-gray-600"
                                        title="Zoom out"
                                        aria-label="Zoom out"
                                    >
                                        <Minus size={14} />
                                    </button>
                                    <input
                                        type="number"
                                        min="25"
                                        max="300"
                                        value={zoomValue === 'fit' ? '' : Math.round(zoomValue * 100)}
                                        placeholder="--"
                                        onChange={handleCustomZoom}
                                        className="w-12 px-1 py-0.5 text-sm text-center border border-gray-200 rounded focus:outline-none focus:border-[#0C115B]"
                                    />
                                    <span className="text-xs text-gray-500">%</span>
                                    <button
                                        onClick={handleZoomIn}
                                        className="p-1 rounded hover:bg-gray-100 text-gray-600"
                                        title="Zoom in"
                                        aria-label="Zoom in"
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>
                                {/* Preset options */}
                                {ZOOM_OPTIONS.map((option) => (
                                    <button
                                        key={option.label}
                                        onClick={() => handleZoomChange(option.value as 'fit' | number)}
                                        className={cn(
                                            "w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 transition-colors",
                                            zoomValue === option.value ? "bg-gray-100 font-medium text-gray-900" : "text-gray-700"
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
                        className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                        title="Search in PDF"
                        aria-label="Search in PDF"
                    >
                        <Search size={18} />
                    </button>

                    {/* Rotate button */}
                    <button
                        onClick={() => setRotation(r => (r + 90) % 360)}
                        className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                        title="Rotate 90°"
                        aria-label="Rotate page 90 degrees"
                    >
                        <RotateCw size={18} />
                    </button>

                    {/* Dark mode toggle */}
                    <button
                        onClick={() => setIsDarkMode(d => !d)}
                        className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                        title={isDarkMode ? "Light mode" : "Dark mode"}
                        aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
                    >
                        {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                </div>

                {/* Center: Page Navigation */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={handlePrevPage}
                        disabled={currentPage <= 1}
                        className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            currentPage <= 1 ? "text-gray-300 cursor-not-allowed" : "text-gray-600 hover:bg-gray-100"
                        )}
                        title="Previous page"
                        aria-label="Previous page"
                    >
                        <ChevronLeft size={18} />
                    </button>

                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={pageInputValue}
                            onChange={(e) => setPageInputValue(e.target.value)}
                            onFocus={(e) => e.target.select()}
                            onBlur={() => {
                                const value = parseInt(pageInputValue);
                                if (!isNaN(value) && value >= 1 && value <= numPages) {
                                    scrollToPage(value);
                                } else {
                                    setPageInputValue(String(currentPage));
                                }
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    (e.target as HTMLInputElement).blur();
                                }
                            }}
                            className="w-10 px-1 py-0.5 text-sm text-center font-medium border border-gray-200 rounded-lg focus:outline-none focus:border-[#0C115B] bg-white"
                        />
                        <span className="text-gray-400">/</span>
                        <span>{numPages}</span>
                    </div>

                    <button
                        onClick={handleNextPage}
                        disabled={currentPage >= numPages}
                        className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            currentPage >= numPages ? "text-gray-300 cursor-not-allowed" : "text-gray-600 hover:bg-gray-100"
                        )}
                        title="Next page"
                        aria-label="Next page"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>

                {/* Right: Download */}
                <div className="min-w-[100px] flex justify-end">
                    <a
                        href={pdfUrl}
                        download
                        className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                        title="Download"
                        aria-label="Download PDF"
                    >
                        <Download size={18} />
                    </a>

                    {/* Fullscreen toggle */}
                    <button
                        onClick={toggleFullscreen}
                        className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                        title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                    >
                        {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                </div>
            </div>

            {/* PDF Content */}
            <div
                ref={contentRef}
                className={cn("flex-1 overflow-auto pdf-content", isDarkMode ? "bg-gray-900" : "bg-white")}
                style={{ filter: isDarkMode ? 'invert(1) hue-rotate(180deg)' : 'none' }}
            >
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                        <Loader2 className="w-8 h-8 animate-spin text-[#0C115B]" />
                    </div>
                )}

                {error && (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center text-gray-600">
                            <p>{error}</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="mt-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Retry
                            </button>
                        </div>
                    </div>
                )}

                <Document
                    file={pdfUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading={null}
                    className="inline-flex flex-col items-center min-w-full"
                >
                    {Array.from(new Array(numPages), (_, index) => (
                        <div
                            key={`page_${index + 1}`}
                            id={`pdf-page-${index + 1}`}
                            className="border-b border-gray-300"
                        >
                            <Page
                                pageNumber={index + 1}
                                scale={getScale()}
                                width={getWidth()}
                                rotate={rotation}
                                renderTextLayer={true}
                                renderAnnotationLayer={true}
                                loading={
                                    <div className="flex items-center justify-center bg-gray-50" style={{ width: getWidth() || 'auto', height: 400 }}>
                                        <Loader2 className="w-6 h-6 animate-spin text-[#0C115B]" />
                                    </div>
                                }
                            />
                        </div>
                    ))}
                </Document>
            </div>

            {/* Custom styles for text selection */}
            <style jsx global>{`
                .react-pdf__Page {
                    box-shadow: none !important;
                }
                
                .react-pdf__Page__textContent {
                    user-select: text !important;
                    cursor: text !important;
                    pointer-events: auto !important;
                    z-index: 2 !important;
                }
                
                .react-pdf__Page__textContent span {
                    color: transparent !important;
                }
                
                .react-pdf__Page__textContent span::selection {
                    background: rgba(12, 17, 91, 0.4) !important;
                    color: transparent !important;
                }
                
                .react-pdf__Page__textContent span::-moz-selection {
                    background: rgba(12, 17, 91, 0.4) !important;
                    color: transparent !important;
                }
                
                /* Light scrollbar */
                .pdf-content::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }
                
                .pdf-content::-webkit-scrollbar-track {
                    background: #f1f1f1;
                }
                
                .pdf-content::-webkit-scrollbar-thumb {
                    background: #c1c1c1;
                    border-radius: 4px;
                }
                
                .pdf-content::-webkit-scrollbar-thumb:hover {
                    background: #a8a8a8;
                }
            `}</style>

            {/* Search Modal */}
            {isSearchOpen && (
                <div className="absolute inset-0 bg-black/30 z-50 flex items-start justify-center pt-16">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
                        {/* Search header */}
                        <div className="flex items-center gap-3 p-4 border-b border-gray-200">
                            <Search size={20} className="text-gray-400 flex-shrink-0" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search in PDF..."
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
                                                            p. {result.pageNum}
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
                                                            p. {result.pageNum}
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
                                    Type to search in this PDF
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
