import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm'
}

function serveStaticDir(urlPrefix, diskPath) {
  return (req, res, next) => {
    if (!req.url.startsWith(urlPrefix)) return next();
    let reqPath = req.url.slice(urlPrefix.length).split('?')[0];
    if (reqPath === '' || reqPath === '/') reqPath = '/index.html';
    const filePath = path.join(diskPath, reqPath);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
      return fs.createReadStream(filePath).pipe(res);
    }
    next();
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'serve-workspace-subapps',
      configureServer(server) {
        server.middlewares.use(serveStaticDir('/departments', path.resolve(__dirname, '../departments')));
        server.middlewares.use(serveStaticDir('/police/frontend', path.resolve(__dirname, '../police/frontend/dist')));
      }
    }
  ],
  server: {
    fs: {
      allow: ['..']
    }
  },
  base: '/',
})

