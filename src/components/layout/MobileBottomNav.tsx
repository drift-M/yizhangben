/**
 * 移动端底部导航栏
 *
 * 在小屏设备上显示固定的底部导航，提供核心功能快速入口。
 * 桌面端自动隐藏，由侧边栏替代。
 */

import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart3,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const navItems: NavItem[] = [
  { path: '/', label: '概览', icon: LayoutDashboard },
  { path: '/products', label: '商品', icon: Package },
  { path: '/sales', label: '销售', icon: ShoppingCart },
  { path: '/reports', label: '报表', icon: BarChart3 },
  { path: '/settings', label: '设置', icon: Settings },
];

export function MobileBottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="flex items-center justify-around">
        {navItems.map((item) => (
          <li key={item.path} className="flex-1">
            <NavLink
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center py-2.5 text-xs font-medium transition-colors',
                  isActive ? 'text-terracotta' : 'text-stone-500'
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="mt-1">{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
