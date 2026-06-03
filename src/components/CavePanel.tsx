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
import { formatItemName, getItem, itemGradeLabels, itemGradeOrder, itemTierLabels, shouldEmphasizeItemGrade } from "../data/items";
import { getRealm } from "../data/progression";
import { CALENDAR_DAYS_PER_YEAR } from "../data/time";
import {
  getNextSpiritFieldLevelConfig,
  getNextSpiritFieldPlotGradeConfig,
  getSpiritFieldPlotGradeConfig,
  getSpiritPlant,
  getSpiritPlantBySeed,
  getSpiritPlantYearCap,
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
  getSpiritFieldPlotGrowthMultiplier,
  harvestSpiritPlant,
  plantSpiritSeed,
  uprootSpiritPlant,
  upgradeSpiritField,
  upgradeSpiritFieldPlot,
} from "../game/spiritField";
import { canAffordCost, describeCost } from "../game/state";
import { advanceTime } from "../game/time";
import { getActiveMountTravelReduction, getMountTrainCost, setActiveMount, trainMount, upgradeMountYard } from "../game/mounts";
import type { CavePetInstance, Cost, EquipmentInstance, GameState, ItemConfig, ItemGrade, MountInstance } from "../types";
import { GameIcon, type GameIconName } from "./GameIcon";
import { GameDialog, GradeBadge, ItemSlot } from "./ui";

