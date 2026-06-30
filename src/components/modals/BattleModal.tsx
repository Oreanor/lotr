import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Gauge, FastForward } from "lucide-react";
import type { CSSProperties } from "react";
import { Modal } from "@/components/ui/Modal";
import { PortalBubble } from "@/components/ui/PortalBubble";
import { healthBarColorClass, healthBarWidthPct } from "@/components/ui/healthBar";
import { BALROG_DAMAGERS, enemyBeatenInBattle, iconVariant, ringImage, SWEEP_ANGLES } from "@/game";
import type { BattleState } from "@/game";

// Auto-battle screen: ally vs enemy rosters with hit-flashes, plus the
// outcome banner or the ring/flee/speed controls while fighting.
export function BattleModal({
  battle,
  battleSpeed,
  onCycleSpeed,
  charName,
  monsterName,
  onPutRing,
  onTakeRing,
  onFlee,
  fleeChance,
  onSkip,
  onContinue,
  parleyBubble,
}: {
  battle: BattleState | null;
  battleSpeed: number;
  onCycleSpeed: () => void;
  charName: (id: string) => string;
  monsterName: (icon: string) => string;
  onPutRing: () => void;
  onTakeRing: () => void;
  onFlee: () => void;
  fleeChance: number;
  onSkip: () => void;
  onContinue: () => void;
  // Saruman parley: the line to show now, anchored at that speaker's portrait.
  parleyBubble?: { key: string; text: string } | null;
}) {
  const { t } = useTranslation();
  // Portrait nodes for anchoring win-screen reaction bubbles (drawn in a portal
  // so no modal overflow clips them).
  const portraitRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const allyIcon = (ally: BattleState["allies"][number]): string => {
    if (!ally.icon) {
      return "";
    }
    if (ally.hp <= 0) {
      return iconVariant(ally.icon, "pain");
    }
    if (battle?.outcome === "win") {
      return iconVariant(ally.icon, "joy");
    }
    // A satisfying crit: the striker grins for that beat.
    if (battle?.crit && battle?.attacker === ally.key) {
      return iconVariant(ally.icon, "joy");
    }
    return battle?.lastHit === ally.key ? iconVariant(ally.icon, "pain") : ally.icon;
  };
  // A foe that has yielded — slain, or (like the Nazgûl) recoiled at half
  // health — is out of the fight and should read as defeated, not just at 0 HP.
  const enemyDown = (enemy: BattleState["enemies"][number]): boolean =>
    battle ? enemyBeatenInBattle(enemy, battle) : enemy.hp <= 0;
  const enemyIcon = (enemy: BattleState["enemies"][number]): string => {
    if (!enemy.icon) {
      return "";
    }
    if (enemyDown(enemy)) {
      return iconVariant(enemy.icon, "pain");
    }
    if (battle?.outcome === "lose" && (battle.betrayalBy || battle.rogueId)) {
      return iconVariant(enemy.icon, "joy");
    }
    return battle?.lastHit === enemy.key ? iconVariant(enemy.icon, "pain") : enemy.icon;
  };
  return (
    <Modal
      open={battle !== null}
      overlayClassName="bg-black/80"
      className="flex max-h-[90vh] w-fit min-w-72 max-w-[calc(100vw-3rem)] flex-col border-red-800"
    >
      {battle && (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="relative mb-4">
            <h2 className="text-center font-serif text-xl text-red-300">
              {battle.rogueId
                ? t("battle.rogueTitle")
                : battle.betrayalBy
                  ? t("battle.betrayalTitle")
                  : t("battle.title")}
            </h2>
            {!battle.outcome && (
              <div className="absolute right-0 top-0 flex items-center gap-2">
                <button
                  type="button"
                  onClick={onCycleSpeed}
                  aria-label={t("ui.speedValue", { n: battleSpeed })}
                  title={t("ui.speed")}
                  className="flex items-center gap-1 rounded border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-sm text-neutral-200 transition hover:bg-neutral-700"
                >
                  <Gauge className="size-4" />
                  {battleSpeed}×
                </button>
                <button
                  type="button"
                  onClick={onSkip}
                  aria-label={t("battle.skip")}
                  title={t("battle.skipTitle")}
                  className="flex items-center justify-center rounded border border-neutral-700 bg-neutral-800 p-1.5 text-neutral-200 transition hover:bg-neutral-700"
                >
                  <FastForward className="size-4" />
                </button>
              </div>
            )}
          </div>
          <div className="my-6 flex items-start justify-center gap-3">
            <div className="grid grid-cols-2 content-start justify-items-center gap-2.5 sm:flex sm:max-w-[17rem] sm:flex-wrap sm:justify-center sm:gap-3">
              {battle.allies.map((ally) => {
                const invisible =
                  battle.ringOn && !battle.ringIneffective && ally.key === battle.bearerKey;
                return (
                  <div key={ally.key} className="relative flex w-14 flex-col items-center gap-1 sm:w-20">
                    <div
                      ref={(el) => {
                        if (el) {
                          portraitRefs.current.set(ally.key, el);
                        } else {
                          portraitRefs.current.delete(ally.key);
                        }
                      }}
                      className={`relative size-14 overflow-hidden border sm:size-20 ${
                        ally.hp <= 0 ? "bg-[#7a7a7a]" : "bg-parchment"
                      } ${
                        battle.attacker === ally.key
                          ? "border-amber-400 ring-2 ring-amber-400"
                          : "border-neutral-700"
                      }`}
                    >
                      <img
                        src={allyIcon(ally)}
                        alt=""
                        className={`size-full object-cover ${
                          ally.hp <= 0 ? "grayscale opacity-50" : invisible ? "opacity-40" : ""
                        }`}
                      />
                      {invisible && (
                        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <img src={ringImage} alt="" className="size-7 object-contain" />
                        </span>
                      )}
                      {battle.lastHit === ally.key && (
                        <span
                          key={battle.tick}
                          className="pointer-events-none absolute inset-0 flex items-center justify-center"
                        >
                          <span
                            className={`${battle.crit ? "hit-sweep-crit" : "hit-sweep"} block h-2 w-[140%] bg-white/70`}
                            style={{ "--sweep-angle": SWEEP_ANGLES[battle.hitDir] } as CSSProperties}
                          />
                        </span>
                      )}
                      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1.5 bg-black/50">
                        <span
                          className={`block h-full ${healthBarColorClass(ally.hp, ally.maxHp)}`}
                          style={{ width: `${healthBarWidthPct(ally.hp, ally.maxHp)}%` }}
                        />
                      </span>
                    </div>
                    {/* Bearer marker — same circular ring badge as the map HUD.
                        Worn, the big centred ring inside the portrait shows instead. */}
                    {!invisible && ally.key === battle.bearerKey && (
                      <span
                        className="pointer-events-none absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full border border-amber-700 bg-neutral-900"
                        title={t("character.bearer")}
                      >
                        <img
                          src={ringImage}
                          alt=""
                          draggable={false}
                          className="size-3.5 select-none object-contain"
                        />
                      </span>
                    )}
                    <span className="w-full truncate text-center text-[10px] leading-tight text-neutral-300">
                      {charName(ally.key)}
                    </span>
                  </div>
                );
              })}
            </div>

            <img src="/ui/swords.png" alt="" className="size-7 self-center object-contain" />

            <div className="grid grid-cols-2 content-start justify-items-center gap-2.5 sm:flex sm:max-w-[17rem] sm:flex-wrap sm:justify-center sm:gap-3">
              {battle.enemies.map((enemy) => (
                <div key={enemy.key} className="flex w-14 flex-col items-center gap-1 sm:w-20">
                  <div
                    className={`relative flex size-14 items-center justify-center overflow-hidden border text-2xl sm:size-20 sm:text-3xl ${
                      enemyDown(enemy) ? "bg-[#7a7a7a]" : "bg-parchment"
                    } ${
                      battle.attacker === enemy.key
                        ? "border-amber-400 ring-2 ring-amber-400"
                        : "border-neutral-700"
                    }`}
                  >
                    {enemy.icon ? (
                      <img
                        src={enemyIcon(enemy)}
                        alt=""
                        className={`size-full object-cover ${
                          enemyDown(enemy) ? "grayscale opacity-50" : battle.invisibleEnemy ? "opacity-40" : ""
                        }`}
                      />
                    ) : (
                      <span className={enemyDown(enemy) ? "opacity-30" : ""}>👹</span>
                    )}
                    {battle.invisibleEnemy && enemy.hp > 0 && (
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <img src={ringImage} alt="" className="size-7 object-contain" />
                      </span>
                    )}
                    {battle.lastHit === enemy.key && (
                      <span
                        key={battle.tick}
                        className="pointer-events-none absolute inset-0 flex items-center justify-center"
                      >
                        <span
                          className={`${battle.crit ? "hit-sweep-crit" : "hit-sweep"} block h-2 w-[140%] bg-white/70`}
                          style={{ "--sweep-angle": SWEEP_ANGLES[battle.hitDir] } as CSSProperties}
                        />
                      </span>
                    )}
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1.5 bg-black/50">
                      <span
                        className={`block h-full ${healthBarColorClass(enemy.hp, enemy.maxHp)}`}
                        style={{ width: `${healthBarWidthPct(enemy.hp, enemy.maxHp)}%` }}
                      />
                    </span>
                  </div>
                  <span className="w-full truncate text-center text-[10px] leading-tight text-neutral-300">
                    {battle.betrayalBy || battle.rogueId
                      ? charName(enemy.key)
                      : enemy.icon
                        ? monsterName(enemy.icon)
                        : enemy.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {battle.reactions?.map((r, i) => (
            <PortalBubble
              key={r.key}
              getEl={() => portraitRefs.current.get(r.key) ?? null}
              text={r.text}
              tail="down"
              delayMs={i * 500}
            />
          ))}
          {/* Saruman parley: one speaker's plea/objection at a time, at their portrait. */}
          {parleyBubble && (
            <PortalBubble
              key={parleyBubble.key}
              getEl={() => portraitRefs.current.get(parleyBubble.key) ?? null}
              text={parleyBubble.text}
              tail="down"
              maxWClass="max-w-[16rem]"
            />
          )}
          </div>

          <div className="border-t border-red-900/40 p-4 sm:p-5 pt-4">
          {battle.outcome ? (
            <div className="text-center">
              <p
                className={`font-serif text-xl ${
                  battle.outcome === "win" ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {battle.outcome === "win" ? t("battle.victory", { n: battle.exp }) : t("battle.defeat")}
              </p>
              <button
                type="button"
                className="mt-3 rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700"
                onClick={onContinue}
              >
                {t("battle.continue")}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {battle.phialBlinded && (
                <p className="text-center text-xs text-sky-300">{t("battle.phialNote")}</p>
              )}
              {battle.ringIneffective && (
                <p className="text-center text-xs text-amber-400">{t("battle.ringNote")}</p>
              )}
              {battle.gandalfOnly && !battle.allies.some((a) => BALROG_DAMAGERS.has(a.key)) && (
                <p className="text-center text-xs text-amber-400">{t("battle.balrogNote")}</p>
              )}
              {battle.rogueId && (
                <p className="text-center text-xs text-amber-400">{t("battle.rogueNote")}</p>
              )}
              {battle.betrayalBy && battle.betrayalBy !== "saruman" && (
                <p className="text-center text-xs text-amber-400">{t("battle.betrayalNote")}</p>
              )}
              {(!battle.betrayalBy || battle.betrayalBy === "saruman") &&
                !battle.ringIneffective &&
                battle.bearerKey &&
                battle.allies.some((a) => a.key === battle.bearerKey && a.hp > 0) && (
                  <button
                    type="button"
                    onClick={battle.ringOn ? onTakeRing : onPutRing}
                    className="flex items-center justify-center gap-2 rounded border border-amber-700 bg-amber-900/40 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-900/70"
                    title={t("battle.ringTitle")}
                  >
                    <img src={ringImage} alt="" className="size-4 object-contain" />
                    {battle.ringOn ? t("battle.takeRing") : t("battle.putRing")}
                  </button>
                )}
              {(!battle.betrayalBy || battle.betrayalBy === "saruman") && !battle.rogueId && (
                <button
                  type="button"
                  onClick={onFlee}
                  disabled={battle.fleeUsed}
                  className="rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-neutral-800"
                >
                  {battle.fleeUsed ? t("battle.fleeSpent") : `${t("battle.flee")} (${fleeChance}%)`}
                </button>
              )}
            </div>
          )}
          </div>
        </>
      )}
    </Modal>
  );
}
