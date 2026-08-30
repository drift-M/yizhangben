/**
 * 找回密码页面
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Store, MailCheck } from 'lucide-react';
import { sendPasswordReset } from '@/api/auth';
import { forgotPasswordSchema } from '@/utils/validation';
import { useToast } from '@/components/ui/Toast';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export function ForgotPasswordPage() {
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? '邮箱格式不正确');
      return;
    }

    setIsLoading(true);
    try {
      await sendPasswordReset(email);
      setIsSent(true);
      showToast('重置邮件已发送', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '发送失败', 'error');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4 py-8">
      <Card className="w-full max-w-md animate-fade-in-up">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-terracotta text-white shadow-lg">
            <Store className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-serif font-semibold text-charcoal">找回密码</h1>
          <p className="mt-1 text-sm text-stone-500">输入注册邮箱，我们将发送重置链接</p>
        </div>

        {isSent ? (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="rounded-full bg-emerald-100 p-4">
              <MailCheck className="h-8 w-8 text-emerald-600" />
            </div>
            <p className="mt-4 text-charcoal">重置链接已发送至</p>
            <p className="font-medium text-terracotta">{email}</p>
            <p className="mt-2 text-xs text-stone-500">请检查邮箱并按照提示重置密码</p>
            <Link to="/login" className="mt-6 text-sm font-medium text-terracotta hover:underline">
              返回登录
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              label="邮箱"
              placeholder="请输入注册邮箱"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              error={error}
              required
            />
            <Button type="submit" className="w-full" isLoading={isLoading}>
              发送重置链接
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-stone-500">
          想起密码了？
          <Link to="/login" className="font-medium text-terracotta hover:underline">
            返回登录
          </Link>
        </p>
      </Card>
    </div>
  );
}
