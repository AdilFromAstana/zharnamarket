export interface User {
  id: string;
  email: string;
  phone: string;
  name: string;
  avatar: string | null;
  emailVerified: boolean;
  createdAt: string;
}

export interface AdvertiserProfile {
  userId: string;
  companyName: string;
  companyType: string | null;
  city: string;
  description: string | null;
  telegram: string | null;
  whatsapp: string | null;
  website: string | null;
}

/**
 * Публичный профиль заказчика (рекламодателя).
 * Используется на странице /customers/[id].
 * Охватывает как бизнес (companyName), так и частных лиц (displayName = user.name).
 */
export interface CustomerPublicProfile {
  /** = ownerId из объявлений */
  id: string;
  /** Отображаемое имя: companyName || user.name || "Заказчик" */
  displayName: string;
  /** true — бизнес с AdvertiserProfile; false — частное лицо */
  isCompany: boolean;
  companyType: string | null;
  city: string;
  description: string | null;
  telegram: string | null;
  whatsapp: string | null;
  website: string | null;
  /** ISO-строка даты регистрации на платформе */
  memberSince: string;
  /** Верифицирован ли заказчик */
  verified: boolean;
}
