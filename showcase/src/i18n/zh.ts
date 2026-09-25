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
  },

  groups: {
    "Getting started": "快速上手",
    Foundations: "设计基础",
    Inputs: "输入",
    "Pickers & entry": "选择器与录入",
    "Data display": "数据展示",
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
      blurb: "@eifi1/ui-kit 是什么、它由哪七层构成，以及如何阅读本展示站的页面。",
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
      blurb: "展示数值而非采集数值：基础构件、表格和图表。",
    },
    buttons: {
      title: "按钮与表面",
      short: "按钮",
      blurb: "按钮、图标按钮、卡片、加载指示器、空状态、头像和横幅——其余一切都由这些构件搭建而成。",
    },
    "chips-toggles": {
      title: "标签与切换",
      short: "标签",
      blurb:
        "标签（Chip）与标签输入框、切换按钮组和标签页——用于在几项中选一项或承载一个短列表的小控件。",
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
    helpers: {
      title: "辅助函数与常量",
      short: "辅助函数",
      blurb:
        "输入框背后的函数与数据，以“输入 → 结果”展示：@eifi1/ui-kit/dates 的日期运算、计算器的求值器、货币表，以及组合自定义字段所用的类名常量。",
    },
  },


  // The kit's own words ship with the package — the same import an app writes.
  kit: UI_KIT_LABELS_ZH,
};
