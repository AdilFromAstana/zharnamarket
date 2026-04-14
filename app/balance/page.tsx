"use client";

import { useEffect, useState } from "react";
import { Card, Button, Tag, Empty, Spin, Pagination } from "antd";
import {
  WalletOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  PlusOutlined,
  ThunderboltOutlined,
  FileTextOutlined,
  RocketOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { api } from "@/lib/api-client";
import { MIN_WITHDRAWAL_AMOUNT } from "@/lib/constants";
import type { BalanceTransaction } from "@/lib/types/balance";

interface BalanceData {
  current: number;
  totalEarned: number;
  totalWithdrawn: number;
  totalTopUp: number;
  totalSpent: number;
}

interface BalanceResponse {
  balance: BalanceData;
  transactions: {
    data: BalanceTransaction[];
    pagination: { page: number; total: number; totalPages: number };
  };
}

// ── Transaction display config ────────────────────────────────

const TX_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; color: string; sign: "+" | "-" }
> = {
  earning: {
    label: "Выплата за видео",
    icon: <VideoCameraOutlined />,
    color: "bg-emerald-100 text-emerald-600",
    sign: "+",
  },
  topup: {
    label: "Пополнение кошелька",
    icon: <PlusOutlined />,
    color: "bg-emerald-100 text-emerald-600",
    sign: "+",
  },
  refund: {
    label: "Возврат",
    icon: <ArrowDownOutlined />,
    color: "bg-blue-100 text-blue-600",
    sign: "+",
  },
  withdrawal: {
    label: "Вывод средств",
    icon: <ArrowUpOutlined />,
    color: "bg-gray-100 text-gray-500",
    sign: "-",
  },
  ad_publication: {
    label: "Публикация объявления",
    icon: <FileTextOutlined />,
    color: "bg-orange-100 text-orange-500",
    sign: "-",
  },
  boost: {
    label: "Буст объявления",
    icon: <RocketOutlined />,
    color: "bg-purple-100 text-purple-600",
    sign: "-",
  },
  escrow_deposit: {
    label: "Бюджет задания",
    icon: <ThunderboltOutlined />,
    color: "bg-blue-100 text-blue-600",
    sign: "-",
  },
  escrow_topup: {
    label: "Пополнение бюджета",
    icon: <ThunderboltOutlined />,
    color: "bg-blue-100 text-blue-600",
    sign: "-",
  },
};

export default function BalancePage() {
  useRequireAuth();
  const [data, setData] = useState<BalanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchBalance = async (p: number) => {
    setLoading(true);
    try {
      const result = await api.get<BalanceResponse>(`/api/balance?page=${p}&limit=20`);
      setData(result);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBalance(page); }, [page]);

  if (loading && !data) {
    return <div className="flex justify-center py-20"><Spin size="large" /></div>;
  }

  const balance = data?.balance;
  const transactions = data?.transactions;
  const canWithdraw = (balance?.current ?? 0) >= MIN_WITHDRAWAL_AMOUNT;

  return (
    <div className="max-w-lg mx-auto py-8 px-4">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Кошелёк</h1>

      {/* Balance card */}
      <Card className="mb-4 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <div className="text-center mb-4">
          <WalletOutlined className="text-3xl text-green-600 mb-2" />
          <div className="text-3xl font-bold text-gray-900">
            {(balance?.current ?? 0).toLocaleString("ru")} ₸
          </div>
          <div className="text-sm text-gray-500 mt-1">Доступный баланс</div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-green-200 mb-4">
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-0.5">Пополнено</div>
            <div className="font-semibold text-emerald-700 text-sm">
              +{(balance?.totalTopUp ?? 0).toLocaleString("ru")} ₸
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-0.5">Заработано</div>
            <div className="font-semibold text-emerald-700 text-sm">
              +{((balance?.totalEarned ?? 0) - (balance?.totalTopUp ?? 0)).toLocaleString("ru")} ₸
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-0.5">Потрачено на рекламу</div>
            <div className="font-semibold text-gray-600 text-sm">
              -{(balance?.totalSpent ?? 0).toLocaleString("ru")} ₸
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-0.5">Выведено</div>
            <div className="font-semibold text-gray-600 text-sm">
              -{(balance?.totalWithdrawn ?? 0).toLocaleString("ru")} ₸
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Link href="/balance/topup" className="flex-1">
            <Button
              type="primary"
              block
              size="large"
              icon={<PlusOutlined />}
              className="bg-emerald-500 hover:bg-emerald-600 border-emerald-500 font-semibold"
            >
              Пополнить
            </Button>
          </Link>
          <Link href="/balance/withdraw" className="flex-1">
            <Button
              block
              size="large"
              disabled={!canWithdraw}
              className="font-semibold"
            >
              Вывести
            </Button>
          </Link>
        </div>

        {!canWithdraw && (
          <p className="text-xs text-gray-400 text-center mt-2">
            Минимум для вывода: {MIN_WITHDRAWAL_AMOUNT} ₸
          </p>
        )}
      </Card>

      {/* Transactions */}
      <h2 className="font-semibold text-gray-900 mb-3">История операций</h2>

      {transactions?.data.length === 0 ? (
        <Empty description="Операций пока нет" />
      ) : (
        <div className="space-y-2">
          {transactions?.data.map((tx) => {
            const conf = TX_CONFIG[tx.type] ?? {
              label: tx.type,
              icon: <WalletOutlined />,
              color: "bg-gray-100 text-gray-500",
              sign: tx.amount > 0 ? "+" : "-",
            };
            const isIncoming = tx.amount > 0;

            return (
              <Card
                key={tx.id}
                size="small"
                className="hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm ${conf.color}`}
                  >
                    {conf.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {tx.description || conf.label}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Tag
                        className="m-0 text-[10px] px-1.5 py-0"
                        color={isIncoming ? "green" : "default"}
                      >
                        {conf.label}
                      </Tag>
                      <span className="text-xs text-gray-400">
                        {new Date(tx.createdAt).toLocaleDateString("ru-RU", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                  <div
                    className={`font-semibold text-sm shrink-0 ${
                      isIncoming ? "text-emerald-600" : "text-gray-700"
                    }`}
                  >
                    {isIncoming ? "+" : ""}
                    {tx.amount.toLocaleString("ru")} ₸
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {transactions && transactions.pagination.totalPages > 1 && (
        <div className="flex justify-center mt-4">
          <Pagination
            current={page}
            total={transactions.pagination.total}
            pageSize={20}
            onChange={setPage}
            showSizeChanger={false}
          />
        </div>
      )}
    </div>
  );
}
