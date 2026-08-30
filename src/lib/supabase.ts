/**
 * Supabase 客户端初始化
 *
 * 本项目默认使用 Supabase 云端存储，以支持多设备、多地区访问。
 * 部署前必须在环境变量中配置 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY。
 * 如需在本地离线体验，可设置 VITE_USE_LOCAL_MODE=true 降级为 IndexedDB 演示模式。
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const forceLocalMode = import.meta.env.VITE_USE_LOCAL_MODE === 'true';

// 默认启用 Supabase 云端模式；仅当显式设置 VITE_USE_LOCAL_MODE=true 时降级本地模式
export const isSupabaseConfigured = !forceLocalMode;

if (isSupabaseConfigured && (!supabaseUrl || !supabaseKey)) {
  throw new Error(
    '当前默认使用 Supabase 云端模式，请在 .env.local 中配置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY；或在本地开发时设置 VITE_USE_LOCAL_MODE=true 启用离线演示模式。'
  );
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl ?? 'http://localhost:54321',
  supabaseKey ?? 'local-fallback-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  },
);

/**
 * 将 Supabase 错误转换为友好的中文提示
 */
export function getAuthErrorMessage(error: { message?: string; code?: string }): string {
  const code = error?.code ?? '';
  const msg = error?.message ?? '';

  if (code === 'invalid_credentials' || msg.includes('Invalid login credentials')) {
    return '邮箱或密码错误，请检查后重试';
  }
  if (code === 'user_not_found') {
    return '该邮箱尚未注册';
  }
  if (code === 'email_exists' || msg.includes('already registered')) {
    return '该邮箱已注册，请直接登录';
  }
  if (code === 'weak_password') {
    return '密码强度不足，请设置至少 6 位密码';
  }
  if (msg.includes('Password should be')) {
    return '密码长度至少为 6 位';
  }
  if (msg.includes('For security purposes')) {
    return '操作过于频繁，请稍后再试';
  }
  return msg || '操作失败，请稍后重试';
}
