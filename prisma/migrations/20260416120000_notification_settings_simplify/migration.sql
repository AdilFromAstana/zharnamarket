-- Упрощение настроек уведомлений: убираем неиспользуемые каналы (SMS, Push),
-- убираем "Задания рядом" (нет матчинга), добавляем единый флаг emailSecurity.

ALTER TABLE "notification_settings" ADD COLUMN "emailSecurity" BOOLEAN NOT NULL DEFAULT true;

-- Переносим существующее значение smsImportant в emailSecurity, если оно было отключено,
-- чтобы не менять поведение пользователя неявно.
UPDATE "notification_settings" SET "emailSecurity" = "smsImportant";

ALTER TABLE "notification_settings" DROP COLUMN "emailTasks";
ALTER TABLE "notification_settings" DROP COLUMN "smsImportant";
ALTER TABLE "notification_settings" DROP COLUMN "pushMessages";