type CaveView = "home" | "meditation" | "field" | "alchemy" | "refinery" | "pets" | "mounts";
const SELECTION_SLOT_COUNT = 6;
const SPIRIT_SEED_BAG_SLOT_COUNT = 9;
const HOME_SPIRIT_FIELD_REGION_ID = "home_cave";

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

  const homeSpiritField = cave.spiritField.regions[HOME_SPIRIT_FIELD_REGION_ID] ?? Object.values(cave.spiritField.regions)[0];
  const homeUnlockedPlots = homeSpiritField?.plots.filter((plot) => plot.unlocked).length ?? 0;
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
        <Feature icon="system-spirit-field" label="灵田" value={`${homeUnlockedPlots}/9 格`} />
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
          meta="本府九宫格种植、采收、年份养成"
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
  const homeRegion = (field.regions[HOME_SPIRIT_FIELD_REGION_ID] ?? field.regions[field.activeRegionId] ?? Object.values(field.regions)[0])!;
  const [selectedPlotId, setSelectedPlotId] = useState<string | null>(null);
  const [dialogMode, setDialogMode] = useState<"plot_detail" | "seed_bag">("plot_detail");
  const [seedPage, setSeedPage] = useState(0);
  const nextLevel = getNextSpiritFieldLevelConfig(homeRegion.level);
  const availableSeeds = getAvailableSpiritSeeds(game);
  const selectedPlot = homeRegion.plots.find((plot) => plot.id === selectedPlotId) ?? null;
  const dialogOpen = Boolean(selectedPlot);
  const baseGrowthMultiplier = getSpiritFieldGrowthMultiplier(game, HOME_SPIRIT_FIELD_REGION_ID);
  const unlockedPlots = homeRegion.plots.filter((plot) => plot.unlocked);
  const highestSoilGrade = getHighestSoilGrade(homeRegion.plots);
  const highestSoilConfig = getSpiritFieldPlotGradeConfig(highestSoilGrade);

  useEffect(() => {
    if (selectedPlotId && !homeRegion.plots.some((plot) => plot.id === selectedPlotId)) {
      setSelectedPlotId(null);
    }
  }, [homeRegion.plots, selectedPlotId]);

  function openPlot(plotId: string) {
    setSelectedPlotId(plotId);
    setDialogMode("plot_detail");
    setSeedPage(0);
  }

  function closeDialog() {
    setSelectedPlotId(null);
    setDialogMode("plot_detail");
    setSeedPage(0);
  }

  return (
    <>
      <section className="cave-status-card spirit-field-card">
        <div className="section-heading">
          <h2>
            <GameIcon name="system-spirit-field" size={18} />
            本府灵田
          </h2>
          <span>{homeRegion.level} 级</span>
        </div>
        <p className="cave-hint">洞府内的一片灵土，点击任意地块查看、种植、采收或拔除。</p>
        <div className="cave-detail-grid spirit-field-summary-grid">
          <Metric label="基础速度" value={`${formatRate(baseGrowthMultiplier)}x`} />
          <Metric label="已开垦" value={`${unlockedPlots.length}/9`} />
          <Metric label="最高灵土" value={itemGradeLabels[highestSoilGrade]} />
          <Metric label="最高格速" value={`${formatRate(highestSoilConfig.growthMultiplier)}x`} />
        </div>
        <div className="spirit-field-actions">
          <button className="ghost-button" onClick={() => onChange(advanceTime(game, CALENDAR_DAYS_PER_YEAR, "你在本府灵田照料一年，草木年份随灵气沉淀。"))} type="button">
            <GameIcon name="resource-life" size={15} />
            照料一年
          </button>
          <button className="gold-button cave-upgrade-button" disabled={!nextLevel} onClick={() => onChange(upgradeSpiritField(game, HOME_SPIRIT_FIELD_REGION_ID))} type="button">
            <GameIcon name="system-spirit-field" size={15} />
            {nextLevel ? `升级灵田 · ${describeCost(nextLevel.upgradeCost ?? {})}` : "灵田已满级"}
          </button>
        </div>
        <div className="spirit-field-nine-grid">
          {homeRegion.plots.map((plot) => {
            const species = plot.plant ? getSpiritPlant(plot.plant.speciesId) : null;
            const soilConfig = getSpiritFieldPlotGradeConfig(plot.soilGrade);
            const soilClass = plot.unlocked ? ` grade-card grade-${soilConfig.grade}` : "";
            return (
              <button className={`spirit-field-cell${soilClass} ${plot.unlocked ? "" : "locked"} ${plot.plant ? "planted" : ""} ${selectedPlotId === plot.id ? "selected" : ""}`} key={plot.id} onClick={() => openPlot(plot.id)} type="button">
                {plot.unlocked ? <GradeBadge compact className="spirit-soil-grade-badge" grade={soilConfig.grade} /> : null}
                {plot.unlocked && species && plot.plant ? (
                  <span className={`spirit-field-plant-badge grade-card grade-${species.grade}`}>
                    <GameIcon name="system-spirit-field" size={18} />
                    <strong className={getGradeNameClass(getItem(species.seedItemId))}>{species.name}</strong>
                    <small>{formatPlantYears(plot.plant.years)}</small>
                  </span>
                ) : plot.unlocked ? (
                  <>
                    <GameIcon name="system-spirit-field" size={18} />
                    <strong>空田</strong>
                  </>
                ) : (
                  <>
                    <GameIcon name="system-spirit-field" size={18} />
                    <strong>未开垦</strong>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </section>
      {selectedPlot ? (
        <GameDialog
          className="spirit-field-dialog"
          open={dialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              closeDialog();
            }
          }}
          subtitle={dialogMode === "seed_bag" ? "背包灵种" : "地块信息"}
          title="灵田地块"
        >
          {dialogMode === "seed_bag" && selectedPlot.unlocked && !selectedPlot.plant ? (
            <SpiritSeedBag
              onBack={() => setDialogMode("plot_detail")}
              onPageChange={setSeedPage}
              onPlant={(seedItemId) => {
                const nextGame = plantSpiritSeed(game, HOME_SPIRIT_FIELD_REGION_ID, selectedPlot.id, seedItemId);
                closeDialog();
                onChange(nextGame);
              }}
              page={seedPage}
              seeds={availableSeeds}
            />
          ) : (
            <SpiritPlotDetail
              game={game}
              onChange={(nextGame) => {
                closeDialog();
                onChange(nextGame);
              }}
              onPlantRequest={() => {
                setDialogMode("seed_bag");
                setSeedPage(0);
              }}
              plot={selectedPlot}
            />
          )}
        </GameDialog>
      ) : null}
    </>
  );
}

function AlchemyPage({ game, onChange }: { game: GameState; onChange: (game: GameState) => void }) {
  const alchemy = game.cave.alchemy;
  const [selectedRecipeId, setSelectedRecipeId] = useState(alchemyRecipes[0]?.id ?? "");
  const [recipePage, setRecipePage] = useState(0);
  const selectedRecipe = alchemyRecipes.find((recipe) => recipe.id === selectedRecipeId) ?? alchemyRecipes[0];
  const furnace = getAlchemyFurnaceLevel(alchemy.furnaceLevel);
  const nextFurnace = getNextAlchemyFurnaceLevel(alchemy.furnaceLevel);
  const learned = selectedRecipe ? isAlchemyRecipeLearned(alchemy, selectedRecipe.id) : false;
  const recipeCount = selectedRecipe ? game.inventory.items[selectedRecipe.recipeItemId] ?? 0 : 0;
  const canCraft = Boolean(selectedRecipe && learned && furnace.level >= selectedRecipe.requiredFurnaceLevel && canAffordCost(game, selectedRecipe.cost));
  const recipePageCount = getSelectionPageCount(alchemyRecipes.length);
  const visibleRecipePage = clampSelectionPage(recipePage, alchemyRecipes.length);
  const recipeSlots = getSelectionSlots(alchemyRecipes, visibleRecipePage);

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
        <SelectionHeader meta={`${alchemyRecipes.length} 张丹方`} title="丹方槽" />
        <div className="cave-slot-grid" aria-label="炼丹丹方">
          {recipeSlots.map((recipe, index) =>
            recipe ? (
              <button className={`cave-selection-slot grade-card grade-${getItem(recipe.resultItemId).grade}${recipe.id === selectedRecipe?.id ? " active" : ""}`} key={recipe.id} onClick={() => setSelectedRecipeId(recipe.id)} type="button">
                <span className="selection-slot-index">{visibleRecipePage * SELECTION_SLOT_COUNT + index + 1}</span>
                <GameIcon name="system-alchemy" size={16} />
                <span>
                  <strong className={getGradeNameClass(getItem(recipe.resultItemId))}>{formatItemName(recipe.resultItemId)}</strong>
                  <small>{alchemy.learnedRecipes[recipe.id] ? "已掌握" : "需研读丹方"}</small>
                </span>
              </button>
            ) : (
              <EmptySelectionSlot key={`alchemy-empty-${index}`} />
            ),
          )}
        </div>
        <SelectionPager count={alchemyRecipes.length} onPageChange={setRecipePage} page={visibleRecipePage} pageCount={recipePageCount} />
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
  const refineryRecipes = workshop?.recipes ?? [];
  const refinery = game.cave.refinery;
  const refineryLevel = getCaveRefineryLevel(refinery.level);
  const nextRefinery = getNextCaveRefineryLevel(refinery.level);
  const [selectedRecipeId, setSelectedRecipeId] = useState(refineryRecipes[0]?.id ?? "");
  const [recipePage, setRecipePage] = useState(0);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(game.inventory.equipmentItems[0]?.id ?? null);
  const selectedRecipe = refineryRecipes.find((recipe) => recipe.id === selectedRecipeId) ?? refineryRecipes[0] ?? null;
  const selectedEquipment = game.inventory.equipmentItems.find((item) => item.id === selectedEquipmentId) ?? null;
  const reforgeCost = selectedEquipment ? getReforgeCost(selectedEquipment, 0) : null;
  const recipePageCount = getSelectionPageCount(refineryRecipes.length);
  const visibleRecipePage = clampSelectionPage(recipePage, refineryRecipes.length);
  const recipeSlots = getSelectionSlots(refineryRecipes, visibleRecipePage);

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
          <SelectionHeader meta={`${refineryRecipes.length} 张图纸`} title="图纸槽" />
          <div className="cave-slot-grid" aria-label="洞府炼器图纸">
            {recipeSlots.map((recipe, index) => {
              if (!recipe) {
                return <EmptySelectionSlot key={`refinery-empty-${index}`} />;
              }
              const item = getItem(recipe.itemId);
              return (
                <button className={`cave-selection-slot grade-card grade-${item.grade}${recipe.id === selectedRecipe?.id ? " active" : ""}`} key={recipe.id} onClick={() => setSelectedRecipeId(recipe.id)} type="button">
                  <span className="selection-slot-index">{visibleRecipePage * SELECTION_SLOT_COUNT + index + 1}</span>
                  <GameIcon name="equipment-weapon" size={16} />
                  <span>
                    <strong className={getGradeNameClass(item)}>{formatItemName(item)}</strong>
                    <small>{isEquipmentRecipeLearned(game, recipe.id) ? "已学会" : "需研读图纸"}</small>
                  </span>
                </button>
              );
            })}
          </div>
          <SelectionPager count={refineryRecipes.length} onPageChange={setRecipePage} page={visibleRecipePage} pageCount={recipePageCount} />
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

function SpiritPlotDetail({
  game,
  onChange,
  onPlantRequest,
  plot,
}: {
  game: GameState;
  plot: GameState["cave"]["spiritField"]["regions"][string]["plots"][number];
  onChange: (game: GameState) => void;
  onPlantRequest: () => void;
}) {
  if (!plot.unlocked) {
    return (
      <div className="spirit-plot-dialog-body">
        <section className="spirit-plot-summary locked">
          <GameIcon name="system-spirit-field" size={22} />
          <div>
            <strong>未开垦</strong>
            <small>升级灵田后，这块灵土会并入本府阵图。</small>
          </div>
        </section>
      </div>
    );
  }

  const soilConfig = getSpiritFieldPlotGradeConfig(plot.soilGrade);
  const nextSoilConfig = getNextSpiritFieldPlotGradeConfig(plot.soilGrade);
  const plotGrowthMultiplier = getSpiritFieldPlotGrowthMultiplier(game, HOME_SPIRIT_FIELD_REGION_ID, plot.id);
  const nextSoilCost = nextSoilConfig?.upgradeCost ?? null;

  if (!plot.plant) {
    return (
      <div className="spirit-plot-dialog-body">
        <section className={`spirit-plot-summary grade-card grade-${soilConfig.grade}`}>
          <GameIcon name="system-spirit-field" size={22} />
          <div>
            <strong>空田</strong>
            <small>
              灵土：{itemGradeLabels[soilConfig.grade]} · 本格速度 {formatRate(plotGrowthMultiplier)}x
            </small>
          </div>
          <GradeBadge compact grade={soilConfig.grade} />
        </section>
        <div className="cave-detail-grid">
          <Metric label="灵土品级" value={itemGradeLabels[soilConfig.grade]} />
          <Metric label="本格速度" value={`${formatRate(plotGrowthMultiplier)}x`} />
          <Metric label="下阶培土" value={nextSoilConfig ? itemGradeLabels[nextSoilConfig.grade] : "已满品"} />
          <Metric label="培土消耗" value={nextSoilCost ? describeCost(nextSoilCost) : "无"} />
        </div>
        <div className="spirit-field-actions">
          <button className="primary-action compact" onClick={onPlantRequest} type="button">
            <GameIcon name="module-inventory" size={18} />
            种植
            <small>打开背包灵种栏</small>
          </button>
          <button className="gold-button cave-upgrade-button" disabled={!nextSoilConfig} onClick={() => onChange(upgradeSpiritFieldPlot(game, HOME_SPIRIT_FIELD_REGION_ID, plot.id))} type="button">
            {nextSoilConfig ? `培土至${itemGradeLabels[nextSoilConfig.grade]}` : "灵土已满品"}
          </button>
        </div>
      </div>
    );
  }

  const species = getSpiritPlant(plot.plant.speciesId);
  const mature = plot.plant.years >= species.matureYears;
  const yearCap = getSpiritPlantYearCap(species.grade);
  return (
    <div className="spirit-plot-dialog-body">
      <section className={`spirit-plot-summary grade-card grade-${soilConfig.grade}`}>
        <GameIcon name="system-spirit-field" size={22} />
        <div>
          <strong>灵土地格</strong>
          <small>
            {itemGradeLabels[soilConfig.grade]} · 本格速度 {formatRate(plotGrowthMultiplier)}x
          </small>
        </div>
        <GradeBadge compact grade={soilConfig.grade} />
      </section>
      <section className={`spirit-plot-summary grade-card grade-${species.grade}`}>
        <GameIcon name="system-spirit-field" size={22} />
        <div>
          <strong className={getGradeNameClass(getItem(species.seedItemId))}>{species.name}</strong>
          <small>{species.description}</small>
        </div>
        <GradeBadge compact grade={species.grade} />
      </section>
      <div className="cave-detail-grid">
        <Metric label="灵土品级" value={itemGradeLabels[soilConfig.grade]} />
        <Metric label="本格速度" value={`${formatRate(plotGrowthMultiplier)}x`} />
        <Metric label="当前年份" value={formatPlantYears(plot.plant.years)} />
        <Metric label="成熟年份" value={formatPlantYears(species.matureYears)} />
        <Metric label="品级上限" value={formatPlantYears(yearCap)} />
        <Metric label="状态" value={getPlantMaturityLabel(plot.plant)} />
      </div>
      <div className="cave-detail-grid">
        <Metric label="下阶培土" value={nextSoilConfig ? itemGradeLabels[nextSoilConfig.grade] : "已满品"} />
        <Metric label="培土消耗" value={nextSoilCost ? describeCost(nextSoilCost) : "无"} />
      </div>
      <p className="cave-hint">{species.effectText}</p>
      <div className="spirit-field-actions">
        <button className="primary-action compact" disabled={!mature} onClick={() => onChange(harvestSpiritPlant(game, HOME_SPIRIT_FIELD_REGION_ID, plot.id))} type="button">
          收获
        </button>
        <button className="ghost-button" onClick={() => onChange(uprootSpiritPlant(game, HOME_SPIRIT_FIELD_REGION_ID, plot.id))} type="button">
          拔除
        </button>
      </div>
      <button className="gold-button cave-upgrade-button" disabled={!nextSoilConfig} onClick={() => onChange(upgradeSpiritFieldPlot(game, HOME_SPIRIT_FIELD_REGION_ID, plot.id))} type="button">
        {nextSoilConfig ? `培土至${itemGradeLabels[nextSoilConfig.grade]}` : "灵土已满品"}
      </button>
    </div>
  );
}

function SpiritSeedBag({
  onBack,
  onPageChange,
  onPlant,
  page,
  seeds,
}: {
  seeds: Array<{ itemId: string; amount: number; plantName: string }>;
  page: number;
  onBack: () => void;
  onPageChange: (page: number) => void;
  onPlant: (itemId: string) => void;
}) {
  const pageCount = getPagedSlotPageCount(seeds.length, SPIRIT_SEED_BAG_SLOT_COUNT);
  const visiblePage = clampPagedSlotPage(page, seeds.length, SPIRIT_SEED_BAG_SLOT_COUNT);
  const seedSlots = getPagedSlots(seeds, visiblePage, SPIRIT_SEED_BAG_SLOT_COUNT);
  return (
    <div className="spirit-seed-bag">
      <div className="section-heading">
        <h2>
          <GameIcon name="module-inventory" size={18} />
          灵种背包
        </h2>
        <span>{seeds.length} 种</span>
      </div>
      <div className="inventory-grid-wrap spirit-seed-bag-grid">
        <div className="inventory-grid">
          {seedSlots.map((seed, index) => {
            const plant = seed ? getSpiritPlantBySeed(seed.itemId) : null;
            const item = seed ? getItem(seed.itemId) : null;
            return seed && plant && item ? (
              <ItemSlot
                amount={seed.amount}
                className="inventory-grid-slot item-grade-press"
                grade={item.grade}
                iconName={getItemIconName(item)}
                key={seed.itemId}
                name={formatItemName(item)}
                description={`${plant.name} · ${itemGradeLabels[plant.grade]}`}
                onClick={() => onPlant(seed.itemId)}
                state="filled"
              />
            ) : (
              <ItemSlot className="inventory-grid-slot empty" key={`seed-empty-${visiblePage}-${index}`} state="empty" />
            );
          })}
        </div>
        {seeds.length === 0 ? <p className="inventory-grid-empty">背包中暂无可种植灵种。</p> : null}
        {pageCount > 1 ? (
          <div className="equipment-page-controls inventory-page-controls">
            <button className="ghost-button" disabled={visiblePage <= 0} onClick={() => onPageChange(Math.max(0, visiblePage - 1))} type="button">
              上一页
            </button>
            <span>
              {visiblePage + 1} / {pageCount}
            </span>
            <button className="ghost-button" disabled={visiblePage >= pageCount - 1} onClick={() => onPageChange(Math.min(pageCount - 1, visiblePage + 1))} type="button">
              下一页
            </button>
          </div>
        ) : null}
      </div>
      <button className="ghost-button field-seed-close" onClick={onBack} type="button">
        返回地块
      </button>
    </div>
  );
}

function SelectionHeader({ meta, title }: { meta: string; title: string }) {
  return (
    <div className="cave-selection-head">
      <strong>{title}</strong>
      <small>{meta}</small>
    </div>
  );
}

function EmptySelectionSlot() {
  return (
    <div className="cave-selection-slot empty" aria-hidden="true">
      <span className="selection-slot-index">空</span>
      <GameIcon name="system-library" size={15} />
      <span>
        <strong>空槽</strong>
        <small>等待解锁</small>
      </span>
    </div>
  );
}

function SelectionPager({
  count,
  onPageChange,
  page,
  pageCount,
}: {
  count: number;
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  if (count <= SELECTION_SLOT_COUNT) {
    return null;
  }
  return (
    <div className="selection-pager">
      <button className="ghost-button" disabled={page <= 0} onClick={() => onPageChange(Math.max(0, page - 1))} type="button">
        上一组
      </button>
      <span>
        {page + 1}/{pageCount}
      </span>
      <button className="ghost-button" disabled={page >= pageCount - 1} onClick={() => onPageChange(Math.min(pageCount - 1, page + 1))} type="button">
        下一组
      </button>
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

function getSelectionPageCount(count: number): number {
  return getPagedSlotPageCount(count, SELECTION_SLOT_COUNT);
}

function clampSelectionPage(page: number, count: number): number {
  return clampPagedSlotPage(page, count, SELECTION_SLOT_COUNT);
}

function getSelectionSlots<T>(items: T[], page: number): Array<T | null> {
  return getPagedSlots(items, page, SELECTION_SLOT_COUNT);
}

function getPagedSlotPageCount(count: number, pageSize: number): number {
  return Math.max(1, Math.ceil(count / pageSize));
}

function clampPagedSlotPage(page: number, count: number, pageSize: number): number {
  return Math.min(Math.max(0, page), getPagedSlotPageCount(count, pageSize) - 1);
}

function getPagedSlots<T>(items: T[], page: number, pageSize: number): Array<T | null> {
  const start = clampPagedSlotPage(page, items.length, pageSize) * pageSize;
  const visibleItems = items.slice(start, start + pageSize);
  return Array.from({ length: pageSize }, (_, index) => visibleItems[index] ?? null);
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

function getHighestSoilGrade(plots: GameState["cave"]["spiritField"]["regions"][string]["plots"]): ItemGrade {
  return plots.reduce<ItemGrade>((highest, plot) => {
    if (!plot.unlocked) {
      return highest;
    }
    const grade = getSpiritFieldPlotGradeConfig(plot.soilGrade).grade;
    return itemGradeOrder.indexOf(grade) > itemGradeOrder.indexOf(highest) ? grade : highest;
  }, "fan");
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
