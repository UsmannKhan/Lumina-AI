'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import {
    ChevronLeft,
    ChevronRight,
    Download,
    Loader2,
    ChevronDown,
    Minus,
    Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface PdfViewerProps {
    pdfUrl: string;
    onTextSelect?: (selectedText: string, position: { x: number; y: number }) => void;
}

export default function PdfViewer({ pdfUrl, onTextSelect }: PdfViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [numPages, setNumPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [zoomValue, setZoomValue] = useState<'fit' | number>('fit');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [containerWidth, setContainerWidth] = useState(0);
    const [containerHeight, setContainerHeight] = useState(0);
    const [isZoomDropdownOpen, setIsZoomDropdownOpen] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const zoomDropdownRef = useRef<HTMLDivElement>(null);

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

    const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
        setIsLoading(false);
        setError(null);
    }, []);

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
            // Fit entire page in viewport - use height-based scaling
            // Standard PDF page aspect ratio is ~8.5:11 (0.77)
            // Calculate scale to fit height, with some padding
            if (containerHeight > 0) {
                const targetHeight = containerHeight - 20; // 20px padding
                // Approximate page height at scale 1.0 is ~792px (11 inches * 72 DPI)
                const scale = targetHeight / 792;
                return Math.min(scale, 1.5); // Cap at 150% for very tall containers
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
                {/* Left: Zoom Dropdown */}
                <div className="relative min-w-[100px]" ref={zoomDropdownRef}>
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
                    >
                        <ChevronLeft size={18} />
                    </button>

                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <span className="font-medium">{currentPage}</span>
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
                    >
                        <Download size={18} />
                    </a>
                </div>
            </div>

            {/* PDF Content */}
            <div
                ref={contentRef}
                className="flex-1 overflow-auto bg-white pdf-content"
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
        </div>
    );
}
