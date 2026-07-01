// Reference-guide blurbs for each map location: a short lore note plus a hint at
// what the player does there on the journey to carry the One Ring to Mount Doom.
// Keyed by the numeric location id (see data/locations.json).
export const LOCATION_GUIDE: Record<number, { ru: string; en: string }> = {
  1: {
    ru: "Мрачная крепость на севере Ангмара, оплот Короля-чародея. Здесь вас могут поднять в небо Орлы Манвэ — редкий шанс перелететь опасные земли.",
    en: "A grim fortress in the north of Angmar, seat of the Witch-king. Here the Eagles of Manwë may bear you aloft — a rare chance to soar over perilous lands.",
  },
  2: {
    ru: "Одинокая гора, отвоёванное царство гномов под властью рода Дурина. Обыщите её чертоги — в сокровищнице может отыскаться доброе снаряжение.",
    en: "The Lonely Mountain, the reclaimed dwarf-kingdom of Durin's line. Search its halls — the treasury may yield good gear for the road ahead.",
  },
  3: {
    ru: "Чертоги Короля эльфов в дебрях Лихолесья, царство Трандуила. Здесь можно склонить лесных эльфов встать под ваши знамёна.",
    en: "The Elvenking's halls deep in Mirkwood, realm of Thranduil. Here you may win the Wood-elves to your side and add them to the company.",
  },
  4: {
    ru: "Развалины Форноста, павшей столицы Артедайна, где догорела война с Ангмаром. Обыщите руины — среди костей и камня ждёт нуменорский клинок.",
    en: "The ruins of Fornost, fallen capital of Arthedain, where the war with Angmar ended. Search the rubble — a Númenórean blade lies among the stones.",
  },
  5: {
    ru: "Дом Беорна у Старой Лесной дороги, приют оборотня-медведя. Если хозяин дома, могучий Гримбеорн может согласиться идти с вами.",
    en: "Beorn's house by the Old Forest Road, home of the bear-man. If the master is in, mighty Grimbeorn may agree to march at your side.",
  },
  6: {
    ru: "Форлонд, северная эльфийская гавань залива Люн. Здесь можно взойти на корабль и уйти морем вдоль побережья Средиземья.",
    en: "Forlond, the northern elven haven on the Gulf of Lune. Here you can board a ship and take to the sea along the coasts of Middle-earth.",
  },
  7: {
    ru: "Ривенделл, Последний Приветный Дом Элронда — где держали Совет о судьбе Кольца. Наберите спутников, пополните припасы и передохните.",
    en: "Rivendell, Elrond's Last Homely House, where the Council decided the Ring's fate. Recruit companions, restock supplies, and take your rest.",
  },
  8: {
    ru: "Бри, людско-хоббитский городок на перекрёстке дорог, с трактиром «Гарцующий пони». Возьмите пони в дорогу — и, если повезёт, найдёте Следопыта.",
    en: "Bree, a town of Men and hobbits at the crossroads, home to The Prancing Pony. Take a pony for the road — and perhaps you'll meet a Ranger here.",
  },
  9: {
    ru: "Заверть (Амон Сул), древняя дозорная башня на Пасмурных холмах. Здесь на отряд налетают Кольценосцы — отбейтесь и спешите на восток, в Ривенделл.",
    en: "Weathertop (Amon Sûl), an old watchtower on the Weather Hills. Here the Ringwraiths fall upon the party — drive them off and hurry east to Rivendell.",
  },
  10: {
    ru: "Хоббитон в мирном Шире — здесь начинается путь Хранителя. Возьмите верного Сэма, соберите припасы и отправляйтесь с Кольцом на восток.",
    en: "Hobbiton in the peaceful Shire — where the Ring-bearer's road begins. Take faithful Sam, gather supplies, and set out east with the Ring.",
  },
  11: {
    ru: "Серые Гавани (Митлонд), откуда эльфы отплывают за Море. Кирдан Корабел может даровать вам плавание — и сам присоединиться к отряду.",
    en: "The Grey Havens (Mithlond), whence the elves sail West. Círdan the Shipwright may grant you passage by sea — and join the company himself.",
  },
  12: {
    ru: "Старый лес за оградой Бакленда, где деревья недобры к путникам. Здесь может явиться Том Бомбадил, а в чаще спрятан древний клинок.",
    en: "The Old Forest beyond Buckland's hedge, where the trees are unfriendly to travelers. Tom Bombadil may appear here, and an ancient blade lies hidden.",
  },
  13: {
    ru: "Харлонд, южная эльфийская гавань залива Люн. Отсюда можно отчалить и продолжить путь по морским дорогам.",
    en: "Harlond, the southern elven haven on the Gulf of Lune. From here you can set sail and continue your journey by the sea-roads.",
  },
  14: {
    ru: "Мория, покинутое подгорное царство Кхазад-дум, ныне логово орков. В её глубинах пробуждён Балрог — грозный страж, что преграждает путь.",
    en: "Moria, the abandoned dwarf-realm of Khazad-dûm, now an orc-den. In its depths a Balrog is roused — a dread guardian that bars the way.",
  },
  15: {
    ru: "Лотлориэн, золотой лес Галадриэли и Келеборна. Наберите эльфов-владык, примите их дары и плащи, отдохните и пополните припасы.",
    en: "Lothlórien, the golden wood of Galadriel and Celeborn. Recruit the elven-lords, take their gifts and cloaks, rest, and restock your supplies.",
  },
  16: {
    ru: "Изенгард в долине Нан Курунир — башня Ортханк, где предал Саруман. Одолейте изменника-мага, и в его чертогах отыщется палантир.",
    en: "Isengard in the vale of Nan Curunír — the tower Orthanc, where Saruman turned traitor. Defeat the fallen wizard, and a palantír awaits in his halls.",
  },
  17: {
    ru: "Хельмова Падь и крепость Хорнбург, оплот Рохана в час осады. Здесь Эомер укажет оружейную — раздайте отряду доброе роханское снаряжение.",
    en: "Helm's Deep and the Hornburg, Rohan's stronghold in the hour of siege. Here Éomer leads you to the armory — kit the party out with good Rohirric gear.",
  },
  18: {
    ru: "Эдорас, стольный град роханских Всадников с Золотым чертогом Медусельд. Возьмите коня, наберите вождей Рохана, отдохните и пополните припасы.",
    en: "Edoras, capital of the Riders of Rohan with the golden hall Meduseld. Take a horse, recruit Rohan's leaders, rest, and restock your supplies.",
  },
  19: {
    ru: "Барад-дур, Тёмная Башня Саурона — око Врага над Мордором. Сюда путь Хранителю заказан: дойти до неё с Кольцом — значит погубить весь поход.",
    en: "Barad-dûr, Sauron's Dark Tower — the Enemy's eye over Mordor. No road for the Ring-bearer: to reach it with the Ring is to doom the whole quest.",
  },
  20: {
    ru: "Камень Эреха у подножия Белых гор. Здесь Арагорн, наследник Исильдура, призывает Клятвопреступников — и Король Мёртвых идёт за отрядом.",
    en: "The Stone of Erech at the feet of the White Mountains. Here Aragorn, heir of Isildur, summons the Oathbreakers — and the Dead King follows the company.",
  },
  21: {
    ru: "Ородруин, Роковая гора в сердце Мордора, где было выковано Кольцо. Здесь путь завершается: бросьте Кольцо в огонь и уничтожьте его.",
    en: "Orodruin, Mount Doom in the heart of Mordor, where the Ring was forged. Here the quest ends: cast the Ring into the fire and destroy it.",
  },
  22: {
    ru: "Кирит Унгол, тайный перевал в Мордор над лестницами Моргула. В тёмных туннелях таится Шелоб — чудовищная паучиха, что стережёт проход.",
    en: "Cirith Ungol, the secret pass into Mordor above the Morgul stairs. In its dark tunnels lurks Shelob — the monstrous spider that guards the way.",
  },
  23: {
    ru: "Минас Моргул, Мёртвый город в долине ужаса — обитель Короля-чародея. Здесь Назгулы стоят насмерть; одолейте их владыку, чтобы пройти.",
    en: "Minas Morgul, the dead city in the vale of dread — abode of the Witch-king. Here the Nazgûl stand and fight to the death; slay their lord to pass.",
  },
  24: {
    ru: "Минас Тирит, белокаменная столица Гондора под Роковой горой. Наберите защитников города, отдохните и пополните припасы перед последним броском.",
    en: "Minas Tirith, Gondor's white-walled capital beneath Mount Doom. Recruit the city's defenders, rest, and restock supplies before the final push.",
  },
  25: {
    ru: "Осгилиат, разрушенная древняя столица Гондора по обоим берегам Андуина. В его руинах замурован оружейный тайник — гондорские мечи и доспехи.",
    en: "Osgiliath, Gondor's ruined ancient capital astride the Anduin. Walled up in its ruins is an armory cache — Gondorian swords and hauberks to share out.",
  },
  26: {
    ru: "Дол Амрот, гавань и княжество на побережье Белфаласа. Отсюда можно взойти на корабль и идти морем вдоль южных берегов.",
    en: "Dol Amroth, the haven and princedom on the coast of Belfalas. From here you can board a ship and sail along the southern shores.",
  },
  27: {
    ru: "Пеларгир, древняя гавань Гондора в устье Андуина. Здесь можно сесть на корабль — но южные воды кишат корсарами Умбара.",
    en: "Pelargir, Gondor's ancient haven at the mouth of the Anduin. Here you can take ship — but the southern waters teem with the Corsairs of Umbar.",
  },
  28: {
    ru: "Город Корсаров, разбойничий порт южных пиратов. Одолейте капитана корсаров — или откупитесь миром, чтобы они не тревожили вас на море.",
    en: "The City of the Corsairs, a raider-port of the southern pirates. Beat the corsair captain — or buy peace so they'll trouble you no more at sea.",
  },
  29: {
    ru: "Гавани Умбара, оплот врагов Гондора на дальнем юге. Здесь почти всегда стоит корабль, готовый выйти в море.",
    en: "The Havens of Umbar, stronghold of Gondor's foes in the far south. A ship is nearly always in port here, ready to put out to sea.",
  },
  30: {
    ru: "Бакленд на восточном краю Шира, за рекой Брендивайн. Здесь к Хранителю присоединяются друзья-хоббиты Мерри и Пиппин.",
    en: "Buckland on the eastern edge of the Shire, beyond the Brandywine. Here the hobbit friends Merry and Pippin join the Ring-bearer.",
  },
  31: {
    ru: "Эсгарот, Озёрный город на сваях у Долгого озера близ Эребора. Торговый край — здесь можно передохнуть и пополнить дорожные припасы.",
    en: "Esgaroth, the Lake-town on stilts by the Long Lake near Erebor. A trading place — here you can rest and restock your travel provisions.",
  },
  32: {
    ru: "Тарбад, заброшенный город у брода через Гватло на старой южной дороге. Порыщите среди развалин — там завалялся старый шлем.",
    en: "Tharbad, a deserted town at the Greyflood crossing on the old south road. Rummage through the ruins — an old helm lies forgotten there.",
  },
  33: {
    ru: "Дол Гулдур, тёмная крепость Некроманта на юге Лихолесья. Одолейте его стражей-Назгулов и орков — в подземельях сокрыто Кольцо Дурина.",
    en: "Dol Guldur, the Necromancer's dark fortress in southern Mirkwood. Beat its Nazgûl and orc guardians — the Ring of Durin lies hidden in its dungeons.",
  },
};
