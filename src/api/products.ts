/**
 * 商品管理 API
 *
 * 提供商品的增删改查及尺码库存扣减功能。
 * 商品以型号为核心，每个型号可包含多个尺码，各尺码独立管理库存。
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { localDb } from '@/lib/localDb';
import { Product, AppUser } from '@/types';
import { generateId } from '@/utils/format';

export type ProductInput = Omit<
  Product,
  'id' | 'user_id' | 'created_at' | 'updated_at' | 'category'
>;

/**
 * 将旧版一维尺码结构兼容转换为新版颜色→尺码二级结构
 *
 * 若 sizes 数组第一项不含 color 字段，则认为是一维旧数据，统一用默认颜色包装。
 */
/** 旧版一维尺码项 */
interface OldProductSize {
  size: string;
  stock: number;
}

function normalizeProductSizes(product: Product): Product {
  const sizes = product.sizes ?? [];
  const first = sizes[0] as unknown as Record<string, unknown> | undefined;
  if (sizes.length > 0 && first && !('color' in first)) {
    return {
      ...product,
      sizes: [{ color: '默认', sizes: sizes as unknown as OldProductSize[] }],
    };
  }
  return product;
}

/**
 * 查询商品列表（关联分类）
 */
export async function fetchProducts(user: AppUser): Promise<Product[]> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as Product[]).map(normalizeProductSizes);
  }

  const products = await localDb.products.where('user_id').equals(user.id).toArray();
  const categories = await localDb.categories.where('user_id').equals(user.id).toArray();
  return products.map((p) => ({
    ...normalizeProductSizes(p),
    category: categories.find((c) => c.id === p.category_id),
  }));
}

/**
 * 创建商品
 */
export async function createProduct(user: AppUser, input: ProductInput): Promise<Product> {
  const now = new Date().toISOString();
  const payload: Product = {
    id: generateId(),
    user_id: user.id,
    ...input,
    created_at: now,
    updated_at: now,
  };

  if (isSupabaseConfigured) {
    // 诊断当前会话状态，帮助排查 RLS 问题
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      throw new Error('当前未登录，请重新登录后再试');
    }
    if (sessionData.session.user.id !== user.id) {
      throw new Error('会话用户不一致，请重新登录');
    }

    const { data, error } = await supabase.from('products').insert(payload).select().single();
    if (error) throw new Error(error.message);
    return data as Product;
  }

  await localDb.products.add(payload);
  return payload;
}

/**
 * 更新商品
 */
export async function updateProduct(
  user: AppUser,
  id: string,
  input: Partial<ProductInput>
): Promise<Product> {
  const now = new Date().toISOString();

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('products')
      .update({ ...input, updated_at: now })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Product;
  }

  const product = await localDb.products
    .where('id')
    .equals(id)
    .and((p) => p.user_id === user.id)
    .first();
  if (!product) throw new Error('商品不存在或无权修改');
  await localDb.products.update(id, { ...input, updated_at: now });
  return { ...product, ...input, updated_at: now };
}

/**
 * 删除商品
 *
 * 销售记录需要保留用于历史统计，因此数据库外键应配置为 ON DELETE SET NULL。
 * 删除商品时只需删除商品本身，关联销售记录的 product_id 会自动置空。
 */
export async function deleteProduct(user: AppUser, id: string): Promise<void> {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('products').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw new Error(error.message);
    return;
  }

  const product = await localDb.products
    .where('id')
    .equals(id)
    .and((p) => p.user_id === user.id)
    .first();
  if (!product) throw new Error('商品不存在或无权删除');

  // 本地模式下手动将关联销售记录的 product_id 置空，保留销售记录
  const relatedSales = await localDb.sales
    .where('product_id')
    .equals(id)
    .and((s) => s.user_id === user.id)
    .toArray();
  await localDb.sales.bulkUpdate(
    relatedSales.map((s) => ({ key: s.id, changes: { product_id: null } }))
  );

  await localDb.products.delete(id);
}

