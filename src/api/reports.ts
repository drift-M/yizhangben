/**
 * 财务报表 API
 *
 * 提供按时间范围过滤、按日期聚合和商品销量排行等报表计算功能。
 * 所有计算均基于本地销售数据，无需额外网络请求。
 */

import { Sale, ReportItem, ReportRange } from '@/types';
import { getTodayRange } from '@/utils/format';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

export interface ReportFilters {
  range: ReportRange;
  startDate?: string;
  endDate?: string;
}

/**
 * 根据时间范围过滤销售记录
 *
 * 支持日、周、月及自定义日期区间，返回符合范围的记录子集。
 */
export function filterSalesByRange(sales: Sale[], filters: ReportFilters): Sale[] {
  const now = new Date();

  switch (filters.range) {
    case 'day': {
      const { start, end } = getTodayRange();
      return sales.filter((s) => {
        const d = new Date(s.sold_at);
        return d >= start && d < end;
      });
    }
    case 'week': {
      const start = startOfWeek(now, { weekStartsOn: 1 });
      const end = endOfWeek(now, { weekStartsOn: 1 });
      return sales.filter((s) => {
        const d = new Date(s.sold_at);
        return isWithinInterval(d, { start, end });
      });
    }
    case 'month': {
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      return sales.filter((s) => {
        const d = new Date(s.sold_at);
        return isWithinInterval(d, { start, end });
      });
    }
    case 'custom': {
      if (!filters.startDate || !filters.endDate) return sales;
      const start = new Date(filters.startDate);
      const end = new Date(filters.endDate);
      end.setDate(end.getDate() + 1);
      return sales.filter((s) => {
        const d = new Date(s.sold_at);
        return isWithinInterval(d, { start, end });
      });
    }
    default:
      return sales;
  }
}

/**
 * 按日期聚合销售数据
 *
 * 将销售记录按日期分组，汇总每日的销售额、成本、利润和订单数。
 */
export function aggregateByDate(sales: Sale[]): ReportItem[] {
  const map = new Map<string, ReportItem>();

  sales.forEach((sale) => {
    const dateKey = new Date(sale.sold_at).toISOString().slice(0, 10);
    const existing = map.get(dateKey);
    const revenue = sale.unit_price * sale.quantity;
    const cost = sale.cost_price * sale.quantity;
    const profit = sale.profit;

    if (existing) {
      existing.revenue += revenue;
      existing.cost += cost;
      existing.profit += profit;
      existing.orders += 1;
    } else {
      map.set(dateKey, {
        date: dateKey,
        revenue,
        cost,
        profit,
        orders: 1,
      });
    }
  });

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 获取商品销量排行
 *
 * 按销售额降序排列，返回前 N 名商品的名称、销量和销售额。
 */
export function getProductRanking(
  sales: Sale[],
  limit = 5
): Array<{ name: string; quantity: number; revenue: number }> {
  const map = new Map<string, { name: string; quantity: number; revenue: number }>();

  sales.forEach((sale) => {
    const name = sale.product?.name ?? '未知商品';
    const existing = map.get(name);
    const revenue = sale.unit_price * sale.quantity;
    if (existing) {
      existing.quantity += sale.quantity;
      existing.revenue += revenue;
    } else {
      map.set(name, { name, quantity: sale.quantity, revenue });
    }
  });

  return Array.from(map.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}
