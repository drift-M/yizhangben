/**
 * 商品管理页面
 *
 * 支持商品列表查看、搜索、分类筛选、新增/编辑弹窗（含图片上传和颜色尺码库存管理）、
 * 删除二次确认。每个商品以型号为核心，可按颜色分组配置多个尺码及各尺码库存数量。
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, Pencil, Trash2, X, Image as ImageIcon } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import { createProduct, updateProduct, deleteProduct } from '@/api/products';
import { productSchema, ProductForm } from '@/utils/validation';
import { formatCurrency, getTotalStock } from '@/utils/format';
import { useToast } from '@/components/ui/Toast';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Empty } from '@/components/Empty';
import { Product, ProductColor } from '@/types';

const emptyForm: ProductForm = {
  name: '',
  model: '',
  image: '',
  sizes: [{ color: '', sizes: [{ size: '', stock: 0 }] }],
  cost_price: 0,
  sale_price: 0,
};

/**
 * 将图片文件压缩并转为 data URL
 *
 * 最大尺寸 800px，JPEG 质量 0.8，以控制 IndexedDB 存储占用。
 */
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 800;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height / width) * maxDim);
            width = maxDim;
          } else {
            width = Math.round((width / height) * maxDim);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('无法处理图片'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsDataURL(file);
  });
}

/**
 * 将商品的颜色尺码结构转换为表单可用的 ProductColor 数组
 *
 * 若商品没有任何颜色规格，则返回一个默认空颜色项。
 */
function productColorsToForm(colors: ProductColor[]): ProductColor[] {
  if (colors.length === 0) {
    return [{ color: '', sizes: [{ size: '', stock: 0 }] }];
  }
  return colors.map((c) => ({
    color: c.color,
    sizes: c.sizes.length > 0 ? c.sizes.map((s) => ({ size: s.size, stock: s.stock })) : [{ size: '', stock: 0 }],
  }));
}

/**
 * 清理表单中为空的颜色和尺码项
 *
 * 只保留有颜色名称的颜色项，且每个颜色下只保留有尺码名称的尺码项。
 */
function cleanFormColors(colors: ProductColor[]): ProductColor[] {
  return colors
    .filter((c) => c.color.trim() !== '')
    .map((c) => ({
      color: c.color.trim(),
      sizes: c.sizes.filter((s) => s.size.trim() !== '').map((s) => ({ size: s.size.trim(), stock: s.stock })),
    }))
    .filter((c) => c.sizes.length > 0);
}

