/**
 * 仪表盘首页
 *
 * 展示今日营收概览、缺货商品提醒、最近销售记录以及快捷操作入口。
 * 缺货商品定义为所有尺码库存总和为 0 的商品。
 */

import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Receipt,
  Package,
  AlertTriangle,
  ShoppingCart,
  ArrowRight,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import { formatCurrency, formatDateTime, getTotalStock } from '@/utils/format';
import { filterSalesByRange } from '@/api/reports';
import { useToast } from '@/components/ui/Toast';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Empty } from '@/components/Empty';

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const { products, sales, loadAll, isLoaded } = useDataStore();
  const { showToast } = useToast();

  useEffect(() => {
    if (user && !isLoaded) {
      loadAll(user).catch((err) => showToast(err instanceof Error ? err.message : '加载失败', 'error'));
    }
  }, [user, isLoaded, loadAll, showToast]);

  const todayStats = useMemo(() => {
    const todaySales = filterSalesByRange(sales, { range: 'day' });
    return todaySales.reduce(
      (acc, sale) => {
        acc.revenue += sale.unit_price * sale.quantity;
        acc.cost += sale.cost_price * sale.quantity;
        acc.profit += sale.profit;
        acc.orders += 1;
        return acc;
      },
      { revenue: 0, cost: 0, profit: 0, orders: 0 }
    );
  }, [sales]);

  const outOfStockProducts = useMemo(
    () => products.filter((p) => getTotalStock(p.sizes) === 0),
    [products]
  );

  const totalProductCount = useMemo(() => products.length, [products]);
  const recentSales = useMemo(() => sales.slice(0, 5), [sales]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">
          欢迎回来，{user?.displayName ?? user?.email}
        </h1>
        <p className="-mt-4 text-sm text-stone-500">这里是您店铺今日的运营概况</p>
      </div>

      {/* 今日营收 */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="今日销售额" value={formatCurrency(todayStats.revenue)} icon={<Receipt className="h-5 w-5" />} />
        <StatCard title="今日成本" value={formatCurrency(todayStats.cost)} icon={<TrendingDown className="h-5 w-5" />} />
        <StatCard title="今日利润" value={formatCurrency(todayStats.profit)} icon={<TrendingUp className="h-5 w-5" />} variant="accent" />
        <StatCard title="商品总数" value={totalProductCount} icon={<Package className="h-5 w-5" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 缺货提醒 */}
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-serif font-semibold text-charcoal">
              <AlertTriangle className="h-5 w-5 text-terracotta" />
              缺货提醒
            </h2>
            <Link to="/products" className="text-sm text-terracotta hover:underline">
              查看全部
            </Link>
          </div>

          {outOfStockProducts.length === 0 ? (
            <Empty
              title="库存充足"
              description="当前所有商品均有库存"
              className="py-6"
            />
          ) : (
            <div className="space-y-3">
              {outOfStockProducts.slice(0, 5).map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between rounded-xl border border-terracotta/20 bg-terracotta/5 p-3"
                >
                  <div className="flex items-center gap-3">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-100">
                        <Package className="h-5 w-5 text-stone-400" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-charcoal">{product.name}</p>
                      <p className="text-xs text-stone-500">{product.model}</p>
                    </div>
                  </div>
                  <Badge variant="danger">全部缺货</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 快捷入口 */}
        <Card>
          <h2 className="mb-4 text-lg font-serif font-semibold text-charcoal">快捷操作</h2>
          <div className="space-y-3">
            <Link to="/sales">
              <Button className="w-full justify-between" variant="secondary">
                记一笔销售
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/products">
              <Button className="w-full justify-between" variant="secondary">
                管理商品
                <Package className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/reports">
              <Button className="w-full justify-between" variant="secondary">
                查看报表
                <TrendingUp className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* 最近销售 */}
      <Card className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-serif font-semibold text-charcoal">最近销售</h2>
          <Link to="/sales" className="text-sm text-terracotta hover:underline">
            查看全部
          </Link>
        </div>

        {recentSales.length === 0 ? (
          <Empty title="暂无销售记录" description="去销售页面记录第一笔订单吧" className="py-6" />
        ) : (
          <div className="divide-y divide-stone-100">
            {recentSales.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-charcoal">{sale.product?.name ?? '未知商品'}</p>
                  <p className="text-xs text-stone-500">
                    {sale.sold_color}/{sale.sold_size} · {formatDateTime(sale.sold_at)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-charcoal">
                    {formatCurrency(sale.unit_price * sale.quantity)}
                  </p>
                  <p className="text-xs text-stone-500">{sale.quantity} 件</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
