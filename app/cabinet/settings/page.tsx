"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Form,
  Input,
  Button,
  Switch,
  Modal,
  Avatar,
  Upload,
  Progress,
  Skeleton,
  Tag,
} from "antd";
import {
  UserOutlined,
  LockOutlined,
  BellOutlined,
  LogoutOutlined,
  CameraOutlined,
  DeleteOutlined,
  SafetyOutlined,
  DesktopOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  MailOutlined,
  PhoneOutlined,
  MobileOutlined,
  CloseOutlined,
  GoogleOutlined,
  LinkOutlined,
  DisconnectOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useAuth } from "@/contexts/AuthContext";

const ACCENT = "#0EA5E9";

function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  if (!password) return { score: 0, label: "", color: "#e5e7eb" };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels = [
    { score: 1, label: "Очень слабый", color: "#ef4444" },
    { score: 2, label: "Слабый", color: "#f97316" },
    { score: 3, label: "Средний", color: "#eab308" },
    { score: 4, label: "Хороший", color: "#22c55e" },
    { score: 5, label: "Отличный", color: ACCENT },
  ];
  const level = levels[Math.min(score, 5) - 1] ?? levels[0];
  return { score, label: level.label, color: level.color };
}

function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function avatarColor(seed: string): string {
  const palette = [
    "#0EA5E9",
    "#6366F1",
    "#8B5CF6",
    "#EC4899",
    "#F97316",
    "#10B981",
    "#14B8A6",
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return palette[Math.abs(hash) % palette.length];
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (minutes < 2) return "Только что";
  if (minutes < 60) return `${minutes} мин. назад`;
  if (hours < 24) return `${hours} ч. назад`;
  return `${days} дн. назад`;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  googleId: string | null;
  telegramId: string | null;
  telegramUsername: string | null;
  hasPassword: boolean;
}

interface Session {
  id: string;
  device: string | null;
  os: string | null;
  browser: string | null;
  ip: string | null;
  isCurrent: boolean;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
}

type TabKey = "account" | "security" | "notifications";

const NAV_ITEMS: { key: TabKey; label: string; icon: React.ReactNode; desc: string }[] = [
  { key: "account", label: "Аккаунт", icon: <UserOutlined />, desc: "Личные данные и фото" },
  { key: "security", label: "Безопасность", icon: <LockOutlined />, desc: "Пароль, сессии, удаление" },
  { key: "notifications", label: "Уведомления", icon: <BellOutlined />, desc: "Email-уведомления" },
];

// ─── Section: typed two-column layout helper ──────────────────────────────
function Section({
  title,
  description,
  children,
  tone,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <section
      className={[
        "grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-10 py-8 first:pt-0 border-b border-gray-100 last:border-b-0 last:pb-0",
      ].join(" ")}
    >
      <div className="lg:col-span-1">
        <h2
          className={[
            "text-base font-semibold",
            tone === "danger" ? "text-red-600" : "text-gray-900",
          ].join(" ")}
        >
          {title}
        </h2>
        {description && (
          <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{description}</p>
        )}
      </div>
      <div className="lg:col-span-2">{children}</div>
    </section>
  );
}

// ─── Telegram Icon ───────────────────────────────────────────────────────
function TelegramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="currentColor"
      aria-hidden="true"
      style={{ verticalAlign: "-0.125em" }}
    >
      <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
    </svg>
  );
}

