import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  define: {
    'import.meta.env.VITE_MOBILE': JSON.stringify('true'),
  },
  build: {
    outDir: 'dist/mobile',
    emptyOutDir: true,
  },
})
