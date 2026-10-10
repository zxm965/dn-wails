# 日历模块

## 模块目标

提供无需登录的中国日历月视图，统一展示公历、农历、传统节日、周末、今天，以及国务院办公厅公布的法定节假日和调休补班状态。

## 目录与职责

- `frontend/src/features/calendar/components/CalendarPanel.tsx`：月份标题、年月切换、日期选择、回到今天圆点按钮、状态图例和官方来源入口。
- `frontend/src/features/calendar/components/CalendarPanel.css.ts`：带页面安全边距的卡片式月历网格、状态色和响应式布局。
- `frontend/src/features/calendar/components/CalendarSummary.tsx` 与同名 `.css.ts`：所选日期、公历星期、农历标签、休班状态、可点击的本月传统节日和星座日期范围，以及弹性留白、装饰圆环和响应式样式。
- `frontend/src/features/calendar/model/calendar.ts`：按完整周动态补齐的月视图生成、公历日期键、农历标签和传统节日识别。
- `frontend/src/features/calendar/model/zodiac.ts`：按常用太阳星座固定日期分界计算当前月份覆盖的两个星座和月内日期范围。
- `frontend/src/features/calendar/data/chinaHolidays.ts`：国务院年度放假通知、放假区间和调休补班日期。
- `frontend/src/features/calendar/index.ts`：模块公共入口。
- `frontend/src/shared/navigation/routeConfig.ts`：`/calendar` Hash 路由元数据。
- `frontend/src/shared/navigation/menuConfig.ts`：默认显示的“日历”菜单和偏好说明。

## 依赖关系

```text
HashRouter
  → App 路由装配
  → CalendarPanel
      ├── calendar model
      ├── china holiday data
      ├── shared UI
      └── Native Kit（系统浏览器打开官方来源）
```

日历是纯前端业务模块，不直接依赖账号、数据库、Wails 生成绑定或操作系统日期 API。外部链接只通过共享 Native Kit 打开。

## 核心链路

1. 页面初次打开时读取本地当前日期，生成当前月份。
2. 月视图从当月第一天所在周的星期日开始，只补齐首周之前和末周之后缺少的日期，按实际需要生成 4–6 个完整周。
3. 每个日期使用 `Intl.DateTimeFormat('zh-CN-u-ca-chinese')` 获取农历月日，同时兼容 Chromium 返回的数字日和 macOS WebView 返回的中文农历日，再识别春节、元宵、端午、七夕、中秋、重阳、腊八和除夕。
4. 日期键命中国务院年度数据时覆盖为“休”或“班”，并展示对应节日或调休名称。
5. 上一月、下一月、年份下拉、月份下拉和年月选择器后的绿色“回到今天”圆点按钮只更新当前页面状态，不产生网络请求；回到今天同时选中今天。
6. 日期格支持悬浮、焦点和点击选中视觉状态；日期选择同步更新顶部概览，展示公历星期、农历标签和已有节假日状态，选中日期只保存在组件内，不产生事件或持久化。
7. 顶部“本月节日”只列出当前月的传统节日，点击后选中对应日期；本月天数和周末日数量由当前月数据计算，周末日数量不表示法定休假天数。
8. 顶部“本月星座”列出当前月份覆盖的两个星座、符号和月内日期范围，并突出当前所选日期所属的星座；选中相邻月份日期时，不突出本月星座。

## 数据契约

```ts
interface CalendarDay {
  date: Date
  dateKey: string
  day: number
  lunarLabel: string
  traditionalFestival?: string
  holiday?: { name: string; status: 'holiday' | 'workday' }
  isCurrentMonth: boolean
  isToday: boolean
  isWeekend: boolean
}
```

节假日数据当前收录：

