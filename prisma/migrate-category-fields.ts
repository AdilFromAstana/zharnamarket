/**
 * Миграция: проставить adFormatId, adSubjectId и исправить videoFormatId
 * для всех существующих объявлений на основе анализа содержания.
 * Также переписывает мусорные объявления (тестовые данные).
 *
 * Запуск: npx tsx prisma/migrate-category-fields.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ── ID справочников (из seed) ───────────────────────────────────────────────
const VF = {
  FilmClips:       "cmnoyj4xc0000v22v6oy1xub8",
  PodcastClips:    "cmnoyj4yf0001v22v1jvstgmw",
  Memes:           "cmnoyj4yh0002v22v8uhnwzxm",
  Blog:            "cmnoyj4yi0003v22vud0sw5qr",
  Reviews:         "cmnoyj4yj0004v22vnmg1uspm",
  StreamClips:     "cmnoyj4yk0005v22v2atxgbqq",
  Gameplay:        "cmnoyj4yl0006v22v7xbzt2no",
  StoryBackground: "cmnoyj4ym0007v22vx3aaq8ej",
  ProductReview:   "cmnoyj4yn0008v22vmxxmntf7",
  TalkingHead:     "cmnoyj4yo0009v22vp6omqfxo",
  Tutorial:        "cmnoyj4yq000av22vn1gq0lwu",
  Animation:       "cmnoyj4yr000bv22vbhpew7xw",
};

const AF = {
  Hook:             "cmnoyj4yu000cv22vd1hkqs0f",
  BannerOverlay:    "cmnoyj4yx000dv22vyvpegl4n",
  Ticker:           "cmnoyj4yy000ev22vnx8io4bw",
  NativeIntegration:"cmnoyj4yz000fv22vgfymnkg2",
  TextOverlay:      "cmnoyj4z0000gv22vmn648825",
  FullTakeover:     "cmnoyj4z1000hv22vgttbyso9",
};

const AS = {
  PhysicalProduct: "cmnoyj4z3000iv22v0d8p5o34",
  Service:         "cmnoyj4z6000jv22vunq9kl7l",
  Promotion:       "cmnoyj4z7000kv22vnq1rrh4p",
  AppSoftware:     "cmnoyj4z9000lv22vb9503qz5",
  Course:          "cmnoyj4zb000mv22vr56wlqd6",
  Event:           "cmnoyj4zd000nv22v8huk4xsy",
  Restaurant:      "cmnoyj4ze000ov22vq8aktb5m",
  BrandAwareness:  "cmnoyj4zf000pv22v369y50j0",
};

// ── Основная таблица маппинга ─────────────────────────────────────────────────
// [adId, videoFormatId, adFormatId, adSubjectId, title?, description?]
// title/description — только для мусорных объявлений
type AdUpdate = {
  id: string;
  videoFormat: string;
  adFormat: string;
  adSubject: string;
  title?: string;
  description?: string;
};

const UPDATES: AdUpdate[] = [
  // ── Seed-объявления (первые 5) ─────────────────────────────────────────────
  {
    id: "cmn8f3ulw0008v52v708yt0jz",
    videoFormat: VF.Reviews,
    adFormat: AF.NativeIntegration,
    adSubject: AS.PhysicalProduct,
  },
  {
    id: "cmn8f3ume0009v52vclppoyvq",
    videoFormat: VF.Blog,
    adFormat: AF.NativeIntegration,
    adSubject: AS.Restaurant,
  },
  {
    id: "cmn8f3ums000av52vkfhnd8r6",
    videoFormat: VF.Reviews,
    adFormat: AF.NativeIntegration,
    adSubject: AS.Service,
  },
  {
    id: "cmn8f3unb000bv52v9jpzadym",
    videoFormat: VF.Memes,
    adFormat: AF.NativeIntegration,
    adSubject: AS.AppSoftware,
  },
  {
    id: "cmn8f3unk000cv52vibx2uivx",
    videoFormat: VF.Gameplay,
    adFormat: AF.NativeIntegration,
    adSubject: AS.Service,
  },

  // ── Мусорные тестовые объявления ──────────────────────────────────────────
  {
    id: "cmn932se200011w2ved2yq9dy",
    videoFormat: VF.FilmClips,
    adFormat: AF.Hook,
    adSubject: AS.BrandAwareness,
    title: "Нарезки из фильмов — вирусный контент для продвижения бренда",
    description: "Ищем автора коротких вовлекающих нарезок из популярных фильмов и сериалов для YouTube Shorts. Задача — создать ролик, который удерживает внимание первые 3 секунды мощным хуком, вызывает эмоцию и органично заканчивается упоминанием нашего продукта. Опыт работы с монтажом и знание трендов приветствуется.",
  },
  {
    id: "cmn933kky00021w2vd3mxu0tt",
    videoFormat: VF.Memes,
    adFormat: AF.Ticker,
    adSubject: AS.BrandAwareness,
    title: "Мем-видео с промокодом — продвижение через вирусный юмор",
    description: "Нужен автор смешных и вирусных мем-видео для продвижения в YouTube. Формат: короткий скетч или ситуация из жизни с неожиданной концовкой. В нижней части видео бегущая строка с информацией о нашем продукте и промокодом. Главное — юмор и досмотр до конца.",
  },
  {
    id: "cmn945ktz00031w2vaka6lo01",
    videoFormat: VF.StoryBackground,
    adFormat: AF.TextOverlay,
    adSubject: AS.BrandAwareness,
    title: "История + фоновая активность — реклама через сторителлинг",
    description: "Ищем автора для создания YouTube-ролика в формате «история + уборка/готовка/порядок на фоне». Пока на экране идёт успокаивающая фоновая активность, голос за кадром рассказывает историю, которая плавно приводит к рекламному сообщению. Текст с промокодом появляется в нужный момент на экране. Формат «satisfying» с нарративом.",
  },
  {
    id: "cmn94fvqf0002x52vo901isyc",
    videoFormat: VF.ProductReview,
    adFormat: AF.Hook,
    adSubject: AS.Promotion,
    title: "Обзор товара с хуком — акция со скидкой 100%",
    description: "Нужен автор для создания обзорного видео с зацепляющим хуком в начале. Цель: показать товар в деле, подчеркнуть его преимущества и в конце объявить об акции. Промокод даёт 100% скидку — это сильный инструмент для виральности. Видео должно удерживать внимание с первой секунды.",
  },

  // ── GlamourStyle ──────────────────────────────────────────────────────────
  {
    id: "cmn955mi20005bq2vyd9grjn5",
    videoFormat: VF.Memes,
    adFormat: AF.Ticker,
    adSubject: AS.PhysicalProduct,
  },

  // ── Damdi Kafe ────────────────────────────────────────────────────────────
  {
    id: "cmn955mi90006bq2vgtdpyja6",
    videoFormat: VF.Memes,
    adFormat: AF.Ticker,
    adSubject: AS.Restaurant,
  },

  // ── CleanMaster ───────────────────────────────────────────────────────────
  {
    id: "cmn955mie0007bq2vfa0wha9y",
    videoFormat: VF.StoryBackground,
    adFormat: AF.Ticker,
    adSubject: AS.Service,
  },

  // ── SpeakEnglish ──────────────────────────────────────────────────────────
  {
    id: "cmn955min0008bq2vru2l6kcl",
    videoFormat: VF.Memes,
    adFormat: AF.Ticker,
    adSubject: AS.Course,
  },

  // ── ParHouse ──────────────────────────────────────────────────────────────
  {
    id: "cmn955miq0009bq2vkyq56ypl",
    videoFormat: VF.Memes,
    adFormat: AF.Ticker,
    adSubject: AS.Service,
  },

  // ── AutoService Almaty (история клиента) ─────────────────────────────────
  {
    id: "cmnje9tuy0000fs2v1pvzv6l7",
    videoFormat: VF.StoryBackground,
    adFormat: AF.Hook,
    adSubject: AS.Service,
  },

  // ── Прачечная Белоснег (обучающий Reels) ─────────────────────────────────
  {
    id: "cmnje9tv80002fs2vrqhn2eqd",
    videoFormat: VF.Tutorial,
    adFormat: AF.Hook,
    adSubject: AS.Service,
  },

  // ── AutoService Nur (топ-5 авто) ──────────────────────────────────────────
  {
    id: "cmnje9tvc0003fs2v7l7ri87s",
    videoFormat: VF.Reviews,
    adFormat: AF.Hook,
    adSubject: AS.Service,
  },

  // ── IT Startup KZ (90% стартапов умирают) ────────────────────────────────
  {
    id: "cmnje9tvi0005fs2vj5kjl4h9",
    videoFormat: VF.TalkingHead,
    adFormat: AF.Hook,
    adSubject: AS.AppSoftware,
  },

  // ── Game Cafe (сколько зарабатывает киберспортсмен) ───────────────────────
  {
    id: "cmnje9tvn0007fs2vhabpl959",
    videoFormat: VF.Gameplay,
    adFormat: AF.Hook,
    adSubject: AS.Service,
  },

  // ── FitClub Almaty (трансформация 90 дней) ───────────────────────────────
  {
    id: "cmnje9tvp0008fs2vg3dus8oz",
    videoFormat: VF.StoryBackground,
    adFormat: AF.Hook,
    adSubject: AS.Service,
  },

  // ── Красота Studio (лак 3 дня vs 3 недели) ───────────────────────────────
  {
    id: "cmnje9tvs000afs2vskkgfiqi",
    videoFormat: VF.Tutorial,
    adFormat: AF.Hook,
    adSubject: AS.Service,
  },

  // ── Ресторан Дастархан (казахская кухня 500 лет) ─────────────────────────
  {
    id: "cmnje9tvv000bfs2vs3ht244i",
    videoFormat: VF.StoryBackground,
    adFormat: AF.Hook,
    adSubject: AS.Restaurant,
  },

  // ── SkyGym Astana (30 дней без сахара) ────────────────────────────────────
  {
    id: "cmnje9tw0000dfs2v49wx44g0",
    videoFormat: VF.Tutorial,
    adFormat: AF.Hook,
    adSubject: AS.Service,
  },

  // ── Детский центр Радуга (рисование и математика) ────────────────────────
  {
    id: "cmnje9tw5000ffs2vub365pcq",
    videoFormat: VF.Tutorial,
    adFormat: AF.Hook,
    adSubject: AS.Course,
  },

  // ── Шымкент Моторс (запчасти Toyota) ─────────────────────────────────────
  {
    id: "cmnje9tw6000gfs2v3qvz66ok",
    videoFormat: VF.Reviews,
    adFormat: AF.Hook,
    adSubject: AS.Service,
  },

  // ── KZ Talks (предприниматель потерял 10 млн) ────────────────────────────
  {
    id: "cmnje9tw9000ifs2vqng1v18f",
    videoFormat: VF.PodcastClips,
    adFormat: AF.Hook,
    adSubject: AS.BrandAwareness,
  },

  // ── Pavlodar Pizza (200 000 пицц) ─────────────────────────────────────────
  {
    id: "cmnje9twb000jfs2vhk90o9gg",
    videoFormat: VF.TalkingHead,
    adFormat: AF.Hook,
    adSubject: AS.Restaurant,
  },

  // ── Galaxy Tech (смартфон чаще ремонтируют) ───────────────────────────────
  {
    id: "cmnje9twf000lfs2vgdajzy4d",
    videoFormat: VF.Reviews,
    adFormat: AF.Hook,
    adSubject: AS.Service,
  },

  // ── Актау Фреш (арбуз 800 км) ─────────────────────────────────────────────
  {
    id: "cmnje9twh000nfs2viucvnbn2",
    videoFormat: VF.StoryBackground,
    adFormat: AF.Hook,
    adSubject: AS.PhysicalProduct,
  },

  // ── Кино Club (сцена из казахского кино) ─────────────────────────────────
  {
    id: "cmnje9twj000ofs2vdv48oem0",
    videoFormat: VF.FilmClips,
    adFormat: AF.Hook,
    adSubject: AS.BrandAwareness,
  },

  // ── Steppe Coffee (кофе в Астане vs Европе) ───────────────────────────────
  {
    id: "cmnje9twk000pfs2vo9yr4iq9",
    videoFormat: VF.TalkingHead,
    adFormat: AF.Hook,
    adSubject: AS.Restaurant,
  },

  // ── MusicBox KZ (гитара и математика) ────────────────────────────────────
  {
    id: "cmnje9twm000rfs2v6qkl624s",
    videoFormat: VF.Tutorial,
    adFormat: AF.Hook,
    adSubject: AS.Course,
  },

  // ── KZ Memes Hub (мемы про день предпринимателя) ─────────────────────────
  {
    id: "cmnje9two000sfs2vgku085ic",
    videoFormat: VF.Memes,
    adFormat: AF.FullTakeover,
    adSubject: AS.BrandAwareness,
  },

  // ── Karaganda Print (визитки и деньги) ────────────────────────────────────
  {
    id: "cmnje9twr000ufs2vj88y7fyr",
    videoFormat: VF.Reviews,
    adFormat: AF.Hook,
    adSubject: AS.Service,
  },

  // ── Elite Realty KZ (70% покупают квартиру не там) ───────────────────────
  {
    id: "cmnje9twu000vfs2vyodnb9n9",
    videoFormat: VF.TalkingHead,
    adFormat: AF.Hook,
    adSubject: AS.Service,
  },

  // ── SportZone Pavlodar (цена не тренироваться) ────────────────────────────
  {
    id: "cmnje9twx000xfs2vmymc76s1",
    videoFormat: VF.Tutorial,
    adFormat: AF.Hook,
    adSubject: AS.Service,
  },

  // ── AnimaKids Studio (ребёнок научился читать) ───────────────────────────
  {
    id: "cmnje9tx0000yfs2vwel14hy8",
    videoFormat: VF.StoryBackground,
    adFormat: AF.Hook,
    adSubject: AS.Course,
  },

  // ── TechHub Karaganda (разработчики $3000 удалённо) ──────────────────────
  {
    id: "cmnje9tx30010fs2vf7kqa86c",
    videoFormat: VF.PodcastClips,
    adFormat: AF.Hook,
    adSubject: AS.Course,
  },

  // ── AktauSurf Club (Каспий серфинг) ──────────────────────────────────────
  {
    id: "cmnje9tx40011fs2v2w14b097",
    videoFormat: VF.Blog,
    adFormat: AF.Hook,
    adSubject: AS.Service,
  },

  // ── GreenBox Delivery (еда за 40 минут) ──────────────────────────────────
  {
    id: "cmnje9tx70013fs2vx7zcpg2e",
    videoFormat: VF.StoryBackground,
    adFormat: AF.Hook,
    adSubject: AS.Service,
  },

  // ── Шымкент Студия (предприниматель из Туркестана) ────────────────────────
  {
    id: "cmnje9tx80014fs2vlctkorxx",
    videoFormat: VF.PodcastClips,
    adFormat: AF.Hook,
    adSubject: AS.BrandAwareness,
  },

  // ── AsiaFashion KZ (казахстанские дизайнеры) ─────────────────────────────
  {
    id: "cmnje9tx90015fs2vcydjmri9",
    videoFormat: VF.Reviews,
    adFormat: AF.Hook,
    adSubject: AS.PhysicalProduct,
  },

  // ── TravelKZ (место, о котором не знает 99%) ─────────────────────────────
  {
    id: "cmnje9txb0017fs2v4utljfbm",
    videoFormat: VF.Blog,
    adFormat: AF.Hook,
    adSubject: AS.Service,
  },

  // ── Ромашка Суши (японский шеф и шоколадка-маки) ─────────────────────────
  {
    id: "cmnje9txc0018fs2v99vt2xy0",
    videoFormat: VF.ProductReview,
    adFormat: AF.Hook,
    adSubject: AS.Restaurant,
  },

  // ── DevSchool KZ (Python за сколько) ─────────────────────────────────────
  {
    id: "cmnje9txe0019fs2vu1i4jvly",
    videoFormat: VF.Tutorial,
    adFormat: AF.Hook,
    adSubject: AS.Course,
  },

  // ── GlowUp Beauty (корейский уход 30 дней) ────────────────────────────────
  {
    id: "cmnje9txh001bfs2v0zphk7gh",
    videoFormat: VF.Blog,
    adFormat: AF.Hook,
    adSubject: AS.PhysicalProduct,
  },

  // ── Qazaq Air (Актау → Алматы сравнение) ─────────────────────────────────
  {
    id: "cmnje9txj001cfs2vn63fobuc",
    videoFormat: VF.Reviews,
    adFormat: AF.Hook,
    adSubject: AS.Service,
  },

  // ── StreetFood Almaty (кухня без редактирования) ─────────────────────────
  {
    id: "cmnje9txl001efs2v82ryhmch",
    videoFormat: VF.Blog,
    adFormat: AF.NativeIntegration,
    adSubject: AS.Restaurant,
  },

  // ── KazGold Jewellery (казахское золото дешевле) ─────────────────────────
  {
    id: "cmnje9txl001ffs2vjjd8595q",
    videoFormat: VF.Reviews,
    adFormat: AF.Hook,
    adSubject: AS.PhysicalProduct,
  },

  // ── KidsLearn Online (7-летний ребёнок задача 3-го класса) ───────────────
  {
    id: "cmnje9txn001hfs2vlaw5vpr8",
    videoFormat: VF.Tutorial,
    adFormat: AF.Hook,
    adSubject: AS.Course,
  },

  // ── CycleKZ (велосипедист Алматы → Астана) ────────────────────────────────
  {
    id: "cmnje9txo001ifs2vzy0u71th",
    videoFormat: VF.Blog,
    adFormat: AF.Hook,
    adSubject: AS.Service,
  },

  // ── HalalFood KZ (что значит халяль на упаковке) ─────────────────────────
  {
    id: "cmnje9txq001kfs2v4rktr52m",
    videoFormat: VF.TalkingHead,
    adFormat: AF.Hook,
    adSubject: AS.PhysicalProduct,
  },

  // ── TikTok Agency KZ (20 аккаунтов, 3 ошибки) ────────────────────────────
  {
    id: "cmnje9txs001lfs2vz9pz6hq2",
    videoFormat: VF.PodcastClips,
    adFormat: AF.Hook,
    adSubject: AS.Service,
  },

  // ── GreenCity Nursery (фикус 3 года без пересадки) ───────────────────────
  {
    id: "cmnje9txu001nfs2vtqvkld4u",
    videoFormat: VF.Blog,
    adFormat: AF.Hook,
    adSubject: AS.PhysicalProduct,
  },

  // ── BankKZ Digital (10 000 ₸ в 2020) ─────────────────────────────────────
  {
    id: "cmnje9txv001ofs2vvy663r5n",
    videoFormat: VF.TalkingHead,
    adFormat: AF.Hook,
    adSubject: AS.AppSoftware,
  },

  // ── Nomad BBQ (мясо 5 методов) ────────────────────────────────────────────
  {
    id: "cmnje9txx001qfs2v9xpql4pu",
    videoFormat: VF.ProductReview,
    adFormat: AF.Hook,
    adSubject: AS.PhysicalProduct,
  },

  // ── Pavlodar Авто (топ-3 запчасти) ───────────────────────────────────────
  {
    id: "cmnje9txy001rfs2v0d91n54g",
    videoFormat: VF.Reviews,
    adFormat: AF.Hook,
    adSubject: AS.Service,
  },

  // ── Kino Reviews KZ («Игра в кальмара» и капитализм) ─────────────────────
  {
    id: "cmnje9txz001tfs2v5p2ixzr7",
    videoFormat: VF.FilmClips,
    adFormat: AF.Hook,
    adSubject: AS.BrandAwareness,
  },

  // ── Aktau Hotel Sea (цены в высокий сезон) ────────────────────────────────
  {
    id: "cmnje9ty0001ufs2v1amasd7a",
    videoFormat: VF.TalkingHead,
    adFormat: AF.Hook,
    adSubject: AS.Service,
  },

  // ── Qazaqstan Nomads (40 стран, Казахстан лучший) ────────────────────────
  {
    id: "cmnje9ty2001wfs2vjcmj6j6w",
    videoFormat: VF.Blog,
    adFormat: AF.Hook,
    adSubject: AS.Service,
  },

  // ── MedClinic KZ (3 симптома до инфаркта) ────────────────────────────────
  {
    id: "cmnje9ty2001xfs2vg2u897xz",
    videoFormat: VF.Tutorial,
    adFormat: AF.Hook,
    adSubject: AS.Service,
  },

  // ── KazTelecom Digital (интернет 2026) ───────────────────────────────────
  {
    id: "cmnje9ty4001yfs2vztacfxlk",
    videoFormat: VF.TalkingHead,
    adFormat: AF.Hook,
    adSubject: AS.Service,
  },

  // ── Shymkent Flowers (цветы 14 дней) ─────────────────────────────────────
  {
    id: "cmnje9ty50020fs2vr5ql9z45",
    videoFormat: VF.ProductReview,
    adFormat: AF.Hook,
    adSubject: AS.PhysicalProduct,
  },

  // ── Karaganda Gym Pro (человек без спорта 3 месяца) ──────────────────────
  {
    id: "cmnje9ty60021fs2v42to8wvp",
    videoFormat: VF.StoryBackground,
    adFormat: AF.Hook,
    adSubject: AS.Service,
  },

  // ── Astana Nails (гель-лак 4 недели vs 4 дня) ────────────────────────────
  {
    id: "cmnje9ty80023fs2vesm06ed7",
    videoFormat: VF.Tutorial,
    adFormat: AF.Hook,
    adSubject: AS.Service,
  },

  // ── Play Online Games (казахстанцы часы на игры) ─────────────────────────
  {
    id: "cmnje9tya0024fs2vmc42cbhy",
    videoFormat: VF.TalkingHead,
    adFormat: AF.Hook,
    adSubject: AS.AppSoftware,
  },

  // ── Арт-студия Пикассо (художник 30 мин/день год) ────────────────────────
  {
    id: "cmnje9tyc0026fs2v3tesdot2",
    videoFormat: VF.Blog,
    adFormat: AF.Hook,
    adSubject: AS.Course,
  },

  // ── Kaspi Mall (сколько тратят в ТЦ) ─────────────────────────────────────
  {
    id: "cmnje9tyd0027fs2vdfu52c9q",
    videoFormat: VF.TalkingHead,
    adFormat: AF.Hook,
    adSubject: AS.BrandAwareness,
  },

  // ── Astana Marathon (марафон в 52 года) ───────────────────────────────────
  {
    id: "cmnje9tye0029fs2v0xl546nr",
    videoFormat: VF.StoryBackground,
    adFormat: AF.Hook,
    adSubject: AS.Event,
  },

  // ── Astana Opera (за кулисами за 2 часа до спектакля) ────────────────────
  {
    id: "cmnje9tyg002afs2vl6pxkq0r",
    videoFormat: VF.Blog,
    adFormat: AF.NativeIntegration,
    adSubject: AS.Event,
  },

  // ── Surf KZ (новичок vs инструктор на доске) ─────────────────────────────
  {
    id: "cmnje9tyh002bfs2vxzfzt746",
    videoFormat: VF.Blog,
    adFormat: AF.Hook,
    adSubject: AS.Service,
  },

  // ── Qazaq Moda (казахский vs турецкий ткань) ─────────────────────────────
  {
    id: "cmnje9tyi002dfs2vjzz3loeg",
    videoFormat: VF.ProductReview,
    adFormat: AF.Hook,
    adSubject: AS.PhysicalProduct,
  },

  // ── Pavlodar Kids (5-летний ребёнок 30 минут свободы) ────────────────────
  {
    id: "cmnje9tyj002efs2v4sij5h0r",
    videoFormat: VF.Blog,
    adFormat: AF.NativeIntegration,
    adSubject: AS.Course,
  },

  // ── Жайлы Дом (что скрывают застройщики) ─────────────────────────────────
  {
    id: "cmnje9tyl002gfs2vl37ckils",
    videoFormat: VF.TalkingHead,
    adFormat: AF.Hook,
    adSubject: AS.Service,
  },

  // ── Halyk Life (деньги без страховки) ────────────────────────────────────
  {
    id: "cmnje9tym002hfs2v4ropiqcl",
    videoFormat: VF.TalkingHead,
    adFormat: AF.Hook,
    adSubject: AS.Service,
  },

  // ── Кофе Рай (слепой тест 500 ₸ vs 2000 ₸) ──────────────────────────────
  {
    id: "cmnje9tyn002jfs2vrelxc1xp",
    videoFormat: VF.ProductReview,
    adFormat: AF.Hook,
    adSubject: AS.Restaurant,
  },

  // ── Almaty FC (зарплата футболиста КПЛ) ──────────────────────────────────
  {
    id: "cmnje9tyo002kfs2vc8igjpi7",
    videoFormat: VF.PodcastClips,
    adFormat: AF.Hook,
    adSubject: AS.Event,
  },

  // ── BookStore KZ (книга казахстанских предпринимателей) ──────────────────
  {
    id: "cmnje9tyr002mfs2vbj79glxi",
    videoFormat: VF.PodcastClips,
    adFormat: AF.Hook,
    adSubject: AS.PhysicalProduct,
  },

  // ── EcoWear KZ (гардероб с точки зрения экологии) ────────────────────────
  {
    id: "cmnje9tys002nfs2vp5n6i6lu",
    videoFormat: VF.Blog,
    adFormat: AF.NativeIntegration,
    adSubject: AS.PhysicalProduct,
  },

  // ── Aktau Fresh Market (рыбак 50 кг рыбы) ────────────────────────────────
  {
    id: "cmnje9tyt002pfs2vd7p1v6as",
    videoFormat: VF.Blog,
    adFormat: AF.Hook,
    adSubject: AS.PhysicalProduct,
  },

  // ── Forte Bank (10 000 ₸ в месяц 3 года) ─────────────────────────────────
  {
    id: "cmnje9tyv002qfs2v1kce6aac",
    videoFormat: VF.TalkingHead,
    adFormat: AF.Hook,
    adSubject: AS.AppSoftware,
  },

  // ── Karaganda Craft (варим продукт 48 часов) ─────────────────────────────
  {
    id: "cmnje9tyw002sfs2vl2rfc3jy",
    videoFormat: VF.Blog,
    adFormat: AF.NativeIntegration,
    adSubject: AS.PhysicalProduct,
  },

  // ── Almaty Tattoo (художница 8 лет тату) ─────────────────────────────────
  {
    id: "cmnje9tyx002ufs2vpm09zyty",
    videoFormat: VF.Blog,
    adFormat: AF.NativeIntegration,
    adSubject: AS.Service,
  },

  // ── Qazaq Nomads Agency (7 дней в горах без телефона) ────────────────────
  {
    id: "cmnje9tyy002vfs2va85pyrch",
    videoFormat: VF.Blog,
    adFormat: AF.NativeIntegration,
    adSubject: AS.Service,
  },

  // ── Astana Food Court (50 посетителей фудкорта) ──────────────────────────
  {
    id: "cmnje9tyz002wfs2vn0qetae4",
    videoFormat: VF.TalkingHead,
    adFormat: AF.Hook,
    adSubject: AS.Restaurant,
  },

  // ── LanguageSchool KZ (английский 6 месяцев дневник) ─────────────────────
  {
    id: "cmnje9tz1002yfs2v2g2l8hf3",
    videoFormat: VF.Blog,
    adFormat: AF.Hook,
    adSubject: AS.Course,
  },

  // ── Kcell Operator (скорость интернета в 10 городах) ─────────────────────
  {
    id: "cmnje9tz2002zfs2v7jjnz7pz",
    videoFormat: VF.Reviews,
    adFormat: AF.Hook,
    adSubject: AS.Service,
  },

  // ── Qazaq Barista (почему кофе дома не вкусный) ──────────────────────────
  {
    id: "cmnje9tz30031fs2vhhx20bxi",
    videoFormat: VF.Tutorial,
    adFormat: AF.Hook,
    adSubject: AS.Course,
  },

  // ── Shymkent Auto Show (редкие машины Казахстана) ────────────────────────
  {
    id: "cmnje9tz50033fs2vlb3sa835",
    videoFormat: VF.Reviews,
    adFormat: AF.Hook,
    adSubject: AS.Event,
  },

  // ── Almaty Fashion Week (бюджет показа мод) ──────────────────────────────
  {
    id: "cmnje9tz60034fs2va7o46ual",
    videoFormat: VF.Blog,
    adFormat: AF.NativeIntegration,
    adSubject: AS.Event,
  },

  // ── Astana IT Park (стартапер $100 000 в 23 года) ─────────────────────────
  {
    id: "cmnje9tz70036fs2vnv7uxcx6",
    videoFormat: VF.PodcastClips,
    adFormat: AF.Hook,
    adSubject: AS.Service,
  },

  // ── KazMunayGas (нефть на Каспии 5 дней) ─────────────────────────────────
  {
    id: "cmnje9tz90037fs2vkftz5ou4",
    videoFormat: VF.Blog,
    adFormat: AF.NativeIntegration,
    adSubject: AS.BrandAwareness,
  },

  // ── Шымкент Парфюм (дорогой парфюм химик объясняет) ─────────────────────
  {
    id: "cmnje9tzb0039fs2vung0gnld",
    videoFormat: VF.Tutorial,
    adFormat: AF.Hook,
    adSubject: AS.PhysicalProduct,
  },

  // ── Pavlodar Live Music (музыкант 15 лет не переехал) ────────────────────
  {
    id: "cmnje9tzd003bfs2vqj4iinop",
    videoFormat: VF.Blog,
    adFormat: AF.NativeIntegration,
    adSubject: AS.Event,
  },

  // ── AlmatyGym Elite (CEO тренируется в 5 утра) ───────────────────────────
  {
    id: "cmnje9tze003cfs2v0vcba0ii",
    videoFormat: VF.StoryBackground,
    adFormat: AF.Hook,
    adSubject: AS.Service,
  },

  // ── Karaganda Bakery (хлеб каждые 4 часа) ────────────────────────────────
  {
    id: "cmnje9tzg003efs2v2ud3zoru",
    videoFormat: VF.Blog,
    adFormat: AF.NativeIntegration,
    adSubject: AS.PhysicalProduct,
  },

  // ── Air Astana Premium (самолёт 4 часа до вылета) ────────────────────────
  {
    id: "cmnje9tzh003ffs2vdavy8wht",
    videoFormat: VF.Blog,
    adFormat: AF.NativeIntegration,
    adSubject: AS.Service,
  },

  // ── Aktau Surf House (новичок vs опытный виндсёрфинг) ────────────────────
  {
    id: "cmnje9tzi003hfs2vwh6uw69p",
    videoFormat: VF.Blog,
    adFormat: AF.Hook,
    adSubject: AS.Service,
  },

  // ── SmartHome KZ (автоматизация за 150 000 ₸) ────────────────────────────
  {
    id: "cmnje9tzj003ifs2vee9hptpp",
    videoFormat: VF.ProductReview,
    adFormat: AF.Hook,
    adSubject: AS.PhysicalProduct,
  },

  // ── Almaty Zoo (животные живут дольше в зоопарке) ────────────────────────
  {
    id: "cmnje9tzl003kfs2viua2gvqd",
    videoFormat: VF.TalkingHead,
    adFormat: AF.Hook,
    adSubject: AS.Event,
  },

  // ── Karaganda Cars (продавец сам ездит?) ─────────────────────────────────
  {
    id: "cmnje9tzm003lfs2vlrm3930h",
    videoFormat: VF.TalkingHead,
    adFormat: AF.Hook,
    adSubject: AS.PhysicalProduct,
  },

  // ── Aktau Yoga (5 женщин 21 день йоги) ───────────────────────────────────
  {
    id: "cmnje9tzo003nfs2vvr9ueqv5",
    videoFormat: VF.StoryBackground,
    adFormat: AF.Hook,
    adSubject: AS.Service,
  },

  // ── Samruk Energy (ветер Джунгарских ворот) ──────────────────────────────
  {
    id: "cmnje9tzp003ofs2vqtsimiw1",
    videoFormat: VF.Blog,
    adFormat: AF.NativeIntegration,
    adSubject: AS.BrandAwareness,
  },

  // ── Шымкент Кино (5 казахских фильмов) ───────────────────────────────────
  {
    id: "cmnje9tzr003qfs2vk5nujmvb",
    videoFormat: VF.FilmClips,
    adFormat: AF.Hook,
    adSubject: AS.BrandAwareness,
  },

  // ── Pavlodar Music School (взрослый фортепиано в 40 лет) ─────────────────
  {
    id: "cmnje9tzs003sfs2vxtpiztia",
    videoFormat: VF.StoryBackground,
    adFormat: AF.Hook,
    adSubject: AS.Course,
  },

  // ── Almaty Beauty Fair (сколько тратят на косметику) ─────────────────────
  {
    id: "cmnje9tzt003tfs2vv5jal8zb",
    videoFormat: VF.TalkingHead,
    adFormat: AF.Hook,
    adSubject: AS.Event,
  },

  // ── Karaganda Esports (казахстанец в международном турнире) ──────────────
  {
    id: "cmnje9tzv003vfs2v4k6yqps1",
    videoFormat: VF.Gameplay,
    adFormat: AF.Hook,
    adSubject: AS.Event,
  },

  // ── KazPost Digital (посылка Алматы → Актау 72 часа) ─────────────────────
  {
    id: "cmnje9tzw003wfs2v4y79afib",
    videoFormat: VF.Blog,
    adFormat: AF.NativeIntegration,
    adSubject: AS.Service,
  },

  // ── Aktau Business Club (предприниматель из Актау) ────────────────────────
  {
    id: "cmnje9tzx003yfs2vvsfzzv1y",
    videoFormat: VF.PodcastClips,
    adFormat: AF.Hook,
    adSubject: AS.Service,
  },

  // ── Astana Barbershop (стрижка 45 минут почему это стоит) ────────────────
  {
    id: "cmnje9tzy0040fs2vqbbl63qm",
    videoFormat: VF.Blog,
    adFormat: AF.Hook,
    adSubject: AS.Service,
  },

  // ── Shymkent Food Market (что едят шымкентцы на завтрак) ─────────────────
  {
    id: "cmnje9tzz0041fs2vrj9xyzbb",
    videoFormat: VF.TalkingHead,
    adFormat: AF.Hook,
    adSubject: AS.Restaurant,
  },

  // ── Pavlodar Animators (мем для павлодарцев) ──────────────────────────────
  {
    id: "cmnje9u000043fs2v175dyzh0",
    videoFormat: VF.Memes,
    adFormat: AF.FullTakeover,
    adSubject: AS.BrandAwareness,
  },

  // ── Almaty City (Алматы за 10 лет документальный) ────────────────────────
  {
    id: "cmnje9u020044fs2vsststiv5",
    videoFormat: VF.Blog,
    adFormat: AF.NativeIntegration,
    adSubject: AS.BrandAwareness,
  },

  // ── StartupHub KZ (стартап провалился 3 раза) ─────────────────────────────
  {
    id: "cmnje9u040046fs2v2kmh8kqp",
    videoFormat: VF.PodcastClips,
    adFormat: AF.Hook,
    adSubject: AS.Service,
  },

  // ── GlamourStyle KZ (escrow TikTok стиль) ────────────────────────────────
  {
    id: "cmnnlh7ud0000q72vkkclscyh",
    videoFormat: VF.Memes,
    adFormat: AF.NativeIntegration,
    adSubject: AS.PhysicalProduct,
  },

  // ── Damdi Kafe (escrow Instagram) ────────────────────────────────────────
  {
    id: "cmnnlh7vz0002q72vbd0vtweg",
    videoFormat: VF.Blog,
    adFormat: AF.NativeIntegration,
    adSubject: AS.Restaurant,
  },

  // ── MoreViews (Баннеры Кино Юмор Подкасты) ───────────────────────────────
  {
    id: "cmnnn5g470003bt2vofxerv6n",
    videoFormat: VF.FilmClips,
    adFormat: AF.BannerOverlay,
    adSubject: AS.BrandAwareness,
  },

  // ── Адиль и компания (мусорные объявления — переписываем) ─────────────────
  {
    id: "cmnohoc7u00022x2v2oncfynz",
    videoFormat: VF.PodcastClips,
    adFormat: AF.Hook,
    adSubject: AS.Service,
    title: "Нарезки из подкастов — история бизнеса с нуля до первого миллиона",
    description: "Ищем автора коротких нарезок из подкаст-интервью для TikTok. Задача: взять самые эмоциональные и цепляющие фрагменты из разговоров с предпринимателями, добавить субтитры, хук в первые 3 секунды и логотип компании. Цель — вирусный контент, который показывает экспертизу бренда. Требование: досмотр от 60%, не менее 3 видео в месяц.",
  },
  {
    id: "cmnoitych00032x2vm61q5x0u",
    videoFormat: VF.TalkingHead,
    adFormat: AF.Hook,
    adSubject: AS.Course,
    title: "Говорящая голова — личная история о том, как сменил профессию и не пожалел",
    description: "Нужен харизматичный автор для серии TikTok-видео в формате «говорящая голова». Суть: человек рассказывает свою историю смены карьеры, первых трудностей и результата через 6 месяцев обучения. Хук в начале: «Мне было 32, я работал бухгалтером. Сейчас зарабатываю в 3 раза больше удалённо». Нативный переход к нашему курсу.",
  },
  {
    id: "cmnoodoai00052x2vamadfxi7",
    videoFormat: VF.Memes,
    adFormat: AF.Ticker,
    adSubject: AS.Promotion,
    title: "Вирусный мем с промокодом — акция для подписчиков",
    description: "Создаём серию вирусных мем-видео для TikTok в рамках акции «только для своих». Формат: популярный мем-шаблон + ситуация из жизни наших клиентов + бегущая строка с промокодом в нижней части экрана через 5-7 секунд. Видео должно вызвать эмоцию (смех/узнавание) и мотивировать перейти по ссылке. Ориентир: 50 000+ просмотров за 48 часов.",
  },
  {
    id: "cmnooepd700062x2vq1n5grfl",
    videoFormat: VF.StoryBackground,
    adFormat: AF.TextOverlay,
    adSubject: AS.PhysicalProduct,
    title: "История + ASMR-фон — реклама продукта через сторителлинг",
    description: "Ищем автора для TikTok-роликов в формате «история на фоне успокаивающего действия» (раскладка, уборка, готовка). Голос за кадром или субтитры рассказывают историю одного из клиентов, кулминация — демонстрация нашего продукта. Текст с CTA появляется ближе к концу. Формат: 30-45 секунд. Ключевое — не выглядеть как реклама, выглядеть как личная история.",
  },
  {
    id: "cmnop407600072x2vrydztn3g",
    videoFormat: VF.Blog,
    adFormat: AF.NativeIntegration,
    adSubject: AS.BrandAwareness,
    title: "Влог-серия «Один день с нами» — показываем бренд изнутри без фильтров",
    description: "Нужен блогер или автор, который проведёт один рабочий день в нашей команде и снимет искренний влог. Никакого пафоса — только реальные люди, процессы и продукт. Формат: 45-60 секунд, динамичная нарезка, нативное упоминание бренда в естественном контексте. Идеально для аудитории, которая ценит честность. Платформа: TikTok и Instagram Reels.",
  },
  {
    id: "cmnop9qjp00082x2v58b5udge",
    videoFormat: VF.Reviews,
    adFormat: AF.NativeIntegration,
    adSubject: AS.Service,
    title: "Честный обзор нашего сервиса — ищем реального клиента-автора",
    description: "Предлагаем воспользоваться нашим сервисом бесплатно в обмен на честный и развёрнутый обзор в TikTok или Instagram. Никакого сценария — ваши реальные впечатления. Требования: аудитория от 5 000 подписчиков, видео 30-60 секунд, упоминание названия бренда и ссылка в описании. Оплата фиксированная + бонус за каждые 10 000 просмотров сверх 50 000.",
  },
];

// ── Запуск ────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🔄 Обновляем категорийные поля всех объявлений...\n");

  let updated = 0;
  let rewritten = 0;
  let errors = 0;

  for (const upd of UPDATES) {
    try {
      const data: Record<string, unknown> = {
        videoFormatId: upd.videoFormat,
        adFormatId:    upd.adFormat,
        adSubjectId:   upd.adSubject,
      };
      if (upd.title)       data.title       = upd.title;
      if (upd.description) data.description = upd.description;

      await prisma.ad.update({ where: { id: upd.id }, data });
      updated++;
      if (upd.title) rewritten++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ Ошибка для ${upd.id}: ${msg}`);
      errors++;
    }
  }

  console.log(`\n✅ Готово!`);
  console.log(`   Обновлено: ${updated} объявлений`);
  console.log(`   Перезаписано заголовков/описаний: ${rewritten}`);
  if (errors > 0) console.log(`   Ошибок: ${errors}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
