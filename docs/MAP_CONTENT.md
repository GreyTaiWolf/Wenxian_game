# 地图内容与事件文档

本文档记录纯文字格子地图、城市/地点信息和行路异闻扩展规则。自 2026-07-23 起，大世界与州域不再使用图片地图；新增地图事件、采集点、城市内容、剧情点或地点区域时，优先同步本文档，再检查 `docs/GAME_DESIGN.md` 与 `docs/BALANCE.md`。

## 地图层级

当前历练地图分为三层：

- 大世界：地图 ID 为 `world`，使用 `48x32` 纯文字格子，负责州域位置、路径、地形成本和入口信息。
- 州域地图：中州地图 ID 为 `region:central`，南疆地图 ID 为 `region:south_ridge`；两者均使用 `48x32` 纯文字格子、地点锚点和 A* 寻路。
- 地点场景：进入具体地点后，仍使用原有卡片式场景与行动列表。

地图层不加载 `World_map.png`、`World_map_zhonzhou2.png`、`World_map_nanjiang2.png` 或其他背景图。旧图片资源可作为历史素材保留在仓库，但不能参与当前地图渲染、命中、寻路或内容配置。独立地点场景是否使用插图与“取消图片地图”分开管理。

## 坐标规则

- 网格尺寸为 `48x32`，`cellSize = 32` 只作为逻辑与布局基准，不再对应图片像素。
- 坐标使用零基准 `x,y` 格子坐标，例如 `11,6`。
- 旧 `24x16` 存档坐标加载时按 `x*2+1, y*2+1` 迁移到新网格，保持角色落点位于原格中心附近。
- `anchor` 是区域中心或入口参考格，不一定是玩家最终停留格。
- 州域/地点文字标记放在 `anchor` 中心格；整片 zone 仍然负责点击移动后的信息命中。
- 玩家点击不可走格时，先修正到最近可走格，再按最终停留格判断是否命中 zone。
- A* 只使用上下左右四方向；普通格成本为 1，高消耗格使用 `movementCost` 2 或 3，不可走格不进入路径。
- 大世界普通格推进 7 小时，州域普通格推进 1 小时；高消耗格时间再乘 `movementCost`。
- `eventIds` 可作为 zone 的异闻白名单；为空时由地图、州域、起终点、路程、冷却与事件标记共同筛选候选事件。

## Zone 尺寸规则

来源：`src/data/gridMapZones.ts`

| 类型 | 格数 | 形状 | 用途 |
| --- | ---: | --- | --- |
| 大世界州域入口 | 9 | `3x3` | 州域信息抽屉与确认进入 |
| 州域地点入口 | 1 | `1x1` | 中州、南疆城市、城镇、野外和秘境地点确认入口 |
| 小入口预留 | 2 | `1x2` | 后续洞口、传送阵、狭窄关隘 |

## 大世界 Zone

| zoneId | 州域 | targetId | anchor | 覆盖格 | 状态 |
| --- | --- | --- | --- | --- | --- |
| `world:province:central` | 中州 | `central` | `23,13` | `22-24,12-14` | 已开放 |
| `world:province:east_sea` | 东海 | `east_sea` | `39,12` | `38-40,11-13` | 未开放 |
| `world:province:west_desert` | 西漠 | `west_desert` | `8,15` | `7-9,14-16` | 未开放 |
| `world:province:south_ridge` | 南疆 | `south_ridge` | `23,23` | `22-24,22-24` | 已开放 |
| `world:province:north_border` | 北境 | `north_border` | `23,5` | `22-24,4-6` | 未开放 |

玩家选择目标格并按 A* 路径抵达这些区域后，自动展开州域信息抽屉。未开放州域仍显示“暂未开放”，不会进入内部地图。

## 中州 Zone

| zoneId | 地点 | 类型 | targetId | anchor | 覆盖格 | eventIds |
| --- | --- | --- | --- | --- | --- | --- |
| `central:location:qingyun_city` | 青云城 | 城市 | `qingyun_city` | `24,15` | `24,15` | 预留 |
| `central:location:tian_xuan_gate` | 天玄城门 | 城市 | `tian_xuan_gate` | `28,16` | `28,16` | 预留 |
| `central:location:black_wind_mountain` | 黑风山 | 野外 | `black_wind_mountain` | `6,12` | `6,12` | 预留 |
| `central:location:herb_valley` | 灵药谷 | 野外 | `herb_valley` | `21,25` | `21,25` | 预留 |
| `central:location:ancient_cave` | 古修洞府 | 秘境 | `ancient_cave` | `34,5` | `34,5` | 预留 |
| `central:location:luoxia_town` | 落霞镇 | 城镇 | `luoxia_town` | `8,24` | `8,24` | 预留 |

玩家选择目标格并抵达中州地点单格入口后，自动展开地点信息抽屉。行程完成时可能先出现路途异闻；异闻处理后进入地点仍使用原有地点场景和行动列表。

### 中州场景热点

| 地点 | 场景 | 热点 ID | NPC | 画面位置 | 交互 |
| --- | --- | --- | --- | --- | --- |
| 天玄城门 | 天玄城门 | `shen_guanlan` | 沈观澜 | 左侧登记修士，`22%,78%` | 点击姓名弹出城门登记对话 |
| 天玄城门 | 天玄城门 | `lu_xuanheng` | 陆玄衡 | 右侧守门修士，`76%,76%` | 点击姓名弹出守门规矩对话 |

