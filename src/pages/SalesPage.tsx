/**
 * 销售与财务管理页面
 *
 * 展示今日营收概览、销售记录列表，并支持新增销售与删除回滚。
 * 销售记录关联具体商品、颜色和尺码，库存按颜色尺码精确扣减。
 */

import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown, Receipt } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import { createSale, deleteSale } from '@/api/sales';
import { saleSchema, SaleForm } from '@/utils/validation';
import { formatCurrency, formatDateTime, getTotalStock, toLocalInputValue } from '@/utils/format';
import { filterSalesByRange } from '@/api/reports';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Empty } from '@/components/Empty';
import { Sale } from '@/types';

export function SalesPage() {
  const user = useAuthStore((state) => state.user);
  const { products, sales, loadAll } = useDataStore();
  const { showToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<SaleForm>({
    product_id: '',
    sold_color: '',
    sold_size: '',
    quantity: 1,
    unit_price: 0,
    sold_at: toLocalInputValue(new Date()),
  });
  const [errors, setErrors] = useState<Partial<Record<keyof SaleForm, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Sale | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      loadAll(user).catch((err) => showToast(err instanceof Error ? err.message : '加载失败', 'error'));
    }
  }, [user, loadAll, showToast]);

  const todayStats = useMemo(() => {
    const todaySales = filterSalesByRange(sales, { range: 'day' });
    return todaySales.reduce(
      (acc, sale) => {
        acc.revenue += sale.unit_price * sale.quantity;
        acc.cost += sale.cost_price * sale.quantity;
        acc.profit += sale.profit;
        acc.orders += 1;
        return acc;
      },
      { revenue: 0, cost: 0, profit: 0, orders: 0 }
    );
  }, [sales]);

  const productOptions = useMemo(
    () =>
      products.map((p) => ({
        value: p.id,
        label: `${p.name}（${p.model}）`,
      })),
    [products]
  );

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === form.product_id),
    [products, form.product_id]
  );

  const colorOptions = useMemo(() => {
    if (!selectedProduct) return [];
    return selectedProduct.sizes.map((c) => ({
      value: c.color,
      label: `${c.color}（库存 ${c.sizes.reduce((sum, s) => sum + s.stock, 0)}）`,
    }));
  }, [selectedProduct]);

  const selectedColor = useMemo(
    () => selectedProduct?.sizes.find((c) => c.color === form.sold_color),
    [selectedProduct, form.sold_color]
  );

  const sizeOptions = useMemo(() => {
    if (!selectedColor) return [];
    return selectedColor.sizes.map((s) => ({
      value: s.size,
      label: `${s.size}（库存 ${s.stock}）`,
    }));
  }, [selectedColor]);

  const selectedSizeStock = useMemo(() => {
    if (!selectedColor) return 0;
    const size = selectedColor.sizes.find((s) => s.size === form.sold_size);
    return size?.stock ?? 0;
  }, [selectedColor, form.sold_size]);

  function openModal() {
    const defaultProduct = products[0];
    const defaultColor = defaultProduct?.sizes[0]?.color ?? '';
    const defaultSize = defaultProduct?.sizes[0]?.sizes[0]?.size ?? '';
    setForm({
      product_id: defaultProduct?.id ?? '',
      sold_color: defaultColor,
      sold_size: defaultSize,
      quantity: 1,
      unit_price: defaultProduct?.sale_price ?? 0,
      sold_at: toLocalInputValue(new Date()),
    });
    setErrors({});
    setIsModalOpen(true);
  }

  function handleChange(field: keyof SaleForm, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function handleProductChange(value: string) {
    const product = products.find((p) => p.id === value);
    const defaultColor = product?.sizes[0]?.color ?? '';
    const defaultSize = product?.sizes[0]?.sizes[0]?.size ?? '';
    setForm((prev) => ({
      ...prev,
      product_id: value,
      sold_color: defaultColor,
      sold_size: defaultSize,
      unit_price: product?.sale_price ?? prev.unit_price,
    }));
    setErrors((prev) => ({ ...prev, product_id: undefined }));
  }

  function handleColorChange(value: string) {
    const colorItem = selectedProduct?.sizes.find((c) => c.color === value);
    const defaultSize = colorItem?.sizes[0]?.size ?? '';
    setForm((prev) => ({
      ...prev,
      sold_color: value,
      sold_size: defaultSize,
    }));
    setErrors((prev) => ({ ...prev, sold_color: undefined }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !selectedProduct) return;

    // 输入框是本地时间（无时区），转为带时区的 ISO 时刻再保存，
    // 否则数据库会按 UTC 解释本地时间，导致显示比北京时间多 8 小时
    const payload: SaleForm = {
      ...form,
      sold_at: new Date(form.sold_at).toISOString(),
    };

    const result = saleSchema.safeParse(payload);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof SaleForm, string>> = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0] as keyof SaleForm;
        fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    const colorItem = selectedProduct.sizes.find((c) => c.color === form.sold_color);
    const sizeItem = colorItem?.sizes.find((s) => s.size === form.sold_size);
    if (!colorItem || !sizeItem || sizeItem.stock < form.quantity) {
      setErrors({ quantity: '库存不足' });
      return;
    }

    setIsSubmitting(true);
    try {
      const sale = await createSale(user, result.data, selectedProduct);
      useDataStore.getState().addSale(sale);

      const updatedColors = selectedProduct.sizes.map((c) => {
        if (c.color !== form.sold_color) return c;
        return {
          ...c,
          sizes: c.sizes.map((s) => {
            if (s.size !== form.sold_size) return s;
            return { ...s, stock: s.stock - form.quantity };
          }),
        };
      });
      const updatedProduct = { ...selectedProduct, sizes: updatedColors };
      useDataStore.getState().updateProduct(updatedProduct);

      showToast('销售记录已添加', 'success');
      setIsModalOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '添加失败', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!user || !deleteTarget) return;

    setIsDeleting(true);
    try {
      await deleteSale(user, deleteTarget.id);
      useDataStore.getState().setSales(sales.filter((s) => s.id !== deleteTarget.id));

      const product = products.find((p) => p.id === deleteTarget.product_id);
      if (product) {
        const updatedColors = product.sizes.map((c) => {
          if (c.color !== deleteTarget.sold_color) return c;
          return {
            ...c,
            sizes: c.sizes.map((s) => {
              if (s.size !== deleteTarget.sold_size) return s;
              return { ...s, stock: s.stock + deleteTarget.quantity };
            }),
          };
        });
        useDataStore.getState().updateProduct({ ...product, sizes: updatedColors });
      }

      showToast('销售记录已删除，库存已回滚', 'success');
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
        <h1 className="page-title">销售记账</h1>
        <Button onClick={openModal}>
          <Plus className="h-4 w-4" />
          新增销售
        </Button>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="今日销售额" value={formatCurrency(todayStats.revenue)} icon={<Receipt className="h-5 w-5" />} />
        <StatCard title="今日成本" value={formatCurrency(todayStats.cost)} icon={<TrendingDown className="h-5 w-5" />} />
        <StatCard title="今日利润" value={formatCurrency(todayStats.profit)} icon={<TrendingUp className="h-5 w-5" />} variant="accent" />
        <StatCard title="今日订单" value={todayStats.orders} icon={<Receipt className="h-5 w-5" />} />
      </div>

      {sales.length === 0 ? (
        <Empty title="暂无销售记录" description="点击右上角记录第一笔销售" />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-soft md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-stone-600">
                <tr>
                  <th className="px-5 py-3 font-medium">商品</th>
                  <th className="px-5 py-3 font-medium">颜色尺码</th>
                  <th className="px-5 py-3 font-medium">数量</th>
                  <th className="px-5 py-3 font-medium">成交价</th>
                  <th className="px-5 py-3 font-medium">利润</th>
                  <th className="px-5 py-3 font-medium">销售时间</th>
                  <th className="px-5 py-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-stone-50/50">
                    <td className="px-5 py-3">
                      <div className="font-medium text-charcoal">{sale.product?.name ?? '未知商品'}</div>
                      <div className="text-xs text-stone-500">{sale.product?.model}</div>
                    </td>
                    <td className="px-5 py-3 text-stone-600">
                      {sale.sold_color} / {sale.sold_size}
                    </td>
                    <td className="px-5 py-3 text-charcoal">{sale.quantity}</td>
                    <td className="px-5 py-3 text-charcoal">{formatCurrency(sale.unit_price)}</td>
                    <td className="px-5 py-3">
                      <Badge variant={sale.profit >= 0 ? 'success' : 'danger'}>
                        {formatCurrency(sale.profit)}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-stone-600">{formatDateTime(sale.sold_at)}</td>
                    <td className="px-5 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-terracotta hover:bg-terracotta/10"
                        onClick={() => setDeleteTarget(sale)}
                      >
                        <Trash2 className="h-4 w-4" />
                        删除
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {sales.map((sale) => (
              <div key={sale.id} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-charcoal">{sale.product?.name ?? '未知商品'}</h4>
                    <p className="text-xs text-stone-500">
                      {sale.product?.model} · {sale.sold_color}/{sale.sold_size} · {formatDateTime(sale.sold_at)}
                    </p>
                  </div>
                  <Badge variant={sale.profit >= 0 ? 'success' : 'danger'}>
                    利润 {formatCurrency(sale.profit)}
                  </Badge>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-stone-500">数量</p>
                    <p>{sale.quantity}</p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-500">成交价</p>
                    <p>{formatCurrency(sale.unit_price)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-500">销售额</p>
                    <p>{formatCurrency(sale.unit_price * sale.quantity)}</p>
                  </div>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => setDeleteTarget(sale)}
                >
                  <Trash2 className="h-4 w-4" />
                  删除并回滚库存
                </Button>
              </div>
            ))}
          </div>
        </>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="新增销售"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              取消
            </Button>
            <Button type="submit" form="sale-form" isLoading={isSubmitting}>
              确认销售
            </Button>
          </>
        }
      >
        <form id="sale-form" onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="选择商品"
            value={form.product_id}
            onChange={(e) => handleProductChange(e.target.value)}
            options={[
              { value: '', label: '请选择商品' },
              ...productOptions,
            ]}
            error={errors.product_id}
            required
          />

          {selectedProduct && (
            <p className="text-xs text-stone-500">
              总库存：
              <span className="font-medium text-charcoal">
                {getTotalStock(selectedProduct.sizes)}
              </span>
            </p>
          )}

          <Select
            label="选择颜色"
            value={form.sold_color}
            onChange={(e) => handleColorChange(e.target.value)}
            options={[
              { value: '', label: '请选择颜色' },
              ...colorOptions,
            ]}
            error={errors.sold_color}
            required
          />

          <Select
            label="选择尺码"
            value={form.sold_size}
            onChange={(e) => handleChange('sold_size', e.target.value)}
            options={[
              { value: '', label: '请选择尺码' },
              ...sizeOptions,
            ]}
            error={errors.sold_size}
            required
          />

          {form.sold_size && selectedSizeStock > 0 && (
            <p className="text-xs text-stone-500">
              该尺码库存：
              <span className="font-medium text-charcoal">
                {selectedSizeStock}
              </span>
            </p>
          )}

          <Input
            type="number"
            label="数量"
            value={String(form.quantity)}
            onChange={(e) => handleChange('quantity', Number(e.target.value))}
            error={errors.quantity}
            required
          />
          <Input
            type="number"
            label="成交价"
            value={String(form.unit_price)}
            onChange={(e) => handleChange('unit_price', Number(e.target.value))}
            error={errors.unit_price}
            required
          />
          <Input
            type="datetime-local"
            label="销售时间"
            value={form.sold_at}
            onChange={(e) => handleChange('sold_at', e.target.value)}
            error={errors.sold_at}
            required
          />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="删除销售记录"
        description="删除后该笔销售记录将被移除，库存会自动回滚。是否继续？"
        confirmText="删除"
        isLoading={isDeleting}
      />
    </div>
  );
}
