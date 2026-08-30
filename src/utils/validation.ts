/**
 * 表单校验 schema
 *
 * 使用 Zod 定义所有表单的校验规则，确保数据在提交前通过类型和约束校验。
 */

import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, '请输入邮箱').email('邮箱格式不正确'),
  password: z.string().min(6, '密码至少 6 位'),
  remember: z.boolean().optional(),
});

export const registerSchema = z
  .object({
    email: z.string().min(1, '请输入邮箱').email('邮箱格式不正确'),
    password: z.string().min(6, '密码至少 6 位'),
    confirmPassword: z.string().min(1, '请确认密码'),
    displayName: z.string().min(1, '请输入店铺/姓名').max(30, '名称过长'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '两次输入的密码不一致',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, '请输入邮箱').email('邮箱格式不正确'),
});

/**
 * 商品尺码项校验
 *
 * 尺码名称不可为空，库存数量必须为非负整数。
 */
const productSizeSchema = z.object({
  size: z.string().min(1, '请输入尺码'),
  stock: z.coerce.number().int().min(0, '库存不能为负数'),
});

/**
 * 商品颜色项校验
 *
 * 颜色名称不可为空，且每个颜色下至少需要一个尺码项。
 */
const productColorSchema = z.object({
  color: z.string().min(1, '请输入颜色'),
  sizes: z.array(productSizeSchema).min(1, '每个颜色至少需要一个尺码'),
});

/**
 * 商品表单校验
 *
 * 要求至少一个颜色项，每个颜色下至少一个尺码，售价和进价不可为负数，图片字段可选。
 */
export const productSchema = z.object({
  name: z.string().min(1, '请输入商品名称').max(50, '名称过长'),
  model: z.string().min(1, '请输入型号').max(30, '型号过长'),
  image: z.string().default(''),
  sizes: z.array(productColorSchema).min(1, '至少需要一个颜色'),
  cost_price: z.coerce.number().min(0, '进价不能为负数'),
  sale_price: z.coerce.number().min(0, '售价不能为负数'),
});

/**
 * 销售表单校验
 *
 * 必须选择颜色和具体尺码，数量至少为 1，成交价不可为负。
 */
export const saleSchema = z.object({
  product_id: z.string().min(1, '请选择商品'),
  sold_color: z.string().min(1, '请选择颜色'),
  sold_size: z.string().min(1, '请选择尺码'),
  quantity: z.coerce.number().int().min(1, '数量至少为 1'),
  unit_price: z.coerce.number().min(0, '成交价不能为负数'),
  sold_at: z.string().min(1, '请选择销售时间'),
});

export const categorySchema = z.object({
  name: z.string().min(1, '请输入分类名称').max(20, '分类名称过长'),
});

export const settingSchema = z.object({
  auto_backup: z.boolean(),
});

export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
export type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;
export type ProductForm = z.infer<typeof productSchema>;
export type SaleForm = z.infer<typeof saleSchema>;
export type CategoryForm = z.infer<typeof categorySchema>;
export type SettingForm = z.infer<typeof settingSchema>;