export function ProductsPage() {
  const user = useAuthStore((state) => state.user);
  const { products, loadAll, isLoaded } = useDataStore();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user && !isLoaded) {
      loadAll(user).catch((err) => showToast(err instanceof Error ? err.message : '加载失败', 'error'));
    }
  }, [user, isLoaded, loadAll, showToast]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const q = search.toLowerCase();
      const matchSize = product.sizes.some((c) =>
        c.sizes.some((s) => s.size.toLowerCase().includes(q))
      );
      const matchColor = product.sizes.some((c) => c.color.toLowerCase().includes(q));
      return (
        product.name.toLowerCase().includes(q) ||
        product.model.toLowerCase().includes(q) ||
        matchSize ||
        matchColor
      );
    });
  }, [products, search]);

  function openCreateModal() {
    setEditingProduct(null);
    setForm({ ...emptyForm, sizes: [{ color: '', sizes: [{ size: '', stock: 0 }] }] });
    setErrors({});
    setIsModalOpen(true);
  }

  function openEditModal(product: Product) {
    setEditingProduct(product);
    setForm({
      name: product.name,
      model: product.model,
      image: product.image,
      sizes: productColorsToForm(product.sizes),
      cost_price: product.cost_price,
      sale_price: product.sale_price,
    });
    setErrors({});
    setIsModalOpen(true);
  }

  function handleChange(field: keyof ProductForm, value: string | number | null) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function updateColorName(colorIndex: number, value: string) {
    setForm((prev) => ({
      ...prev,
      sizes: prev.sizes.map((c, i) => (i === colorIndex ? { ...c, color: value } : c)),
    }));
  }

  function addColorRow() {
    setForm((prev) => ({
      ...prev,
      sizes: [...prev.sizes, { color: '', sizes: [{ size: '', stock: 0 }] }],
    }));
  }

  function removeColorRow(colorIndex: number) {
    if (form.sizes.length <= 1) return;
    setForm((prev) => ({
      ...prev,
      sizes: prev.sizes.filter((_, i) => i !== colorIndex),
    }));
  }

  function updateSizeRow(
    colorIndex: number,
    sizeIndex: number,
    field: 'size' | 'stock',
    value: string | number
  ) {
    setForm((prev) => ({
      ...prev,
      sizes: prev.sizes.map((c, ci) => {
        if (ci !== colorIndex) return c;
        return {
          ...c,
          sizes: c.sizes.map((s, si) => (si === sizeIndex ? { ...s, [field]: value } : s)),
        };
      }),
    }));
  }

  function addSizeRow(colorIndex: number) {
    setForm((prev) => ({
      ...prev,
      sizes: prev.sizes.map((c, ci) => {
        if (ci !== colorIndex) return c;
        return { ...c, sizes: [...c.sizes, { size: '', stock: 0 }] };
      }),
    }));
  }

  function removeSizeRow(colorIndex: number, sizeIndex: number) {
    setForm((prev) => ({
      ...prev,
      sizes: prev.sizes.map((c, ci) => {
        if (ci !== colorIndex) return c;
        if (c.sizes.length <= 1) return c;
        return { ...c, sizes: c.sizes.filter((_, si) => si !== sizeIndex) };
      }),
    }));
  }

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('图片大小不能超过 5MB', 'error');
      return;
    }

    try {
      const dataUrl = await compressImage(file);
      setForm((prev) => ({ ...prev, image: dataUrl }));
    } catch {
      showToast('图片处理失败', 'error');
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;

    // 过滤掉空的颜色和尺码项后校验
    const cleanedForm = {
      ...form,
      sizes: cleanFormColors(form.sizes),
    };

    const result = productSchema.safeParse(cleanedForm);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path.join('.')] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingProduct) {
        const updated = await updateProduct(user, editingProduct.id, result.data);
        useDataStore.getState().updateProduct(updated);
        showToast('商品信息已更新', 'success');
      } else {
        const created = await createProduct(user, result.data);
        useDataStore.getState().addProduct(created);
        showToast('商品已添加', 'success');
      }
      setIsModalOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '操作失败', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!user || !deleteTarget) return;

    setIsDeleting(true);
    try {
      await deleteProduct(user, deleteTarget.id);
      useDataStore.getState().removeProduct(deleteTarget.id);
      // 关联销售记录保留，但 product_id 已置空，本地 store 同步更新
      useDataStore.getState().setSales(
        useDataStore.getState().sales.map((s) =>
          s.product_id === deleteTarget.id ? { ...s, product_id: null } : s
        )
      );
      showToast('商品已删除', 'success');
      setDeleteTarget(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '删除失败', 'error');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="page-title">商品管理</h1>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4" />
          新增商品
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="搜索名称、型号、颜色、尺码"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input w-full pl-10"
          />
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <Empty title="暂无商品" description="点击右上角按钮添加您的第一款服装商品" />
      ) : (
        <>
          {/* 桌面端表格 */}
          <div className="hidden overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-soft md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-stone-600">
                <tr>
                  <th className="px-5 py-3 font-medium">商品</th>
                  <th className="px-5 py-3 font-medium">型号</th>
                  <th className="px-5 py-3 font-medium">进价/售价</th>
                  <th className="px-5 py-3 font-medium">颜色尺码库存</th>
                  <th className="px-5 py-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredProducts.map((product) => {
                  const totalStock = getTotalStock(product.sizes);
                  return (
                    <tr key={product.id} className="hover:bg-stone-50/50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-100">
                              <ImageIcon className="h-5 w-5 text-stone-400" />
                            </div>
                          )}
                          <span className="font-medium text-charcoal">{product.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-stone-600">{product.model}</td>
                      <td className="px-5 py-3">
                        <div className="text-stone-600">{formatCurrency(product.cost_price)}</div>
                        <div className="font-medium text-charcoal">{formatCurrency(product.sale_price)}</div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="space-y-1.5">
                          {product.sizes.map((c) => (
                            <div key={c.color}>
                              <span className="text-xs font-medium text-stone-600">{c.color}</span>
                              <div className="mt-0.5 flex flex-wrap gap-1">
                                {c.sizes.map((s) => (
                                  <span
                                    key={`${c.color}-${s.size}`}
                                    className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                                      s.stock === 0
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-stone-100 text-stone-700'
                                    }`}
                                  >
                                    {s.size}: {s.stock}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="mt-1 text-xs text-stone-500">共 {totalStock} 件</p>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEditModal(product)}>
                          <Pencil className="h-4 w-4" />
                          编辑
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-terracotta hover:bg-terracotta/10"
                          onClick={() => setDeleteTarget(product)}
                        >
                          <Trash2 className="h-4 w-4" />
                          删除
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 移动端卡片 */}
          <div className="space-y-3 md:hidden">
            {filteredProducts.map((product) => {
              const totalStock = getTotalStock(product.sizes);
              return (
                <div key={product.id} className="card">
                  <div className="flex items-start gap-3">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="h-16 w-16 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-stone-100">
                        <ImageIcon className="h-8 w-8 text-stone-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-charcoal">{product.name}</h4>
                      <p className="text-xs text-stone-500">{product.model}</p>
                      <div className="mt-2 space-y-1">
                        {product.sizes.map((c) => (
                          <div key={c.color}>
                            <span className="text-xs font-medium text-stone-600">{c.color}</span>
                            <div className="mt-0.5 flex flex-wrap gap-1">
                              {c.sizes.map((s) => (
                                <span
                                  key={`${c.color}-${s.size}`}
                                  className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                                    s.stock === 0
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-stone-100 text-stone-700'
                                  }`}
                                >
                                  {s.size}: {s.stock}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-stone-500">售价</p>
                      <p className="font-medium">{formatCurrency(product.sale_price)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-stone-500">进价</p>
                      <p className="text-stone-600">{formatCurrency(product.cost_price)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-stone-500">总库存</p>
                      <p className={totalStock === 0 ? 'font-semibold text-terracotta' : ''}>{totalStock}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="secondary" size="sm" className="flex-1" onClick={() => openEditModal(product)}>
                      <Pencil className="h-4 w-4" />
                      编辑
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      className="flex-1"
                      onClick={() => setDeleteTarget(product)}
                    >
                      <Trash2 className="h-4 w-4" />
                      删除
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* 新增/编辑弹窗 */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? '编辑商品' : '新增商品'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              取消
            </Button>
            <Button type="submit" form="product-form" isLoading={isSubmitting}>
              {editingProduct ? '保存修改' : '立即添加'}
            </Button>
          </>
        }
      >
        <form id="product-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="商品名称"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              error={errors.name}
              required
            />
            <Input
              label="型号"
              value={form.model}
              onChange={(e) => handleChange('model', e.target.value)}
              error={errors.model}
              required
            />
          </div>

          {/* 图片上传 */}
          <div>
            <label className="label">商品图片</label>
            <div className="flex items-center gap-4">
              {form.image ? (
                <div className="relative">
                  <img src={form.image} alt="预览" className="h-20 w-20 rounded-xl object-cover" />
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, image: '' }))}
                    className="absolute -right-2 -top-2 rounded-full bg-stone-800 p-1 text-white hover:bg-stone-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed border-stone-300 text-stone-400 transition-colors hover:border-terracotta hover:text-terracotta"
                >
                  <ImageIcon className="h-8 w-8" />
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              <p className="text-xs text-stone-500">点击上传图片，支持 JPG/PNG，最大 5MB</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              type="number"
              label="进价"
              value={String(form.cost_price)}
              onChange={(e) => handleChange('cost_price', Number(e.target.value))}
              error={errors.cost_price}
              required
            />
            <Input
              type="number"
              label="售价"
              value={String(form.sale_price)}
              onChange={(e) => handleChange('sale_price', Number(e.target.value))}
              error={errors.sale_price}
              required
            />
          </div>

          {/* 颜色尺码库存 */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="label mb-0">颜色与尺码库存</label>
              <Button type="button" variant="ghost" size="sm" onClick={addColorRow}>
                <Plus className="h-3 w-3" />
                添加颜色
              </Button>
            </div>
            {errors.sizes && (
              <p className="mb-2 text-xs text-terracotta">{errors.sizes}</p>
            )}
            <div className="space-y-3">
              {form.sizes.map((colorItem, colorIndex) => (
                <div
                  key={colorIndex}
                  className="rounded-xl border border-stone-200 bg-stone-50/50 p-3"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Input
                      placeholder="颜色（如 红色）"
                      value={colorItem.color}
                      onChange={(e) => updateColorName(colorIndex, e.target.value)}
                      className="flex-1"
                      error={errors[`sizes.${colorIndex}.color`]}
                    />
                    {form.sizes.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-terracotta"
                        onClick={() => removeColorRow(colorIndex)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {colorItem.sizes.map((sizeItem, sizeIndex) => (
                      <div key={sizeIndex} className="flex items-center gap-2">
                        <Input
                          placeholder="尺码（如 S/M/L）"
                          value={sizeItem.size}
                          onChange={(e) =>
                            updateSizeRow(colorIndex, sizeIndex, 'size', e.target.value)
                          }
                          className="flex-1"
                          error={errors[`sizes.${colorIndex}.sizes.${sizeIndex}.size`]}
                        />
                        <Input
                          type="number"
                          placeholder="库存"
                          value={String(sizeItem.stock)}
                          onChange={(e) =>
                            updateSizeRow(colorIndex, sizeIndex, 'stock', Number(e.target.value))
                          }
                          className="w-28"
                          error={errors[`sizes.${colorIndex}.sizes.${sizeIndex}.stock`]}
                        />
                        {colorItem.sizes.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="shrink-0 text-terracotta"
                            onClick={() => removeSizeRow(colorIndex, sizeIndex)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => addSizeRow(colorIndex)}
                  >
                    <Plus className="h-3 w-3" />
                    添加尺码
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </form>
      </Modal>

      {/* 删除确认 */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="删除商品"
        description={`确定要删除商品「${deleteTarget?.name}」吗？关联的销售记录会保留，但不再关联到此商品。`}
        confirmText="删除"
        isLoading={isDeleting}
      />
    </div>
  );
}
