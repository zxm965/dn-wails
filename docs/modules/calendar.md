# 日历模块

## 模块目标

提供无需登录的中国日历月视图，统一展示公历、农历、传统节日、周末、今天，以及国务院办公厅公布的法定节假日和调休补班状态。

## 目录与职责

- `frontend/src/features/calendar/components/CalendarPanel.tsx`：日历页头、年月切换、回到今天圆点按钮、状态图例和官方来源入口。
- `frontend/src/features/calendar/components/CalendarPanel.css.ts`：带页面安全边距的卡片式月历网格、状态色和响应式布局。
- `frontend/src/features/calendar/model/calendar.ts`：按完整周动态补齐的月视图生成、公历日期键、农历标签和传统节日识别。
- `frontend/src/features/calendar/data/chinaHolidays.ts`：国务院年度放假通知、放假区间和调休补班日期。
- `frontend/src/features/calendar/index.ts`：模块公共入口。
- `frontend/src/shared/navigation/routeConfig.ts`：`/calendar` Hash 路由元数据。
- `frontend/src/shared/navigation/menuConfig.ts`：默认显示的“日历中心”菜单和偏好说明。

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
3. 每个日期使用 `Intl.DateTimeFormat('zh-CN-u-ca-chinese')` 获取农历月日，再识别春节、元宵、端午、七夕、中秋、重阳、腊八和除夕。
4. 日期键命中国务院年度数据时覆盖为“休”或“班”，并展示对应节日或调休名称。
5. 上一月、下一月、年份下拉、月份下拉和年月选择器后的绿色“回到今天”圆点按钮只更新当前页面状态，不产生网络请求。
6. 日期格支持悬浮、焦点和点击选中视觉状态；当前选中日期只保存在组件内，不触发详情、事件或持久化。

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
- 农历依赖 WebView 的标准 `Intl` 中国农历实现；不请求第三方日历接口。
- 官方来源无法打开时通过应用内反馈提示错误，不改变日历内容。
- 日期格可使用鼠标点击或键盘 Enter、空格选中；该状态当前没有业务含义，切换回来时仍可恢复同一日期的选中描边。

页面使用比通用页面更宽的横向安全边距，月历内部采用带间距的日期卡片代替贴边表格线；日期行数随月份动态变化，不保留多余的整周。日期卡片高度随窗口高度在 `54–72px` 之间调整，并压缩垂直留白，使 5 行和 6 行月份尽量无需滚动即可完整展示。在内容宽度低于 `620px` 和 `390px` 时逐级收紧外边距、卡片间距和圆角，保证七列布局不产生横向滚动。

## 接入方式

`CalendarPanel` 通过功能模块 `index.ts` 暴露，由 `App.tsx` 的 `/calendar` 路由装配。日历中心位于路由和侧边菜单首位，是应用默认入口；菜单默认可见且无需登录，用户可在偏好设置中隐藏，隐藏当前日历入口时应用会回退到第一个可见路由。

新增年度安排时，只在 `chinaHolidays.ts` 中加入该年度通知来源、放假区间和补班日期，并人工逐项对照国务院通知。

## 验证方式

```bash
cd frontend
pnpm fmt:check
pnpm lint
pnpm build
```

人工检查至少覆盖：当前月份、跨年切换、春节跨月、国庆调休、无官方数据年份、`1024 × 768` 最小窗口和极窄内容宽度。系统浏览器打开来源属于原生交互，需要桌面环境验证。
