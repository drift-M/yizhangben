/**
 * 应用入口
 *
 * 渲染根组件并在生产环境中注册 Service Worker 以支持离线访问和 PWA 安装。
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ToastProvider } from '@/components/ui/Toast';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>
);

/**
 * 注册 Service Worker
 *
 * 仅在生产环境中注册，开发模式下跳过以避免缓存干扰热更新。
 * 注册失败时静默处理，不影响应用正常使用。
 */
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    // 使用 BASE_URL 拼接，兼容部署在子路径（如 GitHub Pages 的 /仓库名/）
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then((registration) => {
        console.debug('[SW] 注册成功，作用域：', registration.scope);
      })
      .catch((error) => {
        console.warn('[SW] 注册失败：', error);
      });
  });
}
