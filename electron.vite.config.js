import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import path from 'path'

export default defineConfig({
    main: {
        build: {
            outDir: 'out',
            minify:true,
            rollupOptions: {
                input: {main: path.resolve(__dirname, 'app/main.js')}
            }
        },
        plugins: [externalizeDepsPlugin()],
    }
})