- [2024 年部分节假日安排](https://www.gov.cn/zhengce/content/202310/content_6911527.htm)
- [2025 年部分节假日安排](https://www.gov.cn/zhengce/zhengceku/202411/content_6986383.htm)
- [2026 年部分节假日安排](https://www.gov.cn/zhengce/zhengceku/202511/content_7047091.htm)

## 错误与边界

- 公历和农历支持从 `1949` 年到当前年份之后第 `3` 年；边界月份的上一月或下一月按钮会禁用。
- 未收录国务院安排的年份仍展示公历、农历、传统节日和周末，但明确提示暂无官方调休数据，不根据经验推断“休/班”。
- “休”表示通知中的连续放假区间，“班”表示通知明确要求上班的调休日期；普通周末不额外标为“休”。
- 农历依赖 WebView 的标准 `Intl` 中国农历实现；农历日解析同时接受 `14` 和“十四”这两类引擎输出，不请求第三方日历接口。
- 官方来源无法打开时通过应用内反馈提示错误，不改变日历内容。
- 日期格可使用鼠标点击或键盘 Enter、空格选中；切月后如果上次选择仍在可见网格中则继续展示，否则默认展示本月第一天，切换回来时仍可恢复上次选择。
- 概览不推断未收录年份的休班安排；无传统节日的月份显示空状态，传统节日不等同于法定放假。
- 星座采用常见太阳星座固定日期表（[日期参考](https://time.com/5315377/are-zodiac-signs-real-astrology-history/)），不计算出生时刻或星盘；展示范围只包含当前月日期，二月末日按闰年调整，一月正确衔接上一年的摩羯座。
- 日历页根容器使用 `user-select: none` 和 `-webkit-user-select: none`，禁止鼠标拖动或双击选中文本，覆盖月份标题、日期卡片和顶部信息区；日期选择、键盘操作、下拉选择和来源链接仍按原有交互处理。

页面不使用通用 `PageHeader`，以月历工具栏中的月份作为一级标题。主体取消最大宽度限制，在对称横向安全边距内铺满右侧内容容器并保持水平居中；边距基于内容容器宽度响应式调整。月历内部采用带间距的日期卡片代替贴边表格线；日期行数随月份动态变化，不保留多余的整周。日期卡片的期望高度随窗口高度在 `54–72px` 之间调整，实际高度以日期行分配空间为上限。在内容宽度低于 `620px` 和 `390px` 时逐级收紧外边距、工具栏、卡片间距和圆角；月历页面内容宽度低于 `320px` 时，年月选择和导航控件分两行排列，日期数字与休班标记纵向排列并收紧尺寸，避免七列布局产生横向滚动。

页面高度固定为内容区高度，使用 `minmax(min-content, 1fr) minmax(0, max-content)` 两行网格：顶部概览保留必要内容高度并弹性承接剩余空间，下方月历优先使用期望高度，空间不足时缩短日期行，而不是撑高页面产生滚动。月历内部使用工具栏、星期、日期网格、图例四行布局，日期网格采用等高且可收缩的行，卡片设为 `min-height: 0` 和 `max-height: 100%`。月份为 4、5 或 6 行时无需测量高度或设置固定定位，也不修改其他页面的滚动行为。

概览在内容宽度不超过 `620px` 时从左右双栏切换为上下排列，节日按钮可换行，并隐藏辅助说明以节省高度；极窄内容下进一步隐藏日期提示标签，长休班名称省略展示并保留完整悬浮提示。使用主题令牌适配明暗主题，装饰圆环不接收鼠标事件。

## 接入方式

`CalendarPanel` 通过功能模块 `index.ts` 暴露，由 `App.tsx` 的 `/calendar` 路由装配。日历位于路由和侧边菜单首位，是应用默认入口；菜单默认可见且无需登录，用户可在“设置 → 菜单”中隐藏，隐藏当前日历入口时应用会回退到第一个可见路由。

新增年度安排时，只在 `chinaHolidays.ts` 中加入该年度通知来源、放假区间和补班日期，并人工逐项对照国务院通知。

## 验证方式

```bash
cd frontend
pnpm fmt:check
pnpm lint
pnpm build
```

人工检查至少覆盖：当前月份、跨年切换、春节跨月、国庆调休、无官方数据年份、4–6 行月份的剩余空间、日期与节日按钮选择、回到今天、无传统节日月份、星座分界日期、二月闰年与一月跨年星座、明暗主题、常规桌面尺寸、`1024 × 768` 最小窗口和极窄内容宽度。系统浏览器打开来源属于原生交互，需要桌面环境验证。
