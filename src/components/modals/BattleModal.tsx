import { useTranslation } from "react-i18next";
import { Gauge, FastForward } from "lucide-react";
import type { CSSProperties } from "react";
import { Modal } from "@/components/ui/Modal";
import { healthBarColorClass, healthBarWidthPct } from "@/components/ui/healthBar";
import { BALROG_DAMAGERS, iconVariant, ringImage, SWEEP_ANGLES } from "@/game";
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
}) {
  const { t } = useTranslation();
  return (
    <Modal
      open={battle !== null}
      overlayClassName="bg-black/80"
      className="max-h-[90vh] w-fit min-w-72 max-w-[calc(100vw-3rem)] overflow-y-auto border-red-800 p-5"
    >
      {battle && (
        <>
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
            <div className="flex max-w-[46%] flex-wrap content-start justify-center gap-2.5 sm:max-w-[17rem] sm:gap-3">
              {battle.allies.map((ally) => {
                const invisible =
                  battle.ringOn && !battle.ringIneffective && ally.key === battle.bearerKey;
                return (
                  <div key={ally.key} className="flex w-14 flex-col items-center gap-1 sm:w-20">
                    <div
                      className={`relative size-14 overflow-hidden border bg-parchment sm:size-20 ${
                        battle.attacker === ally.key
                          ? "border-amber-400 ring-2 ring-amber-400"
                          : "border-neutral-700"
                      }`}
                    >
                      <img
                        src={
                          (ally.hp <= 0 || battle.lastHit === ally.key) && ally.icon
                            ? iconVariant(ally.icon, "pain")
                            : (ally.icon ?? "")
                        }
                        alt=""
                        className={`size-full object-cover ${
                          ally.hp <= 0 ? "opacity-30 grayscale" : invisible ? "opacity-40" : ""
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
                            className="hit-sweep block h-2 w-[140%] bg-white/70"
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
                    <span className="w-full truncate text-center text-[10px] leading-tight text-neutral-300">
                      {charName(ally.key)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="self-center text-2xl text-neutral-500">⚔️</div>

            <div className="flex max-w-[46%] flex-wrap content-start justify-center gap-2.5 sm:max-w-[17rem] sm:gap-3">
              {battle.enemies.map((enemy) => (
                <div key={enemy.key} className="flex w-14 flex-col items-center gap-1 sm:w-20">
                  <div
                    className={`relative flex size-14 items-center justify-center overflow-hidden border bg-parchment text-2xl sm:size-20 sm:text-3xl ${
                      battle.attacker === enemy.key
                        ? "border-amber-400 ring-2 ring-amber-400"
                        : "border-neutral-700"
                    }`}
                  >
                    {enemy.icon ? (
                      <img
                        src={
                          enemy.hp <= 0 || battle.lastHit === enemy.key
                            ? iconVariant(enemy.icon, "pain")
                            : enemy.icon
                        }
                        alt=""
                        className={`size-full object-cover ${
                          enemy.hp <= 0 ? "opacity-30 grayscale" : battle.invisibleEnemy ? "opacity-40" : ""
                        }`}
                      />
                    ) : (
                      <span className={enemy.hp <= 0 ? "opacity-30" : ""}>👹</span>
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
                          className="hit-sweep block h-2 w-[140%] bg-white/70"
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

          {battle.outcome ? (
            <div className="mt-5 text-center">
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
            <div className="mt-5 flex flex-col gap-2">
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
        </>
      )}
    </Modal>
  );
}
