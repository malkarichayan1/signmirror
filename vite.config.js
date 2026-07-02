import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Skip pre-bundling — MediaPipe ships its own ESM with internal WASM
    // side-loads that Vite's dep optimizer cannot handle correctly.
    exclude: ['@mediapipe/tasks-vision'],
  },
});
