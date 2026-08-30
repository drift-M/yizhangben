/**
 * 系统设置 API
 *
 * 管理用户的应用配置，当前仅支持自动备份开关。
 * 支持 Supabase 云端和本地 IndexedDB 双模式持久化。
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { localDb } from '@/lib/localDb';
import { AppSetting, AppUser } from '@/types';

export type SettingInput = Pick<AppSetting, 'auto_backup'>;

/**
 * 获取当前用户设置
 *
 * 若用户尚未保存过设置，则返回默认配置。
 */
export async function fetchSettings(user: AppUser): Promise<AppSetting> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', user.id)
      .single();
    if (error && error.code !== 'PGRST116') throw new Error(error.message);
    return (data as AppSetting) ?? { user_id: user.id, auto_backup: false };
  }

  const setting = await localDb.settings.where('user_id').equals(user.id).first();
  return setting ?? { user_id: user.id, auto_backup: false };
}

/**
 * 更新设置
 *
 * Supabase 模式下使用 upsert 确保幂等性（首次保存即创建，后续更新）。
 */
export async function updateSettings(user: AppUser, input: SettingInput): Promise<AppSetting> {
  const payload: AppSetting = {
    user_id: user.id,
    ...input,
  };

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('settings')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as AppSetting;
  }

  await localDb.settings.put(payload);
  return payload;
}
