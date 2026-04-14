"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Spin, Empty, Select, Input, Modal, Drawer } from "antd";
import {
  ArrowLeftOutlined,
  SearchOutlined,
  UserOutlined,
  CrownOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  MoreOutlined,
  FileTextOutlined,
  IdcardOutlined,
  SwapOutlined,
  LockOutlined,
  UnlockOutlined,
  UndoOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { api, ApiError } from "@/lib/api-client";
import { formatDate, formatRelative, cn, getAvatarGradient } from "@/lib/utils";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface UserItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  avatarColor?: string | null;
  role: "user" | "admin";
  emailVerified: boolean;
  blocked: boolean;
  blockedAt: string | null;
  isDeleted: boolean;
  createdAt: string;
  _count: { ads: number; creatorProfiles: number };
}

interface UsersResponse {
  data: UserItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── Status helpers ──────────────────────────────────────────────────────────

function getUserStatus(user: UserItem): {
  label: string;
  dotColor: string;
  textColor: string;
  bgColor: string;
} {
  if (user.isDeleted)
    return {
      label: "Удалён",
      dotColor: "bg-gray-400",
      textColor: "text-gray-600",
      bgColor: "bg-gray-50",
    };
  if (user.blocked)
    return {
      label: "Заблокирован",
      dotColor: "bg-red-500",
      textColor: "text-red-700",
      bgColor: "bg-red-50",
    };
  return {
    label: "Активен",
    dotColor: "bg-green-500",
    textColor: "text-green-700",
    bgColor: "bg-green-50",
  };
}

function getRoleBadge(role: "user" | "admin"): {
  label: string;
  textColor: string;
  bgColor: string;
} {
  if (role === "admin")
    return {
      label: "Admin",
      textColor: "text-violet-700",
      bgColor: "bg-violet-50",
    };
  return { label: "User", textColor: "text-gray-600", bgColor: "bg-gray-100" };
}

function getCardBorder(user: UserItem): string {
  if (user.isDeleted) return "border-gray-300 bg-gray-50/50";
  if (user.blocked) return "border-red-200 bg-red-50/20";
  return "border-gray-100";
}

// ─── Smart date: relative if <7d, compact absolute otherwise ─────────────────

function smartDate(date: string | null): string {
  if (!date) return "—";
  const now = new Date();
  const d = new Date(date);
  const diffDays = Math.floor(
    (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays < 7) return formatRelative(date);
  return formatDate(date);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const router = useRouter();
  const { isLoading: authLoading } = useRequireAdmin();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 0,
  });
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterBlocked, setFilterBlocked] = useState<string>("all");
  const [filterDeleted, setFilterDeleted] = useState<string>("false");
  const [searchValue, setSearchValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Bottom sheet state
  const [actionUser, setActionUser] = useState<UserItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (filterRole !== "all") params.set("role", filterRole);
      if (filterBlocked !== "all") params.set("blocked", filterBlocked);
      if (filterDeleted !== "false") params.set("deleted", filterDeleted);
      params.set("page", String(pagination.page));
      params.set("limit", "30");

      const data = await api.get<UsersResponse>(
        `/api/admin/users?${params.toString()}`,
      );
      setUsers(data.data);
      setPagination((prev) => ({
        ...prev,
        total: data.pagination.total,
        totalPages: data.pagination.totalPages,
      }));
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterRole, filterBlocked, filterDeleted, pagination.page]);

  useEffect(() => {
    if (!authLoading) fetchUsers();
  }, [authLoading, fetchUsers]);

  const handleSearch = (value: string) => {
    setSearchValue(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearchQuery(value);
      setPagination((p) => ({ ...p, page: 1 }));
    }, 400);
  };

  // ─── Actions ─────────────────────────────────────────────────────────────

  const openActions = (user: UserItem) => {
    setActionUser(user);
    setDrawerOpen(true);
  };

  const closeActions = () => {
    setDrawerOpen(false);
    setTimeout(() => setActionUser(null), 300);
  };

  const handleToggleRole = async (user: UserItem) => {
    closeActions();
    const newRole = user.role === "admin" ? "user" : "admin";
    Modal.confirm({
      title: `Сменить роль на "${newRole}"?`,
      content: `${user.name} (${user.email})`,
      okText: "Да",
      cancelText: "Отмена",
      onOk: async () => {
        try {
          await api.patch(`/api/admin/users/${user.id}`, { role: newRole });
          setUsers((prev) =>
            prev.map((u) =>
              u.id === user.id
                ? { ...u, role: newRole as "user" | "admin" }
                : u,
            ),
          );
          toast.success(`Роль изменена на "${newRole}"`);
        } catch (err) {
          if (err instanceof ApiError) toast.error(err.message);
        }
      },
    });
  };

  const handleToggleBlock = async (user: UserItem) => {
    closeActions();
    const action = user.blocked ? "Разблокировать" : "Заблокировать";
    Modal.confirm({
      title: `${action} пользователя?`,
      content: `${user.name} (${user.email})`,
      okText: action,
      okType: user.blocked ? "default" : "danger",
      cancelText: "Отмена",
      onOk: async () => {
        try {
          await api.patch(`/api/admin/users/${user.id}`, {
            blocked: !user.blocked,
          });
          setUsers((prev) =>
            prev.map((u) =>
              u.id === user.id
                ? {
                    ...u,
                    blocked: !u.blocked,
                    blockedAt: u.blocked ? null : new Date().toISOString(),
                  }
                : u,
            ),
          );
          toast.success(
            user.blocked
              ? "Пользователь разблокирован"
              : "Пользователь заблокирован",
          );
        } catch (err) {
          if (err instanceof ApiError) toast.error(err.message);
        }
      },
    });
  };

  const handleRestore = async (user: UserItem) => {
    closeActions();
    try {
      await api.patch(`/api/admin/users/${user.id}`, { isDeleted: false });
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isDeleted: false } : u)),
      );
      toast.success("Пользователь восстановлен");
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    }
  };

  // ─── Loading state ───────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        {/* ── Page title ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 shrink-0 transition-colors"
          >
            <ArrowLeftOutlined className="text-sm" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 sm:text-xl">
              Пользователи
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {pagination.total}{" "}
              {pagination.total === 1 ? "пользователь" : "пользователей"}
            </p>
          </div>
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 shrink-0 disabled:opacity-50 transition-colors"
          >
            <ReloadOutlined spin={loading} />
          </button>
        </div>

        {/* ── Search ──────────────────────────────────────────────────── */}
        <div className="mb-4">
          <Input
            prefix={<SearchOutlined className="text-gray-400" />}
            placeholder="Поиск по имени или email..."
            allowClear
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            className="!rounded-xl"
            size="large"
          />
        </div>

        {/* ── Filters (horizontal scroll on mobile) ───────────────────── */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
          <Select
            value={filterRole}
            onChange={(v) => {
              setFilterRole(v);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="shrink-0"
            style={{ minWidth: 130 }}
            size="middle"
            options={[
              { label: "Все роли", value: "all" },
              { label: "Пользователи", value: "user" },
              { label: "Админы", value: "admin" },
            ]}
          />
          <Select
            value={filterBlocked}
            onChange={(v) => {
              setFilterBlocked(v);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="shrink-0"
            style={{ minWidth: 140 }}
            size="middle"
            options={[
              { label: "Все статусы", value: "all" },
              { label: "Активные", value: "false" },
              { label: "Заблокированные", value: "true" },
            ]}
          />
          <Select
            value={filterDeleted}
            onChange={(v) => {
              setFilterDeleted(v);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="shrink-0"
            style={{ minWidth: 140 }}
            size="middle"
            options={[
              { label: "Не удалённые", value: "false" },
              { label: "Удалённые", value: "true" },
              { label: "Все", value: "all" },
            ]}
          />
        </div>

        {/* ── Users list ──────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Spin size="large" />
          </div>
        ) : users.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 py-16">
            <Empty
              description="Пользователи не найдены"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {users.map((user) => {
              const status = getUserStatus(user);
              const role = getRoleBadge(user.role);
              const borderClass = getCardBorder(user);
              const avatarGradient =
                user.avatarColor ?? getAvatarGradient(user.name);

              return (
                <div
                  key={user.id}
                  className={cn(
                    "bg-white rounded-2xl border p-3 sm:p-4 transition-colors",
                    borderClass,
                    user.isDeleted && "opacity-60",
                  )}
                >
                  {/* Row 1: Avatar + Info + Status + Kebab */}
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="shrink-0">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm"
                        />
                      ) : (
                        <div
                          className={cn(
                            "w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-semibold text-sm ring-2 ring-white shadow-sm",
                            avatarGradient,
                          )}
                        >
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Text content */}
                    <div className="flex-1 min-w-0">
                      {/* Name row + status */}
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-[15px] text-gray-900 truncate leading-tight">
                          {user.name}
                        </span>
                        {/* Status indicator — dot + text */}
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[11px] font-medium shrink-0 rounded-full px-2 py-0.5",
                            status.bgColor,
                            status.textColor,
                          )}
                        >
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full shrink-0",
                              status.dotColor,
                            )}
                          />
                          {status.label}
                        </span>
                      </div>

                      {/* Role badge + email verified */}
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2 py-0.5",
                            role.bgColor,
                            role.textColor,
                          )}
                        >
                          {user.role === "admin" && (
                            <CrownOutlined className="text-[10px]" />
                          )}
                          {role.label}
                        </span>
                        {user.emailVerified && (
                          <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-green-600 bg-green-50 rounded-full px-2 py-0.5">
                            <CheckCircleOutlined className="text-[10px]" />
                            Email
                          </span>
                        )}
                      </div>

                      {/* Email */}
                      <p className="text-[13px] text-gray-500 truncate mt-0.5 leading-tight">
                        {user.email}
                      </p>

                      {/* Stats row: ads, profiles, registration date */}
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="inline-flex items-center gap-1 text-[12px] text-gray-400">
                          <FileTextOutlined className="text-[11px]" />
                          {user._count.ads}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[12px] text-gray-400">
                          <IdcardOutlined className="text-[11px]" />
                          {user._count.creatorProfiles}
                        </span>
                        <span className="text-[11px] text-gray-300">·</span>
                        <span className="text-[12px] text-gray-400">
                          Рег. {smartDate(user.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Kebab menu button */}
                    <button
                      onClick={() => openActions(user)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors shrink-0 -mr-1 -mt-0.5"
                    >
                      <MoreOutlined className="text-lg" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Pagination ──────────────────────────────────────────────── */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-1 mt-6 pb-4">
            <button
              onClick={() =>
                setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))
              }
              disabled={pagination.page === 1}
              className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-white text-sm"
            >
              ‹
            </button>
            {generatePageNumbers(pagination.page, pagination.totalPages).map(
              (p, i) =>
                p === "..." ? (
                  <span
                    key={`dots-${i}`}
                    className="w-6 text-center text-gray-300 text-sm"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() =>
                      setPagination((prev) => ({ ...prev, page: p as number }))
                    }
                    className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center text-sm font-medium transition-colors",
                      p === pagination.page
                        ? "bg-sky-500 text-white shadow-sm"
                        : "border border-gray-200 text-gray-600 hover:bg-gray-100",
                    )}
                  >
                    {p}
                  </button>
                ),
            )}
            <button
              onClick={() =>
                setPagination((p) => ({
                  ...p,
                  page: Math.min(p.totalPages, p.page + 1),
                }))
              }
              disabled={pagination.page === pagination.totalPages}
              className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-white text-sm"
            >
              ›
            </button>
          </div>
        )}
      </div>

      {/* ── Action Bottom Sheet (Drawer) ──────────────────────────────── */}
      <Drawer
        open={drawerOpen}
        onClose={closeActions}
        placement="bottom"
        size="default"
        closable={false}
        styles={{
          wrapper: { borderRadius: "16px 16px 0 0" },
          body: { padding: "0 0 env(safe-area-inset-bottom, 16px) 0" },
        }}
        rootClassName="admin-user-actions-drawer"
      >
        {actionUser && (
          <div>
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* User preview in sheet */}
            <div className="flex items-center gap-3 px-5 pb-3 border-b border-gray-100">
              {actionUser.avatar ? (
                <img
                  src={actionUser.avatar}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div
                  className={cn(
                    "w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-semibold text-sm",
                    actionUser.avatarColor ??
                      getAvatarGradient(actionUser.name),
                  )}
                >
                  {actionUser.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900 text-[15px] truncate">
                  {actionUser.name}
                </p>
                <p className="text-[13px] text-gray-500 truncate">
                  {actionUser.email}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="py-2">
              {actionUser.isDeleted ? (
                /* Deleted user — only restore */
                <ActionButton
                  icon={<UndoOutlined />}
                  label="Восстановить пользователя"
                  color="text-green-600"
                  onClick={() => handleRestore(actionUser)}
                />
              ) : (
                <>
                  {/* Change role */}
                  <ActionButton
                    icon={<SwapOutlined />}
                    label={
                      actionUser.role === "admin"
                        ? "Сменить роль → User"
                        : "Сменить роль → Admin"
                    }
                    color="text-gray-700"
                    onClick={() => handleToggleRole(actionUser)}
                  />

                  {/* Block / Unblock */}
                  {actionUser.blocked ? (
                    <ActionButton
                      icon={<UnlockOutlined />}
                      label="Разблокировать"
                      color="text-green-600"
                      onClick={() => handleToggleBlock(actionUser)}
                    />
                  ) : (
                    <ActionButton
                      icon={<LockOutlined />}
                      label="Заблокировать"
                      color="text-red-600"
                      onClick={() => handleToggleBlock(actionUser)}
                    />
                  )}
                </>
              )}

              {/* Cancel */}
              <div className="mx-4 mt-1 border-t border-gray-100" />
              <ActionButton
                icon={<CloseOutlined />}
                label="Отмена"
                color="text-gray-500"
                onClick={closeActions}
              />
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

// ─── Action button for bottom sheet ──────────────────────────────────────────

function ActionButton({
  icon,
  label,
  color,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-5 py-3 text-left text-[15px] font-medium transition-colors active:bg-gray-50",
        color,
      )}
    >
      <span className="text-lg w-5 flex items-center justify-center">
        {icon}
      </span>
      {label}
    </button>
  );
}

// ─── Smart pagination: show max 5 page buttons with ellipsis ─────────────────

function generatePageNumbers(
  current: number,
  total: number,
): (number | "...")[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "...")[] = [];

  if (current <= 3) {
    pages.push(1, 2, 3, 4, "...", total);
  } else if (current >= total - 2) {
    pages.push(1, "...", total - 3, total - 2, total - 1, total);
  } else {
    pages.push(1, "...", current - 1, current, current + 1, "...", total);
  }

  return pages;
}
