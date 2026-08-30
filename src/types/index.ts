/**
 * 全局类型定义
 *
 * 本文件定义了应用中所有核心数据结构，包括用户、商品、销售、分类等实体。
 * 商品支持多尺码库存管理：同一型号商品可按尺码分别记录数量。
 */

/**
 * 应用用户信息
 */
export interface AppUser {
  id: string;
  email: string;
  displayName?: string;
}

/**
 * 商品分类
 */
export interface Category {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

/**
 * 商品尺码库存项
 *
 * 每个尺码对应独立的库存数量，用于同一颜色下不同尺码的精细化管理。
 */
export interface ProductSize {
  size: string;
  stock: number;
}

/**
 * 商品颜色规格项
 *
 * 每个颜色包含一组尺码库存，形成「颜色 → 尺码 → 库存」的层级结构。
 */
export interface ProductColor {
  color: string;
  sizes: ProductSize[];
}

/**
 * 商品信息
 *
 * 以型号为核心，支持按颜色区分尺码库存。图片字段存储 base64 数据 URL 或远程 URL。
 */
export interface Product {
  id: string;
  user_id: string;
  category_id?: string | null;
  name: string;
  model: string;
  image: string;
  sizes: ProductColor[];
  cost_price: number;
  sale_price: number;
  created_at: string;
  updated_at: string;
  category?: Category;
}

/**
 * 销售记录
 *
 * sold_color 与 sold_size 共同记录售出时选择的具体规格，用于库存精确扣减与历史追溯。
 * product_id 在关联商品被删除后会变为 null，但销售记录本身保留。
 */
export interface Sale {
  id: string;
  user_id: string;
  product_id: string | null;
  created_by: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
  profit: number;
  sold_at: string;
  sold_color: string;
  sold_size: string;
  product?: Product;
}

/**
 * 应用设置
 */
export interface AppSetting {
  user_id: string;
  auto_backup: boolean;
}

/**
 * 报表时间范围选项
 */
export type ReportRange = 'day' | 'week' | 'month' | 'custom';

/**
 * 按日期聚合的报表数据项
 */
export interface ReportItem {
  date: string;
  revenue: number;
  cost: number;
  profit: number;
  orders: number;
}

/**
 * 仪表盘统计数据
 */
export interface DashboardStats {
  revenue: number;
  cost: number;
  profit: number;
  orders: number;
}

/**
 * 备份数据结构
 *
 * 用于导出/导入完整用户数据，包含版本号以支持未来格式升级。
 */
export interface BackupData {
  version: string;
  exportedAt: string;
  userId: string;
  categories: Category[];
  products: Product[];
  sales: Sale[];
  settings: AppSetting | null;
}
