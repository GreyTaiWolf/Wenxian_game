import { useEffect, useState, type ReactNode } from "react";
import { getNextSpiritArrayConfig, getSpiritArrayConfig } from "../data/cave";
import {
  alchemyRecipes,
  getAlchemyFurnaceLevel,
  getBeastStableLevel,
  getCaveRefineryLevel,
  getMountConfig,
  getMountYardLevel,
  getNextAlchemyFurnaceLevel,
  getNextBeastStableLevel,
  getNextCaveRefineryLevel,
  getNextMountYardLevel,
  getPetConfig,
  normalizeBeastStableState,
  normalizeMountYardState,
} from "../data/caveFacilities";
import { getEquipmentWorkshop } from "../data/equipmentWorkshops";
import { formatItemName, getItem, itemGradeLabels, itemTierLabels, shouldEmphasizeItemGrade } from "../data/items";
import { getRealm } from "../data/progression";
import { CALENDAR_DAYS_PER_YEAR } from "../data/time";
import {
  getNextSpiritFieldLevelConfig,
  getSpiritFieldLevelConfig,
  getSpiritFieldRegionConfig,
  getSpiritPlant,
  spiritFieldRegionConfigs,
} from "../data/spiritPlants";
import { craftAlchemyRecipe, getAlchemySuccessRate, isAlchemyRecipeLearned, learnAlchemyRecipe, upgradeAlchemyFurnace } from "../game/alchemy";
import { breakthroughPet, feedPet, formatPetFeedCost, getPetPowerMultiplier, setActivePet, upgradeBeastStable } from "../game/beastStable";
import { claimMeditation, getMeditationPreview, normalizeCaveState, startMeditation, upgradeSpiritArray } from "../game/cave";
import { caveRefineryWorkshopId, upgradeCaveRefinery } from "../game/caveRefinery";
import {
  craftWorkshopEquipment,
  getEffectiveWorkshopCraftCost,
  getReforgeCost,
  isEquipmentRecipeLearned,
  learnEquipmentCraftRecipe,
  reforgeWorkshopEquipment,
} from "../game/equipmentWorkshop";
import {
  formatPlantYears,
  getAvailableSpiritSeeds,
  getPlantMaturityLabel,
  getSpiritFieldGrowthMultiplier,
  harvestSpiritPlant,
  plantSpiritSeed,
  setActiveSpiritFieldRegion,
  unlockSpiritFieldRegion,
  uprootSpiritPlant,
  upgradeSpiritField,
} from "../game/spiritField";
import { canAffordCost, describeCost } from "../game/state";
import { advanceTime } from "../game/time";
import { getActiveMountTravelReduction, getMountTrainCost, setActiveMount, trainMount, upgradeMountYard } from "../game/mounts";
import type { CavePetInstance, Cost, EquipmentInstance, GameState, ItemConfig, MountInstance } from "../types";
import { GameIcon, type GameIconName } from "./GameIcon";
import { GradeBadge } from "./ui";

type CaveView = "home" | "meditation" | "field" | "alchemy" | "refinery" | "pets" | "mounts";

