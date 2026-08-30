/**
 * 销售记录 API
 *
 * 管理销售记录的创建和删除，包含尺码级别的精确库存扣减与回滚。
 * 每条销售记录通过 sold_size 字段关联商品的具体尺码。
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { localDb } from '@/lib/localDb';
import { Sale, AppUser, Product } from '@/types';
import { generateId } from '@/utils/format';
import { decreaseStock, increaseStock } from '@/api/products';

export interface SaleInput {
  product_id: string;
  sold_color: string;
  sold_size: string;
  quantity: number;
  unit_price: number;
  sold_at: string;
}

/**
 * 查询销售记录（关联商品信息）
 */
export async function fetchSales(user: AppUser): Promise<Sale[]> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('sales')
      .select('*, product:products(*)')
      .eq('user_id', user.id)
      .order('sold_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Sale[];
  }

  const sales = await localDb.sales.where('user_id').equals(user.id).toArray();
  const products = await localDb.products.where('user_id').equals(user.id).toArray();
  return sales.map((s) => ({
    ...s,
    product: products.find((p) => p.id === s.product_id),
  }));
}

/**
 * 创建销售记录并扣减对应颜色尺码的库存
 *
 * 先校验目标颜色与尺码库存是否充足，不足则抛出错误。
 * 成功后调用 decreaseStock 精确扣减指定规格的库存。
 */
export async function createSale(
  user: AppUser,
  input: SaleInput,
  product: Product
): Promise<Sale> {
  // 校验指定颜色与尺码库存
  const colorItem = product.sizes.find((c) => c.color === input.sold_color);
  const sizeItem = colorItem?.sizes.find((s) => s.size === input.sold_size);
  if (!colorItem || !sizeItem || sizeItem.stock < input.quantity) {
    throw new Error(`「${input.sold_color}/${input.sold_size}」库存不足，无法完成销售`);
  }

  const profit = (input.unit_price - product.cost_price) * input.quantity;
  const sale: Sale = {
    id: generateId(),
    user_id: user.id,
    product_id: input.product_id,
    created_by: user.id,
    quantity: input.quantity,
    unit_price: input.unit_price,
    cost_price: product.cost_price,
    profit,
    sold_at: input.sold_at,
    sold_color: input.sold_color,
    sold_size: input.sold_size,
  };

  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('sales').insert(sale).select().single();
    if (error) throw new Error(error.message);
    await decreaseStock(user, input.product_id, input.sold_color, input.sold_size, input.quantity);
    return data as Sale;
  }

  await localDb.sales.add(sale);
  await decreaseStock(user, input.product_id, input.sold_color, input.sold_size, input.quantity);
  return sale;
}

/**
 * 删除销售记录并回滚对应颜色尺码的库存
 *
 * 先删除销售记录，再将数量回加到对应颜色尺码的库存中。
 * 若关联商品已被删除（product_id 为 null），则无需回滚库存。
 */
export async function deleteSale(user: AppUser, saleId: string): Promise<Sale | null> {
  if (isSupabaseConfigured) {
    const { data: sale } = await supabase
      .from('sales')
      .select('*')
      .eq('id', saleId)
      .eq('user_id', user.id)
      .single();
    if (!sale) throw new Error('记录不存在');

    const { error } = await supabase.from('sales').delete().eq('id', saleId).eq('user_id', user.id);
    if (error) throw new Error(error.message);

    // 商品仍存在时才回滚库存
    if (sale.product_id) {
      await increaseStock(user, sale.product_id, sale.sold_color, sale.sold_size, sale.quantity);
    }
    return sale as Sale;
  }

  const sale = await localDb.sales
    .where('id')
    .equals(saleId)
    .and((s) => s.user_id === user.id)
    .first();
  if (!sale) throw new Error('记录不存在或无权删除');
  await localDb.sales.delete(saleId);

  // 商品仍存在时才回滚库存
  if (sale.product_id) {
    await increaseStock(user, sale.product_id, sale.sold_color, sale.sold_size, sale.quantity);
  }
  return sale;
}
