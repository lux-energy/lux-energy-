import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const frontendRoot = dirname(fileURLToPath(
    import.meta.url))

export default defineConfig({
    root: frontendRoot,
    appType: 'spa',
    optimizeDeps: {
        entries: ['index.html']
    },
    plugins: [
        react(),
        {
            name: 'serve-root-index',
            configureServer(server) {
                server.middlewares.use((request, response, next) => {
                    if (request.url === '/') {
                        request.url = '/index.html';
                    }
                    next();
                });
            }
        }
    ],
    server: {
        host: '0.0.0.0',
        port: 3002,
        strictPort: true,
        proxy: {
            '/api': {
                target: 'http://localhost:5000',
                changeOrigin: true
            }
        }
    },
    resolve: {
        alias: {
            '@': resolve(frontendRoot, 'src')
        }
    }
})