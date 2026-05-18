import { useState } from "react";
import { getRealm } from "../data/progression";
import type { RootSave, SaveSlot, SettingsState } from "../types";
import { GameIcon } from "./GameIcon";

interface MainMenuProps {
  rootSave: RootSave;
  onContinue: () => void;
  onCreate: (slotIndex: number, name: string) => void;
  onDelete: (slotId: string) => void;
  onUpdateSettings: (settings: SettingsState) => void;
}

function formatSlot(slot: SaveSlot | null, index: number): string {
  if (!slot) {
    return `存档 ${index + 1}：空`;
  }
  const realm = getRealm(slot.game.player.realmId);
  return `存档 ${index + 1}：${slot.game.player.name} · ${realm.name}`;
}

export default function MainMenu({ rootSave, onContinue, onCreate, onDelete, onUpdateSettings }: MainMenuProps) {
  const recentSlot = rootSave.slots.find((slot) => slot?.id === rootSave.recentSlotId) ?? null;

  return (
    <main className="menu-shell">
      <section className="ink-title">
        <span>
          <GameIcon name="module-cultivation" size={16} />
          文字修仙
        </span>
        <h1>初入仙途</h1>
        <p>一卷凡心入青云，三尺灵光照长生。</p>
      </section>

      <section className="menu-card">
        <button className="primary-action" disabled={!recentSlot} onClick={onContinue}>
          <GameIcon name="action-back" size={18} />
          继续
          <small>{recentSlot ? `${recentSlot.game.player.name} · ${getRealm(recentSlot.game.player.realmId).name}` : "暂无可继续存档"}</small>
        </button>
        <NewGameForm rootSave={rootSave} onCreate={onCreate} />
      </section>

      <section className="menu-card">
        <div className="section-heading">
          <h2>
            <GameIcon name="item" size={18} />
            存档
          </h2>
          <span>三档</span>
        </div>
        <div className="slot-list">
          {rootSave.slots.map((slot, index) => (
            <div className="slot-row" key={slot?.id ?? `empty-${index}`}>
              <div>
                <strong>{formatSlot(slot, index)}</strong>
                <small>{slot ? `最后游玩：${new Date(slot.updatedAt).toLocaleString()}` : "可创建新角色"}</small>
              </div>
              {slot ? (
                <button className="ghost-button danger" onClick={() => onDelete(slot.id)}>
                  删除
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="menu-card">
        <div className="section-heading">
          <h2>
            <GameIcon name="action-settings" size={18} />
            设置
          </h2>
          <span>本地</span>
        </div>
        <label className="setting-row">
          文字大小
          <select
            value={rootSave.settings.textSize}
            onChange={(event) => onUpdateSettings({ ...rootSave.settings, textSize: event.target.value as SettingsState["textSize"] })}
          >
            <option value="small">小</option>
            <option value="normal">标准</option>
            <option value="large">大</option>
          </select>
        </label>
        <label className="setting-row">
          动效
          <input
            type="checkbox"
            checked={rootSave.settings.motion}
            onChange={(event) => onUpdateSettings({ ...rootSave.settings, motion: event.target.checked })}
          />
        </label>
        <label className="setting-row">
          自动存档
          <input
            type="checkbox"
            checked={rootSave.settings.autoSave}
            onChange={(event) => onUpdateSettings({ ...rootSave.settings, autoSave: event.target.checked })}
          />
        </label>
      </section>
    </main>
  );
}

function NewGameForm({ rootSave, onCreate }: { rootSave: RootSave; onCreate: (slotIndex: number, name: string) => void }) {
  const [slotIndex, setSlotIndex] = useState(() => {
    const emptyIndex = rootSave.slots.findIndex((slot) => !slot);
    return emptyIndex >= 0 ? emptyIndex : 0;
  });
  const [name, setName] = useState("");
  const normalized = Array.from(name.trim()).slice(0, 5).join("");
  const isValid = normalized.length >= 1 && normalized.length <= 5;

  return (
    <div className="new-game">
      <div className="section-heading">
        <h2>
          <GameIcon name="module-cultivation" size={18} />
          初入仙途
        </h2>
        <span>{rootSave.slots[slotIndex] ? "覆盖" : "新档"}</span>
      </div>
      <label>
        存档位
        <select value={slotIndex} onChange={(event) => setSlotIndex(Number(event.target.value))}>
          {rootSave.slots.map((slot, index) => (
            <option value={index} key={index}>
              {formatSlot(slot, index)}
            </option>
          ))}
        </select>
      </label>
      <label>
        道号
        <input
          value={name}
          maxLength={10}
          placeholder="5 个字符内"
          onChange={(event) => setName(Array.from(event.target.value).slice(0, 5).join(""))}
        />
      </label>
      <button className="primary-action" disabled={!isValid} onClick={() => onCreate(slotIndex, normalized)}>
        <GameIcon name="module-explore" size={18} />
        初入仙途
        <small>{isValid ? `${normalized} 将踏入中州` : "请输入 1-5 个字符"}</small>
      </button>
    </div>
  );
}
