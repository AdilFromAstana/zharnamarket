-- Rename enum values from mapped Russian values to English codes

-- City enum
ALTER TYPE "City" RENAME VALUE 'Алматы' TO 'Almaty';
ALTER TYPE "City" RENAME VALUE 'Астана' TO 'Astana';
ALTER TYPE "City" RENAME VALUE 'Шымкент' TO 'Shymkent';
ALTER TYPE "City" RENAME VALUE 'Караганда' TO 'Karaganda';
ALTER TYPE "City" RENAME VALUE 'Актау' TO 'Aktau';
ALTER TYPE "City" RENAME VALUE 'Павлодар' TO 'Pavlodar';
ALTER TYPE "City" RENAME VALUE 'Все города' TO 'AllCities';

-- ContentCategory enum
ALTER TYPE "ContentCategory" RENAME VALUE 'Кино-нарезки' TO 'KinoNarezki';
ALTER TYPE "ContentCategory" RENAME VALUE 'Мемы' TO 'Memy';
ALTER TYPE "ContentCategory" RENAME VALUE 'Обзоры' TO 'Obzory';
ALTER TYPE "ContentCategory" RENAME VALUE 'Подкасты' TO 'Podkasty';
ALTER TYPE "ContentCategory" RENAME VALUE 'Геймплей' TO 'Geympley';
ALTER TYPE "ContentCategory" RENAME VALUE 'Музыка/Атмосфера' TO 'MuzykaAtmosfera';
ALTER TYPE "ContentCategory" RENAME VALUE 'Авто' TO 'Avto';
ALTER TYPE "ContentCategory" RENAME VALUE 'Красота' TO 'Krasota';
ALTER TYPE "ContentCategory" RENAME VALUE 'Спорт' TO 'Sport';
ALTER TYPE "ContentCategory" RENAME VALUE 'Мультфильмы' TO 'Multfilmy';
