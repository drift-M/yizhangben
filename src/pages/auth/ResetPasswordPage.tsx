/**
 * 重置密码页面
 *
 * 用户通过邮件链接跳转至此后设置新密码。
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { updatePassword } from '@/api/auth';
import { useToast } from '@/components/ui/Toast';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const newErrors: typeof errors = {};

    if (password.length < 6) {
      newErrors.password = '密码至少 6 位';
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = '两次输入的密码不一致';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsLoading(true);
    try {
      await updatePassword(password);
      setIsSuccess(true);
      showToast('密码重置成功，请重新登录', 'success');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '重置失败', 'error');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4 py-8">
      <Card className="w-full max-w-md animate-fade-in-up">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-terracotta text-white shadow-lg">
            <Lock className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-serif font-semibold text-charcoal">重置密码</h1>
          <p className="mt-1 text-sm text-stone-500">请设置您的新密码</p>
        </div>

        {isSuccess ? (
          <div className="py-6 text-center">
            <p className="text-charcoal">密码已重置成功</p>
            <Link to="/login" className="mt-4 inline-block text-sm font-medium text-terracotta hover:underline">
              前往登录
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              label="新密码"
              placeholder="至少 6 位"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              error={errors.password}
              required
            />
            <Input
              type="password"
              label="确认新密码"
              placeholder="再次输入新密码"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
              }}
              error={errors.confirmPassword}
              required
            />
            <Button type="submit" className="w-full" isLoading={isLoading}>
              确认重置
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-stone-500">
          <Link to="/login" className="font-medium text-terracotta hover:underline">
            返回登录
          </Link>
        </p>
      </Card>
    </div>
  );
}
