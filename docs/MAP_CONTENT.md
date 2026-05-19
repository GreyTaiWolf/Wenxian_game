# 地图内容与事件文档

本文档记录图片地图、格子区域、城市/地点信息和后续地图事件扩展规则。新增地图事件、采集点、城市内容、剧情点或地点区域时，优先同步本文档，再检查 `docs/GAME_DESIGN.md` 与 `docs/BALANCE.md`。

## 地图层级

当前历练地图分为三层：

- 大世界：地图 ID 为 `world`，使用 `World_map.png`，负责州域选择与州域入口信息。
- 州域地图：当前只有南疆启用图片地图，地图 ID 为 `region:south_ridge`，使用 `World_map_nanjiang2.png`。
- 地点场景：进入具体地点后，仍使用原有卡片式场景与行动列表。

中州当前没有图片二级地图，继续保留卡片式地点入口。

## 坐标规则

- 图片原始坐标按 `1536x1024` 处理。
- 网格尺寸为 `24x16`，`cellSize = 64`。
- 坐标使用零基准 `x,y` 格子坐标，例如 `11,6`。
- `anchor` 是区域中心或入口参考格，不一定是玩家最终停留格。
- 普通模式下的州域/地点文字标记放在 `anchor` 中心格；整片 zone 仍然负责点击移动后的信息命中。
- 玩家点击不可走格时，先修正到最近可走格，再按最终停留格判断是否命中 zone。
- `eventIds` 作为后续地图事件预留字段，本次不触发额外战斗、奖励或任务。

## Zone 尺寸规则

来源：`src/data/gridMapZones.ts`

| 类型 | 格数 | 形状 | 用途 |
| --- | ---: | --- | --- |
| 大世界州域入口 | 9 | `3x3` | 州域信息抽屉与确认进入 |
| 城市/城镇 | 9 | `3x3` | 主城、坊市、宗门城镇等较大落点 |
| 野外 | 6 | `3x2` | 山林、谷地、沼泽等中型活动区域 |
| 秘境 | 3 | `3x1` | 洞天、礁岛、瀑后入口等小型入口 |
| 小入口预留 | 2 | `1x2` | 后续洞口、传送阵、狭窄关隘 |

## 大世界 Zone

| zoneId | 州域 | targetId | anchor | 覆盖格 | 状态 |
| --- | --- | --- | --- | --- | --- |
| `world:province:central` | 中州 | `central` | `11,6` | `10-12,5-7` | 已开放 |
| `world:province:east_sea` | 东海 | `east_sea` | `19,6` | `18-20,5-7` | 未开放 |
| `world:province:west_desert` | 西漠 | `west_desert` | `4,7` | `3-5,6-8` | 未开放 |
| `world:province:south_ridge` | 南疆 | `south_ridge` | `11,11` | `10-12,10-12` | 已开放 |
| `world:province:north_border` | 北境 | `north_border` | `11,2` | `10-12,1-3` | 未开放 |

玩家自由点击并抵达这些区域后，只自动展开州域信息抽屉。未开放州域仍显示“暂未开放”，不会进入内部地图。

## 南疆 Zone

| zoneId | 地点 | 类型 | targetId | anchor | 覆盖格 | eventIds |
| --- | --- | --- | --- | --- | --- | --- |
| `south_ridge:location:wuyao_alliance` | 巫妖盟 | 城市 | `wuyao_alliance` | `12,4` | `11-13,3-5` | 预留 |
| `south_ridge:location:wood_spirit_sect` | 木灵宗 | 城市 | `wood_spirit_sect` | `5,3` | `4-6,2-4` | 预留 |
| `south_ridge:location:baicao_valley` | 百草谷 | 野外 | `baicao_valley` | `9,7` | `8-10,6-7` | 预留 |
| `south_ridge:location:ten_thousand_beast_mountain` | 万妖山 | 野外 | `ten_thousand_beast_mountain` | `7,5` | `6-8,4-5` | 预留 |
| `south_ridge:location:miasma_marsh` | 瘴雾沼泽 | 野外 | `miasma_marsh` | `4,10` | `3-5,9-10` | 预留 |
| `south_ridge:location:thousand_falls_cliff` | 千瀑灵崖 | 秘境 | `thousand_falls_cliff` | `14,7` | `13-15,7` | 预留 |
| `south_ridge:location:tide_market` | 潮汐海市 | 城镇 | `tide_market` | `19,7` | `18-20,6-8` | 预留 |
| `south_ridge:location:returning_tide_reef` | 归潮礁岛 | 秘境 | `returning_tide_reef` | `17,12` | `16-18,12` | 预留 |

玩家自由点击并抵达南疆地点区域后，只自动展开地点信息抽屉。进入地点仍需要玩家点击抽屉中的“前往”按钮。

## 后续事件规则

新增地图事件时建议使用以下流程：

1. 先在本文件记录事件名称、关联 zone、触发条件、显示文案和奖励/战斗预期。
2. 若事件影响奖励、掉落、战斗或概率，同步更新 `docs/BALANCE.md`。
3. 若事件影响世界内容、任务线或系统关系，同步更新 `docs/GAME_DESIGN.md`。
4. 再在 `src/data` 中添加正式配置，并确保 ID 使用英文 `lower_snake_case`。
5. 保持 zone 命中只负责“发现与弹出信息”，不要绕过地点确认直接触发收益。
