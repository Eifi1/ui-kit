import { UI_KIT_LABELS_ZH } from "@eifi1/ui-kit/i18n/zh";
import type { Dictionary } from "./types";

/**
 * 中文（简体）— Simplified Chinese (mainland China).
 *
 * Written against en.ts and the kit's `DEFAULT_*` labels key for key. Conventions a
 * reviewer should know:
 *
 *  1. PUNCTUATION IS FULL-WIDTH: "：" "，" "。" "？" "（ ）", and quotes are “ ”. That
 *     includes `common.fieldValue`, which composes "字段：值" with no space after the
 *     colon — the ASCII ": " the English default uses is a typo in Chinese.
 *  2. SPACING. A half-width space separates Han characters from a Latin word or an
 *     Arabic numeral ("第 3 页，共 14 页", "Recharts 之上"), the convention of most
 *     mainland style guides for UI text. It is never put next to full-width punctuation.
 *  3. NO PLURALS, BUT WORD ORDER AND MEASURE WORDS. Counted messages need no branch;
 *     what they need is the measure word (项、行、页、步) and Chinese order —
 *     "第 3 页，共 14 页" rather than a translated "Page 3 of 14".
 *  4. APIs STAY ENGLISH: `Combobox`, `Recharts`, `TokenSet`, `Hooks`, `provider`, the
 *     package path.
 */