// ─── Email Change Field ──────────────────────────────────────────────────
function EmailChangeField({ currentEmail }: { currentEmail: string }) {
  const [mode, setMode] = useState<"view" | "edit" | "verify">("view");
  const [newEmail, setNewEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRequestCode = async () => {
    if (!newEmail.trim()) return;
    setLoading(true);
    try {
      await api.post("/api/users/me/change-email", { newEmail: newEmail.trim() });
      toast.success("Код отправлен на новый email");
      setMode("verify");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Ошибка";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      await api.post("/api/users/me/verify-email-change", { code: code.trim() });
      toast.success("Email успешно изменён");
      window.location.reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Неверный код";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (mode === "view") {
    return (
      <div className="!mb-1">
        <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
        <div className="flex items-center gap-2">
          <Input
            prefix={<MailOutlined className="text-gray-400" />}
            value={currentEmail}
            disabled
            className="!text-gray-600"
            size="large"
          />
          <Button
            icon={<EditOutlined />}
            onClick={() => { setNewEmail(""); setMode("edit"); }}
            size="large"
          >
            Изменить
          </Button>
        </div>
      </div>
    );
  }

  if (mode === "edit") {
    return (
      <div className="!mb-1">
        <label className="block text-sm font-medium text-gray-700 mb-2">Новый email</label>
        <div className="flex items-center gap-2">
          <Input
            prefix={<MailOutlined className="text-gray-400" />}
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Введите новый email"
            size="large"
            onPressEnter={handleRequestCode}
          />
          <Button
            type="primary"
            loading={loading}
            onClick={handleRequestCode}
            size="large"
            style={{ background: ACCENT, borderColor: ACCENT }}
          >
            Отправить код
          </Button>
          <Button
            size="large"
            onClick={() => setMode("view")}
          >
            Отмена
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5">
          Код подтверждения будет отправлен на новый адрес.
        </p>
      </div>
    );
  }

  // mode === "verify"
  return (
    <div className="!mb-1">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Код подтверждения
      </label>
      <p className="text-sm text-gray-500 mb-2">
        Введите 6-значный код, отправленный на <strong>{newEmail}</strong>
      </p>
      <div className="flex items-center gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="000000"
          maxLength={6}
          size="large"
          className="!max-w-[180px] !text-center !tracking-widest !font-mono !text-lg"
          onPressEnter={handleVerify}
        />
        <Button
          type="primary"
          loading={loading}
          onClick={handleVerify}
          size="large"
          style={{ background: ACCENT, borderColor: ACCENT }}
        >
          Подтвердить
        </Button>
        <Button
          size="large"
          onClick={() => { setCode(""); setMode("edit"); }}
        >
          Назад
        </Button>
      </div>
      <p className="text-xs text-gray-400 mt-1.5">
        Код действителен 15 минут.{" "}
        <button
          type="button"
          className="text-sky-600 hover:underline"
          onClick={handleRequestCode}
        >
          Отправить повторно
        </button>
      </p>
    </div>
  );
}

// ─── Connected Accounts Section ──────────────────────────────────────────
function ConnectedAccountsSection({
  user,
  onRefresh,
}: {
  user: UserData | null;
  onRefresh: () => void;
}) {
  const [unlinkingProvider, setUnlinkingProvider] = useState<string | null>(null);
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [settingPassword, setSettingPassword] = useState(false);
  const strength = getPasswordStrength(newPassword);

  const handleUnlink = async (provider: "google" | "telegram") => {
    Modal.confirm({
      title: `Отвязать ${provider === "google" ? "Google" : "Telegram"}?`,
      content: "Вы больше не сможете входить через этот метод.",
      okText: "Отвязать",
      okType: "danger",
      cancelText: "Отмена",
      onOk: async () => {
        setUnlinkingProvider(provider);
        try {
          await api.post("/api/users/me/unlink", { provider });
          toast.success(`${provider === "google" ? "Google" : "Telegram"} отвязан`);
          onRefresh();
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Ошибка";
          toast.error(msg);
        } finally {
          setUnlinkingProvider(null);
        }
      },
    });
  };

  const handleSetPassword = async () => {
    if (newPassword.length < 8) {
      toast.error("Минимум 8 символов");
      return;
    }
    setSettingPassword(true);
    try {
      await api.post("/api/users/me/set-password", { password: newPassword });
      toast.success("Пароль установлен");
      setShowSetPassword(false);
      setNewPassword("");
      onRefresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Ошибка";
      toast.error(msg);
    } finally {
      setSettingPassword(false);
    }
  };

  if (!user) return null;

  const providers: {
    key: string;
    label: string;
    icon: React.ReactNode;
    connected: boolean;
    detail: string | null;
    color: string;
    onLink: () => void;
    onUnlink: () => void;
  }[] = [
    {
      key: "google",
      label: "Google",
      icon: <GoogleOutlined style={{ fontSize: 20 }} />,
      connected: !!user.googleId,
      detail: user.googleId ? "Привязан" : null,
      color: "#ea4335",
      onLink: () => { window.location.href = "/api/auth/google/link"; },
      onUnlink: () => handleUnlink("google"),
    },
    {
      key: "telegram",
      label: "Telegram",
      icon: <TelegramIcon />,
      connected: !!user.telegramId,
      detail: user.telegramUsername ? `@${user.telegramUsername}` : user.telegramId ? "Привязан" : null,
      color: "#0088cc",
      onLink: () => { window.location.href = "/api/auth/telegram"; },
      onUnlink: () => handleUnlink("telegram"),
    },
  ];

  return (
    <Section
      title="Способы входа"
      description="Управляйте методами авторизации. Нельзя отвязать последний способ входа."
    >
      <div className="space-y-2">
        {providers.map((p) => (
          <div
            key={p.key}
            className={[
              "flex items-center justify-between gap-3 p-3 sm:p-4 rounded-xl border transition-colors",
              p.connected
                ? "border-emerald-200 bg-emerald-50/40"
                : "border-gray-200 bg-white",
            ].join(" ")}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: p.connected ? `${p.color}15` : "#f3f4f6",
                  color: p.connected ? p.color : "#9ca3af",
                }}
              >
                {p.icon}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  {p.label}
                  {p.connected && (
                    <Tag color="green" className="!m-0 text-xs">Привязан</Tag>
                  )}
                </div>
                {p.detail && p.connected && (
                  <div className="text-xs text-gray-500 mt-0.5">{p.detail}</div>
                )}
              </div>
            </div>
            {p.connected ? (
              <Button
                size="small"
                type="text"
                danger
                icon={<DisconnectOutlined />}
                loading={unlinkingProvider === p.key}
                onClick={p.onUnlink}
              >
                Отвязать
              </Button>
            ) : (
              <Button
                size="small"
                type="default"
                icon={<LinkOutlined />}
                onClick={p.onLink}
              >
                Привязать
              </Button>
            )}
          </div>
        ))}

        {/* Password row */}
        <div
          className={[
            "flex items-center justify-between gap-3 p-3 sm:p-4 rounded-xl border transition-colors",
            user.hasPassword
              ? "border-emerald-200 bg-emerald-50/40"
              : "border-gray-200 bg-white",
          ].join(" ")}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: user.hasPassword ? `${ACCENT}15` : "#f3f4f6",
                color: user.hasPassword ? ACCENT : "#9ca3af",
              }}
            >
              <LockOutlined style={{ fontSize: 20 }} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                Пароль
                {user.hasPassword && (
                  <Tag color="green" className="!m-0 text-xs">Установлен</Tag>
                )}
              </div>
              {!user.hasPassword && (
                <div className="text-xs text-gray-500 mt-0.5">
                  Установите пароль для входа по email
                </div>
              )}
            </div>
          </div>
          {!user.hasPassword && !showSetPassword && (
            <Button
              size="small"
              type="default"
              icon={<LockOutlined />}
              onClick={() => setShowSetPassword(true)}
            >
              Установить
            </Button>
          )}
          {user.hasPassword && (
            <CheckCircleOutlined className="text-emerald-500 text-lg shrink-0" />
          )}
        </div>

        {/* Set password inline form */}
        {showSetPassword && !user.hasPassword && (
          <div className="p-4 rounded-xl border border-sky-200 bg-sky-50/40 space-y-3">
            <div>
              <Input.Password
                prefix={<LockOutlined className="text-gray-400" />}
                placeholder="Минимум 8 символов"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                size="large"
                onPressEnter={handleSetPassword}
              />
              {newPassword && (
                <div className="mt-2">
                  <Progress
                    percent={(strength.score / 5) * 100}
                    strokeColor={strength.color}
                    showInfo={false}
                    size="small"
                  />
                  <span className="text-xs" style={{ color: strength.color }}>
                    {strength.label}
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="primary"
                loading={settingPassword}
                onClick={handleSetPassword}
                style={{ background: ACCENT, borderColor: ACCENT }}
              >
                Установить пароль
              </Button>
              <Button onClick={() => { setShowSetPassword(false); setNewPassword(""); }}>
                Отмена
              </Button>
            </div>
          </div>
        )}
      </div>
    </Section>
  );
}

