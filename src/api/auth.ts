/**
 * 用户认证 API
 *
 * 同时支持 Supabase Auth 与本地离线演示模式。
 * 本地模式下，密码使用 SHA-256 加盐哈希后存储，避免明文保存敏感信息。
 *
 * 员工模块已移除，所有注册用户均为店主，拥有完整数据访问权限。
 */

import { supabase, isSupabaseConfigured, getAuthErrorMessage } from '@/lib/supabase';
import { AppUser } from '@/types';
import { generateId } from '@/utils/format';

const LOCAL_USERS_KEY = 'clothing_ledger_local_users';
const LOCAL_SESSION_KEY = 'clothing_ledger_session';
const REMEMBER_KEY = 'clothing_ledger_remember';

interface LocalUser {
  id: string;
  email: string;
  password: string;
  salt: string;
  displayName: string;
}

/**
 * 生成随机盐值（hex 字符串）
 */
function generateSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * 将密码与盐值进行 SHA-256 哈希，返回 hex 字符串
 */
async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(salt + password));
  const hashArray = Array.from(new Uint8Array(buffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 校验用户输入的密码是否与存储的加盐哈希一致
 */
async function verifyPassword(
  password: string,
  storedHash: string,
  salt: string
): Promise<boolean> {
  const inputHash = await hashPassword(password, salt);
  return inputHash === storedHash;
}

function getLocalUsers(): LocalUser[] {
  const raw = localStorage.getItem(LOCAL_USERS_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveLocalUsers(users: LocalUser[]): void {
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
}

function toAppUser(user: LocalUser): AppUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
  };
}

/**
 * 注册账号
 */
export async function register(
  email: string,
  password: string,
  displayName: string
): Promise<AppUser> {
  if (isSupabaseConfigured) {
    // 先使用 Supabase Auth 注册账号
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
      },
    });
    if (signUpError) throw new Error(getAuthErrorMessage(signUpError));
    if (!signUpData.user) throw new Error('注册失败，请稍后重试');

    // 注册成功后立即登录，确保当前会话有效，避免邮箱确认导致无法操作数据
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      // 如果登录失败，可能是因为 Supabase 开启了邮箱确认
      throw new Error(
        '注册成功但无法自动登录。请在 Supabase 控制台关闭 "Confirm email"，或前往邮箱点击确认链接后再登录。'
      );
    }
    if (!signInData.user) throw new Error('登录失败');

    return {
      id: signInData.user.id,
      email: signInData.user.email ?? email,
      displayName,
    };
  }

  // 本地模式
  const users = getLocalUsers();
  if (users.some((u) => u.email === email)) {
    throw new Error('该邮箱已注册');
  }
  const salt = generateSalt();
  const passwordHash = await hashPassword(password, salt);
  const newUser: LocalUser = {
    id: generateId(),
    email,
    password: passwordHash,
    salt,
    displayName,
  };
  users.push(newUser);
  saveLocalUsers(users);
  localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(toAppUser(newUser)));
  return toAppUser(newUser);
}

/**
 * 登录账号
 */
export async function login(
  email: string,
  password: string,
  remember: boolean
): Promise<AppUser> {
  localStorage.setItem(REMEMBER_KEY, String(remember));

  if (isSupabaseConfigured) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(getAuthErrorMessage(error));
    if (!data.user) throw new Error('登录失败');

    const displayName = (data.user.user_metadata?.display_name as string) ?? email;
    return {
      id: data.user.id,
      email: data.user.email ?? email,
      displayName,
    };
  }

  // 本地模式
  const users = getLocalUsers();
  const user = users.find((u) => u.email === email);
  if (!user) throw new Error('邮箱或密码错误');

  // 兼容旧版无盐值的账户：若 salt 为空则用旧方式校验
  const salt = user.salt ?? '';
  const isValid = salt
    ? await verifyPassword(password, user.password, salt)
    : (await hashPassword(password, '')) === user.password;

  if (!isValid) throw new Error('邮箱或密码错误');

  localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(toAppUser(user)));
  return toAppUser(user);
}

/**
 * 退出登录
 */
export async function logout(): Promise<void> {
  if (isSupabaseConfigured) {
    await supabase.auth.signOut();
  }
  localStorage.removeItem(LOCAL_SESSION_KEY);
}

/**
 * 发送密码重置邮件
 */
export async function sendPasswordReset(email: string): Promise<void> {
  if (isSupabaseConfigured) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw new Error(getAuthErrorMessage(error));
    return;
  }

  // 本地模式模拟
  const users = getLocalUsers();
  if (!users.some((u) => u.email === email)) {
    throw new Error('该邮箱未注册');
  }
}

/**
 * 更新密码
 */
export async function updatePassword(newPassword: string): Promise<void> {
  if (isSupabaseConfigured) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(getAuthErrorMessage(error));
    return;
  }
  throw new Error('本地模式不支持在线重置密码，请重新注册账号');
}

/**
 * 获取当前会话用户
 */
export async function getCurrentUser(): Promise<AppUser | null> {
  if (isSupabaseConfigured) {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    const meta = data.user.user_metadata ?? {};
    return {
      id: data.user.id,
      email: data.user.email ?? '',
      displayName: (meta.display_name as string) ?? data.user.email ?? '',
    };
  }

  const raw = localStorage.getItem(LOCAL_SESSION_KEY);
  return raw ? (JSON.parse(raw) as AppUser) : null;
}

/**
 * 是否勾选了"记住我"
 */
export function shouldRemember(): boolean {
  return localStorage.getItem(REMEMBER_KEY) === 'true';
}
