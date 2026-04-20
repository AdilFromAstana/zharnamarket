"use client";

import { Suspense, useEffect, useState } from "react";
import { Tag, Empty, Pagination } from "antd";
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
import { useSearchParams } from "next/navigation";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { MIN_WITHDRAWAL_AMOUNT, SHOW_WITHDRAWAL_UI } from "@/lib/constants";
import { useBalanceFull, useInvalidateBalance } from "@/hooks/useBalance";
import TopupDrawer from "@/components/balance/TopupDrawer";
import WithdrawDrawer from "@/components/balance/WithdrawDrawer";
import type { BalanceTransaction } from "@/lib/types/balance";

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

// ── Skeleton ────────────────────────────────

function BalanceSkeleton() {
  return (
    <div className="max-w-lg mx-auto py-8 px-4 animate-pulse">
      <div className="h-6 w-28 bg-gray-200 rounded mb-6" />
      <div className="rounded-2xl border border-gray-100 p-6 mb-6">
        <div className="flex flex-col items-center gap-2 mb-5">
          <div className="w-10 h-10 bg-gray-200 rounded-full" />
          <div className="h-9 w-40 bg-gray-200 rounded" />
          <div className="h-4 w-28 bg-gray-100 rounded" />
        </div>
        <div className="h-12 bg-gray-200 rounded-xl" />
      </div>
      <div className="h-5 w-36 bg-gray-200 rounded mb-3" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 py-3">
          <div className="w-9 h-9 bg-gray-200 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 bg-gray-200 rounded" />
            <div className="h-3 w-24 bg-gray-100 rounded" />
          </div>
          <div className="h-4 w-16 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );
}

export default function BalancePage() {
  return (
    <Suspense fallback={<BalanceSkeleton />}>
      <BalancePageInner />
    </Suspense>
  );
}

function BalancePageInner() {
  useRequireAuth();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const [topupOpen, setTopupOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const invalidateBalance = useInvalidateBalance();

  const { data, isLoading } = useBalanceFull(page);

  // Open topup drawer if ?topup=true (redirect from /topup page or header)
  useEffect(() => {
    if (searchParams.get("topup") === "true") {
      setTopupOpen(true);
    }
  }, [searchParams]);

  const handleTopupClose = () => {
    setTopupOpen(false);
    invalidateBalance();
  };

  const handleWithdrawClose = () => {
    setWithdrawOpen(false);
    invalidateBalance();
  };

  if (isLoading && !data) {
    return <BalanceSkeleton />;
  }

  const balance = data?.balance;
  const transactions = data?.transactions;
  const canWithdraw = (balance?.current ?? 0) >= MIN_WITHDRAWAL_AMOUNT;

  const totalEarned = (balance?.totalEarned ?? 0) - (balance?.totalTopUp ?? 0);
  const totalSpent = balance?.totalSpent ?? 0;
  const totalWithdrawn = balance?.totalWithdrawn ?? 0;
  const totalTopUp = balance?.totalTopUp ?? 0;

  // Filter non-zero stats
  const stats = [
    { label: "Пополнено", value: totalTopUp, color: "text-emerald-700", prefix: "+" },
    { label: "Заработано", value: totalEarned, color: "text-emerald-700", prefix: "+" },
    { label: "Потрачено", value: totalSpent, color: "text-gray-600", prefix: "-" },
    { label: "Выведено", value: totalWithdrawn, color: "text-gray-600", prefix: "-" },
  ].filter((s) => s.value > 0);

  const isNewUser = (balance?.current ?? 0) === 0 && (!transactions?.data.length);

  return (
    <div className="max-w-lg mx-auto py-8 px-4">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Кошелёк</h1>

      {/* ── Balance card ─────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-green-50 to-emerald-50 p-6 mb-6">
        <div className="text-center mb-5">
          <WalletOutlined className="text-3xl text-green-600 mb-2" />
          <div className="text-3xl font-bold text-gray-900">
            {(balance?.current ?? 0).toLocaleString("ru")} ₸
          </div>
          <div className="text-sm text-gray-500 mt-1">Доступный баланс</div>
        </div>

        {/* Stats — only non-zero */}
        {stats.length > 0 && (
          <div
            className={`grid gap-3 pt-4 border-t border-green-200 mb-5 ${
              stats.length === 1 ? "grid-cols-1" :
              stats.length === 2 ? "grid-cols-2" :
              stats.length === 3 ? "grid-cols-3" :
              "grid-cols-2"
            }`}
          >
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-xs text-gray-500 mb-0.5">{s.label}</div>
                <div className={`font-semibold text-sm ${s.color}`}>
                  {s.prefix}{s.value.toLocaleString("ru")} ₸
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA — Пополнить full-width */}
        <button
          onClick={() => setTopupOpen(true)}
          className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white font-semibold text-base flex items-center justify-center gap-2 transition-all"
        >
          <PlusOutlined />
          Пополнить
        </button>

        {/* Вывести — secondary text link */}
        {SHOW_WITHDRAWAL_UI &&
          (canWithdraw ? (
            <button
              onClick={() => setWithdrawOpen(true)}
              className="block w-full text-center text-sm text-gray-500 hover:text-gray-700 mt-3 transition-colors"
            >
              Вывести средства
            </button>
          ) : (
            <p className="text-xs text-gray-400 text-center mt-3">
              Минимум для вывода: {MIN_WITHDRAWAL_AMOUNT.toLocaleString("ru")} ₸
            </p>
          ))}
      </div>

      {/* ── Empty state for new users ─────────────────── */}
      {isNewUser ? (
        <div className="text-center py-10">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <WalletOutlined className="text-2xl text-emerald-500" />
          </div>
          <h2 className="text-base font-semibold text-gray-900 mb-1">
            Пополните кошелёк
          </h2>
          <p className="text-sm text-gray-500 mb-5 max-w-xs mx-auto">
            Чтобы размещать задания и находить креаторов, пополните баланс
          </p>
          <button
            onClick={() => setTopupOpen(true)}
            className="inline-flex items-center gap-2 px-6 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-sm transition-all active:scale-[0.98]"
          >
            <PlusOutlined />
            Пополнить кошелёк
          </button>
        </div>
      ) : (
        <>
          {/* ── Transactions ───────────────────────────── */}
          <h2 className="font-semibold text-gray-900 mb-3">История операций</h2>

          {transactions?.data.length === 0 ? (
            <Empty description="Опер��ций пока нет" />
          ) : (
            <div className="divide-y divide-gray-100">
              {transactions?.data.map((tx: BalanceTransaction) => {
                const conf = TX_CONFIG[tx.type] ?? {
                  label: tx.type,
                  icon: <WalletOutlined />,
                  color: "bg-gray-100 text-gray-500",
                  sign: tx.amount > 0 ? "+" : "-",
                };
                const isIncoming = tx.amount > 0;
                const showTag =
                  tx.description && tx.description !== conf.label;

                return (
                  <div
                    key={tx.id}
                    className="flex items-center gap-3 py-3"
                  >
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
                        {showTag && (
                          <Tag
                            className="m-0 text-[10px] px-1.5 py-0"
                            color={isIncoming ? "green" : "default"}
                          >
                            {conf.label}
                          </Tag>
                        )}
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
        </>
      )}

      {/* ── Topup Modal/Drawer ──────────────────────── */}
      <TopupDrawer
        open={topupOpen}
        onClose={handleTopupClose}
      />

      {/* ── Withdraw Modal/Drawer ────────────────────── */}
      <WithdrawDrawer
        open={withdrawOpen}
        onClose={handleWithdrawClose}
        maxBalance={balance?.current}
      />
    </div>
  );
}