export default function CavePanel({ game, onChange }: { game: GameState; onChange: (game: GameState) => void }) {
  const [view, setView] = useState<CaveView>("home");
  const [now, setNow] = useState(() => new Date());
  const cave = normalizeCaveState(game.cave, game.player.team);
  const normalizedGame = { ...game, cave };
  const realm = getRealm(game.player.realmId);
  const preview = getMeditationPreview(normalizedGame, now);

  useEffect(() => {
    setNow(new Date());
    if (!cave.meditationStartedAt) {
      return;
    }
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, [cave.meditationStartedAt]);

  if (view === "meditation") {
    return (
      <CaveSubPage icon="module-cultivation" onBack={() => setView("home")} subtitle={realm.name} title="修炼室">
        <MeditationPage game={normalizedGame} now={now} onChange={onChange} />
      </CaveSubPage>
    );
  }
  if (view === "field") {
    return (
      <CaveSubPage icon="system-spirit-field" onBack={() => setView("home")} subtitle={`${cave.spiritField.totalHarvests} 次采收`} title="灵田">
        <SpiritFieldPage game={normalizedGame} onChange={onChange} />
      </CaveSubPage>
    );
  }
  if (view === "alchemy") {
    return (
      <CaveSubPage icon="system-alchemy" onBack={() => setView("home")} subtitle={`${cave.alchemy.totalCrafts} 次成丹`} title="炼丹房">
        <AlchemyPage game={normalizedGame} onChange={onChange} />
      </CaveSubPage>
    );
  }
  if (view === "refinery") {
    return (
      <CaveSubPage icon="system-refinery" onBack={() => setView("home")} subtitle={`${getCaveRefineryLevel(cave.refinery.level).level} 级炉室`} title="炼器室">
        <RefineryPage game={normalizedGame} onChange={onChange} />
      </CaveSubPage>
    );
  }
  if (view === "pets") {
    return (
      <CaveSubPage icon="system-pet" onBack={() => setView("home")} subtitle={`${cave.beastStable.pets.length} 只灵宠`} title="灵兽栏">
        <PetStablePage game={normalizedGame} onChange={onChange} />
      </CaveSubPage>
    );
  }
  if (view === "mounts") {
    return (
      <CaveSubPage icon="system-mount" onBack={() => setView("home")} subtitle={`${cave.mountYard.mounts.length} 只坐骑`} title="坐骑苑">
        <MountYardPage game={normalizedGame} onChange={onChange} />
      </CaveSubPage>
    );
  }

  const activeRegions = Object.values(cave.spiritField.regions).filter((region) => region.unlocked).length;
  const stable = normalizeBeastStableState(cave.beastStable, game.player.team);
  const mountYard = normalizeMountYardState(cave.mountYard);
  const activeMount = mountYard.mounts.find((mount) => mount.mountId === mountYard.activeMountId);
  const activeMountName = activeMount ? getMountConfig(activeMount.mountId)?.name : null;

  return (
    <section className="module-panel cave-panel">
      <div className="section-heading">
        <h2>
          <GameIcon name="module-cave" size={18} />
          洞府
        </h2>
        <span>{realm.name}</span>
      </div>

      <div className="feature-grid cave-overview-grid">
        <Feature icon="module-cultivation" label="闭关" value={preview.isActive ? `可领 +${preview.claimableCultivation}` : "未闭关"} />
        <Feature icon="system-spirit-field" label="灵田" value={`${activeRegions}/${spiritFieldRegionConfigs.length} 区`} />
        <Feature icon="system-alchemy" label="丹炉" value={`${cave.alchemy.furnaceLevel} 级`} />
        <Feature icon="system-refinery" label="炼器室" value={`${cave.refinery.level} 级`} />
        <Feature icon="system-pet" label="灵宠" value={`${stable.pets.length} 只`} />
        <Feature icon="system-mount" label="坐骑" value={activeMountName ?? "未随行"} />
      </div>

      <div className="cave-facility-list">
        <FacilityButton
          icon="module-cultivation"
          label="修炼室"
          meta={preview.isActive ? `闭关中 · ${formatDuration(preview.effectiveMinutes)}` : `效率 +${formatRate(preview.ratePerMinute)}/分钟`}
          onClick={() => setView("meditation")}
        />
        <FacilityButton
          icon="system-spirit-field"
          label="灵田"
          meta="分区九宫格种植、采收、开辟外田"
          onClick={() => setView("field")}
        />
        <FacilityButton
          icon="system-alchemy"
          label="炼丹房"
          meta={`丹炉 ${cave.alchemy.furnaceLevel} 级 · 丹方 ${Object.keys(cave.alchemy.learnedRecipes).length}/${alchemyRecipes.length}`}
          onClick={() => setView("alchemy")}
        />
        <FacilityButton
          icon="system-refinery"
          label="炼器室"
          meta={`炉室 ${cave.refinery.level} 级 · 打造与洗炼`}
          onClick={() => setView("refinery")}
        />
        <FacilityButton icon="system-pet" label="灵兽栏" meta="喂养、进阶、设置出战灵宠" onClick={() => setView("pets")} />
        <FacilityButton icon="system-mount" label="坐骑苑" meta="驯养坐骑，降低行路耗时" onClick={() => setView("mounts")} />
      </div>
    </section>
  );
}

function CaveSubPage({ children, icon, onBack, subtitle, title }: { children: ReactNode; icon: GameIconName; onBack: () => void; subtitle: string; title: string }) {
  return (
    <section className="module-panel cave-panel">
      <div className="cave-sub-header">
        <button className="ghost-button cave-back-button" onClick={onBack} type="button">
          <GameIcon name="action-back" size={16} />
          返回
        </button>
        <div>
          <h2>
            <GameIcon name={icon} size={18} />
            {title}
          </h2>
          <span>{subtitle}</span>
        </div>
      </div>
      {children}
    </section>
  );
}

function MeditationPage({ game, now, onChange }: { game: GameState; now: Date; onChange: (game: GameState) => void }) {
  const cave = normalizeCaveState(game.cave, game.player.team);
  const preview = getMeditationPreview({ ...game, cave }, now);
  const currentArray = getSpiritArrayConfig(cave.spiritArrayLevel);
  const nextArray = getNextSpiritArrayConfig(cave.spiritArrayLevel);
  const progress = Math.min(100, Math.floor((preview.effectiveMinutes / Math.max(1, preview.maxMinutes)) * 100));

  return (
    <>
      <section className="cave-status-card">
        <div className="section-heading">
          <h2>
            <GameIcon name="module-cultivation" size={18} />
            闭关状态
          </h2>
          <span>{preview.isActive ? "闭关中" : "未闭关"}</span>
        </div>
        <div className="cave-detail-grid">
          <Metric label="已闭关" value={preview.isActive ? formatDuration(preview.elapsedMinutes) : "未开始"} />
          <Metric label="有效时间" value={formatDuration(preview.effectiveMinutes)} />
          <Metric label="预计修为" value={`+${preview.potentialCultivation}`} />
          <Metric label="可领取" value={`+${preview.claimableCultivation}`} />
        </div>
        <div className="cave-progress-track" aria-label="闭关时间进度">
          <div style={{ width: `${progress}%` }} />
        </div>
        <p className="cave-hint">
          {preview.remainingCultivation <= 0
            ? "当前境界修为已满，先完成突破再继续闭关。"
            : preview.cappedByTime
              ? "闭关已达到当前聚灵阵上限，可以出关领取。"
              : preview.isActive
                ? "洞府已封门，离线期间也会继续累计闭关时间。"
                : "开始闭关后会记录时间，回到洞府时可领取修为。"}
        </p>
        <button
          className="primary-action compact"
          type="button"
          onClick={() => onChange(preview.isActive ? claimMeditation(game, new Date()) : startMeditation(game, new Date()))}
        >
          <GameIcon name={preview.isActive ? "resource-spirit" : "module-cave"} size={18} />
          {preview.isActive ? "领取出关" : "开始闭关"}
          <small>{preview.isActive ? "结算本次闭关修为" : "离线也会累积"}</small>
        </button>
      </section>

      <section className="cave-status-card">
        <div className="section-heading">
          <h2>
            <GameIcon name="system-spirit-field" size={18} />
            聚灵阵
          </h2>
          <span>{currentArray.level} 级</span>
        </div>
        <div className="cave-detail-grid">
          <Metric label="当前倍率" value={`${Math.round(currentArray.multiplier * 100)}%`} />
          <Metric label="时长上限" value={formatDuration(currentArray.maxMeditationMinutes)} />
          <Metric label="下一等级" value={nextArray ? `${nextArray.level} 级` : "已满级"} />
          <Metric label="升级消耗" value={nextArray?.upgradeCost ? describeCost(nextArray.upgradeCost) : "无"} />
        </div>
        <button className="gold-button cave-upgrade-button" disabled={!nextArray} onClick={() => onChange(upgradeSpiritArray(game))} type="button">
          <GameIcon name="system-spirit-field" size={15} />
          {nextArray ? "升级聚灵阵" : "聚灵阵已满级"}
        </button>
      </section>
    </>
  );
}

function SpiritFieldPage({ game, onChange }: { game: GameState; onChange: (game: GameState) => void }) {
  const field = game.cave.spiritField;
  const [selectedRegionId, setSelectedRegionId] = useState(field.activeRegionId);
  const selectedRegion = field.regions[selectedRegionId] ?? field.regions.home_cave;
  const regionConfig = getSpiritFieldRegionConfig(selectedRegion.regionId);
  const levelConfig = getSpiritFieldLevelConfig(selectedRegion.level);
  const nextLevel = getNextSpiritFieldLevelConfig(selectedRegion.level);
  const availableSeeds = getAvailableSpiritSeeds(game);
  const [selectedSeedItemId, setSelectedSeedItemId] = useState<string | null>(availableSeeds[0]?.itemId ?? null);
  const growthMultiplier = getSpiritFieldGrowthMultiplier(game, selectedRegion.regionId);

  useEffect(() => {
    if (selectedSeedItemId && availableSeeds.some((seed) => seed.itemId === selectedSeedItemId)) {
      return;
    }
    setSelectedSeedItemId(availableSeeds[0]?.itemId ?? null);
  }, [availableSeeds, selectedSeedItemId]);

  function selectRegion(regionId: string) {
    setSelectedRegionId(regionId);
    const region = field.regions[regionId];
    if (region?.unlocked) {
      onChange(setActiveSpiritFieldRegion(game, regionId));
    }
  }

  return (
    <>
      <div className="cave-region-tabs" aria-label="灵田区域">
        {spiritFieldRegionConfigs.map((config) => {
          const region = field.regions[config.regionId];
          return (
            <button className={selectedRegionId === config.regionId ? "active" : ""} key={config.regionId} onClick={() => selectRegion(config.regionId)} type="button">
              <GameIcon name="system-spirit-field" size={15} />
              <span>{config.name}</span>
              <small>{region?.unlocked ? `${region.level}级` : "未开辟"}</small>
            </button>
          );
        })}
      </div>

      <section className="cave-status-card spirit-field-card">
        <div className="section-heading">
          <h2>
            <GameIcon name="system-spirit-field" size={18} />
            {regionConfig.name}
          </h2>
          <span>{selectedRegion.unlocked ? `${selectedRegion.level} 级` : "未开辟"}</span>
        </div>
        <p className="cave-hint">{regionConfig.description}</p>
        <div className="cave-detail-grid">
          <Metric label="年份倍率" value={`${growthMultiplier}x`} />
          <Metric label="已开地块" value={`${selectedRegion.plots.filter((plot) => plot.unlocked).length}/9`} />
          <Metric label="年份上限" value={formatPlantYears(levelConfig.maxPlantYears)} />
          <Metric label="最高品级" value={itemGradeLabels[levelConfig.maxGrade]} />
        </div>
        {!selectedRegion.unlocked ? (
          <button className="gold-button cave-upgrade-button" disabled={!regionConfig.unlockCost || !canAffordCost(game, regionConfig.unlockCost)} onClick={() => onChange(unlockSpiritFieldRegion(game, selectedRegion.regionId))} type="button">
            <GameIcon name="system-spirit-field" size={15} />
            {regionConfig.unlockCost ? `开辟外田 · ${describeCost(regionConfig.unlockCost)}` : "暂不可开辟"}
          </button>
        ) : (
          <>
            <div className="spirit-field-actions">
              <button className="ghost-button" onClick={() => onChange(advanceTime(game, CALENDAR_DAYS_PER_YEAR, `你在${regionConfig.name}照料灵田一年，草木年份随灵气沉淀。`))} type="button">
                <GameIcon name="resource-life" size={15} />
                照料一年
              </button>
              <button className="gold-button cave-upgrade-button" disabled={!nextLevel} onClick={() => onChange(upgradeSpiritField(game, selectedRegion.regionId))} type="button">
                <GameIcon name="system-spirit-field" size={15} />
                {nextLevel ? `升级灵田 · ${describeCost(nextLevel.upgradeCost ?? {})}` : "灵田已满级"}
              </button>
            </div>
            <SeedPicker seeds={availableSeeds} selectedSeedItemId={selectedSeedItemId} onSelect={setSelectedSeedItemId} />
            <div className="spirit-field-nine-grid">
              {selectedRegion.plots.map((plot, index) => (
                <article className={`spirit-field-cell ${plot.unlocked ? "" : "locked"} ${plot.plant ? "planted" : ""}`} key={plot.id}>
                  <div className="spirit-field-plot-title">
                    <strong>{index + 1}</strong>
                    <span>{plot.unlocked ? (plot.plant ? "生长中" : "空田") : "未开垦"}</span>
                  </div>
                  {!plot.unlocked ? <p className="muted">升级后开垦</p> : null}
                  {plot.unlocked && plot.plant ? <PlantedPlot game={game} plotId={plot.id} plant={plot.plant} regionId={selectedRegion.regionId} onChange={onChange} /> : null}
                  {plot.unlocked && !plot.plant ? (
                    <button className="ghost-button spirit-cell-action" disabled={!selectedSeedItemId} onClick={() => selectedSeedItemId && onChange(plantSpiritSeed(game, selectedRegion.regionId, plot.id, selectedSeedItemId))} type="button">
                      {selectedSeedItemId ? `种植${formatItemName(selectedSeedItemId)}` : "暂无灵种"}
                    </button>
                  ) : null}
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}

function AlchemyPage({ game, onChange }: { game: GameState; onChange: (game: GameState) => void }) {
  const alchemy = game.cave.alchemy;
  const [selectedRecipeId, setSelectedRecipeId] = useState(alchemyRecipes[0]?.id ?? "");
  const selectedRecipe = alchemyRecipes.find((recipe) => recipe.id === selectedRecipeId) ?? alchemyRecipes[0];
  const furnace = getAlchemyFurnaceLevel(alchemy.furnaceLevel);
  const nextFurnace = getNextAlchemyFurnaceLevel(alchemy.furnaceLevel);
  const learned = selectedRecipe ? isAlchemyRecipeLearned(alchemy, selectedRecipe.id) : false;
  const recipeCount = selectedRecipe ? game.inventory.items[selectedRecipe.recipeItemId] ?? 0 : 0;
  const canCraft = Boolean(selectedRecipe && learned && furnace.level >= selectedRecipe.requiredFurnaceLevel && canAffordCost(game, selectedRecipe.cost));

  return (
    <>
      <section className="cave-status-card">
        <div className="section-heading">
          <h2>
            <GameIcon name="system-alchemy" size={18} />
            丹炉
          </h2>
          <span>{furnace.level} 级</span>
        </div>
        <div className="cave-detail-grid">
          <Metric label="成功加成" value={`+${formatPercent(furnace.successBonus)}`} />
          <Metric label="额外成丹" value={`${formatPercent(furnace.extraOutputChance)}`} />
          <Metric label="失败返还" value={`${formatPercent(furnace.failureReturnRate)}`} />
          <Metric label="升级消耗" value={nextFurnace?.upgradeCost ? describeCost(nextFurnace.upgradeCost) : "无"} />
        </div>
        <button className="gold-button cave-upgrade-button" disabled={!nextFurnace} onClick={() => onChange(upgradeAlchemyFurnace(game))} type="button">
          <GameIcon name="system-alchemy" size={15} />
          {nextFurnace ? "升级丹炉" : "丹炉已满级"}
        </button>
      </section>

      <section className="cave-status-card">
        <div className="workbench-recipe-tabs" aria-label="炼丹丹方">
          {alchemyRecipes.map((recipe) => (
            <button className={recipe.id === selectedRecipe?.id ? "active" : ""} key={recipe.id} onClick={() => setSelectedRecipeId(recipe.id)} type="button">
              <GameIcon name="system-alchemy" size={16} />
              <span>
                <strong>{formatItemName(recipe.resultItemId)}</strong>
                <small>{alchemy.learnedRecipes[recipe.id] ? "已掌握" : "需研读丹方"}</small>
              </span>
            </button>
          ))}
        </div>
        {selectedRecipe ? (
          <div className="workbench-layout">
            <section className={`workbench-stage-card blueprint-stage ${learned ? "ready" : recipeCount > 0 ? "available" : "missing"}`}>
              <div className="workshop-card-heading">
                <GameIcon name="system-library" size={18} />
                <div>
                  <strong>{formatItemName(selectedRecipe.recipeItemId)}</strong>
                  <small>{learned ? "已研读" : recipeCount > 0 ? `可研读 · 持有 x${recipeCount}` : "缺丹方"}</small>
                </div>
              </div>
              <p>{selectedRecipe.description}</p>
              {!learned ? (
                <button disabled={recipeCount <= 0} onClick={() => onChange(learnAlchemyRecipe(game, selectedRecipe.id))} type="button">
                  {recipeCount > 0 ? "研读丹方" : "缺少丹方"}
                </button>
              ) : (
                <span className="workbench-status-tag">丹方已收入炉册</span>
              )}
            </section>
            <section className="workbench-stage-card material-stage">
              <div className="workshop-card-heading">
                <GameIcon name="item-material" size={18} />
                <div>
                  <strong>所需材料</strong>
                  <small>{describeCost(selectedRecipe.cost)}</small>
                </div>
              </div>
              <CostSlots cost={selectedRecipe.cost} game={game} />
            </section>
            <section className="workbench-stage-card result-stage">
              <div className="workshop-card-heading">
                <GameIcon name="item-pill" size={18} />
                <div>
                  <strong className={getGradeNameClass(getItem(selectedRecipe.resultItemId))}>{formatItemName(selectedRecipe.resultItemId)}</strong>
                  <small>成功率 {formatPercent(getAlchemySuccessRate(selectedRecipe.baseSuccessRate, furnace.successBonus))}</small>
                </div>
                <GradeBadge compact grade={getItem(selectedRecipe.resultItemId).grade} />
              </div>
              <button disabled={!canCraft} onClick={() => onChange(craftAlchemyRecipe(game, selectedRecipe.id))} type="button">
                {canCraft ? "开炉炼丹" : learned ? "条件不足" : "先研读丹方"}
              </button>
            </section>
          </div>
        ) : null}
      </section>
    </>
  );
}

function RefineryPage({ game, onChange }: { game: GameState; onChange: (game: GameState) => void }) {
  const workshop = getEquipmentWorkshop(caveRefineryWorkshopId);
  const refinery = game.cave.refinery;
  const refineryLevel = getCaveRefineryLevel(refinery.level);
  const nextRefinery = getNextCaveRefineryLevel(refinery.level);
  const [selectedRecipeId, setSelectedRecipeId] = useState(workshop?.recipes[0]?.id ?? "");
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(game.inventory.equipmentItems[0]?.id ?? null);
  const selectedRecipe = workshop?.recipes.find((recipe) => recipe.id === selectedRecipeId) ?? workshop?.recipes[0] ?? null;
  const selectedEquipment = game.inventory.equipmentItems.find((item) => item.id === selectedEquipmentId) ?? null;
  const reforgeCost = selectedEquipment ? getReforgeCost(selectedEquipment, 0) : null;

  return (
    <>
      <section className="cave-status-card">
        <div className="section-heading">
          <h2>
            <GameIcon name="system-refinery" size={18} />
            炼器室
          </h2>
          <span>{refineryLevel.level} 级</span>
        </div>
        <div className="cave-detail-grid">
          <Metric label="灵石减免" value={`${formatPercent(refineryLevel.spiritStoneDiscount)}`} />
          <Metric label="打造次数" value={`${refinery.totalCrafts}`} />
          <Metric label="洗炼次数" value={`${refinery.totalReforges}`} />
          <Metric label="升级消耗" value={nextRefinery?.upgradeCost ? describeCost(nextRefinery.upgradeCost) : "无"} />
        </div>
        <button className="gold-button cave-upgrade-button" disabled={!nextRefinery} onClick={() => onChange(upgradeCaveRefinery(game))} type="button">
          <GameIcon name="system-refinery" size={15} />
          {nextRefinery ? "升级炼器室" : "炼器室已满级"}
        </button>
      </section>

      {workshop ? (
        <section className="cave-status-card">
          <div className="section-heading">
            <h2>
              <GameIcon name="equipment-weapon" size={18} />
              打造
            </h2>
            <span>{workshop.name}</span>
          </div>
          <div className="workbench-recipe-tabs" aria-label="洞府炼器图纸">
            {workshop.recipes.map((recipe) => {
              const item = getItem(recipe.itemId);
              return (
                <button className={`grade-card grade-${item.grade}${recipe.id === selectedRecipe?.id ? " active" : ""}`} key={recipe.id} onClick={() => setSelectedRecipeId(recipe.id)} type="button">
                  <GameIcon name="equipment-weapon" size={16} />
                  <span>
                    <strong className={getGradeNameClass(item)}>{formatItemName(item)}</strong>
                    <small>{isEquipmentRecipeLearned(game, recipe.id) ? "已学会" : "需研读图纸"}</small>
                  </span>
                </button>
              );
            })}
          </div>
          {selectedRecipe ? <CaveCraftRecipe game={game} onChange={onChange} recipeId={selectedRecipe.id} workshopId={workshop.id} /> : null}
        </section>
      ) : null}

      <section className="cave-status-card">
        <div className="section-heading">
          <h2>
            <GameIcon name="equipment-artifact" size={18} />
            洗炼
          </h2>
          <span>{game.inventory.equipmentItems.length} 件装备</span>
        </div>
        <div className="reforge-equipment-list cave-reforge-list">
          {game.inventory.equipmentItems.map((instance) => (
            <button className={`reforge-equipment-card grade-card grade-${instance.quality}${instance.id === selectedEquipment?.id ? " active" : ""}`} key={instance.id} onClick={() => setSelectedEquipmentId(instance.id)} type="button">
              <GameIcon name="equipment" size={17} />
              <span>
                <strong className={`grade-name grade-${instance.quality}`}>{instance.displayName}</strong>
                <small>{itemGradeLabels[instance.quality]} · 词条 {instance.affixes.length} · 战力 +{instance.powerBonus}</small>
              </span>
            </button>
          ))}
        </div>
        {selectedEquipment && reforgeCost ? (
          <div className="workbench-stage-card material-stage">
            <div className="workshop-card-heading">
              <GameIcon name="item-material" size={18} />
              <div>
                <strong>洗炼材料</strong>
                <small>{describeCost(reforgeCost)}</small>
              </div>
            </div>
            <CostSlots cost={reforgeCost} game={game} />
            <button disabled={!canAffordCost(game, reforgeCost) || selectedEquipment.affixes.length <= 0} onClick={() => onChange(reforgeCaveEquipmentWithCount(game, selectedEquipment.id))} type="button">
              {canAffordCost(game, reforgeCost) ? "开始洗炼" : "材料不足"}
            </button>
          </div>
        ) : (
          <p className="empty-hint compact">当前暂无可洗炼装备。</p>
        )}
      </section>
    </>
  );
}

function PetStablePage({ game, onChange }: { game: GameState; onChange: (game: GameState) => void }) {
  const stable = normalizeBeastStableState(game.cave.beastStable, game.player.team);
  const level = getBeastStableLevel(stable.level);
  const nextLevel = getNextBeastStableLevel(stable.level);
  return (
    <>
      <section className="cave-status-card">
        <div className="section-heading">
          <h2>
            <GameIcon name="system-pet" size={18} />
            灵兽栏
          </h2>
          <span>{stable.level} 级</span>
        </div>
        <div className="cave-detail-grid">
          <Metric label="栏位" value={`${stable.pets.length}/${level.slotCount}`} />
          <Metric label="等级上限" value={`${level.maxPetLevel}`} />
          <Metric label="出战灵宠" value={stable.activePetId ? getPetConfig(stable.activePetId)?.name ?? "灵宠" : "未设置"} />
          <Metric label="升级消耗" value={nextLevel?.upgradeCost ? describeCost(nextLevel.upgradeCost) : "无"} />
        </div>
        <button className="gold-button cave-upgrade-button" disabled={!nextLevel} onClick={() => onChange(upgradeBeastStable(game))} type="button">
          <GameIcon name="system-pet" size={15} />
          {nextLevel ? "升级灵兽栏" : "灵兽栏已满级"}
        </button>
      </section>
      <div className="cave-creature-list">
        {stable.pets.map((pet) => (
          <PetCard active={stable.activePetId === pet.petId} game={game} key={pet.petId} onChange={onChange} pet={pet} />
        ))}
        {!stable.pets.length ? <p className="empty-hint compact">尚未收服灵宠，可在万妖山、黑风山等灵宠事件中寻找踪迹。</p> : null}
      </div>
    </>
  );
}

function MountYardPage({ game, onChange }: { game: GameState; onChange: (game: GameState) => void }) {
  const yard = normalizeMountYardState(game.cave.mountYard);
  const level = getMountYardLevel(yard.level);
  const nextLevel = getNextMountYardLevel(yard.level);
  const activeMount = yard.mounts.find((mount) => mount.mountId === yard.activeMountId);
  return (
    <>
      <section className="cave-status-card">
        <div className="section-heading">
          <h2>
            <GameIcon name="system-mount" size={18} />
            坐骑苑
          </h2>
          <span>{yard.level} 级</span>
        </div>
        <div className="cave-detail-grid">
          <Metric label="训练上限" value={`${level.maxMountLevel}`} />
          <Metric label="随行坐骑" value={activeMount ? getMountConfig(activeMount.mountId)?.name ?? "坐骑" : "未设置"} />
          <Metric label="林谷减时" value={`${formatPercent(getActiveMountTravelReduction(game, "forest"))}`} />
          <Metric label="升级消耗" value={nextLevel?.upgradeCost ? describeCost(nextLevel.upgradeCost) : "无"} />
        </div>
        <button className="gold-button cave-upgrade-button" disabled={!nextLevel} onClick={() => onChange(upgradeMountYard(game))} type="button">
          <GameIcon name="system-mount" size={15} />
          {nextLevel ? "升级坐骑苑" : "坐骑苑已满级"}
        </button>
      </section>
      <div className="cave-creature-list">
        {yard.mounts.map((mount) => (
          <MountCard active={yard.activeMountId === mount.mountId} game={game} key={mount.mountId} mount={mount} onChange={onChange} />
        ))}
        {!yard.mounts.length ? <p className="empty-hint compact">坐骑苑尚无坐骑。</p> : null}
      </div>
    </>
  );
}

function CaveCraftRecipe({ game, onChange, recipeId, workshopId }: { game: GameState; onChange: (game: GameState) => void; recipeId: string; workshopId: string }) {
  const workshop = getEquipmentWorkshop(workshopId);
  const recipe = workshop?.recipes.find((item) => item.id === recipeId) ?? null;
  if (!recipe) {
    return null;
  }
  const item = getItem(recipe.itemId);
  const blueprintCount = game.inventory.items[recipe.blueprintItemId] ?? 0;
  const learned = isEquipmentRecipeLearned(game, recipe.id);
  const cost = getEffectiveWorkshopCraftCost(game, workshopId, recipe.cost);
  const canCraft = learned && canAffordCost(game, cost);
  return (
    <div className="workbench-layout">
      <section className={`workbench-stage-card blueprint-stage ${learned ? "ready" : blueprintCount > 0 ? "available" : "missing"}`}>
        <div className="workshop-card-heading">
          <GameIcon name="system-library" size={18} />
          <div>
            <strong>{formatItemName(recipe.blueprintItemId)}</strong>
            <small>{learned ? "已学会" : blueprintCount > 0 ? `可研读 · 持有 x${blueprintCount}` : "缺图纸"}</small>
          </div>
        </div>
        <p>{recipe.description}</p>
        {!learned ? (
          <button disabled={blueprintCount <= 0} onClick={() => onChange(learnEquipmentCraftRecipe(game, workshopId, recipe.id))} type="button">
            {blueprintCount > 0 ? "研读图纸" : "缺少图纸"}
          </button>
        ) : (
          <span className="workbench-status-tag">图纸已收入火候册</span>
        )}
      </section>
      <section className="workbench-stage-card material-stage">
        <div className="workshop-card-heading">
          <GameIcon name="item-material" size={18} />
          <div>
            <strong>所需材料</strong>
            <small>{describeCost(cost)}</small>
          </div>
        </div>
        <CostSlots cost={cost} game={game} />
      </section>
      <section className={`workbench-stage-card result-stage grade-card grade-${item.grade}`}>
        <div className="workshop-card-heading">
          <GameIcon name="equipment-weapon" size={18} />
          <div>
            <strong className={getGradeNameClass(item)}>{formatItemName(item)}</strong>
            <small>{itemTierLabels[item.tier]} · 打造后进入背包</small>
          </div>
          <GradeBadge compact grade={item.grade} />
        </div>
        <button disabled={!canCraft} onClick={() => onChange(craftWorkshopEquipmentWithCount(game, workshopId, recipe.id))} type="button">
          {canCraft ? "开始打造" : learned ? "材料不足" : "先研读图纸"}
        </button>
      </section>
    </div>
  );
}

function craftWorkshopEquipmentWithCount(game: GameState, workshopId: string, recipeId: string): GameState {
  const nextGame = craftWorkshopEquipment(game, workshopId, recipeId);
  if (nextGame === game || workshopId !== caveRefineryWorkshopId) {
    return nextGame;
  }
  return {
    ...nextGame,
    cave: {
      ...nextGame.cave,
      refinery: {
        ...nextGame.cave.refinery,
        totalCrafts: nextGame.cave.refinery.totalCrafts + 1,
      },
    },
  };
}

function reforgeCaveEquipmentWithCount(game: GameState, instanceId: string): GameState {
  const nextGame = reforgeWorkshopEquipment(game, instanceId, []);
  if (nextGame === game) {
    return nextGame;
  }
  return {
    ...nextGame,
    cave: {
      ...nextGame.cave,
      refinery: {
        ...nextGame.cave.refinery,
        totalReforges: nextGame.cave.refinery.totalReforges + 1,
      },
    },
  };
}

function PetCard({ active, game, onChange, pet }: { active: boolean; game: GameState; onChange: (game: GameState) => void; pet: CavePetInstance }) {
  const config = getPetConfig(pet.petId);
  if (!config) {
    return null;
  }
  const multiplier = getPetPowerMultiplier(pet);
  return (
    <article className={`cave-creature-card ${active ? "active" : ""}`}>
      <div className="section-heading">
        <h2>
          <GameIcon name="system-pet" size={18} />
          {config.name}
        </h2>
        <span>{active ? "出战中" : "待命"}</span>
      </div>
      <p>{config.description}</p>
      <div className="cave-detail-grid">
        <Metric label="等级" value={`${pet.level}`} />
        <Metric label="亲密" value={`${pet.intimacy}`} />
        <Metric label="进阶" value={`${pet.breakthrough}`} />
        <Metric label="属性倍率" value={`${multiplier.toFixed(2)}x`} />
      </div>
      <div className="spirit-field-actions">
        <button className="ghost-button" disabled={active} onClick={() => onChange(setActivePet(game, pet.petId))} type="button">
          出战
        </button>
        <button className="ghost-button" onClick={() => onChange(feedPet(game, pet.petId))} type="button">
          喂养
          <small>{formatPetFeedCost(pet)}</small>
        </button>
      </div>
      <button className="gold-button cave-upgrade-button" onClick={() => onChange(breakthroughPet(game, pet.petId))} type="button">
        灵宠进阶
      </button>
    </article>
  );
}

function MountCard({ active, game, mount, onChange }: { active: boolean; game: GameState; mount: MountInstance; onChange: (game: GameState) => void }) {
  const config = getMountConfig(mount.mountId);
  if (!config) {
    return null;
  }
  const trainCost = getMountTrainCost(mount);
  return (
    <article className={`cave-creature-card ${active ? "active" : ""}`}>
      <div className="section-heading">
        <h2>
          <GameIcon name="system-mount" size={18} />
          {config.name}
        </h2>
        <span>{active ? "随行中" : "待命"}</span>
      </div>
      <p>{config.description}</p>
      <div className="cave-detail-grid">
        <Metric label="等级" value={`${mount.level}`} />
        <Metric label="默契" value={`${mount.intimacy}`} />
        <Metric label="常规减时" value={`${formatPercent(getActiveMountTravelReduction({ ...game, cave: { ...game.cave, mountYard: { ...game.cave.mountYard, activeMountId: mount.mountId } } }, "plain"))}`} />
        <Metric label="林谷减时" value={`${formatPercent(getActiveMountTravelReduction({ ...game, cave: { ...game.cave, mountYard: { ...game.cave.mountYard, activeMountId: mount.mountId } } }, "forest"))}`} />
      </div>
      <div className="spirit-field-actions">
        <button className="ghost-button" disabled={active} onClick={() => onChange(setActiveMount(game, mount.mountId))} type="button">
          随行
        </button>
        <button className="ghost-button" disabled={!canAffordCost(game, trainCost)} onClick={() => onChange(trainMount(game, mount.mountId))} type="button">
          驯养
          <small>{describeCost(trainCost)}</small>
        </button>
      </div>
    </article>
  );
}

function SeedPicker({
  onSelect,
  seeds,
  selectedSeedItemId,
}: {
  seeds: Array<{ itemId: string; amount: number; plantName: string }>;
  selectedSeedItemId: string | null;
  onSelect: (itemId: string) => void;
}) {
  if (!seeds.length) {
    return <p className="empty-hint compact">暂无灵种，可在地图事件、灵雨或灵植地点中获得。</p>;
  }
  return (
    <div className="cave-seed-picker" aria-label="选择灵种">
      {seeds.map((seed) => (
        <button className={seed.itemId === selectedSeedItemId ? "active" : ""} key={seed.itemId} onClick={() => onSelect(seed.itemId)} type="button">
          <GameIcon name="item-material" size={14} />
          <span>{formatItemName(seed.itemId)}</span>
          <small>{seed.plantName} x{seed.amount}</small>
        </button>
      ))}
    </div>
  );
}

function PlantedPlot({
  game,
  onChange,
  plant,
  plotId,
  regionId,
}: {
  game: GameState;
  onChange: (game: GameState) => void;
  plant: NonNullable<GameState["cave"]["spiritField"]["regions"][string]["plots"][number]["plant"]>;
  plotId: string;
  regionId: string;
}) {
  const species = getSpiritPlant(plant.speciesId);
  const mature = plant.years >= species.matureYears;
  return (
    <div className="spirit-plant-detail">
      <strong className={`grade-name grade-${plant.grade}`}>{species.name}</strong>
      <small>
        {itemGradeLabels[plant.grade]} / {formatPlantYears(plant.years)}
      </small>
      <small>{getPlantMaturityLabel(plant)}</small>
      <div className="spirit-field-actions compact-actions">
        <button className="primary-action compact" disabled={!mature} onClick={() => onChange(harvestSpiritPlant(game, regionId, plotId))} type="button">
          收获
        </button>
        <button className="ghost-button" onClick={() => onChange(uprootSpiritPlant(game, regionId, plotId))} type="button">
          拔除
        </button>
      </div>
    </div>
  );
}

function CostSlots({ cost, game }: { cost: Cost; game: GameState }) {
  const slots = getCostSlots(cost, game);
  if (!slots.length) {
    return <p className="empty-hint compact">无需额外材料。</p>;
  }
  return (
    <div className="workbench-cost-grid">
      {slots.map((slot) => {
        const missing = slot.owned < slot.required;
        return (
          <div className={`workbench-cost-slot ${missing ? "missing" : "ready"}`} key={slot.id}>
            <GameIcon name={slot.iconName} size={16} />
            <strong>{slot.name}</strong>
            <small>{slot.kind === "stones" ? `${slot.required} 灵石` : `库存 ${slot.owned}/${slot.required}`}</small>
          </div>
        );
      })}
    </div>
  );
}

function Feature({ icon, label, value }: { icon: GameIconName; label: string; value: string }) {
  return (
    <article className="feature-tile">
      <GameIcon name={icon} size={18} />
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function FacilityButton({ icon, label, meta, onClick }: { icon: GameIconName; label: string; meta: string; onClick: () => void }) {
  return (
    <button className="cave-facility-button" onClick={onClick} type="button">
      <GameIcon name={icon} size={18} />
      <span>
        <strong>{label}</strong>
        <small>{meta}</small>
      </span>
    </button>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="cave-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getCostSlots(cost: Cost, game: GameState): Array<{ id: string; name: string; required: number; owned: number; kind: "item" | "stones"; iconName: GameIconName }> {
  const slots: Array<{ id: string; name: string; required: number; owned: number; kind: "item" | "stones"; iconName: GameIconName }> = [];
  if ((cost.spiritStones ?? 0) > 0) {
    slots.push({
      id: "spirit_stones",
      name: "灵石",
      required: cost.spiritStones ?? 0,
      owned: game.player.spiritStones,
      kind: "stones",
      iconName: "resource-stones",
    });
  }
  cost.items?.forEach((part) => {
    const item = getItem(part.itemId);
    slots.push({
      id: item.id,
      name: formatItemName(item),
      required: part.amount,
      owned: game.inventory.items[item.id] ?? 0,
      kind: "item",
      iconName: getItemIconName(item),
    });
  });
  return slots;
}

function getItemIconName(item: ItemConfig): GameIconName {
  if (item.equipment) {
    return "equipment";
  }
  if (item.category === "pill") {
    return "item-pill";
  }
  if (item.category === "material") {
    return "item-material";
  }
  if (item.category === "blueprint" || item.category === "recipe") {
    return "system-library";
  }
  return "item";
}

function getGradeNameClass(item: ItemConfig): string {
  return `grade-name grade-${item.grade}${shouldEmphasizeItemGrade(item.grade) ? " strong" : ""}`;
}

function formatRate(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

function formatDuration(minutes: number): string {
  if (minutes <= 0) {
    return "0 分钟";
  }
  if (minutes < 60) {
    return `${minutes} 分钟`;
  }
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  return restMinutes > 0 ? `${hours} 小时 ${restMinutes} 分钟` : `${hours} 小时`;
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