// ─── Account Tab ──────────────────────────────────────────────────────────
function AccountTab({
  user,
  loading,
  onSave,
  onAvatarChange,
  onDirtyChange,
  saveSignal,
  resetSignal,
}: {
  user: UserData | null;
  loading: boolean;
  onSave: (values: { name: string; phone: string }) => Promise<void>;
  onAvatarChange: (url: string) => void;
  onDirtyChange: (dirty: boolean) => void;
  saveSignal: number;
  resetSignal: number;
}) {
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const lastSaveSignal = useRef(saveSignal);
  const lastResetSignal = useRef(resetSignal);

  useEffect(() => {
    if (!user) return;
    form.setFieldsValue({
      name: user.name ?? "",
      phone: user.phone ?? "",
      email: user.email ?? "",
    });
  }, [user, form]);

  // Reset form on resetSignal
  useEffect(() => {
    if (resetSignal === lastResetSignal.current) return;
    lastResetSignal.current = resetSignal;
    if (!user) return;
    form.setFieldsValue({
      name: user.name ?? "",
      phone: user.phone ?? "",
    });
    onDirtyChange(false);
  }, [resetSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save on saveSignal
  useEffect(() => {
    if (saveSignal === lastSaveSignal.current) return;
    lastSaveSignal.current = saveSignal;
    (async () => {
      try {
        const values = (await form.validateFields()) as { name: string; phone: string };
        await onSave(values);
        onDirtyChange(false);
      } catch {
        // validation failed
      }
    })();
  }, [saveSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAvatarUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "avatar");

      const res = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Ошибка загрузки");
        return;
      }

      const { url } = await res.json();
      await api.patch("/api/users/me", { avatar: url });
      onAvatarChange(url);
      toast.success("Фото обновлено");
    } catch {
      toast.error("Ошибка загрузки фото");
    } finally {
      setUploading(false);
    }
  };

  const initials = getInitials(user?.name);
  const bg = useMemo(() => avatarColor(user?.id ?? user?.name ?? "x"), [user?.id, user?.name]);

  return (
    <div className="divide-y divide-gray-100">
      <Section
        title="Фото профиля"
        description="Используется в публичном профиле и комментариях. Рекомендуем квадратное изображение от 256×256 px."
      >
        <div className="flex items-center gap-5">
          <Upload
            accept="image/*"
            showUploadList={false}
            maxCount={1}
            disabled={uploading}
            beforeUpload={(file) => {
              handleAvatarUpload(file as unknown as File);
              return false;
            }}
          >
            <button
              type="button"
              className="relative group rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-400"
              aria-label="Изменить фото"
            >
              <Avatar
                size={88}
                src={user?.avatar ?? undefined}
                style={{ background: user?.avatar ? undefined : bg, fontSize: 28, fontWeight: 600 }}
              >
                {!user?.avatar && initials}
              </Avatar>
              <span className="absolute inset-0 rounded-full bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <CameraOutlined className="text-white text-xl" />
              </span>
            </button>
          </Upload>

          <div className="space-y-2">
            <Upload
              accept="image/*"
              showUploadList={false}
              maxCount={1}
              disabled={uploading}
              beforeUpload={(file) => {
                handleAvatarUpload(file as unknown as File);
                return false;
              }}
            >
              <Button icon={<CameraOutlined />} loading={uploading}>
                {uploading ? "Загрузка..." : "Загрузить новое"}
              </Button>
            </Upload>
            <p className="text-xs text-gray-400">JPG, PNG или GIF · до 5 МБ</p>
          </div>
        </div>
      </Section>

      <Section
        title="Личные данные"
        description="Имя видно другим пользователям. Телефон — только вам и по запросу для связи."
      >
        <Form
          form={form}
          layout="vertical"
          size="large"
          onValuesChange={() => onDirtyChange(true)}
          requiredMark={false}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <Form.Item
              label="Имя"
              name="name"
              rules={[
                { required: true, message: "Введите ваше имя" },
                { min: 2, message: "Минимум 2 символа" },
              ]}
            >
              <Input prefix={<UserOutlined className="text-gray-400" />} placeholder="Ваше имя" />
            </Form.Item>
            <Form.Item
              label="Телефон"
              name="phone"
              rules={[{ pattern: /^\+7\d{10}$/, message: "Формат: +7XXXXXXXXXX" }]}
            >
              <Input prefix={<PhoneOutlined className="text-gray-400" />} placeholder="+7 000 000 00 00" />
            </Form.Item>
          </div>

          <EmailChangeField currentEmail={user?.email ?? ""} />
        </Form>
      </Section>
    </div>
  );
}

