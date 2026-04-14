import Link from 'next/link';
import { Button } from 'antd';
import PublicLayout from '@/components/layout/PublicLayout';

export default function NotFound() {
  return (
    <PublicLayout>
      <div className="text-center py-24">
        <div className="text-8xl font-bold text-gray-100 mb-4">404</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Страница не найдена</h1>
        <p className="text-gray-500 mb-8 max-w-sm mx-auto">
          Страница, которую вы ищете, не существует или была перемещена
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/">
            <Button type="primary" size="large" style={{ background: '#0EA5E9', borderColor: '#0EA5E9' }}>
              На главную
            </Button>
          </Link>
          <Link href="/ads">
            <Button size="large">Посмотреть объявления</Button>
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}
