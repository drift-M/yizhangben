/**
 * 数据备份与恢复工具
 *
 * 支持将 IndexedDB 中的完整用户数据导出为 JSON 文件，
 * 以及从 JSON 文件恢复数据。备份版本号用于未来格式升级。
 */

import { localDb } from '@/lib/localDb';
import { BackupData, AppUser } from '@/types';
import { generateId } from '@/utils/format';

/** 备份格式版本：v3 对应商品颜色→尺码二级结构 + sold_color 字段 */
const BACKUP_VERSION = '3.0';

/**
 * 导出当前用户的全部本地数据为 JSON 对象
 */
export async function exportBackup(user: AppUser): Promise<BackupData> {
  const [categories, products, sales, settings] = await Promise.all([
    localDb.categories.where('user_id').equals(user.id).toArray(),
    localDb.products.where('user_id').equals(user.id).toArray(),
    localDb.sales.where('user_id').equals(user.id).toArray(),
    localDb.settings.where('user_id').equals(user.id).toArray(),
  ]);

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    userId: user.id,
    categories,
    products,
    sales,
    settings: settings[0] ?? null,
  };
}

/**
 * 下载备份文件为 JSON
 *
 * 文件名包含日期便于区分多次备份。
 */
export function downloadBackup(data: BackupData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `衣账本备份-${new Date().toLocaleDateString('zh-CN')}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * 从文件读取备份 JSON
 *
 * 校验文件是否包含 version 和 userId 字段，不合法时抛出错误。
 */
export function readBackupFile(file: File): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as BackupData;
        if (!data.version || !data.userId) {
          throw new Error('备份文件格式不正确');
        }
        resolve(data);
      } catch (err) {
        reject(err instanceof Error ? err : new Error('解析备份文件失败'));
      }
    };
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsText(file);
  });
}

/**
 * 将备份数据恢复到本地数据库
 *
 * 会覆盖当前用户同名记录，并将备份数据中的 user_id 替换为当前用户 ID。
 */
export async function importBackup(data: BackupData, currentUser: AppUser): Promise<void> {
  const targetUserId = currentUser.id;

  await localDb.transaction(
    'rw',
    [localDb.categories, localDb.products, localDb.sales, localDb.settings],
    async () => {
      // 清除当前用户旧数据
      await Promise.all([
        localDb.categories.where('user_id').equals(targetUserId).delete(),
        localDb.products.where('user_id').equals(targetUserId).delete(),
        localDb.sales.where('user_id').equals(targetUserId).delete(),
      ]);

      // 写入备份数据并切换 user_id
      if (data.categories.length) {
        await localDb.categories.bulkAdd(
          data.categories.map((c) => ({ ...c, user_id: targetUserId }))
        );
      }
      if (data.products.length) {
        await localDb.products.bulkAdd(
          data.products.map((p) => ({ ...p, user_id: targetUserId, id: p.id || generateId() }))
        );
      }
      if (data.sales.length) {
        await localDb.sales.bulkAdd(
          data.sales.map((s) => ({ ...s, user_id: targetUserId, id: s.id || generateId() }))
        );
      }
      if (data.settings) {
        await localDb.settings.put({ ...data.settings, user_id: targetUserId });
      }
    }
  );
}

/**
 * 执行自动本地备份（若用户开启了自动备份设置）
 */
export async function runAutoBackup(user: AppUser): Promise<void> {
  const settings = await localDb.settings.where('user_id').equals(user.id).first();
  if (!settings?.auto_backup) return;

  const data = await exportBackup(user);
  localStorage.setItem(`clothing_ledger_auto_backup_${user.id}`, JSON.stringify(data));
}

/**
 * 读取自动备份缓存
 */
export function getAutoBackup(userId: string): BackupData | null {
  const raw = localStorage.getItem(`clothing_ledger_auto_backup_${userId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as BackupData;
  } catch {
    return null;
  }
}
