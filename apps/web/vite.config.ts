import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Vite only loads .env files from its own project root by default (apps/web/).
  // This repo keeps a single .env at the monorepo root, so point Vite there instead
  // of duplicating VITE_API_URL into a second, easy-to-forget apps/web/.env file.
  envDir: path.resolve(dirname, '../..'),
});
