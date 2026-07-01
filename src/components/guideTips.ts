// Curated player guide: the non-obvious, content-gating mechanics of the game.
// Bilingual (ru/en). Self-contained data only — no imports, no logic. Every claim
// here is drawn from the game rules (rules.ts / constants.ts / data.ts /
// combat.ts / endings.ts / MiddleEarthMap.tsx), not invented.

export interface GuideTip {
  ru: string;
  en: string;
}

export interface GuideTipGroup {
  titleRu: string;
  titleEn: string;
  tips: GuideTip[];
}

export const GUIDE_TIPS: GuideTipGroup[] = [
  {
    titleRu: "Спутники",
    titleEn: "Companions",
    tips: [
      {
        ru: "Многие герои ждут дома всегда (Тхеоден и Эовин в Эдорасе, Галадриэль в Лориэне), но Том Бомбадил в Старом лесу дома лишь в 1 визит из 5, а Гримбеорн — в 1 из 2, так что заходите повторно.",
        en: "Many heroes are always home (Théoden and Éowyn at Edoras, Galadriel in Lórien), but Tom Bombadil is only in the Old Forest 1 visit in 5 and Grimbeorn 1 in 2 — so keep coming back.",
      },
      {
        ru: "Часть спутников доступна лишь в узкие даты и места: Арагорн — в Бри 29–30 сентября (потом в Ривенделле), Боромир — в Ривенделле только ночью, Гэндальф — на Заверти 3–4 октября.",
        en: "Some companions appear only in narrow date-windows: Aragorn at Bree Sept 29–30 (later Rivendell), Boromir at Rivendell only at night, Gandalf at Weathertop Oct 3–4.",
      },
      {
        ru: "Упрямцев берут измором: Бильбо соглашается лишь на 7-й уговор, Денетор — на 5-й, так что предлагайте вступить снова и снова.",
        en: "Reluctant recruits cave only under pestering: Bilbo relents on the 7th ask, Denethor on the 5th — so keep re-offering.",
      },
      {
        ru: "Бродячих врагов можно завербовать, победив: Голлума (везде, но лишь если весь отряд — хоббиты), Эомера (в Рохане, ~20%) и Древоборода (в Фангорне, ~85%, пока энты не взяли Изенгард).",
        en: "Some foes join if you beat them: Gollum (anywhere, but only if the whole party is hobbits), Éomer (in Rohan, ~20%), and Treebeard (in Fangorn, ~85%, until the Ents take Isengard).",
      },
      {
        ru: "Составы конфликтуют: эльфы не идут с гномом — кроме Леголаса, Арвен, Галадриэли, Кирдана и Галдора (Келеборн и Халдир — только при Галадриэли); Арвен не идёт при Элронде, Эовин — при Эомере/Теодене, а Гэндальф и Саруман взаимно исключают друг друга.",
        en: "Rosters clash: elves refuse a dwarf — except Legolas, Arwen, Galadriel, Círdan and Galdor (Celeborn and Haldir only if Galadriel is along); Arwen refuses if Elrond is along, Éowyn if Éomer/Théoden are, and Gandalf and Saruman won't travel together.",
      },
      {
        ru: "Некоторые ставят условия: Кирдан отплывёт лишь с отрядом умнее себя (средний интеллект выше 9), а Тхеоден вступит только после того, как Гэндальф изгонит Гриму из Эдораса.",
        en: "Some set conditions: Círdan sails only with a party wiser than himself (avg intelligence above 9), and Théoden joins only after Gandalf drives Wormtongue from Edoras.",
      },
    ],
  },
  {
    titleRu: "Сюжетные события",
    titleEn: "Story events",
    tips: [
      {
        ru: "Если Гэндальф Серый падёт в бою (Балрог в Мории), через 30 дней он может встретиться на дороге как Гэндальф Белый и вновь вступить — весь отряд получает +25% опыта в боях.",
        en: "If Gandalf the Grey falls in battle (the Balrog at Moria), after 30 days he may be met on the road as Gandalf the White and rejoin — the whole party then earns +25% battle XP.",
      },
      {
        ru: "Сарумана в Изенгарде можно пощадить: если сбить его до половины, имея в отряде заступника (Гэндальфа или Древоборода), запускается совет о милости с выбором «пощадить/добить».",
        en: "Saruman at Isengard can be spared: beat him to half strength with an advocate along (Gandalf or Treebeard) and a mercy parley opens with a spare/kill choice.",
      },
      {
        ru: "Только Арагорн, наследник Исильдура, может призвать Мёртвых при Эрехе (через «Исследовать») — они вступают Королём Мёртвых, и умертвия больше не нападают на отряд.",
        en: "Only Aragorn, Isildur's heir, can summon the Dead at Erech (via Explore) — they join as the King of the Dead and barrow-wights no longer assail the party.",
      },
      {
        ru: "Тайники снаряжения ищите «Исследованием»: руины Осгилиата дают гондорский арсенал (мечи +3 сила / кольчуги +3 защита), а арсенал Хельмовой Пади открывается лишь с Эомером в отряде.",
        en: "Hunt gear caches with Explore: the Osgiliath ruins yield a Gondorian armoury (+3 strength swords / +3 defense mail), and the Helm's Deep armoury opens only with Éomer along.",
      },
      {
        ru: "Корсары у Умбара пропустят вас миром, если средний интеллект отряда выше 8: тогда с капитаном можно договориться, и морские набеги прекратятся.",
        en: "The Corsairs will let you pass in peace if the party's average intelligence is above 8: the captain then parleys instead of fighting, and the sea-raids stop.",
      },
      {
        ru: "15 марта 3019 года наместник Денетор в отчаянии предаёт себя огню — после этого завербовать его в Минас Тирите уже нельзя.",
        en: "On 15 March 3019 the despairing Steward Denethor gives himself to the fire — after that he can no longer be recruited at Minas Tirith.",
      },
    ],
  },
  {
    titleRu: "Кольцо",
    titleEn: "The Ring",
    tips: [
      {
        ru: "Порча носителя растёт каждый день пути (дни÷стойкость); на 100% носитель срывается и бежит с Кольцом. У Фродо стойкость велика, но слабый носитель падёт быстро.",
        en: "The bearer's corruption climbs every day carried (days ÷ resilience); at 100% he breaks and flees with the Ring. Frodo's resilience is high, but a weak bearer falls fast.",
      },
      {
        ru: "Предатели (Бильбо, Боромир, Голлум, Саруман, Денетор) через ~30 дней в отряде могут поддаться Кольцу и напасть на носителя в дуэли 1-на-1 — победят, унесут Кольцо к Ородруину.",
        en: "Traitors (Bilbo, Boromir, Gollum, Saruman, Denethor) may, after ~30 days along, succumb and challenge the bearer in a 1-v-1 duel — if they win, they race the Ring to Mount Doom.",
      },
      {
        ru: "Надетое в бою Кольцо прячет носителя (лишь ~25% ударов достигают его), но призраки и Балрог видят сквозь него — против них Кольцо бесполезно, пока они не повержены.",
        en: "Putting the Ring on in battle hides the bearer (only ~25% of blows land), but wraiths and the Balrog see through it — against them the Ring is useless until they're beaten.",
      },
    ],
  },
  {
    titleRu: "Бой",
    titleEn: "Combat",
    tips: [
      {
        ru: "Назгулы отступают на половине здоровья, а не гибнут (Заверть, дорога) — но в Минас Моргуле, средоточии их силы, они стоят насмерть.",
        en: "Nazgûl retreat at half health rather than die (Weathertop, the road) — but in Minas Morgul, the seat of their power, they stand and fight to the death.",
      },
      {
        ru: "Балрога всерьёз ранят лишь Гэндальф, Бомбадил или Саруман (+10 к удару); Фиал Галадриэли (у Фродо) вдвое ослабляет Шелоб, ослепляя её.",
        en: "Only Gandalf, Bombadil or Saruman wound the Balrog seriously (+10 to the blow); the Phial of Galadriel (held by Frodo) blinds Shelob, halving her strength.",
      },
      {
        ru: "У героев есть боевые «специализации»: Эовин бьёт Назгулов сильнее, Халдир — орков, Трандуил чаще критует по троллям, Гримбеорн — по зверям, а Король Мёртвых лечится, раня живых.",
        en: "Heroes have combat niches: Éowyn hits Nazgûl harder, Haldir orcs, Thranduil crits trolls more often, Grimbeorn beasts, and the King of the Dead heals by wounding the living.",
      },
      {
        ru: "Приказы в бою: кликните союзника, чтобы прикрыть его (до него доходит лишь ~50% ударов, с Фарамиром в отряде — 25%; кольценосца в надетом Кольце прикрыть нельзя), или врага, чтобы отряд навалился на него; интеллект повышает шанс крита и меткого фокуса.",
        en: "Battle orders: click an ally to shield him (only ~50% of blows reach him, 25% with Faramir along; a bearer wearing the Ring can't be shielded), or a foe to gang up on it; intelligence raises both crit chance and focus-fire reliability.",
      },
    ],
  },
  {
    titleRu: "Путешествие",
    titleEn: "Travel",
    tips: [
      {
        ru: "Чёрную стену гор вокруг Мордора не пройти пешком — только Орлы Манвэ перелетают её; они бывают у Карн Дума (~25% визитов), слушаются лишь Гэндальфа и улетают через 30 дней (но не бросят вас над морем — уход откладывается, пока не будете над сушей).",
        en: "The black mountain wall around Mordor can't be crossed on foot — only the Eagles of Manwë fly over it; they appear at Carn Dûm (~25% of visits), answer only to Gandalf, and leave after 30 days (but never over the sea — their departure waits until you're above land).",
      },
      {
        ru: "Корабли берут в гаванях (не всегда есть в порту); Кирдан удваивает скорость на море, но чем южнее плывёте, тем вероятнее набеги корсаров.",
        en: "Ships board at harbours (not always in port); Círdan doubles sea speed, but the further south you sail, the likelier corsair raids.",
      },
      {
        ru: "Голод убивает: без еды каждый день отнимает 5% здоровья у каждого. Запас — 30 дней пешком, 50 на пони, 60 на коне; Сэм добывает +3 еды на охоте, а двойной паёк лечит.",
        en: "Hunger kills: with no food each day drains 5% of everyone's health. Stores hold 30 days on foot, 50 by pony, 60 by horse; Sam forages +3 food, and double rations heal.",
      },
    ],
  },
  {
    titleRu: "Концовки",
    titleEn: "Endings",
    tips: [
      {
        ru: "У Роковой горы выбор: бросить Кольцо в Огонь (победа — но при высокой порче носитель может надеть его вместо этого) или заявить права на него и стать новым Тёмным Владыкой.",
        en: "At the Crack of Doom you choose: cast the Ring into the Fire (victory — though a corrupt bearer may put it on instead) or claim it and become a new Dark Lord.",
      },
      {
        ru: "Если Голлум ещё жив в финале, половина попыток надеть Кольцо кончается так, как в книге: он вырывает Прелесть и падает с нею в Огонь — Кольцо уничтожено вопреки носителю.",
        en: "If Gollum is still alive at the finale, half the moments the bearer would put the Ring on end as the book did: he seizes the Precious and topples with it into the Fire — the Ring unmade despite the bearer.",
      },
      {
        ru: "Доплыв на корабле до западного края мира, можно уйти на Запад: с уничтоженным Кольцом — в Валинор, с Кольцом на руках — иная судьба, а иначе спасёт лишь высокая удача отряда (иначе корабль сгинет). На орлах туда же: но Кольцо на Запад они не понесут — только когда оно уничтожено.",
        en: "Sailing a ship to the world's western edge lets you take the Straight Road West: with the Ring destroyed you reach Valinor, still bearing it a different fate, and otherwise only high party luck saves you (or the ship is lost). The Eagles can bear you there too — but they won't carry the Ring West, only once it's unmade.",
      },
    ],
  },
];