/**
 * 扣减指定颜色与尺码的库存
 *
 * 根据 productId、colorName 和 sizeName 精确定位到具体库存项并扣减数量。
 * 若库存不足则抛出错误，不会将库存扣至负数。
 */
export async function decreaseStock(
  user: AppUser,
  productId: string,
  colorName: string,
  sizeName: string,
  quantity: number
): Promise<Product> {
  if (isSupabaseConfigured) {
    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('user_id', user.id)
      .single();
    if (!product) throw new Error('商品不存在');

    const colors = (product.sizes as Product['sizes']) ?? [];
    const colorItem = colors.find((c) => c.color === colorName);
    const sizeItem = colorItem?.sizes.find((s) => s.size === sizeName);
    if (!colorItem || !sizeItem) throw new Error(`规格「${colorName}/${sizeName}」不存在`);
    if (sizeItem.stock < quantity) throw new Error(`规格「${colorName}/${sizeName}」库存不足`);

    const updatedColors = colors.map((c) => {
      if (c.color !== colorName) return c;
      return {
        ...c,
        sizes: c.sizes.map((s) => {
          if (s.size !== sizeName) return s;
          return { ...s, stock: Math.max(0, s.stock - quantity) };
        }),
      };
    });

    const { data, error } = await supabase
      .from('products')
      .update({ sizes: updatedColors, updated_at: new Date().toISOString() })
      .eq('id', productId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Product;
  }

  const product = await localDb.products
    .where('id')
    .equals(productId)
    .and((p) => p.user_id === user.id)
    .first();
  if (!product) throw new Error('商品不存在');

  const colorItem = product.sizes.find((c) => c.color === colorName);
  const sizeItem = colorItem?.sizes.find((s) => s.size === sizeName);
  if (!colorItem || !sizeItem) throw new Error(`规格「${colorName}/${sizeName}」不存在`);
  if (sizeItem.stock < quantity) throw new Error(`规格「${colorName}/${sizeName}」库存不足`);

  const updatedColors = product.sizes.map((c) => {
    if (c.color !== colorName) return c;
    return {
      ...c,
      sizes: c.sizes.map((s) => {
        if (s.size !== sizeName) return s;
        return { ...s, stock: Math.max(0, s.stock - quantity) };
      }),
    };
  });

  await localDb.products.update(productId, {
    sizes: updatedColors,
    updated_at: new Date().toISOString(),
  });
  return { ...product, sizes: updatedColors };
}

/**
 * 回滚指定颜色与尺码的库存（删除销售记录时调用）
 */
export async function increaseStock(
  user: AppUser,
  productId: string,
  colorName: string,
  sizeName: string,
  quantity: number
): Promise<void> {
  if (isSupabaseConfigured) {
    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('user_id', user.id)
      .single();
    if (!product) return;

    const colors = (product.sizes as Product['sizes']) ?? [];
    const updatedColors = colors.map((c) => {
      if (c.color !== colorName) return c;
      return {
        ...c,
        sizes: c.sizes.map((s) => {
          if (s.size !== sizeName) return s;
          return { ...s, stock: s.stock + quantity };
        }),
      };
    });

    await supabase
      .from('products')
      .update({ sizes: updatedColors, updated_at: new Date().toISOString() })
      .eq('id', productId);
    return;
  }

  const product = await localDb.products
    .where('id')
    .equals(productId)
    .and((p) => p.user_id === user.id)
    .first();
  if (!product) return;

  const updatedColors = product.sizes.map((c) => {
    if (c.color !== colorName) return c;
    return {
      ...c,
      sizes: c.sizes.map((s) => {
        if (s.size !== sizeName) return s;
        return { ...s, stock: s.stock + quantity };
      }),
    };
  });

  await localDb.products.update(productId, { sizes: updatedColors });
}
