/**
 * 登录页面
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Store } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { loginSchema, LoginForm } from '@/utils/validation';
import { useToast } from '@/components/ui/Toast';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export function LoginPage() {
  const navigate = useNavigate();
  const { user, isInitialized, login, isLoading } = useAuthStore();
  const { showToast } = useToast();

  const [form, setForm] = useState<LoginForm>({
    email: '',
    password: '',
    remember: false,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof LoginForm, string>>>({});

  // 已登录则跳转到首页
  useEffect(() => {
    if (isInitialized && user) {
      navigate('/');
    }
  }, [isInitialized, user, navigate]);

  function handleChange(field: keyof LoginForm, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const result = loginSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof LoginForm, string>> = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0] as keyof LoginForm;
        fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      await login(form.email, form.password, form.remember ?? false);
      showToast('登录成功', 'success');
      navigate('/');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '登录失败', 'error');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4 py-8">
      <Card className="w-full max-w-md animate-fade-in-up">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-terracotta text-white shadow-lg">
            <Store className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-serif font-semibold text-charcoal">衣账本</h1>
          <p className="mt-1 text-sm text-stone-500">登录您的店铺账号</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            placeholder="请输入密码"
            value={form.password}
            onChange={(e) => handleChange('password', e.target.value)}
            error={errors.password}
            required
          />

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-stone-600">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-stone-300 text-terracotta focus:ring-terracotta"
                checked={form.remember}
                onChange={(e) => handleChange('remember', e.target.checked)}
              />
              记住登录状态
            </label>
            <Link to="/forgot-password" className="text-terracotta hover:underline">
              忘记密码？
            </Link>
          </div>

          <Button type="submit" className="w-full" isLoading={isLoading}>
            登录
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-stone-500">
          还没有账号？
          <Link to="/register" className="font-medium text-terracotta hover:underline">
            立即注册
          </Link>
        </p>
      </Card>
    </div>
  );
}
