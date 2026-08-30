/**
 * 业务数据状态管理
 *
 * 集中管理商品、分类、销售和设置数据，提供 CRUD 操作方法。
 * loadAll 方法在应用初始化时一次性加载全部数据，后续通过局部更新保持同步。
 */

import { create } from 'zustand';
import { Product, Category, Sale, AppSetting, AppUser } from '@/types';
import { fetchProducts } from '@/api/products';
import { fetchCategories } from '@/api/categories';
import { fetchSales } from '@/api/sales';
import { fetchSettings } from '@/api/settings';
import { localDb } from '@/lib/localDb';
import { isSupabaseConfigured } from '@/lib/supabase';

/**
 * 将云端数据快照写回 IndexedDB
 *
 * 先删除该用户的旧数据再批量写入，保证快照与云端一致。
 * 用于下次启动时秒开渲染，调用方忽略失败、不影响主流程。
 */
async function persistSnapshot(
  userId: string,
  data: { products: Product[]; categories: Category[]; sales: Sale[]; settings: AppSetting | null }
): Promise<void> {
  await localDb.transaction(
    'rw',
    [localDb.products, localDb.categories, localDb.sales, localDb.settings],
    async () => {
      await Promise.all([
        localDb.products.where('user_id').equals(userId).delete(),
        localDb.categories.where('user_id').equals(userId).delete(),
        localDb.sales.where('user_id').equals(userId).delete(),
      ]);
      await localDb.products.bulkPut(data.products);
      await localDb.categories.bulkPut(data.categories);
      await localDb.sales.bulkPut(data.sales);
      if (data.settings) await localDb.settings.put(data.settings);
    }
  );
}

interface DataState {
  products: Product[];
  categories: Category[];
  sales: Sale[];
  settings: AppSetting | null;
  isLoading: boolean;
  isLoaded: boolean;
  /** 当前已加载数据所属的用户 ID，用于切换账号时强制重新加载 */
  loadedUserId: string | null;
  error: string | null;

  loadAll: (user: AppUser) => Promise<void>;
  setProducts: (products: Product[]) => void;
  setCategories: (categories: Category[]) => void;
  setSales: (sales: Sale[]) => void;
  setSettings: (settings: AppSetting) => void;
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  removeProduct: (id: string) => void;
  addSale: (sale: Sale) => void;
  removeSale: (id: string) => void;
  addCategory: (category: Category) => void;
  removeCategory: (id: string) => void;
  updateSettings: (settings: AppSetting) => void;
}

export const useDataStore = create<DataState>((set, get) => ({
  products: [],
  categories: [],
  sales: [],
  settings: null,
  isLoading: false,
  isLoaded: false,
  loadedUserId: null,
  error: null,

  /**
   * 加载全部业务数据
   *
   * 仅在首次加载时调用，通过 isLoaded 标记避免重复请求。
   * 云端模式下先从 IndexedDB 快照立即渲染（秒开看到历史数据），
   * 再后台拉取云端最新数据更新页面并回写快照。
   */
  loadAll: async (user) => {
    if (get().isLoading) return;
    // 同一账号已加载过则不重复请求
    if (get().isLoaded && get().loadedUserId === user.id) return;
    // 切换账号时先清空旧数据，避免串号展示
    if (get().loadedUserId !== user.id) {
      set({ products: [], categories: [], sales: [], settings: null, isLoaded: false });
    }
    set({ isLoading: true, error: null });

    // 1) 先从本地快照立即渲染，避免白屏等待网络
    if (isSupabaseConfigured) {
      try {
        const [cachedProducts, cachedCategories, cachedSales, cachedSettings] = await Promise.all([
          localDb.products.where('user_id').equals(user.id).toArray(),
          localDb.categories.where('user_id').equals(user.id).toArray(),
          localDb.sales.where('user_id').equals(user.id).toArray(),
          localDb.settings.get(user.id),
        ]);
        if (cachedProducts.length || cachedCategories.length || cachedSales.length) {
          set({
            products: cachedProducts,
            categories: cachedCategories,
            sales: cachedSales,
            settings: cachedSettings ?? null,
            isLoaded: true,
            loadedUserId: user.id,
          });
        }
      } catch {
        // 快照读取失败时忽略，回退为纯网络加载
      }
    }

    // 2) 拉取最新数据更新页面，成功后回写本地快照
    try {
      const [products, categories, sales, settings] = await Promise.all([
        fetchProducts(user),
        fetchCategories(user),
        fetchSales(user),
        fetchSettings(user),
      ]);
      set({
        products,
        categories,
        sales,
        settings,
        isLoading: false,
        isLoaded: true,
        loadedUserId: user.id,
      });

      if (isSupabaseConfigured) {
        persistSnapshot(user.id, { products, categories, sales, settings }).catch(() => {});
      }
    } catch (err) {
      // 已有快照数据时网络失败不报错，静默降级展示缓存
      if (get().isLoaded) {
        set({ isLoading: false });
      } else {
        set({ error: err instanceof Error ? err.message : '加载失败', isLoading: false });
      }
    }
  },

  setProducts: (products) => set({ products }),
  setCategories: (categories) => set({ categories }),
  setSales: (sales) => set({ sales }),
  setSettings: (settings) => set({ settings }),

  addProduct: (product) => set({ products: [product, ...get().products] }),
  updateProduct: (product) =>
    set({
      products: get().products.map((p) => (p.id === product.id ? product : p)),
    }),
  removeProduct: (id) =>
    set({
      products: get().products.filter((p) => p.id !== id),
    }),

  addSale: (sale) => set({ sales: [sale, ...get().sales] }),
  removeSale: (id) =>
    set({
      sales: get().sales.filter((s) => s.id !== id),
    }),

  addCategory: (category) => set({ categories: [...get().categories, category] }),
  removeCategory: (id) =>
    set({
      categories: get().categories.filter((c) => c.id !== id),
    }),

  updateSettings: (settings) => set({ settings }),
}));
