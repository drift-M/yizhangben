/**
 * 注册页面
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Store } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { registerSchema, RegisterForm } from '@/utils/validation';
import { useToast } from '@/components/ui/Toast';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export function RegisterPage() {
  const navigate = useNavigate();
  const { user, isInitialized, register, isLoading } = useAuthStore();
  const { showToast } = useToast();

  const [form, setForm] = useState<RegisterForm>({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterForm, string>>>({});

  useEffect(() => {
    if (isInitialized && user) {
      navigate('/');
    }
  }, [isInitialized, user, navigate]);

  function handleChange(field: keyof RegisterForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const result = registerSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof RegisterForm, string>> = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0] as keyof RegisterForm;
        fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      await register(form.email, form.password, form.displayName);
      showToast('注册成功，欢迎使用衣账本', 'success');
      navigate('/');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '注册失败', 'error');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4 py-8">
      <Card className="w-full max-w-md animate-fade-in-up">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-terracotta text-white shadow-lg">
            <Store className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-serif font-semibold text-charcoal">创建账号</h1>
          <p className="mt-1 text-sm text-stone-500">注册后即可开始管理您的服装店</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="店铺名称 / 姓名"
            placeholder="例如：小林服装店"
            value={form.displayName}
            onChange={(e) => handleChange('displayName', e.target.value)}
            error={errors.displayName}
            required
          />
          <Input
            type="email"
            label="邮箱"
            placeholder="请输入邮箱"
            value={form.email}
            onChange={(e) => handleChange('email', e.target.value)}
            error={errors.email}
            required
          />
          <Input
            type="password"
            label="密码"
            placeholder="至少 6 位"
            value={form.password}
            onChange={(e) => handleChange('password', e.target.value)}
            error={errors.password}
            required
          />
          <Input
            type="password"
            label="确认密码"
            placeholder="再次输入密码"
            value={form.confirmPassword}
            onChange={(e) => handleChange('confirmPassword', e.target.value)}
            error={errors.confirmPassword}
            required
          />

          <Button type="submit" className="w-full" isLoading={isLoading}>
            注册
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-stone-500">
          已有账号？
          <Link to="/login" className="font-medium text-terracotta hover:underline">
            立即登录
          </Link>
        </p>
      </Card>
    </div>
  );
}
