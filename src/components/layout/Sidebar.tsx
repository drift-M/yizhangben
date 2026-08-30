/**
 * 桌面端侧边栏导航
 *
 * 提供应用主要功能入口，包括概览、商品、分类、销售、报表和设置。
 * 底部显示当前用户信息及退出按钮。
 */

import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Tags,
  ShoppingCart,
  BarChart3,
  Settings,
  LogOut,
  Store,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

interface NavItem {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const navItems: NavItem[] = [
  { path: '/', label: '概览', icon: LayoutDashboard },
  { path: '/products', label: '商品', icon: Package },
  { path: '/categories', label: '分类', icon: Tags },
  { path: '/sales', label: '销售', icon: ShoppingCart },
  { path: '/reports', label: '报表', icon: BarChart3 },
  { path: '/settings', label: '设置', icon: Settings },
];

export function Sidebar() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <aside className="hidden h-screen w-64 flex-col border-r border-stone-200 bg-white md:flex">
      <div className="flex h-16 items-center gap-2 border-b border-stone-100 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-terracotta text-white">
          <Store className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-serif font-semibold leading-tight text-charcoal">衣账本</h1>
          <p className="text-xs text-stone-500">服装店记账本</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-6">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-terracotta/10 text-terracotta'
                      : 'text-stone-600 hover:bg-stone-100 hover:text-charcoal'
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-stone-100 p-4">
        <div className="mb-3 px-4">
          <p className="text-sm font-medium text-charcoal">{user?.displayName ?? user?.email}</p>
          <p className="text-xs text-stone-500">{user?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-charcoal"
        >
          <LogOut className="h-5 w-5" />
          安全退出
        </button>
      </div>
    </aside>
  );
}
