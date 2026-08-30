/**
 * 设置与数据备份页面
 *
 * 管理本地自动备份，并手动导出/导入备份文件。
 */

import { useEffect, useRef, useState } from 'react';
import { Cloud, HardDrive, Download, Upload, Save } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import { updateSettings } from '@/api/settings';
import { exportBackup, downloadBackup, readBackupFile, importBackup } from '@/utils/backup';
import { settingSchema, SettingForm } from '@/utils/validation';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const { settings, loadAll } = useDataStore();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<SettingForm>({
    auto_backup: false,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof SettingForm, string>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (user) {
      loadAll(user).catch((err) => showToast(err instanceof Error ? err.message : '加载失败', 'error'));
    }
  }, [user, loadAll, showToast]);

  useEffect(() => {
    if (settings) {
      setForm({
        auto_backup: settings.auto_backup,
      });
    }
  }, [settings]);

  function handleChange(field: keyof SettingForm, value: boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;

    const result = settingSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof SettingForm, string>> = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0] as keyof SettingForm;
        fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSaving(true);
    try {
      const updated = await updateSettings(user, result.data);
      useDataStore.getState().updateSettings(updated);
      showToast('设置已保存', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '保存失败', 'error');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleExport() {
    if (!user) return;
    setIsExporting(true);
    try {
      const data = await exportBackup(user);
      downloadBackup(data);
      showToast('备份文件已下载', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '导出失败', 'error');
    } finally {
      setIsExporting(false);
    }
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setIsImporting(true);
    try {
      const data = await readBackupFile(file);
      await importBackup(data, user);
      await loadAll(user);
      showToast('备份数据已恢复', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '导入失败', 'error');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  return (
    <div>
      <h1 className="page-title">系统设置</h1>

      <Card className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-serif font-semibold text-charcoal">数据存储模式</h2>
            <p className="mt-1 text-sm text-stone-500">
              {isSupabaseConfigured
                ? '当前使用 Supabase 云端数据库，数据实时同步。'
                : '当前使用本地浏览器 IndexedDB 存储，数据保存在本机。'}
            </p>
          </div>
          <Badge variant={isSupabaseConfigured ? 'success' : 'warning'} className="shrink-0">
            {isSupabaseConfigured ? (
              <>
                <Cloud className="mr-1 h-3 w-3" /> 云端
              </>
            ) : (
              <>
                <HardDrive className="mr-1 h-3 w-3" /> 本地
              </>
            )}
          </Badge>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-serif font-semibold text-charcoal">基础设置</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-stone-200 p-4 transition-colors hover:bg-stone-50">
              <input
                type="checkbox"
                className="h-5 w-5 rounded border-stone-300 text-terracotta focus:ring-terracotta"
                checked={form.auto_backup}
                onChange={(e) => handleChange('auto_backup', e.target.checked)}
              />
              <div>
                <p className="font-medium text-charcoal">启用本地自动备份</p>
                <p className="text-xs text-stone-500">开启后，数据将定期缓存到本地存储中</p>
              </div>
            </label>
            <Button type="submit" className="w-full" isLoading={isSaving}>
              <Save className="h-4 w-4" />
              保存设置
            </Button>
          </form>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-serif font-semibold text-charcoal">数据备份与恢复</h2>
          <p className="mb-4 text-sm text-stone-500">
            导出完整数据为 JSON 文件，或从备份文件恢复。恢复操作会覆盖当前账号下的本地数据。
          </p>
          <div className="space-y-3">
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleExport}
              isLoading={isExporting}
            >
              <Download className="h-4 w-4" />
              导出备份
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              isLoading={isImporting}
            >
              <Upload className="h-4 w-4" />
              导入备份
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