export const zh: Dictionary = {
  // Full tag: the region is what makes `Intl` choose 2026/9/22 and ¥ over NT$, while the
  // menu addresses this dictionary by the primary subtag ("zh").
  tag: "zh-CN",
  name: "中文",
  country: "cn",
  dir: "ltr",

  chrome: {
    brand: "@eifi1/ui-kit",
    onThisPage: "本页目录",
    // Page-to-page navigation, so 页 — the wizard's step buttons say 上一步/下一步.
    previous: "上一页",
    next: "下一页",
    notFoundTitle: "页面不存在",
    notFoundHint: "该路径不对应组件库中的任何组件。",
    backToStart: "返回概览",
    toggleTheme: "切换主题",
    palette: "调色板",
    language: "语言",
    renderedFrom: "@eifi1/ui-kit 展示站 — 由 src/ 渲染，而非 dist/。",
    breadcrumb: "面包屑导航",
    pagination: "分页",
    sidebarStyle: "侧边栏样式",
    sidebarFlyout: "页面以弹出菜单显示",
    sidebarInline: "页面直接列在侧边栏",
    contentsPosition: "目录位置",
    positionStart: "左侧",
    positionEnd: "右侧",
    devicePreview: "屏幕尺寸预览",
    previewHint:
      "以三种最常见的屏幕尺寸实时显示本页：可在每个框内滚动和点击。主题、配色和语言跟随顶部栏。",
    phone: "手机",
    tablet: "平板",
    desktop: "桌面",
    searchPlaceholder: "搜索组件、示例或需求…",
    searchComponents: "组件",
    searchExamples: "示例",
    searchNeeds: "您需要什么？",
    searchPages: "页面",
  },

  groups: {
    "Getting started": "快速上手",
    Foundations: "设计基础",
    Inputs: "输入",
    "Pickers & entry": "选择器与录入",
    "Data display": "数据展示",
    Charts: "图表",
    // The established term for popups/layers in Chinese component libraries.
    Overlays: "浮层",
    // "Chrome" as in the frame around an app, not the browser.
    "App chrome": "应用框架",
    API: "API",
  },

  groupShort: {
    "Getting started": "入门",
    Foundations: "Tokens",
    "Pickers & entry": "选择器",
    "Data display": "展示",
    "App chrome": "框架",
  },

  pages: {
    overview: {
      title: "概览",
      short: "概览",
      blurb: "@eifi1/ui-kit 是什么、它由哪八层构成，以及如何阅读本展示站的页面。",
    },
    foundations: {
      title: "设计基础",
      blurb:
        "每个组件用来绘制的数值，以及每个组件所说的语言。这一层之下，没有任何颜色或文字是写死的。",
    },
    tokens: {
      title: "Tokens",
      short: "Tokens",
      blurb:
        "当前 TokenSet 中的每个值，实时呈现。在顶栏切换主题或调色板，看这一页随之变化——没有变化的，就是写死的。",
    },
    palette: {
      title: "调色板生成器",
      short: "调色板",
      blurb: "输入一个品牌色，输出两套主题——每个对比度都经过实测而非声称，每处取舍都明确说明。",
    },
    localisation: {
      title: "本地化",
      short: "本地化",
      blurb: "组件库渲染的每一段文字，汇成一棵带类型的树——以及把译文一次性交给所有组件的 provider。",
    },
    inputs: {
      title: "输入",
      blurb:
        "输入或设定一个值的各种方式：文本、选择、数字、日期、文件，以及包裹它们的表单适配器。它们共用同一结构——浮动标签、值、下方的提示行——让整张表单读起来浑然一体。",
    },
    fields: {
      title: "文本字段",
      short: "文本",
      blurb: "输入框，以及应用用来组合自有字段的类名常量。",
    },
    forms: {
      title: "表单（react-hook-form）",
      short: "表单",
      blurb:
        "位于 @eifi1/ui-kit/rhf 的 react-hook-form 适配器：字段的标签、控件、说明和消息彼此关联，并与表单状态相连，消息只出现在用户看得到的地方。",
    },
    choices: {
      title: "选择",
      short: "选择",
      blurb: "开或关、几项中选一项、刻度上的一个值——以及选择颜色、图标或卡片。",
    },
    numbers: {
      title: "数字与金额",
      short: "数字",
      blurb:
        "数字相关组件：带计算器的数字输入框、值为数字的字段、金额字段及其色调，以及货币选择器。",
    },
    calendars: {
      title: "日历与日期选择器",
      short: "日历",
      blurb:
        "选择某一天或一段日期：日历本身、基于它构建的日期与日期范围选择器、它们的预设和边界，以及每周的第一天。",
    },
    "month-time": {
      title: "月份与时间",
      short: "月份与时间",
      blurb: "更粗与更细的粒度：单独选择的月份（在字段中或步进按钮之间），以及一天中的时刻。",
    },
    files: {
      title: "文件",
      short: "文件",
      blurb:
        "选择文件：可打开文件选择器或相机的按钮、拖放区域，以及显示在用户视线所在之处的拒绝提示——绝不使用 toast。",
    },
    pickers: {
      title: "选择器与录入",
      blurb:
        "从列表中选择而非手动输入，以及较复杂的录入方式：测量数据表、离开时即保存的字段、签名、密码。",
    },
    comboboxes: {
      title: "Combobox",
      short: "Combobox",
      blurb: "带建议的自由文本：值即为输入内容的 Combobox，以及边输入边搜索的自动补全。",
    },
    "entity-pickers": {
      title: "实体选择器",
      short: "实体",
      blurb:
        "按 id 选择一条记录：字段式与按钮式选择器、静态与动态加载的选项、多选，以及它们共有的无效、错误和禁用状态。",
    },
    "dropdown-parts": {
      title: "下拉部件",
      short: "部件",
      blurb: "多选、分组选择器和手机底部面板——以及组件库中每个下拉框所基于的 hooks 和面板。",
    },
    "measured-grid": {
      title: "表格录入",
      short: "表格录入",
      blurb:
        "录入测量数据表：可用键盘操作的单元格网格、从电子表格粘贴的数据块，以及同一表格的文本形式——数千行，仅渲染可见行。",
    },
    "field-sync": {
      title: "字段同步状态",
      short: "同步状态",
      blurb:
        "数据库字段的同步状态，在离开字段时保存：边框颜色和字段末尾的图标表示已编辑、保存中、已保存或失败——将鼠标悬停在错误标记上可查看原因。",
    },
    "signature-password": {
      title: "签名、密码与确认",
      short: "签名",
      blurb: "采集签名（以及显示已保存的签名）、告诉用户密码的强度，并确认破坏性操作。",
    },
    "data-display": {
      title: "数据展示",
      blurb:
        "展示数值而非采集数值：基础构件、反馈与进度、列表、树和表格。",
    },
    buttons: {
      title: "按钮与表面",
      short: "按钮",
      blurb:
        "按钮、按钮组、图标按钮、卡片、加载指示器和头像——其余一切都由这些构件搭建而成。",
    },
    "chips-toggles": {
      title: "标签与切换",
      short: "标签",
      blurb:
        "标签（Chip）与标签输入框、切换按钮组和标签页——用于在几项中选一项或承载一个短列表的小控件。",
    },
    feedback: {
      title: "反馈与进度",
      short: "反馈",
      blurb:
        "任务进行到哪一步、内容正在加载、这里什么都没有、有内容需要阅读：进度条与计量条、骨架屏、空状态和横幅。",
    },
    "description-list": {
      title: "描述列表与表格",
      short: "列表与表格",
      blurb:
        "不借助任何机制排列信息：由术语和说明组成的列表、简单的静态表格，以及位于两者之间的分隔线和滚动区域。",
    },
    "lists-menus": {
      title: "列表与菜单",
      short: "列表与菜单",
      blurb:
        "每个应用都手工绘制的行——按钮、链接或一条记录，操作放在旁边——菜单中的一行，以及选中多行时出现的操作栏。",
    },
    "tree-view": {
      title: "树视图",
      short: "树",
      blurb:
        "用键盘浏览的层级结构——只占一个 Tab 停靠点、方向键展开与折叠、输入即跳转——支持按需加载子节点、外部受控、从右到左，以及单独使用的行。",
    },
    "data-table": {
      title: "数据表格",
      short: "表格",
      blurb:
        "组件库中最大的组件，完整呈现：排序、筛选、选择与展开、外部受控、无分页的短表格、填满面板，以及从右到左布局。",
    },
    "data-table-server": {
      title: "数据表格：服务端、URL 与手机",
      short: "服务端与手机",
      blurb:
        "当表格并不掌控一切时：保存在地址中的视图、由服务端分页的行，以及由卡片、分组和滑动操作构成的手机布局。",
    },
    "data-table-parts": {
      title: "数据表格：部件与工具函数",
      short: "表格部件",
      blurb:
        "表格的组成部分，也可单独使用：分页器、筛选弹出框、标签树，以及排序、筛选和 URL 的纯函数工具。",
    },
    charts: {
      title: "图表",
      blurb:
        "以图形呈现数值：基于 Recharts 的主题化外壳、矩形树图、带柱形和面积的可缩放序列图，以及 KPI 卡片。",
    },
    "chart-shell": {
      title: "图表外壳",
      short: "图表",
      blurb:
        "基于 Recharts 的主题化图表外壳——容器、工具提示和图例——以及组件库中每张图表所取用的配色系统。",
    },
    "tile-chart": {
      title: "矩形树图",
      short: "树图",
      blurb:
        "矩形树图（treemap）：以方块呈现整体中的占比，标签自动适配、方块可点击——以及下钻，既可通过柱状图，也可通过方块。",
    },
    "series-chart": {
      title: "序列图",
      short: "序列",
      blurb:
        "各应用共用的可缩放序列图：每种单位一条坐标轴、由开关组成的图例、一组图表共用一次缩放，以及其底层的工具函数。",
    },
    "series-chart-marks": {
      title: "序列图：柱形、面积与时间",
      short: "柱形与面积",
      blurb:
        "同一个图表绘制柱形、面积和堆叠，横轴可为分类或真实时间，带参考线、标记、数据点和点击——图例颜色始终保持不变。",
    },
    stats: {
      title: "统计卡片与迷你图",
      short: "统计",
      blurb:
        "每个仪表盘都会重复出现的 KPI 卡片——数值、变化、趋势——以及能放进表格单元格的迷你折线图。",
    },
    layout: {
      title: "折叠区域与对话框框架",
      short: "折叠",
      blurb: "可以收起的区块，以及每个对话框都会重复的“标题—内容—操作”框架。",
    },
    overlays: {
      title: "浮层",
      blurb: "悬浮在页面之上的一切，以及它们关闭时共用的同一套时序。",
    },
    dialogs: {
      title: "对话框",
      short: "对话框",
      blurb: "模态框与全屏对话框、点击背景关闭它们的规则，以及所有浮层共用的关闭过渡时序。",
    },
    "confirm-floating": {
      title: "确认对话框与浮动面板",
      short: "确认",
      blurb:
        "取代 window.confirm 的 Promise——支持三种语气、自定义文案和排队——以及停靠在角落、由浮动按钮打开的非模态面板。",
    },
    popovers: {
      title: "弹出框、菜单与工具提示",
      short: "弹出框",
      blurb:
        "锚定在触发元素上的浮层：弹出框、悬停菜单和工具提示——在窗口边缘翻转并收拢、在从右到左布局中镜像——以及其背后的纯定位计算。",
    },
    tour: {
      title: "新手引导",
      short: "引导",
      blurb:
        "在真实页面上的聚光灯式引导：步骤可通过选择器指向任意元素、等待点击、预先执行代码，并能应对目标缺失。",
    },
    "command-palette": {
      title: "命令面板",
      short: "命令",
      blurb:
        "⌘K 命令面板：可搜索的页面与操作列表，在页面任意位置通过快捷键打开，结果可以稍后到达。",
    },
    "swipeable-row": {
      title: "可滑动行",
      short: "滑动",
      blurb:
        "横向拖动即可显示操作的列表行——手指或鼠标、分级、从右到左均可——同样的操作也可通过键盘访问。",
    },
    "app-chrome": {
      title: "应用框架",
      blurb: "应用所处的框架，以及每个应用都会重复的流程：设置、多步骤表单、反馈。",
    },
    "page-structure": {
      title: "页面标题栏与面包屑",
      short: "页面标题栏",
      blurb:
        "页面中不属于内容的部分：带路径和操作的页面标题栏、单独的面包屑导航，以及分区标签、说明文字和状态圆点。",
    },
    shell: {
      title: "外壳",
      short: "外壳",
      blurb: "拆解你眼前的这个应用框架。",
    },
    settings: {
      title: "设置字段",
      short: "设置",
      blurb: "账户设置中的各行：主题、语言、个人资料、密码和双重验证。",
    },
    wizard: {
      title: "向导",
      short: "向导",
      blurb: "多步骤引擎、它的外框和确认步骤。",
    },
    "feedback-compose": {
      title: "反馈 — 撰写",
      short: "撰写",
      blurb: "反馈表单及其附件字段。",
    },
    "feedback-inbox": {
      title: "反馈 — 收件箱",
      short: "收件箱",
      blurb: "共用的状态词汇、状态流转规则，以及构建收件箱所需的各个部件。",
    },
    api: {
      title: "API",
      blurb:
        "去掉像素之后剩下的部分：构建组件所用的 hook，以及应用直接调用的纯函数与常量。",
    },
    "hooks-lib": {
      title: "Hooks 与 lib",
      short: "Hooks",
      blurb: "非可视化的导出：实时运行的 hooks，以及以“输入 → 输出”形式展示的纯函数工具。",
    },
    "clipboard-timing": {
      title: "剪贴板与定时",
      short: "剪贴板",
      blurb:
        "会说明是否成功的复制，以及等输入停下再执行：复制按钮及其 Hook，以及防抖的值和回调。",
    },
    helpers: {
      title: "辅助函数与常量",
      short: "辅助函数",
      blurb:
        "输入框背后的函数与数据，以“输入 → 结果”展示：@eifi1/ui-kit/dates 的日期运算、计算器的求值器、货币表，以及组合自定义字段所用的类名常量。",
    },
  },


  // The top-bar search's "What do you need?" rows, phrased as typed into a search box.
  // Key terms are split by a half-width space so a typed prefix lands on a chunk.
  needs: {
    overview: [
      "组件库 入门",
      "组件库 结构",
      "如何阅读 示例页面",
      "与 MUI 对比",
      "安装 与配置",
    ],
    foundations: [
      "查看 设计令牌",
      "颜色 与主题",
      "翻译 整个组件库",
      "品牌 配色",
      "深色模式",
    ],
    tokens: [
      "所有 颜色令牌",
      "切换 浅色和深色主题",
      "修改 配色方案",
      "刷新后 保留主题",
      "间距 圆角 阴影",
      "文字颜色 与背景",
      "检查 硬编码的值",
    ],
    palette: [
      "根据品牌色 生成配色",
      "检查 颜色对比度",
      "图表 配色",
      "无障碍 色阶",
      "推导 深色模式颜色",
      "单一颜色 自定义主题",
    ],
    localisation: [
      "翻译 界面",
      "切换 语言",
      "德语 翻译",
      "德语 非正式称呼 du",
      "瑞士德语 拼写",
      "查找 未翻译的文本",
      "设置 日期和数字的区域",
      "为所有组件 提供文本",
    ],
    inputs: [
      "所有 输入组件",
      "构建 表单",
      "输入 文本、数字或日期",
      "表单字段 布局",
      "选择 一个值",
    ],
    fields: [
      "输入 文本",
      "浮动标签 文本框",
      "多行 文本",
      "搜索框",
      "字段下方 提示文字",
      "显示 校验错误",
      "下拉 选择",
      "清空 字段",
      "自定义 字段",
    ],
    forms: [
      "表单 校验",
      "使用 react-hook-form",
      "字段下方 错误信息",
      "必填 字段",
      "提交 表单",
      "标签 关联输入框",
      "表单 校验规则",
    ],
    choices: [
      "开关 设置项",
      "勾选 复选框",
      "从几个选项中 选择一个",
      "滑块 选择数值",
      "选择 颜色",
      "选择 图标",
      "卡片式 选择",
      "滑块 选择范围",
    ],
    numbers: [
      "输入 金额",
      "输入 数字",
      "选择 货币",
      "字段内 计算器",
      "带步进按钮的 数字",
      "手机 数字键盘",
      "负数 红色显示",
      "按区域 格式化数字",
    ],
    calendars: [
      "选择 日期",
      "选择 日期范围",
      "日历",
      "日期范围 预设 如上个月",
      "限制 可选日期",
      "每周 第一天",
      "选择 起止日期",
      "跳转到 今天",
    ],
    "month-time": [
      "选择 月份",
      "切换 上个月或下个月",
      "输入 时间",
      "选择 小时和分钟",
      "按月 账期",
      "限制 时间范围",
    ],
    files: [
      "上传 文件",
      "拖放 文件",
      "相机 拍照",
      "选择 多个文件",
      "只允许 图片或 PDF",
      "拒绝 过大的文件",
      "显示 文件被拒原因",
    ],
    pickers: [
      "从列表中 选择",
      "选择 记录",
      "输入 数值表格",
      "失焦时 保存字段",
      "采集 签名",
      "检查 密码强度",
    ],
    comboboxes: [
      "输入 筛选长列表",
      "输入时 显示建议",
      "从服务器 自动补全",
      "自由输入 带建议",
      "边输入 边搜索",
      "新建 选项",
      "combobox",
    ],
    "entity-pickers": [
      "按 ID 选择记录",
      "选择 客户或联系人",
      "选择 多条记录",
      "从 API 加载选项",
      "表格内 选择器",
      "显示 无效或错误状态",
      "选择 关联项",
    ],
    "dropdown-parts": [
      "选择 多个选项",
      "复选框 多选",
      "选项 分组",
      "全选",
      "手机上 底部弹出选择器",
      "自己 实现下拉框",
      "输入 筛选下拉框",
    ],
    "measured-grid": [
      "输入 测量数据表格",
      "从电子表格 粘贴",
      "像 Excel 的 键盘表格",
      "数千行 数据",
      "虚拟 列表",
      "粘贴文本 解析为行",
      "方向键 编辑单元格",
    ],
    "field-sync": [
      "离开时 保存字段",
      "显示 保存中或已保存",
      "显示 保存失败",
      "自动 保存",
      "未保存 更改提示",
      "绑定数据库的 字段",
    ],
    "signature-password": [
      "签署 文档",
      "采集 签名",
      "显示 已保存的签名",
      "检查 密码强度",
      "输入密码 确认",
      "删除前 确认",
      "输入名称 确认删除",
      "确认 危险操作",
    ],
    "data-display": [
      "展示 数据",
      "显示 数值",
      "表格 与列表",
      "进度 与反馈",
      "按钮 与卡片",
    ],
    buttons: [
      "按钮",
      "主要 次要按钮",
      "图标 按钮",
      "按钮组",
      "卡片 容器",
      "加载 动画",
      "首字母 头像",
      "禁用 按钮",
    ],
    "chips-toggles": [
      "从几个选项中 选择一个",
      "分段 控件",
      "标签页",
      "标签 或纸片",
      "输入 多个标签",
      "筛选 标签",
      "切换 视图",
      "移除 标签",
    ],
    feedback: [
      "显示 进度",
      "进度条",
      "加载 占位",
      "加载时 骨架屏",
      "空 结果",
      "未找到 提示",
      "通知 用户",
      "警告或错误 横幅",
      "成功 提示",
      "百分比 仪表",
      "显示 简短确认",
      "删除后 撤销",
      "toast 提示",
    ],
    "description-list": [
      "键值对 展示",
      "记录 详情",
      "简单 静态表格",
      "带合计行的 表格",
      "分隔线",
      "可滚动 区域",
      "表格 数字右对齐",
    ],
    "lists-menus": [
      "项目 列表",
      "可点击的 列表行",
      "带操作的 行",
      "未读 标记",
      "收件箱 列表",
      "带勾选的 菜单项",
      "危险 菜单项",
      "选择 多行",
      "批量 操作",
      "选择 工具栏",
    ],
    "tree-view": [
      "层级 数据",
      "文件夹 树",
      "展开 折叠节点",
      "按需 加载子节点",
      "键盘 浏览树",
      "嵌套 分类",
      "列表式 组织架构",
    ],
    "data-table": [
      "可排序的 表格数据",
      "表格 排序",
      "筛选 表格行",
      "选择 行",
      "展开行 查看详情",
      "分页 表格",
      "隐藏或调整 列顺序",
      "数据 网格",
      "表格内 搜索",
    ],
    "data-table-server": [
      "服务端 分页",
      "表格筛选 保存在 URL",
      "手机上 表格显示为卡片",
      "表格行 滑动操作",
      "行 分组",
      "从 API 加载分页",
      "分享 筛选后的表格链接",
    ],
    "data-table-parts": [
      "分页 控件",
      "筛选 弹出框",
      "排序 辅助函数",
      "按筛选条件 匹配行",
      "翻译 表格文本",
      "每页条数 选择",
    ],
    layout: [
      "折叠 区块",
      "手风琴",
      "展开 收起更多",
      "带标题和操作的 对话框布局",
      "可展开 面板",
      "高度 动画",
    ],
    charts: [
      "绘制 图表",
      "数据 可视化",
      "图表 配色",
      "KPI 仪表盘",
      "折线图 或柱状图",
    ],
    "chart-shell": [
      "主题化 图表",
      "图表 提示框",
      "图表 图例",
      "数据系列 配色",
      "Recharts 使用主题",
      "饼图 或柱状图",
      "响应式 图表",
    ],
    "tile-chart": [
      "矩形树图",
      "显示 占比",
      "图表 下钻",
      "可点击 色块",
      "按类别 统计支出",
      "色块内 放置标签",
    ],
    "series-chart": [
      "随时间变化 图表",
      "图表 缩放",
      "双坐标轴 折线图",
      "图例 切换系列",
      "多图表 联动缩放",
      "时间 序列",
      "测量值 随时间变化",
    ],
    "series-chart-marks": [
      "柱状图",
      "堆叠 面积图",
      "参考线 或阈值",
      "图表 标记点",
      "点击 图表中的点",
      "按日期 绘制图表",
      "图例 颜色固定",
    ],
    stats: [
      "KPI 卡片",
      "数字 及其变化",
      "上升或下降 趋势",
      "表格单元格 迷你图",
      "仪表盘 数据",
      "迷你 折线图",
    ],
    overlays: [
      "页面上方 显示内容",
      "打开 对话框",
      "弹窗 或菜单",
      "提示框",
      "命令面板",
    ],
    dialogs: [
      "打开 模态对话框",
      "全屏 对话框",
      "点击背景 关闭",
      "关闭 动画",
      "弹出 窗口",
      "手机上的 对话框",
    ],
    "confirm-floating": [
      "删除前 确认",
      "确认 对话框",
      "替代 window.confirm",
      "您确定吗 提示",
      "悬浮 操作按钮",
      "停靠角落的 面板",
      "聊天或帮助 面板",
    ],
    popovers: [
      "悬停 显示提示",
      "按钮 弹出层",
      "悬停 菜单",
      "下拉 菜单",
      "在元素旁 定位弹窗",
      "图标 说明",
    ],
    tour: [
      "引导 游览",
      "新手 引导",
      "高亮 元素",
      "分步 介绍",
      "等待 用户点击",
      "新用户 产品导览",
    ],
    "command-palette": [
      "命令面板",
      "全局 搜索",
      "搜索 快捷键",
      "跳转到 页面",
      "容错 搜索",
      "快捷操作 菜单",
      "服务器 搜索结果",
    ],
    "swipeable-row": [
      "滑动 删除行",
      "滑动 显示操作",
      "手机上 滑动",
      "滑动 归档",
      "列表行 操作",
    ],
    "app-chrome": [
      "应用 布局",
      "侧边栏 和顶栏",
      "设置 页面",
      "多步骤 表单",
      "收集 用户反馈",
    ],
    "page-structure": [
      "带操作的 页面标题",
      "页面 标题栏",
      "面包屑 导航",
      "手机上的 面包屑",
      "小号 大写 分区标签",
      "字段下的 说明文字",
      "状态 圆点",
      "在线 指示",
      "头像上的 未读圆点",
      "图例 颜色",
    ],
    shell: [
      "带侧边栏的 应用布局",
      "顶栏",
      "导航 菜单",
      "手机 底部导航",
      "目录",
      "主题 切换",
      "语言 菜单",
      "折叠 侧边栏",
    ],
    settings: [
      "账户 设置",
      "修改 密码",
      "双重 认证",
      "编辑 个人资料",
      "选择 主题",
      "选择 语言",
      "用户 偏好",
    ],
    wizard: [
      "多步骤 表单",
      "步骤条",
      "带确认步骤的 向导",
      "步骤间 前后切换",
      "新手 引导流程",
      "提交前 汇总",
    ],
    "feedback-compose": [
      "收集 用户反馈",
      "报告 问题",
      "附加 截图",
      "反馈 表单",
      "提交 建议",
    ],
    "feedback-inbox": [
      "管理 反馈",
      "反馈 状态流程",
      "分类处理 问题报告",
      "客服 收件箱",
      "修改 反馈状态",
    ],
    api: [
      "Hooks 与辅助函数",
      "无界面的 函数",
      "工具 函数",
      "常量",
      "日期 辅助函数",
    ],
    "hooks-lib": [
      "响应 屏幕尺寸",
      "媒体查询 Hook",
      "返回键 关闭弹层",
      "在触发元素旁 定位面板",
      "合并 类名",
      "检测 手机",
    ],
    "clipboard-timing": [
      "复制到 剪贴板",
      "带确认的 复制按钮",
      "输入 防抖",
      "等待 用户停止输入",
      "延迟 搜索请求",
      "回调 节流",
    ],
    helpers: [
      "日期 计算",
      "今天的日期 ISO 格式",
      "日期范围 预设",
      "计算 数学表达式",
      "货币 列表",
      "最近几个 完整月份",
      "字段 类名",
    ],
  },


  // The kit's own words ship with the package — the same import an app writes.
  kit: UI_KIT_LABELS_ZH,
};
