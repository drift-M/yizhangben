/**
 * 格式化工具函数
 *
 * 提供金额、日期和 ID 生成的通用格式化方法。
 */

/**
 * 将数值格式化为人民币金额字符串（带两位小数）
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * 格式化日期为本地字符串（年月日）
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * 格式化日期时间（年月日 时分）
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 生成唯一 ID（本地模式使用）
 *
 * 始终生成标准 UUID v4 格式，确保与 Supabase 数据库字段类型兼容。
 * 优先使用 crypto.randomUUID（浏览器原生支持），降级为 RFC 4122 兼容算法。
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
  return uuid;
}

/**
 * 获取今日起止时间（从 00:00:00 到次日 00:00:00）
 */
export function getTodayRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { start, end };
}

/**
 * 计算商品总库存（所有颜色下所有尺码库存之和）
 */
export function getTotalStock(colors: Array<{ sizes: Array<{ stock: number }> }>): number {
  return colors.reduce((sum, color) => sum + color.sizes.reduce((c, s) => c + s.stock, 0), 0);
}
