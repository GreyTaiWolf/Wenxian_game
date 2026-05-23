# 地图内容与事件文档

本文档记录图片地图、格子区域、城市/地点信息和后续地图事件扩展规则。新增地图事件、采集点、城市内容、剧情点或地点区域时，优先同步本文档，再检查 `docs/GAME_DESIGN.md` 与 `docs/BALANCE.md`。

## 地图层级

当前历练地图分为三层：

- 大世界：地图 ID 为 `world`，使用 `World_map.png`，负责州域选择与州域入口信息。
- 州域地图：中州和南疆均启用图片地图；中州地图 ID 为 `region:central`，使用 `World_map_zhonzhou2.png`；南疆地图 ID 为 `region:south_ridge`，使用 `World_map_nanjiang2.png`。
- 地点场景：进入具体地点后，可使用卡片式场景与行动列表；青云镇、黑风山已启用三级图片地图。

## 坐标规则

- 图片原始坐标按 `1536x1024` 处理。
- 网格尺寸为 `48x32`，`cellSize = 32`。
- 坐标使用零基准 `x,y` 格子坐标，例如 `11,6`。
- 旧 `24x16` 存档坐标加载时按 `x*2+1, y*2+1` 迁移到新网格，保持角色落点位于原格中心附近。
- `anchor` 是区域中心或入口参考格，不一定是玩家最终停留格。
- 普通模式下的州域/地点文字标记放在 `anchor` 中心格；整片 zone 仍然负责点击移动后的信息命中。
- 玩家点击不可走格时，先修正到最近可走格，再按最终停留格判断是否命中 zone。
- `eventIds` 作为后续地图事件预留字段，本次不触发额外战斗、奖励或任务。

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

玩家自由点击并抵达这些区域后，只自动展开州域信息抽屉。未开放州域仍显示“暂未开放”，不会进入内部地图。

## 中州 Zone

| zoneId | 地点 | 类型 | targetId | anchor | 覆盖格 | eventIds |
| --- | --- | --- | --- | --- | --- | --- |
| `central:location:qingyun_city` | 青云镇 | 城市 | `qingyun_city` | `10,12` | `10,12` | 预留 |
| `central:location:tian_xuan_gate` | 天玄城门 | 城市 | `tian_xuan_gate` | `28,16` | `28,16` | 预留 |
| `central:location:black_wind_mountain` | 黑风山 | 野外 | `black_wind_mountain` | `6,12` | `6,12` | 预留 |
| `central:location:herb_valley` | 灵药谷 | 野外 | `herb_valley` | `21,25` | `21,25` | 预留 |
| `central:location:ancient_cave` | 古修洞府 | 秘境 | `ancient_cave` | `34,5` | `34,5` | 预留 |
| `central:location:luoxia_town` | 落霞镇 | 城镇 | `luoxia_town` | `8,24` | `8,24` | 预留 |

玩家自由点击并抵达中州地点单格入口后，只自动展开地点信息抽屉。青云镇位于中州西侧 `10,12`，与黑风山横向相邻但仍保持单格入口；实际寻路和 zone 命中使用表内 anchor。进入地点后由地点配置决定是否使用三级图片地图，不因入口改造新增奖励、任务或战斗组。

### 青云镇内部场景

青云镇进入地点后使用 `scene/qinyun_town.png` 作为三级场景地图。整张图占据地点页面主体，支持拖拽、缩放和重置；三级地图上下方向锁定，横向拖拽和缩放时图片不得离开 UI 框架。网格按钮可显示 `42x23` 表格坐标，用于后续按“左侧某格”追加交互或新场景。玩家点击背景图文字或文字下方黄点切换场景：无独立场景图的入口展开图内抽屉，有独立场景图的入口进入第四级图片地图；三级地图网格只做标注参考，不进行 A* 寻路或网格判定。

