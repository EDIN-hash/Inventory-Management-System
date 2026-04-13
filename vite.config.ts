import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { createHtmlPlugin } from 'vite-plugin-html';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import { readFileSync } from 'fs';

// Generate a random nonce for CSP
const generateNonce = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let nonce = '';
    for (let i = 0; i < 16; i++) {
        nonce += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return nonce;
};

const nonce = generateNonce();

// Read critical CSS
const criticalCSS = readFileSync(resolve(__dirname, 'src/critical.css'), 'utf-8');

export default defineConfig({
    plugins: [
        react(),
        cssInjectedByJsPlugin(),
        createHtmlPlugin({
            minify: true,
            inject: {
                data: {
                    nonce: nonce,
                    criticalCSS: criticalCSS
                }
            }
        })
    ],
    root: resolve(__dirname, "."),
    build: {
        outDir: "dist",
        emptyOutDir: true,
        cssCodeSplit: false,
        rollupOptions: {
            input: {
                main: resolve(__dirname, "index.html"),
            },
            output: {
                manualChunks: {
                    'react-vendor': ['react', 'react-dom'],
                    'ui-vendor': ['react-modal']
                }
            }
        },
        chunkSizeWarningLimit: 500,
    },
    server: {
        port: 5173,
        strictPort: false,
        open: true,
        headers: {
            'Content-Security-Policy': `
                default-src 'self';
                script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.google.com https://*.gstatic.com;
                style-src 'self' 'unsafe-inline' https://*.google.com https://*.gstatic.com;
                img-src 'self' data: https://*.google.com https://*.gstatic.com;
                font-src 'self' https://*.google.com https://*.gstatic.com;
                connect-src 'self' http://localhost:* https://*.google.com https://*.gstatic.com;
                frame-src 'self' https://*.google.com;
                object-src 'none';
                base-uri 'self';
                form-action 'self';
            `
        }
    },
    define: {
        'process.env': {},
        'global.nonce': JSON.stringify(nonce)
    }
});
