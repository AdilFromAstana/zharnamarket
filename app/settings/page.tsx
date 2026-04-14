"use client";

import React, { useState, useEffect } from "react";
import {
  Form,
  Input,
  Button,
  Tabs,
  Switch,
  Divider,
  Alert,
  Tag,
  Modal,
  Avatar,
  Upload,
  Progress,
  Spin,
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
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import PublicLayout from "@/components/layout/PublicLayout";
import { api } from "@/lib/api-client";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useAuth } from "@/contexts/AuthContext";

// ─── Утилита: сила пароля ──────────────────────────────────────────────────
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
    { score: 5, label: "Отличный", color: "#0EA5E9" },
  ];
  const level = levels[Math.min(score, 5) - 1] ?? levels[0];
  return { score, label: level.label, color: level.color };
}

interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
}

// ─── Секция Аккаунт ────────────────────────────────────────────────────────
function AccountTab({
  user,
  loading,
  onSave,
  onAvatarChange,
}: {
  user: UserData | null;
  loading: boolean;
  onSave: (values: { name: string; phone: string }) => void;
  onAvatarChange: (url: string) => void;
}) {
  const [form] = Form.useForm();
  const [isDirty, setIsDirty] = useState(false);
  const [uploading, setUploading] = useState(false);

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

      // Обновляем аватар пользователя
      await api.patch("/api/users/me", { avatar: url });
      onAvatarChange(url);
      toast.success("Фото обновлено");
    } catch {
      toast.error("Ошибка загрузки фото");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Аватар */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-4 text-base">
          Фото профиля
        </h3>
        <div className="flex items-center gap-5">
          <div className="relative group">
            <Avatar
              size={80}
              icon={<UserOutlined />}
              src={user?.avatar ?? undefined}
              style={{ background: "#0EA5E9" }}
              className="text-2xl"
            />
            <Upload
              accept="image/*"
              showUploadList={false}
              maxCount={1}
              disabled={uploading}
              beforeUpload={(file) => {
                handleAvatarUpload(file as unknown as File);
                return false; // prevent default upload
              }}
            >
              <button
                className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                aria-label="Изменить фото"
              >
                <CameraOutlined className="text-white text-lg" />
              </button>
            </Upload>
          </div>
          <div>
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
              <Button
                size="small"
                icon={<CameraOutlined />}
                loading={uploading}
              >
                {uploading ? "Загрузка..." : "Загрузить фото"}
              </Button>
            </Upload>
            <p className="text-xs text-gray-400 mt-1.5">
              JPG, PNG или GIF · до 5 МБ
            </p>
          </div>
        </div>
      </div>

      <Divider className="my-4" />

      {/* Личные данные */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-4 text-base">
          Личные данные
        </h3>
        <Form
          form={form}
          layout="vertical"
          size="large"
          initialValues={{
            name: user?.name ?? "",
            phone: user?.phone ?? "",
            email: user?.email ?? "",
          }}
          onValuesChange={() => setIsDirty(true)}
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
              <Input
                prefix={<UserOutlined className="text-gray-400" />}
                placeholder="Ваше имя"
              />
            </Form.Item>
            <Form.Item
              label="Телефон"
              name="phone"
              rules={[
                {
                  pattern: /^\+7\d{10}$/,
                  message: "Формат: +7XXXXXXXXXX",
                },
              ]}
            >
              <Input
                prefix={<PhoneOutlined className="text-gray-400" />}
                placeholder="+7 000 000 00 00"
              />
            </Form.Item>
          </div>

          {/* Email — readonly */}
          <Form.Item label="Email" name="email">
            <Input
              prefix={<MailOutlined className="text-gray-400" />}
              disabled
              suffix={
                <Tag
                  color="orange"
                  className="text-xs cursor-default select-none"
                >
                  Не изменяется
                </Tag>
              }
            />
          </Form.Item>
          <p className="text-xs text-gray-400 -mt-3 mb-4">
            Для смены email обратитесь в поддержку
          </p>

          <Button
            type="primary"
            loading={loading}
            disabled={!isDirty}
            onClick={async () => {
              const values = (await form.validateFields()) as {
                name: string;
                phone: string;
              };
              onSave(values);
              setIsDirty(false);
            }}
            style={{ background: "#0EA5E9", borderColor: "#0EA5E9" }}
            icon={isDirty ? <CheckCircleOutlined /> : undefined}
          >
            {isDirty ? "Сохранить изменения" : "Изменений нет"}
          </Button>

          {isDirty && (
            <span className="ml-3 text-sm text-amber-600">
              <ExclamationCircleOutlined className="mr-1" />
              Есть несохранённые изменения
            </span>
          )}
        </Form>
      </div>
    </div>
  );
}

