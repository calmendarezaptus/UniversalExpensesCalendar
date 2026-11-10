import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const timeEntryApi = (env.VITE_TIME_ENTRY_API_BASE_URL || 'https://timeentryforaptusfinancials-730085095.development.catalystserverless.com/server/time_entry_services').replace(/\/$/, '')
  return {
    base: './',
    plugins: [react()],
    server: {
      // Mismo proxy que la captura: evita CORS en desarrollo.
      proxy: {
        '/api/time-entry': {
          target: timeEntryApi,
          changeOrigin: true,
          rewrite: (requestPath: string) => requestPath.replace(/^\/api\/time-entry/, ''),
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
  }
})
