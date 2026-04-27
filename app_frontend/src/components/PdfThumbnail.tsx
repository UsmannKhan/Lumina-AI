'use client';

import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// Worker is configured here (and again in PdfViewer) — both calls are
// idempotent. Keeping it in both means either entry can render PDFs.
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

interface PdfThumbnailProps {
  url: string;
  /** Rendered when the PDF fails to load or while it's loading. */
  fallback: React.ReactNode;
}

/**
 * Renders the first page of a PDF, sized to overflow its container so the
 * tile shows the top of the page. Designed to live inside a square tile
 * with `position: relative; overflow: hidden`.
 */
export default function PdfThumbnail({ url, fallback }: PdfThumbnailProps) {
  const [errored, setErrored] = useState(false);

  if (errored) return <>{fallback}</>;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        background: '#fff',
      }}
    >
      <Document
        file={url}
        loading={fallback}
        error={fallback}
        onLoadError={() => setErrored(true)}
      >
        <Page
          pageNumber={1}
          width={400}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          loading={fallback}
          error={fallback}
        />
      </Document>
    </div>
  );
}