// ─── Тип Session ──────────────────────────────────────────────────────────
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

/** Форматирует дату в читаемое "X дней назад / только что" */
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

// ─── Секция Безопасность ───────────────────────────────────────────────────
function SecurityTab({
  loading,
  onPasswordChange,
  onLogout,
  onDeleteAccount,
}: {
  loading: boolean;
  onPasswordChange: (passwords: {
    currentPassword: string;
    newPassword: string;
  }) => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
}) {
  const [form] = Form.useForm();
  const [newPassword, setNewPassword] = useState("");
  const strength = getPasswordStrength(newPassword);

  // ─── Сессии ──────────────────────────────────────────────────────────────
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
        form.setFields([
          {
            name: "confirmPassword",
            errors: ["Пароли не совпадают"],
          },
        ]);
        return;
      }
      onPasswordChange({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      form.resetFields();
      setNewPassword("");
    } catch {
      // валидация не прошла
    }
  };

  const handleDeleteAccount = () => {
    Modal.confirm({
      title: "Удалить аккаунт?",
      icon: <ExclamationCircleOutlined style={{ color: "#ef4444" }} />,
      content:
        "Это действие необратимо. Все ваши данные, задания и профили будут удалены.",
      okText: "Удалить",
      okType: "danger",
      cancelText: "Отмена",
      onOk: () => onDeleteAccount(),
    });
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Смена пароля */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-4 text-base">
          Смена пароля
        </h3>
        <Form form={form} layout="vertical" size="large">
          <Form.Item
            label="Текущий пароль"
            name="currentPassword"
            rules={[{ required: true, message: "Введите текущий пароль" }]}
          >
            <Input.Password
              prefix={<LockOutlined className="text-gray-400" />}
              placeholder="Ваш текущий пароль"
            />
          </Form.Item>

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

          {/* Индикатор силы пароля */}
          {newPassword && (
            <div className="mb-4 -mt-2">
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

          <Form.Item
            label="Повторите новый пароль"
            name="confirmPassword"
            rules={[{ required: true, message: "Подтвердите пароль" }]}
          >
            <Input.Password
              prefix={<LockOutlined className="text-gray-400" />}
              placeholder="Повторите новый пароль"
            />
          </Form.Item>

          <Button
            type="primary"
            loading={loading}
            onClick={handlePasswordSubmit}
            style={{ background: "#0EA5E9", borderColor: "#0EA5E9" }}
          >
            Изменить пароль
          </Button>
        </Form>
      </div>

      <Divider />

      {/* Активные сессии */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-4 text-base">
          Активные сессии
        </h3>

        {sessionsLoading ? (
          <div className="flex justify-center py-6">
            <Spin size="small" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">Нет активных сессий</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={[
                  "flex items-center justify-between p-4 rounded-xl border",
                  session.isCurrent
                    ? "border-green-200 bg-green-50"
                    : "border-gray-200",
                ].join(" ")}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={[
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      session.isCurrent
                        ? "bg-white border border-green-200"
                        : "bg-gray-100",
                    ].join(" ")}
                  >
                    {session.device?.toLowerCase().includes("mobile") ||
                    session.os?.toLowerCase().includes("ios") ||
                    session.os?.toLowerCase().includes("android") ? (
                      <PhoneOutlined
                        className={
                          session.isCurrent
                            ? "text-green-600 text-lg"
                            : "text-gray-500 text-lg"
                        }
                      />
                    ) : (
                      <DesktopOutlined
                        className={
                          session.isCurrent
                            ? "text-green-600 text-lg"
                            : "text-gray-500 text-lg"
                        }
                      />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                      {session.isCurrent
                        ? "Это устройство"
                        : (session.device ?? "Неизвестное устройство")}
                      {session.isCurrent && (
                        <Tag color="green" className="text-xs">
                          Текущая
                        </Tag>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {[
                        session.os,
                        session.browser,
                        formatRelative(session.lastActiveAt),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      {session.ip && (
                        <span className="ml-1 text-gray-400">
                          · {session.ip}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {session.isCurrent ? (
                  <SafetyOutlined className="text-green-500 text-lg" />
                ) : (
                  <Button
                    size="small"
                    danger
                    type="text"
                    loading={terminatingId === session.id}
                    onClick={() => handleTerminateSession(session.id)}
                  >
                    Завершить
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {sessions.filter((s) => !s.isCurrent).length > 0 && (
          <Button
            className="mt-3"
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
            Завершить все другие сессии
          </Button>
        )}
      </div>

      <Divider />

      {/* Опасная зона */}
      <div>
        <h3 className="font-semibold text-red-600 mb-4 text-base flex items-center gap-2">
          <ExclamationCircleOutlined />
          Опасная зона
        </h3>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
          {/* Выйти из аккаунта */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-900">
                Выйти из аккаунта
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                Завершить текущую сессию на этом устройстве
              </div>
            </div>
            <Button danger icon={<LogoutOutlined />} onClick={onLogout}>
              Выйти
            </Button>
          </div>

          <Divider className="my-2" />

          {/* Удалить аккаунт */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-red-700">
                Удалить аккаунт
              </div>
              <div className="text-xs text-red-400 mt-0.5">
                Необратимое действие — все данные будут удалены
              </div>
            </div>
            <Button
              danger
              ghost
              icon={<DeleteOutlined />}
              onClick={handleDeleteAccount}
            >
              Удалить
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Секция Уведомления ────────────────────────────────────────────────────
type NotificationKey =
  | "email_replies"
  | "email_tasks"
  | "email_news"
  | "sms_important"
  | "push_messages";

const NOTIFICATION_GROUPS: {
  title: string;
  icon: React.ReactNode;
  items: { key: NotificationKey; label: string; desc: string }[];
}[] = [
  {
    title: "Email-уведомления",
    icon: <MailOutlined />,
    items: [
      {
        key: "email_replies",
        label: "Новые отклики",
        desc: "Когда кто-то откликнулся на ваше задание",
      },
      {
        key: "email_tasks",
        label: "Задания рядом",
        desc: "Новые задания по вашим навыкам",
      },
      {
        key: "email_news",
        label: "Новости платформы",
        desc: "Обновления и акции Viral Wall",
      },
    ],
  },
  {
    title: "Push / SMS-уведомления",
    icon: <MobileOutlined />,
    items: [
      {
        key: "sms_important",
        label: "Важные события",
        desc: "Безопасность и действия аккаунта",
      },
      {
        key: "push_messages",
        label: "Сообщения",
        desc: "Новые сообщения от пользователей",
      },
    ],
  },
];

function NotificationsTab() {
  const [settings, setSettings] = useState<Record<NotificationKey, boolean>>({
    email_replies: true,
    email_tasks: true,
    email_news: false,
    sms_important: true,
    push_messages: false,
  });
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Загружаем настройки при монтировании
  useEffect(() => {
    api
      .get<{
        emailReplies: boolean;
        emailTasks: boolean;
        emailNews: boolean;
        smsImportant: boolean;
        pushMessages: boolean;
      }>("/api/settings/notifications")
      .then((data) => {
        setSettings({
          email_replies: data.emailReplies,
          email_tasks: data.emailTasks,
          email_news: data.emailNews,
          sms_important: data.smsImportant,
          push_messages: data.pushMessages,
        });
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const toggle = (key: NotificationKey) =>
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/api/settings/notifications", {
        emailReplies: settings.email_replies,
        emailTasks: settings.email_tasks,
        emailNews: settings.email_news,
        smsImportant: settings.sms_important,
        pushMessages: settings.push_messages,
      });
      toast.success("Настройки уведомлений сохранены");
    } catch {
      toast.error("Ошибка сохранения настроек");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-6">
      <Alert
        type="info"
        showIcon
        title="Уведомления помогают не пропустить важное"
        description="Выберите, какие события вам интересны. Критические уведомления безопасности приходят всегда."
        className="rounded-xl"
      />

      {NOTIFICATION_GROUPS.map((group) => (
        <div key={group.title}>
          <h3 className="font-semibold text-gray-900 mb-3 text-base flex items-center gap-2">
            <span>{group.icon}</span>
            {group.title}
          </h3>
          <div className="space-y-2">
            {group.items.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer"
                onClick={() => toggle(item.key)}
              >
                <div>
                  <div className="font-medium text-gray-900 text-sm">
                    {item.label}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {item.desc}
                  </div>
                </div>
                <Switch
                  checked={settings[item.key]}
                  onChange={() => toggle(item.key)}
                  onClick={(_, e) => e.stopPropagation()}
                  style={
                    settings[item.key] ? { background: "#0EA5E9" } : undefined
                  }
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      <Button
        type="primary"
        style={{ background: "#0EA5E9", borderColor: "#0EA5E9" }}
        loading={saving}
        onClick={handleSave}
      >
        Сохранить настройки
      </Button>
    </div>
  );
}

// ─── Конфигурация табов ────────────────────────────────────────────────────
type TabKey = "account" | "security" | "notifications";

const TAB_CONFIG: {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
}[] = [
  { key: "account", label: "Аккаунт", icon: <UserOutlined /> },
  { key: "security", label: "Безопасность", icon: <LockOutlined /> },
  { key: "notifications", label: "Уведомления", icon: <BellOutlined /> },
];

// ─── Главная страница ──────────────────────────────────────────────────────
export default function SettingsPage() {
  const router = useRouter();
  const { isLoading: authLoading, logout: authLogout } = useAuth();

  // Защита страницы — редирект если не авторизован
  useRequireAuth();

  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("account");
  const [user, setUser] = useState<UserData | null>(null);

  useEffect(() => {
    if (authLoading) return;
    api
      .get<UserData>("/api/users/me")
      .then(setUser)
      .catch(() => {});
  }, [authLoading]);

  if (authLoading) {
    return (
      <PublicLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Spin size="large" />
        </div>
      </PublicLayout>
    );
  }

  const handleSaveProfile = async (values: { name: string; phone: string }) => {
    setProfileLoading(true);
    try {
      const updated = await api.patch<UserData>("/api/users/me", {
        name: values.name,
        phone: values.phone,
      });
      setUser(updated);
      toast.success("Профиль обновлён");
    } catch {
      toast.error("Ошибка сохранения");
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

  // Контент активного таба (переиспользуется на мобиле и десктопе)
  const tabContent: Record<TabKey, React.ReactNode> = {
    account: (
      <AccountTab
        user={user}
        loading={profileLoading}
        onSave={handleSaveProfile}
        onAvatarChange={(url) => {
          setUser((prev) => (prev ? { ...prev, avatar: url } : prev));
        }}
      />
    ),
    security: (
      <SecurityTab
        loading={passwordLoading}
        onPasswordChange={handleChangePassword}
        onLogout={handleLogout}
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

  // Для Ant Design Tabs (десктоп)
  const tabItems = TAB_CONFIG.map((tab) => ({
    key: tab.key,
    label: (
      <span className="flex items-center gap-1.5">
        {tab.icon}
        {tab.label}
      </span>
    ),
    children: tabContent[tab.key],
  }));

  return (
    <PublicLayout>
      <div className="max-w-2xl">
        {/* Hero-шапка: аватар + имя + email */}
        <div className="flex items-center gap-4 mb-6">
          <Avatar
            size={56}
            icon={<UserOutlined />}
            src={user?.avatar ?? undefined}
            style={{ background: "#0EA5E9", flexShrink: 0 }}
            className="text-xl"
          />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 leading-tight truncate">
              {user?.name ?? "—"}
            </h1>
            <p className="text-sm text-gray-500 truncate">
              {user?.email ?? ""}
            </p>
          </div>
        </div>

        {/* ── МОБИЛЬ: горизонтальные таблетки + контент ── */}
        <div className="block md:hidden">
          {/* Скролл-строка с таблетками */}
          <div className="overflow-x-auto scrollbar-hide pb-2 mb-0 -mx-4 px-4">
            <div className="flex gap-2 w-max">
              {TAB_CONFIG.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={[
                    "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                    activeTab === tab.key
                      ? "bg-sky-500 text-white shadow-sm"
                      : "bg-white border border-gray-200 text-gray-600 hover:border-sky-300 hover:text-sky-600",
                  ].join(" ")}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Контент активного таба на мобиле */}
          <div className="bg-white rounded-2xl border border-gray-200 mt-3 px-4 pt-4">
            {tabContent[activeTab]}
          </div>
        </div>

        {/* ── ДЕСКТОП: стандартный Ant Design Tabs ── */}
        <div className="hidden md:block bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <Tabs
            items={tabItems}
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as TabKey)}
            className="px-6 pt-4"
          />
        </div>
      </div>
    </PublicLayout>
  );
}
