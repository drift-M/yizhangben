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

interface DataState {
  products: Product[];
  categories: Category[];
  sales: Sale[];
  settings: AppSetting | null;
  isLoading: boolean;
  isLoaded: boolean;
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
  error: null,

  /**
   * 加载全部业务数据
   *
   * 仅在首次加载或强制刷新时调用，通过 isLoaded 标记避免重复请求。
   */
  loadAll: async (user) => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });
    try {
      const [products, categories, sales, settings] = await Promise.all([
        fetchProducts(user),
        fetchCategories(user),
        fetchSales(user),
        fetchSettings(user),
      ]);
      set({ products, categories, sales, settings, isLoading: false, isLoaded: true });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载失败', isLoading: false });
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