| 热点 | 场景 ID | 三级格 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| 小小仙铺 | `xiaoxiao_shop` | `20,8` | 交易 | 镇内杂货小铺，接入现有商店入口 |
| 赵家炼器铺 | `zhao_refinery` | `22,13` | 交易 | 低阶兵刃与炼器铺，接入现有商店入口 |
| 陈半仙 | `chen_banxian_stall` | `17,12` | NPC 对话 | 摆摊卖秘籍的老头，当前为对话与功法系统预告 |
| 李百草 | `li_baicao_herbs` | `12,11` | 交易 | 进入 `scene/li_baicao.png` 第四级草药铺地图，接入现有商店入口 |
| 城主府 | `city_manor` | 预留 | NPC 对话 | 保留青云令牌入宗入口 |
| 公告栏 | `notice_board` | `26,5` | 任务 | 保留中州任务榜入口 |
| 青云客栈 | `qingyun_inn` | `30,11` | NPC 对话 | 客栈老板娘消息与顾青萝招募入口 |
| 灵田 | `inn_spirit_field` | `33,12` | NPC 对话 | 青云客栈老板娘的灵田，当前只展示观察反馈 |

### 黑风山内部场景

黑风山进入地点后使用 `scene/black_wind_mountain.png` 作为三级场景地图。网格沿用 `42x23`；红色格为不可走地形提示，只做视觉标注，不接入 A* 寻路或存档坐标。黑灵泉到墨金洞之间保留可通行石阶路线。当前开放黑灵泉、墨金洞、黑风妖寨三个热点，战斗沿用已有山狼与黑风妖修配置，不新增敌人、掉落或奖励数值。

| 热点 | 场景 ID | 三级格 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| 黑灵泉 | `black_spirit_spring` | `20,10` | 灵泉 | 黑雾泉眼，当前提供探查反馈 |
| 墨金洞 | `mojin_cave` | `33,17` | 洞窟战斗 | 洞中妖狼，沿用 `wolf_pack` |
| 黑风妖寨 | `black_wind_demon_stockade` | `35,10` | 妖修战斗 | 妖修营寨，沿用 `black_wind_duo` |

### 中州场景热点

| 地点 | 场景 | 热点 ID | NPC | 画面位置 | 交互 |
| --- | --- | --- | --- | --- | --- |
| 天玄城门 | 天玄城门 | `shen_guanlan` | 沈观澜 | 左侧登记修士，`22%,78%` | 点击姓名弹出城门登记对话 |
| 天玄城门 | 天玄城门 | `lu_xuanheng` | 陆玄衡 | 右侧守门修士，`76%,76%` | 点击姓名弹出守门规矩对话 |

### 场景资源与热点组件规则

- 图片资源统一从 `src/data/assets.ts` 读取，地图、州域图、场景图、NPC 头像和物品图标都先登记在资源入口，业务组件不再散落硬编码路径。
- 现有真实图片继续用 Vite `new URL(...)` 引入；未来内容可先登记 `/assets/...` 规划路径，但组件必须允许图片加载失败。
- 场景图缺失时，`SceneView` 显示场景名、类型和短描述，不阻塞行动按钮、NPC 热点或文字反馈。
- NPC 头像缺失时，`NpcDialogueSheet` 显示默认头像占位；物品图标缺失时继续使用 `GameIcon` 语义图标。
- 热点坐标使用百分比 `x/y`，左上角为 `0%,0%`，右下角为 `100%,100%`；按钮点击区域不小于 42px。
- 热点类型预留 `npc / shop / portal / action`，当前天玄城门 NPC 热点先接入底部对话抽屉，不改变地图寻路、奖励或任务触发。

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

玩家自由点击并抵达南疆地点单格入口后，只自动展开地点信息抽屉。入口周边相邻格不会按旧多格区域自动弹出地点信息；进入地点仍需要玩家点击抽屉中的“前往”按钮。

## 后续事件规则

新增地图事件时建议使用以下流程：

1. 先在本文件记录事件名称、关联 zone、触发条件、显示文案和奖励/战斗预期。
2. 若事件影响奖励、掉落、战斗或概率，同步更新 `docs/BALANCE.md`。
3. 若事件影响世界内容、任务线或系统关系，同步更新 `docs/GAME_DESIGN.md`。
4. 再在 `src/data` 中添加正式配置，并确保 ID 使用英文 `lower_snake_case`。
5. 保持 zone 命中只负责“发现与弹出信息”，不要绕过地点确认直接触发收益。
