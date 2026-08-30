/**
 * 商品分类管理页面
 *
 * 支持分类的新增和删除。删除前会校验该分类下是否还有关联商品，
 * 有则阻止删除并提示用户先迁移商品。
 */

import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import { createCategory, deleteCategory } from '@/api/categories';
import { categorySchema } from '@/utils/validation';
import { useToast } from '@/components/ui/Toast';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Empty } from '@/components/Empty';
import { Category } from '@/types';

export function CategoriesPage() {
  const user = useAuthStore((state) => state.user);
  const { categories, products, loadAll, isLoaded } = useDataStore();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user && !isLoaded) {
      loadAll(user).catch((err) => showToast(err instanceof Error ? err.message : '加载失败', 'error'));
    }
  }, [user, isLoaded, loadAll, showToast]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;

    const result = categorySchema.safeParse({ name });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? '名称格式不正确');
      return;
    }

    setIsSubmitting(true);
    try {
      const category = await createCategory(user, result.data);
      useDataStore.getState().addCategory(category);
      setName('');
      showToast('分类已添加', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '添加失败', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!user || !deleteTarget) return;

    const relatedCount = products.filter((p) => p.category_id === deleteTarget.id).length;
    if (relatedCount > 0) {
      showToast('该分类下还有商品，无法删除', 'error');
      setDeleteTarget(null);
      return;
    }

    setIsDeleting(true);
    try {
      await deleteCategory(user, deleteTarget.id);
      useDataStore.getState().removeCategory(deleteTarget.id);
      showToast('分类已删除', 'success');
      setDeleteTarget(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '删除失败', 'error');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">分类管理</h1>

      <form onSubmit={handleSubmit} className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <Input
            label="新增分类"
            placeholder="例如：T恤、外套、裤子"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            error={error}
          />
        </div>
        <Button type="submit" className="sm:self-end" isLoading={isSubmitting}>
          <Plus className="h-4 w-4" />
          添加
        </Button>
      </form>

      {categories.length === 0 ? (
        <Empty title="暂无分类" description="添加分类后可在商品管理中使用" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => {
            const count = products.filter((p) => p.category_id === category.id).length;
            return (
              <div key={category.id} className="card flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-charcoal">{category.name}</h4>
                  <p className="mt-1 text-xs text-stone-500">{count} 件商品</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-terracotta hover:bg-terracotta/10"
                  onClick={() => setDeleteTarget(category)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="删除分类"
        description={`确定要删除分类「${deleteTarget?.name}」吗？`}
        confirmText="删除"
        isLoading={isDeleting}
      />
    </div>
  );
}
