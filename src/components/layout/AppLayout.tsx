/**
 * 应用主布局
 *
 * 桌面端展示左侧边栏，移动端展示底部导航栏，主内容区自动适配。
 */

import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { MobileBottomNav } from './MobileBottomNav';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-cream">
      <Sidebar />
      <main className="flex-1 overflow-y-auto md:ml-0">
        <div className="page-container min-h-screen">{children}</div>
      </main>
      <MobileBottomNav />
    </div>
  );
}
