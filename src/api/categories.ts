/**
 * 商品分类 API
 *
 * 提供分类的查询、创建和删除功能。
 * 删除分类前需确保该分类下没有关联商品（由调用方校验）。
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { localDb } from '@/lib/localDb';
import { Category, AppUser } from '@/types';
import { generateId } from '@/utils/format';

export type CategoryInput = Pick<Category, 'name'>;

/**
 * 查询分类列表
 */
export async function fetchCategories(user: AppUser): Promise<Category[]> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Category[];
  }

  return localDb.categories.where('user_id').equals(user.id).toArray();
}

/**
 * 创建分类
 */
export async function createCategory(user: AppUser, input: CategoryInput): Promise<Category> {
  const payload: Category = {
    id: generateId(),
    user_id: user.id,
    name: input.name,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('categories').insert(payload).select().single();
    if (error) throw new Error(error.message);
    return data as Category;
  }

  await localDb.categories.add(payload);
  return payload;
}

/**
 * 删除分类
 */
export async function deleteCategory(user: AppUser, id: string): Promise<void> {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('categories').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw new Error(error.message);
    return;
  }
  const category = await localDb.categories
    .where('id')
    .equals(id)
    .and((c) => c.user_id === user.id)
    .first();
  if (!category) throw new Error('分类不存在或无权删除');
  await localDb.categories.delete(id);
}
