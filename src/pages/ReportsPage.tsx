/**
 * 财务报表页面
 *
 * 支持按日、周、月及自定义时间范围查看销售额、成本、利润趋势与商品销量排行。
 */

import { useEffect, useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { Calendar, TrendingUp, TrendingDown, Receipt, Award } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import { filterSalesByRange, aggregateByDate, getProductRanking, ReportFilters } from '@/api/reports';
import { formatCurrency, formatDate } from '@/utils/format';
import { useToast } from '@/components/ui/Toast';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Empty } from '@/components/Empty';
import { ReportRange } from '@/types';

const rangeLabels: Record<ReportRange, string> = {
  day: '今日',
  week: '本周',
  month: '本月',
  custom: '自定义',
};

export function ReportsPage() {
  const user = useAuthStore((state) => state.user);
  const { sales, loadAll, isLoaded } = useDataStore();
  const { showToast } = useToast();

  const [range, setRange] = useState<ReportRange>('day');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (user && !isLoaded) {
      loadAll(user).catch((err) => showToast(err instanceof Error ? err.message : '加载失败', 'error'));
    }
  }, [user, isLoaded, loadAll, showToast]);

  const filters: ReportFilters = useMemo(() => {
    if (range === 'custom') {
      return { range, startDate, endDate };
    }
    return { range };
  }, [range, startDate, endDate]);

  const filteredSales = useMemo(() => filterSalesByRange(sales, filters), [sales, filters]);

  const stats = useMemo(() => {
    return filteredSales.reduce(
      (acc, sale) => {
        acc.revenue += sale.unit_price * sale.quantity;
        acc.cost += sale.cost_price * sale.quantity;
        acc.profit += sale.profit;
        acc.orders += 1;
        return acc;
      },
      { revenue: 0, cost: 0, profit: 0, orders: 0 }
    );
  }, [filteredSales]);

  const trendData = useMemo(() => aggregateByDate(filteredSales), [filteredSales]);

  const ranking = useMemo(() => getProductRanking(filteredSales, 5), [filteredSales]);

  return (
    <div>
      <h1 className="page-title">财务报表</h1>

      {/* 时间范围选择 */}
      <Card className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(rangeLabels) as ReportRange[]).map((key) => (
              <Button
                key={key}
                variant={range === key ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setRange(key)}
              >
                {rangeLabels[key]}
              </Button>
            ))}
          </div>

          {range === 'custom' && (
            <div className="flex flex-1 flex-col gap-3 sm:flex-row">
              <Input
                type="date"
                label="开始日期"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <Input
                type="date"
                label="结束日期"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          )}
        </div>
      </Card>

      {/* 核心指标 */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="销售额" value={formatCurrency(stats.revenue)} icon={<Receipt className="h-5 w-5" />} />
        <StatCard title="成本" value={formatCurrency(stats.cost)} icon={<TrendingDown className="h-5 w-5" />} />
        <StatCard title="利润" value={formatCurrency(stats.profit)} icon={<TrendingUp className="h-5 w-5" />} variant="accent" />
        <StatCard title="订单数" value={stats.orders} icon={<Calendar className="h-5 w-5" />} />
      </div>

      {filteredSales.length === 0 ? (
        <Empty title="该时间段暂无数据" description="请切换时间范围或先去记录销售" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* 趋势图 */}
          <Card className="lg:col-span-2">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-serif font-semibold text-charcoal">
              <TrendingUp className="h-5 w-5 text-terracotta" />
              营收趋势
            </h2>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C45C3E" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#C45C3E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E6E2DB" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value: string) => value.slice(5)}
                    stroke="#8A8178"
                    fontSize={12}
                  />
                  <YAxis
                    tickFormatter={(value: number) => `¥${value}`}
                    stroke="#8A8178"
                    fontSize={12}
                    width={56}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label: string) => formatDate(label)}
                    contentStyle={{
                      borderRadius: '0.75rem',
                      border: '1px solid #F2F0EC',
                      boxShadow: '0 4px 20px -4px rgba(45, 42, 38, 0.08)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    name="利润"
                    stroke="#C45C3E"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorProfit)"
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="销售额"
                    stroke="#B89B72"
                    strokeWidth={2}
                    fill="transparent"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* 销量排行 */}
          <Card>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-serif font-semibold text-charcoal">
              <Award className="h-5 w-5 text-gold" />
              商品销量排行
            </h2>
            <div className="space-y-4">
              {ranking.map((item, index) => (
                <div key={item.name} className="flex items-center gap-3">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      index === 0
                        ? 'bg-gold text-white'
                        : index === 1
                        ? 'bg-stone-300 text-white'
                        : index === 2
                        ? 'bg-terracotta/60 text-white'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-charcoal">{item.name}</p>
                    <p className="text-xs text-stone-500">{item.quantity} 件 · {formatCurrency(item.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ranking} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" hide />
                  <Tooltip
                    formatter={(value: number) => `${value} 件`}
                    contentStyle={{ borderRadius: '0.75rem' }}
                  />
                  <Bar dataKey="quantity" radius={[0, 4, 4, 0]}>
                    {ranking.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#B89B72' : '#C45C3E'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
