export type TransactionType = "earning" | "withdrawal" | "refund";
export type WithdrawalStatus = "pending" | "processing" | "completed" | "failed";

export interface CreatorBalance {
  id: string;
  userId: string;
  balance: number;
  totalEarned: number;
  totalWithdrawn: number;
}

export interface BalanceTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  submissionId: string | null;
  withdrawalId: string | null;
  createdAt: string;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  amount: number;
  method: "kaspi" | "halyk" | "card";
  details: string;
  status: WithdrawalStatus;
  processedAt: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}
