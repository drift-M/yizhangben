/**
 * 本地 IndexedDB 存储
 *
 * 当未配置 Supabase 或网络不可用时，应用使用 Dexie 在本地持久化数据，
 * 同时支持导出/导入 JSON 备份，确保数据不丢失。
 *
 * 版本历史：
 * - v1：初始版本，包含 staff 表和旧商品结构（color/size/stock/threshold）
 * - v2：移除 staff 表，商品改为多尺码库存结构（sizes 数组），销售记录增加 sold_size 字段
 * - v3：商品 sizes 改为颜色→尺码→库存的二级结构，销售记录增加 sold_color 字段
 */

import Dexie, { Table } from 'dexie';
import { Category, Product, Sale, AppSetting } from '@/types';

/** 旧数据迁移时使用的默认颜色名 */
const DEFAULT_COLOR = '默认';

class LocalDb extends Dexie {
  categories!: Table<Category, string>;
  products!: Table<Product, string>;
  sales!: Table<Sale, string>;
  settings!: Table<AppSetting, string>;

  constructor() {
    super('ClothingLedgerDB');

    // v1：初始架构（保留以支持从旧版本升级）
    this.version(1).stores({
      categories: 'id, user_id',
      products: 'id, user_id, category_id, model',
      sales: 'id, user_id, product_id, sold_at',
      settings: 'user_id',
      staff: 'id, owner_id, user_id',
    });

    // v2：移除 staff 表，商品改为 sizes 数组结构，销售记录增加 sold_size
    this.version(2)
      .stores({
        categories: 'id, user_id',
        products: 'id, user_id',
        sales: 'id, user_id, sold_at',
        settings: 'user_id',
      })
      .upgrade(async (tx) => {
        // 迁移商品数据：将 color/size/stock/low_stock_threshold 转换为 sizes 数组
        await tx.table('products').toCollection().modify((product: Record<string, unknown>) => {
          const size = (product.size as string) || '均码';
          const stock = typeof product.stock === 'number' ? product.stock : 0;
          product.sizes = [{ size, stock }];
          product.image = '';
          delete product.color;
          delete product.size;
          delete product.stock;
          delete product.low_stock_threshold;
        });

        // 迁移销售记录：添加 sold_size 字段
        await tx.table('sales').toCollection().modify((sale: Record<string, unknown>) => {
          if (!sale.sold_size) {
            sale.sold_size = '均码';
          }
          delete sale.created_by_user;
        });

        // 清除 staff 表数据（表已在 schema 中移除）
        try {
          await tx.table('staff').clear();
        } catch {
          // staff 表可能不存在，忽略错误
        }

        // 迁移设置：移除 low_stock_default 字段
        await tx.table('settings').toCollection().modify((setting: Record<string, unknown>) => {
          delete setting.low_stock_default;
        });
      });

    // v3：商品 sizes 改为颜色→尺码的二级结构，销售记录增加 sold_color 字段
    this.version(3)
      .stores({
        categories: 'id, user_id',
        products: 'id, user_id',
        sales: 'id, user_id, sold_at',
        settings: 'user_id',
      })
      .upgrade(async (tx) => {
        // 迁移商品数据：将一维尺码数组包装为按默认颜色分组的二级结构
        await tx.table('products').toCollection().modify((product: Record<string, unknown>) => {
          const oldSizes = product.sizes as Array<{ size: string; stock: number }> | undefined;
          if (oldSizes && oldSizes.length > 0 && !('color' in oldSizes[0])) {
            product.sizes = [{ color: DEFAULT_COLOR, sizes: oldSizes }];
          }
        });

        // 迁移销售记录：为旧记录补充默认颜色
        await tx.table('sales').toCollection().modify((sale: Record<string, unknown>) => {
          if (!sale.sold_color) {
            sale.sold_color = DEFAULT_COLOR;
          }
        });
      });
  }
}

export const localDb = new LocalDb();
