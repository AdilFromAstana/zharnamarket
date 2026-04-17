"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Drawer, Dropdown, Button } from "antd";
import {
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuOutlined,
  CloseOutlined,
  PlusOutlined,
  FileTextOutlined,
  UnorderedListOutlined,
  TeamOutlined,
  AppstoreOutlined,
  DownOutlined,
  LoginOutlined,
  SafetyCertificateOutlined,
  WalletOutlined,
  DashboardOutlined,
  TagOutlined,
  AuditOutlined,
  FlagOutlined,
  FolderOutlined,
  VideoCameraOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { cn, getAvatarGradient } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import TopupDrawer from "@/components/balance/TopupDrawer";
import { useBalance, useInvalidateBalance } from "@/hooks/useBalance";

const NAV_LINKS = [
  { href: "/ads", label: "Задания", icon: <UnorderedListOutlined /> },
  { href: "/creators", label: "Креаторы", icon: <TeamOutlined /> },
];

const ADMIN_NAV_LINKS = [
  {
    href: "/admin",
    label: "Дашборд",
    icon: <DashboardOutlined />,
    exact: true,
  },
  { href: "/admin/users", label: "Пользователи", icon: <TeamOutlined /> },
  { href: "/admin/promo", label: "Промокоды", icon: <TagOutlined /> },
  { href: "/admin/moderation", label: "Модерация", icon: <AuditOutlined /> },
  {
    href: "/admin/submissions",
    label: "Заявки",
    icon: <VideoCameraOutlined />,
  },
  { href: "/admin/withdrawals", label: "Выводы", icon: <DollarOutlined /> },
  { href: "/admin/reports", label: "Жалобы", icon: <FlagOutlined /> },
  { href: "/admin/categories", label: "Категории", icon: <FolderOutlined /> },
];

/** Градиентный аватар с инициалом пользователя */
function GradientAvatar({
  name,
  avatarColor,
  size = "sm",
}: {
  name?: string;
  avatarColor?: string | null;
  size?: "sm" | "md";
}) {
  const sizeClass = size === "md" ? "w-10 h-10 text-base" : "w-7 h-7 text-sm";
  const initial = name?.charAt(0).toUpperCase() ?? "U";
  const gradient =
    avatarColor ??
    (name ? getAvatarGradient(name) : "from-sky-500 to-blue-600");
  return (
    <div
      className={cn(
        "rounded-full bg-gradient-to-br flex items-center justify-center text-white font-semibold shadow-sm shrink-0",
        sizeClass,
        gradient,
      )}
    >
      {initial}
    </div>
  );
}

export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoggedIn, isLoading, isAdmin, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [topupOpen, setTopupOpen] = useState(false);
  const walletBalance = useBalance();
  const invalidateBalance = useInvalidateBalance();

  // Дропдаун «+ Создать» — два действия для авторизованных пользователей
  const createMenuItems: MenuProps["items"] = [
    {
      key: "create-ad",
      icon: <FileTextOutlined />,
      label: (
        <div>
          <div className="font-medium">Задание</div>
          <div className="text-xs text-gray-400">Ищу создателя контента</div>
        </div>
      ),
      onClick: () => {
        if (!isLoggedIn) {
          router.push("/auth/login?next=/ads/new");
        } else {
          router.push("/ads/new");
        }
      },
    },
    {
      key: "create-profile",
      icon: <UserOutlined />,
      label: (
        <div>
          <div className="font-medium">Профиль</div>
          <div className="text-xs text-gray-400">Я создаю контент</div>
        </div>
      ),
      onClick: () => {
        if (!isLoggedIn) {
          router.push("/auth/login?next=/creators/new");
        } else {
          router.push("/creators/new");
        }
      },
    },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      toast.info("До свидания!");
      router.push("/auth/login");
    } catch {
      toast.error("Ошибка при выходе");
    }
  };

  const accountMenuItems: MenuProps["items"] = isAdmin
    ? [
        {
          key: "admin",
          icon: <DashboardOutlined />,
          label: <Link href="/admin">Дашборд</Link>,
        },
        {
          key: "settings",
          icon: <SettingOutlined />,
          label: <Link href="/cabinet/settings">Настройки</Link>,
        },
        { type: "divider" },
        {
          key: "logout",
          icon: <LogoutOutlined />,
          label: "Выйти",
          danger: true,
          onClick: handleLogout,
        },
      ]
    : [
        {
          key: "cabinet",
          icon: <UserOutlined />,
          label: <Link href="/cabinet">Мой кабинет</Link>,
        },
        {
          key: "balance",
          icon: <WalletOutlined />,
          label: <Link href="/cabinet/balance">Кошелёк</Link>,
        },
        {
          key: "settings",
          icon: <SettingOutlined />,
          label: <Link href="/cabinet/settings">Настройки</Link>,
        },
        { type: "divider" },
        {
          key: "logout",
          icon: <LogoutOutlined />,
          label: "Выйти",
          danger: true,
          onClick: handleLogout,
        },
      ];

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 md:h-16 gap-4">
            {/* Левая группа: логотип + навигация */}
            <div className="flex items-center gap-8 min-w-0">
              <Link href="/" className="flex items-center gap-2 shrink-0">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  Z
                </div>
                <span className="font-bold text-gray-900 text-base tracking-tight">
                  zharnamarket
                </span>
              </Link>

              {/* Nav — только desktop */}
              <nav className="hidden md:flex items-center gap-1">
                {isAdmin
                  ? ADMIN_NAV_LINKS.map((link) => {
                      const isActive = link.exact
                        ? pathname === link.href
                        : pathname?.startsWith(link.href) &&
                          !(link.href === "/admin" && pathname !== "/admin");
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                            isActive
                              ? "bg-amber-50 text-amber-700"
                              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50",
                          )}
                        >
                          {link.label}
                        </Link>
                      );
                    })
                  : NAV_LINKS.map((link) => {
                      const isActive = pathname?.startsWith(link.href);
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                            isActive
                              ? "bg-sky-50 text-sky-700"
                              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50",
                          )}
                        >
                          {link.label}
                        </Link>
                      );
                    })}
              </nav>
            </div>

            {/* Правая часть */}
            <div className="flex items-center gap-2">
              {/* Кошелёк-пилюля + быстрое пополнение — desktop */}
              {!isLoading && isLoggedIn && !isAdmin && (
                <div className="hidden md:flex items-center gap-1">
                  <Link
                    href="/cabinet/balance"
                    className="flex items-center h-9 rounded-full border border-gray-200 bg-gray-50 px-3 gap-1.5 text-sm font-semibold text-gray-900 hover:text-emerald-600 hover:border-gray-300 transition-colors"
                    title="Кошелёк"
                  >
                    <WalletOutlined style={{ color: "#10b981" }} />
                    <span>
                      {walletBalance === null
                        ? "—"
                        : walletBalance.toLocaleString("ru")}
                    </span>
                    <span className="text-xs font-normal text-gray-400">₸</span>
                  </Link>
                  <button
                    onClick={() => setTopupOpen(true)}
                    className="w-9 h-9 rounded-full border border-gray-200 bg-gray-50 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-600 flex items-center justify-center text-gray-500 transition-colors"
                    title="Пополнить"
                  >
                    <PlusOutlined className="text-xs" />
                  </button>
                </div>
              )}

              {/* Кнопка «+ Создать» с дропдауном — desktop (скрыта для админа, гостей и на страницах создания) */}
              {!isAdmin &&
                isLoggedIn &&
                !pathname?.startsWith("/ads/new") &&
                !pathname?.startsWith("/creators/new") && (
                  <Dropdown
                    menu={{ items: createMenuItems }}
                    trigger={["click"]}
                    placement="bottomRight"
                    className="hidden md:block"
                  >
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      className="!bg-gradient-to-br !from-sky-500 !to-blue-600 !border-0 !shadow-md hidden md:inline-flex"
                    >
                      Создать
                    </Button>
                  </Dropdown>
                )}

              {/* Аккаунт — авторизованный (desktop) */}
              {!isLoading && isLoggedIn && (
                <Dropdown
                  menu={{ items: accountMenuItems }}
                  trigger={["click"]}
                  placement="bottomRight"
                >
                  <button className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                    <GradientAvatar
                      name={user?.name}
                      avatarColor={user?.avatarColor}
                      size="sm"
                    />
                    <span className="text-sm font-medium text-gray-900 max-w-[100px] truncate">
                      {user?.name}
                    </span>
                    <DownOutlined className="text-gray-400 text-[10px]" />
                  </button>
                </Dropdown>
              )}

              {/* Кнопки входа для неавторизованных (desktop) */}
              {!isLoading && !isLoggedIn && (
                <div className="hidden md:flex items-center gap-3">
                  <Link
                    href="/auth/register"
                    className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Регистрация
                  </Link>
                  <Link href="/auth/login">
                    <Button
                      type="primary"
                      icon={<LoginOutlined />}
                      style={{ background: "#0EA5E9", borderColor: "#0EA5E9" }}
                    >
                      Войти
                    </Button>
                  </Link>
                </div>
              )}

              {/* Mobile: бургер */}
              <Button
                type="text"
                icon={<MenuOutlined />}
                className="!w-11 !h-11 !flex md:!hidden items-center justify-center"
                onClick={() => setDrawerOpen(true)}
                aria-label="Открыть меню"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Topup Modal/Drawer — opens from header */}
      <TopupDrawer
        open={topupOpen}
        onClose={() => {
          setTopupOpen(false);
          invalidateBalance();
        }}
      />

      {/* Mobile Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        placement="right"
        size="default"
        title={
          isLoggedIn && user ? (
            <div className="flex items-center gap-3">
              <GradientAvatar
                name={user.name}
                avatarColor={user.avatarColor}
                size="md"
              />
              <div>
                <div className="text-sm font-semibold text-gray-900 leading-none">
                  {user.name}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{user.email}</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <UserOutlined className="text-gray-400" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">Гость</div>
                <div className="text-xs text-gray-400">Не авторизован</div>
              </div>
            </div>
          )
        }
        closeIcon={<CloseOutlined />}
      >
        {/* ─── Админская навигация ─────────────────────────────── */}
        {isAdmin ? (
          <>
            <nav className="space-y-1 mb-6">
              <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider px-3 mb-2">
                Админ-панель
              </p>
              {ADMIN_NAV_LINKS.map((link) => {
                const isActive = link.exact
                  ? pathname === link.href
                  : pathname?.startsWith(link.href) &&
                    !(
                      link.exact === undefined &&
                      link.href === "/admin" &&
                      pathname !== "/admin"
                    );
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setDrawerOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-amber-50 text-amber-700"
                        : "text-gray-700 hover:bg-gray-50",
                    )}
                  >
                    <span className="text-base">{link.icon}</span>
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Аккаунт — админ */}
            <div className="border-t border-gray-100 pt-4 space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">
                Аккаунт
              </p>
              <Link
                href="/cabinet/settings"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <SettingOutlined /> Настройки
              </Link>
              <button
                onClick={async () => {
                  setDrawerOpen(false);
                  await handleLogout();
                }}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors text-red-500 hover:bg-red-50 w-full text-left"
              >
                <span className="text-red-500">
                  <LogoutOutlined />
                </span>
                Выйти
              </button>
            </div>
          </>
        ) : (
          <>
            {/* ─── Обычная навигация (не-админ) ──────────────────── */}
            <nav className="space-y-1 mb-6">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">
                Навигация
              </p>
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setDrawerOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                    pathname?.startsWith(link.href)
                      ? "bg-sky-50 text-sky-700"
                      : "text-gray-700 hover:bg-gray-50",
                  )}
                >
                  <span className="text-base">{link.icon}</span>
                  {link.label}
                </Link>
              ))}

              {/* Кабинет — только для авторизованных */}
              {isLoggedIn && (
                <Link
                  href="/cabinet"
                  onClick={() => setDrawerOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                    pathname?.startsWith("/cabinet") ||
                      pathname?.startsWith("/ads/manage")
                      ? "bg-sky-50 text-sky-700"
                      : "text-gray-700 hover:bg-gray-50",
                  )}
                >
                  <span className="text-base">
                    <AppstoreOutlined />
                  </span>
                  Кабинет
                </Link>
              )}

              {/* Кошелёк — только для авторизованных */}
              {isLoggedIn && (
                <Link
                  href="/cabinet/balance"
                  onClick={() => setDrawerOpen(false)}
                  className={cn(
                    "flex items-center justify-between gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                    pathname?.startsWith("/cabinet/balance")
                      ? "bg-sky-50 text-sky-700"
                      : "text-gray-700 hover:bg-gray-50",
                  )}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-base">
                      <WalletOutlined />
                    </span>
                    Кошелёк
                  </span>
                  {walletBalance !== null && (
                    <span className="text-xs font-semibold text-emerald-600">
                      {walletBalance.toLocaleString("ru")} ₸
                    </span>
                  )}
                </Link>
              )}

              {isLoggedIn && (
                <button
                  onClick={() => {
                    setDrawerOpen(false);
                    setTimeout(() => setTopupOpen(true), 300);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-emerald-700 hover:bg-emerald-50 transition-colors text-left"
                >
                  <span className="text-base">
                    <PlusOutlined />
                  </span>
                  Пополнить кошелёк
                </button>
              )}
            </nav>

            {/* CTA — создать */}
            {isLoggedIn ? (
              <div className="mb-6 flex flex-col gap-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3">
                  Создать
                </p>
                <Link href="/ads/new" onClick={() => setDrawerOpen(false)}>
                  <Button
                    type="primary"
                    block
                    icon={<FileTextOutlined />}
                    className="!bg-gradient-to-br !from-sky-500 !to-blue-600 !border-0 !shadow-md"
                  >
                    Задание (ищу креатора)
                  </Button>
                </Link>
                <Link href="/creators/new" onClick={() => setDrawerOpen(false)}>
                  <Button block icon={<UserOutlined />}>
                    Профиль (я создаю контент)
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="mb-6 flex flex-col gap-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3">
                  Аккаунт
                </p>
                <Link href="/auth/login" onClick={() => setDrawerOpen(false)}>
                  <Button
                    type="primary"
                    block
                    icon={<LoginOutlined />}
                    style={{ background: "#0EA5E9", borderColor: "#0EA5E9" }}
                  >
                    Войти
                  </Button>
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setDrawerOpen(false)}
                >
                  <Button block icon={<UserOutlined />}>
                    Создать аккаунт
                  </Button>
                </Link>
              </div>
            )}

            {/* Аккаунт — только для авторизованных */}
            {isLoggedIn && (
              <div className="border-t border-gray-100 pt-4 space-y-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">
                  Аккаунт
                </p>
                <Link
                  href="/cabinet/settings"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <SettingOutlined /> Настройки
                </Link>
                <button
                  onClick={async () => {
                    setDrawerOpen(false);
                    await handleLogout();
                  }}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors text-red-500 hover:bg-red-50 w-full text-left"
                >
                  <span className="text-red-500">
                    <LogoutOutlined />
                  </span>
                  Выйти
                </button>
              </div>
            )}
          </>
        )}
      </Drawer>
    </>
  );
}
