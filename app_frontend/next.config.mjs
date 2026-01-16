/** @type {import('next').NextConfig} */
const nextConfig = {
    // Optimize barrel file imports for lucide-react (1500+ icons)
    // This transforms `import { X } from 'lucide-react'` into direct imports at build time
    experimental: {
        optimizePackageImports: ['lucide-react'],
    },
    images: {
        domains: ['img.youtube.com', 'i.ytimg.com'],
    },
    // Handle canvas module for PDF.js (not needed in browser)
    webpack: (config) => {
        config.resolve.fallback = {
            ...config.resolve.fallback,
            canvas: false,
        };
        return config;
    },
}

export default nextConfig
