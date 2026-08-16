import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
import { compression, defineAlgorithm } from 'vite-plugin-compression2'


export default defineConfig({
  plugins: [vue(), vueJsx(), vueDevTools(), tailwindcss(),compression({
      algorithms: [
        'gzip',
        'brotliCompress',
        defineAlgorithm('deflate', { level: 9 })
      ]
    })],
  build: {
    // 重型库（mermaid/katex/highlight）已通过动态 import 懒加载，不影响首屏
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      onwarn(warning, warn) {
        // 抑制第三方库中的 #__PURE__ 注释警告
        if (warning.code === 'INVALID_ANNOTATION') return
        warn(warning)
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('reka-ui') || id.includes('class-variance-authority') || id.includes('clsx') || id.includes('tailwind-merge')) {
              return 'vendor-ui'
            }
            if (id.includes('bytemd')) {
              return 'vendor-editor'
            }
            if (id.includes('echarts') || id.includes('zrender')) {
              return 'vendor-echarts'
            }
            if (id.includes('highlight.js')) {
              return 'vendor-highlight'
            }
            if (id.includes('katex')) {
              return 'vendor-katex'
            }
            if (id.includes('vee-validate') || id.includes('zod')) {
              return 'vendor-validate'
            }
            if (id.includes('pinia') || id.includes('vue-router') || id.includes('@vueuse')) {
              return 'vendor-vue'
            }
            if (id.includes('vue-sonner') || id.includes('medium-zoom') || id.includes('lucide')) {
              return 'vendor-utils'
            }
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // 本地开发端口
    port: 3000,
    open: true,
    proxy: {
      // 匹配所有 /api 开头接口
      '/api': {
        target: 'http://127.0.0.1:8080', // 后端服务地址
        changeOrigin: true, // 跨域核心
        //rewrite: (path) => path.replace(/^\/api/, ''), // 去掉 /api 前缀
      },
      // 第三方接口单独代理
      '/oss': {
        target: 'https://xxx.oss-cn-beijing.aliyuncs.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/oss/, ''),
      },
      '/oauth2': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        //rewrite: (path) => path.replace(/^\/oauth2/, ''),
      },
    },
  },
})
