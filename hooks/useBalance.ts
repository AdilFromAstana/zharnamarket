import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import type { BalanceTransaction } from "@/lib/types/balance";

// Shared query key prefix — all balance queries use this for invalidation
const BALANCE_KEY = ["balance"] as const;

// ── Header balance (current only) ────────────────────────────
export function useBalance() {
  const { isLoggedIn, isAdmin } = useAuth();

  const { data: balance } = useQuery({
    queryKey: [...BALANCE_KEY, "current"],
    queryFn: () =>
      api.get<{ balance: { current: number } }>("/api/balance").then((d) => d.balance.current),
    enabled: isLoggedIn && !isAdmin,
  });

  return balance ?? null;
}

// ── Full balance with transactions (for balance page) ────────

interface BalanceData {
  current: number;
  totalEarned: number;
  totalWithdrawn: number;
  totalTopUp: number;
  totalSpent: number;
}

interface BalanceFullResponse {
  balance: BalanceData;
  transactions: {
    data: BalanceTransaction[];
    pagination: { page: number; total: number; totalPages: number };
  };
}

export function useBalanceFull(page: number) {
  const { isLoggedIn, isAdmin } = useAuth();

  return useQuery({
    queryKey: [...BALANCE_KEY, "full", page],
    queryFn: () => api.get<BalanceFullResponse>(`/api/balance?page=${page}&limit=20`),
    enabled: isLoggedIn && !isAdmin,
  });
}

// ── Invalidation helper ──────────────────────────────────────
// Invalidates ALL balance queries (header + full page)
export function useInvalidateBalance() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: BALANCE_KEY });
}