// ─── Security Tab ─────────────────────────────────────────────────────────
function SecurityTab({
  loading,
  user,
  onPasswordChange,
  onLogout,
  onDeleteAccount,
  onRefreshUser,
}: {
  loading: boolean;
  user: UserData | null;
  onPasswordChange: (passwords: { currentPassword: string; newPassword: string }) => Promise<void>;
  onLogout: () => void;
  onDeleteAccount: () => void;
  onRefreshUser: () => void;
}) {
  const [form] = Form.useForm();
  const [newPassword, setNewPassword] = useState("");
  const strength = getPasswordStrength(newPassword);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [terminatingId, setTerminatingId] = useState<string | null>(null);
  const [terminatingAll, setTerminatingAll] = useState(false);

  useEffect(() => {
    api
      .get<Session[]>("/api/settings/sessions")
      .then(setSessions)
      .catch(() => {})
      .finally(() => setSessionsLoading(false));
  }, []);

  const handleTerminateSession = async (id: string) => {
    setTerminatingId(id);
    try {
      await api.delete(`/api/settings/sessions/${id}`);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      toast.success("Сессия завершена");
    } catch {
      toast.error("Не удалось завершить сессию");
    } finally {
      setTerminatingId(null);
    }
  };

  const handleTerminateAll = async () => {
    setTerminatingAll(true);
    try {
      await api.delete("/api/settings/sessions");
      setSessions((prev) => prev.filter((s) => s.isCurrent));
      toast.success("Все другие сессии завершены");
    } catch {
      toast.error("Ошибка при завершении сессий");
    } finally {
      setTerminatingAll(false);
    }
  };

  const handlePasswordSubmit = async () => {
    try {
      const values = (await form.validateFields()) as {
        currentPassword: string;
        newPassword: string;
        confirmPassword: string;
      };
      if (values.newPassword !== values.confirmPassword) {
        form.setFields([{ name: "confirmPassword", errors: ["Пароли не совпадают"] }]);
        return;
      }
      await onPasswordChange({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      form.resetFields();
      setNewPassword("");
    } catch {
      // validation failed
    }
  };

  const handleDeleteAccount = () => {
    Modal.confirm({
      title: "Удалить аккаунт?",
      icon: <ExclamationCircleOutlined style={{ color: "#ef4444" }} />,
      content:
        "Это действие необратимо. Все ваши данные, задания и профили будут удалены безвозвратно.",
      okText: "Удалить навсегда",
      okType: "danger",
      cancelText: "Отмена",
      onOk: () => onDeleteAccount(),
    });
  };

  const otherSessions = sessions.filter((s) => !s.isCurrent);

  return (
    <div className="divide-y divide-gray-100">
      <ConnectedAccountsSection user={user} onRefresh={onRefreshUser} />

      <Section title="Пароль" description="Используйте не менее 8 символов, включая цифры и буквы разного регистра.">
        <Form form={form} layout="vertical" size="large" requiredMark={false}>
          <Form.Item
            label="Текущий пароль"
            name="currentPassword"
            rules={[{ required: true, message: "Введите текущий пароль" }]}
          >
            <Input.Password prefix={<LockOutlined className="text-gray-400" />} placeholder="Текущий пароль" />
          </Form.Item>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <Form.Item
              label="Новый пароль"
              name="newPassword"
              rules={[
                { required: true, message: "Введите новый пароль" },
                { min: 8, message: "Минимум 8 символов" },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined className="text-gray-400" />}
                placeholder="Минимум 8 символов"
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </Form.Item>

            <Form.Item
              label="Повторите пароль"
              name="confirmPassword"
              rules={[{ required: true, message: "Подтвердите пароль" }]}
            >
              <Input.Password prefix={<LockOutlined className="text-gray-400" />} placeholder="Повторите пароль" />
            </Form.Item>
          </div>

          {newPassword && (
            <div className="-mt-2 mb-4">
              <Progress
                percent={(strength.score / 5) * 100}
                strokeColor={strength.color}
                showInfo={false}
                size="small"
              />
              <span className="text-xs" style={{ color: strength.color }}>
                {strength.label}
              </span>
            </div>
          )}

          <Button
            type="primary"
            loading={loading}
            onClick={handlePasswordSubmit}
            style={{ background: ACCENT, borderColor: ACCENT }}
          >
            Обновить пароль
          </Button>
        </Form>
      </Section>

      <Section
        title="Активные сессии"
        description="Где вы вошли в аккаунт. Если видите незнакомое устройство — завершите сессию и смените пароль."
      >
        {sessionsLoading ? (
          <div className="space-y-3">
            <Skeleton.Input active block style={{ height: 64 }} />
            <Skeleton.Input active block style={{ height: 64 }} />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">Нет активных сессий</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => {
              const isMobile =
                session.device?.toLowerCase().includes("mobile") ||
                session.os?.toLowerCase().includes("ios") ||
                session.os?.toLowerCase().includes("android");
              return (
                <div
                  key={session.id}
                  className={[
                    "flex items-center justify-between gap-3 p-3 sm:p-4 rounded-xl border transition-colors",
                    session.isCurrent
                      ? "border-emerald-200 bg-emerald-50/40"
                      : "border-gray-200 bg-white hover:border-gray-300",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={[
                        "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
                        session.isCurrent ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-500",
                      ].join(" ")}
                    >
                      {isMobile ? (
                        <MobileOutlined style={{ fontSize: 20 }} />
                      ) : (
                        <DesktopOutlined style={{ fontSize: 20 }} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 flex items-center gap-2 truncate">
                        <span className="truncate">
                          {session.isCurrent
                            ? "Это устройство"
                            : (session.device ?? "Неизвестное устройство")}
                        </span>
                        {session.isCurrent && (
                          <Tag color="green" className="!m-0 text-xs">
                            Текущая
                          </Tag>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 truncate">
                        {[session.os, session.browser, formatRelative(session.lastActiveAt)]
                          .filter(Boolean)
                          .join(" · ")}
                        {session.ip && <span className="text-gray-400"> · {session.ip}</span>}
                      </div>
                    </div>
                  </div>
                  {session.isCurrent ? (
                    <SafetyOutlined className="text-emerald-500 text-lg shrink-0" />
                  ) : (
                    <Button
                      size="small"
                      type="text"
                      danger
                      loading={terminatingId === session.id}
                      onClick={() => handleTerminateSession(session.id)}
                      className="shrink-0"
                    >
                      Завершить
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {otherSessions.length > 0 && (
          <div className="mt-3">
            <Button
              size="small"
              danger
              ghost
              loading={terminatingAll}
              onClick={() =>
                Modal.confirm({
                  title: "Завершить все другие сессии?",
                  content: "Все устройства кроме текущего будут разлогинены.",
                  okText: "Завершить",
                  okType: "danger",
                  cancelText: "Отмена",
                  onOk: handleTerminateAll,
                })
              }
            >
              Завершить все другие ({otherSessions.length})
            </Button>
          </div>
        )}
      </Section>

      <Section title="Выход" description="Завершить сессию на этом устройстве. Вы сможете войти снова в любой момент.">
        <Button icon={<LogoutOutlined />} onClick={onLogout}>
          Выйти из аккаунта
        </Button>
      </Section>

      <Section
        tone="danger"
        title="Удаление аккаунта"
        description="Все ваши данные, задания и профили будут безвозвратно удалены. Это действие нельзя отменить."
      >
        <Button danger icon={<DeleteOutlined />} onClick={handleDeleteAccount}>
          Удалить аккаунт
        </Button>
      </Section>
    </div>
  );
}

// ─── Notifications Tab (auto-save) ────────────────────────────────────────
type NotificationKey = "email_replies" | "email_security" | "email_news";

const NOTIFICATION_ITEMS: { key: NotificationKey; label: string; desc: string }[] = [
  {
    key: "email_replies",
    label: "Новые отклики",
    desc: "Когда креатор откликнулся на ваше задание",
  },
  {
    key: "email_security",
    label: "Безопасность аккаунта",
    desc: "Вход с нового устройства, сброс и смена пароля",
  },
  {
    key: "email_news",
    label: "Новости платформы",
    desc: "Обновления и акции Zharnamarket",
  },
];

function NotificationsTab() {
  const [settings, setSettings] = useState<Record<NotificationKey, boolean> | null>(null);
  const [savingKey, setSavingKey] = useState<NotificationKey | null>(null);

  useEffect(() => {
    api
      .get<{
        emailReplies: boolean;
        emailSecurity: boolean;
        emailNews: boolean;
      }>("/api/settings/notifications")
      .then((data) => {
        setSettings({
          email_replies: data.emailReplies,
          email_security: data.emailSecurity,
          email_news: data.emailNews,
        });
      })
      .catch(() => {
        setSettings({
          email_replies: true,
          email_security: true,
          email_news: false,
        });
      });
  }, []);

  const persist = async (next: Record<NotificationKey, boolean>) => {
    try {
      await api.put("/api/settings/notifications", {
        emailReplies: next.email_replies,
        emailSecurity: next.email_security,
        emailNews: next.email_news,
      });
      toast.success("Сохранено", { duration: 1500 });
    } catch {
      toast.error("Не удалось сохранить");
    }
  };

  const handleToggle = async (key: NotificationKey) => {
    if (!settings) return;
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    setSavingKey(key);
    await persist(next);
    setSavingKey(null);
  };

  return (
    <div className="divide-y divide-gray-100">
      <Section
        title="Email-уведомления"
        description="Приходят на ваш почтовый ящик. Другие каналы мы пока не поддерживаем."
      >
        {!settings ? (
          <div className="space-y-2">
            <Skeleton.Input active block style={{ height: 64 }} />
            <Skeleton.Input active block style={{ height: 64 }} />
            <Skeleton.Input active block style={{ height: 64 }} />
          </div>
        ) : (
          <div className="space-y-2">
            {NOTIFICATION_ITEMS.map((item) => {
              const checked = settings[item.key];
              return (
                <div
                  key={item.key}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleToggle(item.key)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleToggle(item.key);
                    }
                  }}
                  className="w-full text-left flex items-center justify-between gap-4 p-4 rounded-xl border border-gray-200 hover:border-gray-300 bg-white transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-400"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 text-sm">{item.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
                  </div>
                  <Switch
                    checked={checked}
                    loading={savingKey === item.key}
                    onChange={() => handleToggle(item.key)}
                    onClick={(_, e) => e.stopPropagation()}
                    style={checked ? { background: ACCENT } : undefined}
                  />
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const router = useRouter();
  const { isLoading: authLoading, logout: authLogout } = useAuth();

  useRequireAuth();

  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("account");
  const [user, setUser] = useState<UserData | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  // Account dirty + signal-based save/reset
  const [accountDirty, setAccountDirty] = useState(false);
  const [saveSignal, setSaveSignal] = useState(0);
  const [resetSignal, setResetSignal] = useState(0);

  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authLoading) return;
    api
      .get<UserData>("/api/users/me")
      .then(setUser)
      .catch(() => {})
      .finally(() => setUserLoading(false));
  }, [authLoading]);

  // Scroll content to top when switching tabs
  useEffect(() => {
    contentRef.current?.scrollTo?.({ top: 0, behavior: "smooth" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeTab]);

  const handleSaveProfile = async (values: { name: string; phone: string }) => {
    setProfileLoading(true);
    try {
      await api.patch<UserData>("/api/users/me", {
        name: values.name,
        phone: values.phone,
      });
      toast.success("Профиль обновлён");
      window.location.reload();
    } catch {
      toast.error("Ошибка сохранения");
      throw new Error("save failed");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (passwords: {
    currentPassword: string;
    newPassword: string;
  }) => {
    setPasswordLoading(true);
    try {
      await api.post("/api/users/me/change-password", passwords);
      toast.success("Пароль успешно изменён");
    } catch {
      toast.error("Неверный текущий пароль");
      throw new Error("password change failed");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogout = () => {
    Modal.confirm({
      title: "Выйти из аккаунта?",
      icon: <LogoutOutlined />,
      content: "Вы будете перенаправлены на страницу входа.",
      okText: "Выйти",
      okType: "danger",
      cancelText: "Отмена",
      onOk: async () => {
        await authLogout();
        toast.info("До свидания!");
        router.push("/auth/login");
      },
    });
  };

  // ── tab content ─────────────────────────────────────────────────────────
  const tabContent: Record<TabKey, React.ReactNode> = {
    account: (
      <AccountTab
        user={user}
        loading={profileLoading}
        onSave={handleSaveProfile}
        onAvatarChange={(url) => setUser((prev) => (prev ? { ...prev, avatar: url } : prev))}
        onDirtyChange={setAccountDirty}
        saveSignal={saveSignal}
        resetSignal={resetSignal}
      />
    ),
    security: (
      <SecurityTab
        loading={passwordLoading}
        user={user}
        onPasswordChange={handleChangePassword}
        onLogout={handleLogout}
        onRefreshUser={() => {
          api.get<UserData>("/api/users/me").then(setUser).catch(() => {});
        }}
        onDeleteAccount={async () => {
          try {
            await api.delete("/api/users/me");
            toast.success("Аккаунт удалён");
            await authLogout();
            window.location.href = "/";
          } catch {
            toast.error("Ошибка удаления аккаунта");
          }
        }}
      />
    ),
    notifications: <NotificationsTab />,
  };

  if (authLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  const showStickyBar = activeTab === "account" && accountDirty;

  return (
    <div className="max-w-6xl mx-auto pb-24">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Настройки</h1>
        <p className="text-sm text-gray-500 mt-1">Управляйте профилем, безопасностью и уведомлениями.</p>
      </div>

      {/* MOBILE: pills */}
      <div className="lg:hidden mb-4">
        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
          <div className="flex gap-2 w-max">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={[
                  "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                  activeTab === item.key
                    ? "bg-sky-500 text-white shadow-sm"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-sky-300 hover:text-sky-600",
                ].join(" ")}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-8">
        {/* DESKTOP: sidebar nav */}
        <aside className="hidden lg:block">
          <nav className="sticky top-24 space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  className={[
                    "w-full text-left flex items-start gap-3 px-3 py-3 rounded-xl transition-colors group",
                    active
                      ? "bg-sky-50 text-sky-700"
                      : "text-gray-700 hover:bg-gray-50",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      active ? "bg-white text-sky-600 shadow-sm" : "bg-gray-100 text-gray-500 group-hover:bg-white",
                    ].join(" ")}
                  >
                    {item.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium leading-tight">{item.label}</span>
                    <span className={["block text-xs mt-0.5", active ? "text-sky-600/80" : "text-gray-400"].join(" ")}>
                      {item.desc}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* CONTENT */}
        <div ref={contentRef} className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 lg:p-8">
          {userLoading && activeTab === "account" ? (
            <Skeleton active paragraph={{ rows: 8 }} />
          ) : (
            tabContent[activeTab]
          )}
        </div>
      </div>

      {/* STICKY SAVE BAR */}
      {showStickyBar && (
        <div className="fixed bottom-0 inset-x-0 z-40 px-4 pb-4 pointer-events-none">
          <div className="max-w-6xl mx-auto pointer-events-auto">
            <div className="flex items-center justify-between gap-3 bg-gray-900 text-white rounded-2xl shadow-2xl px-4 sm:px-5 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <ExclamationCircleOutlined className="text-amber-400 shrink-0" />
                <span className="text-sm truncate">У вас есть несохранённые изменения</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="text"
                  icon={<CloseOutlined />}
                  onClick={() => setResetSignal((n) => n + 1)}
                  className="!text-white hover:!bg-white/10"
                >
                  <span className="hidden sm:inline">Отменить</span>
                </Button>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  loading={profileLoading}
                  onClick={() => setSaveSignal((n) => n + 1)}
                  style={{ background: ACCENT, borderColor: ACCENT }}
                >
                  Сохранить
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