## 南疆 Zone

| zoneId | 地点 | 类型 | targetId | anchor | 覆盖格 | eventIds |
| --- | --- | --- | --- | --- | --- | --- |
| `south_ridge:location:wuyao_alliance` | 巫妖盟 | 城市 | `wuyao_alliance` | `25,9` | `25,9` | 预留 |
| `south_ridge:location:wood_spirit_sect` | 木灵宗 | 城市 | `wood_spirit_sect` | `11,7` | `11,7` | 预留 |
| `south_ridge:location:baicao_valley` | 百草谷 | 野外 | `baicao_valley` | `19,15` | `19,15` | 预留 |
| `south_ridge:location:ten_thousand_beast_mountain` | 万妖山 | 野外 | `ten_thousand_beast_mountain` | `15,11` | `15,11` | 预留 |
| `south_ridge:location:miasma_marsh` | 瘴雾沼泽 | 野外 | `miasma_marsh` | `9,21` | `9,21` | 预留 |
| `south_ridge:location:thousand_falls_cliff` | 千瀑灵崖 | 秘境 | `thousand_falls_cliff` | `29,15` | `29,15` | 预留 |
| `south_ridge:location:tide_market` | 潮汐海市 | 城镇 | `tide_market` | `39,15` | `39,15` | 预留 |
| `south_ridge:location:returning_tide_reef` | 归潮礁岛 | 秘境 | `returning_tide_reef` | `35,25` | `35,25` | 预留 |

玩家选择目标格并抵达南疆地点单格入口后，自动展开地点信息抽屉。入口周边相邻格不会按旧多格区域自动弹出地点信息；进入地点仍需要玩家点击抽屉中的“前往”按钮。南疆异闻池尚未制作时不会借用中州异闻文案。

## 当前行路异闻

来源：`src/data/travelEvents.ts`、`src/game/travelEvents.ts`

| 事件 ID | 标题 | 关联地点 | 最短路程 | 冷却 | 说明 |
| --- | --- | --- | ---: | ---: | --- |
| `central_wounded_guest` | 黑松坡·负伤客 | 黑风山、落霞镇 | 4 格 | 48 小时 | 可消耗回春散救人并进入后续因果，也可免费绕行 |
| `central_mired_caravan` | 落霞商道·陷车 | 青云城、落霞镇 | 3 格 | 30 小时 | 灵草换谢仪，或耗时推车 |
| `central_three_leaf_verdure` | 药谷外·三叶青 | 灵药谷 | 3 格 | 36 小时 | 付灵石学习采药，或观叶悟气 |
| `central_broken_stele` | 洞府古道·断碑剑音 | 古修洞府 | 4 格 | 54 小时 | 灵石补阵强悟，或安全拓碑 |
| `central_rain_tea_stall` | 青云驿路·无名茶棚 | 青云城、落霞镇、天玄城门 | 3 格 | 42 小时 | 饮茶定心，或免费问路 |
| `central_star_track_array` | 天玄城外·星轨残阵 | 天玄城门、青云城 | 4 格 | 48 小时 | 消耗凝气草稳阵，或记录阵纹 |
| `central_wounded_guest_old_kiln` | 废窑灯火·旧诺 | 负伤客后续 | 续接 | 共用 48 小时 | 仅由救助负伤客的选择继续，不进入普通抽取池 |

触发与选择规则：

- 首次存在合格候选的行程必定触发一次；已有事件历史后按 `14% + min(50%, 路程格数 × 2.5%)` 判定，上限 72%。
- 候选事件按 `weight` 加权抽取；处于冷却、路程不足、地区不符或 `stageOnly` 的事件会被排除。
- 每条事件固定两个选择，至少一个无需资源；资源不足时付费选项禁用，但玩家始终可以继续。
- 结果可修改修为、灵石、物品、心境、时间与事件标记；待处理事件、历史和标记保存到 V4 存档。
- 进行中的格子路径、剩余步数与目的意图同样保存到 V4；刷新或返回菜单后会从当前格继续，不会出现坐标已移动但抵达结算丢失。
- 待处理异闻由游戏主界面全局阻塞，不能通过切换修炼、背包或洞府绕过选择。
- 当前历史最多保留 40 条；后续扩展不能把完整长篇正文塞进历史，只记录事件、选择和世界时间。

## 新增事件流程

新增地图事件时使用以下流程：

1. 先在本文件记录事件名称、关联 zone、触发条件、显示文案和奖励/战斗预期。
2. 若事件影响奖励、掉落、战斗或概率，同步更新 `docs/BALANCE.md`。
3. 若事件影响世界内容、任务线或系统关系，同步更新 `docs/GAME_DESIGN.md`。
4. 再在 `src/data` 中添加正式配置，并确保 ID 使用英文 `lower_snake_case`。
5. 每条事件必须有免费兜底选项，并设置合理冷却；付费项必须在结算前验证资源。
6. 保持 zone 与行程只负责筛选和弹出事件，奖励统一由选择结算，不允许点击同一格无限领取。
