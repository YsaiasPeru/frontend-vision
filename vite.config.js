import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En desarrollo proxya /api al backend de Rust en :8080.
// En produccion (build) cambia API_BASE en src/api.js por la URL de tu servidor.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
});
