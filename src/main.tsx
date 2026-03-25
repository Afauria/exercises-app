import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { BankProvider } from './context/BankContext';
import App from './App';
import './index.css';

/**
 * 使用 Hash 路由，地址形如 https://user.github.io/ai_test/#/practice
 * 刷新时浏览器只请求 /ai_test/index.html，不会请求 /ai_test/practice，避免 GitHub Pages 静态托管 404。
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <BankProvider>
        <App />
      </BankProvider>
    </HashRouter>
  </StrictMode>
);
