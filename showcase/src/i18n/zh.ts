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
    "Data display": "数据展示",
    // The established term for popups/layers in Chinese component libraries.
    Overlays: "浮层",
    // "Chrome" as in the frame around an app, not the browser.
    "App chrome": "应用框架",
    API: "API",
  },

  pages: {
    overview: {
      title: "概览",
      blurb: "@eifi1/ui-kit 是什么、它由哪六层构成，以及如何阅读本展示站的页面。",
    },
    foundations: {
      title: "设计基础",
      blurb:
        "每个组件用来绘制的数值，以及每个组件所说的语言。这一层之下，没有任何颜色或文字是写死的。",
    },
    tokens: {
      title: "Tokens",
      blurb:
        "当前 TokenSet 中的每个值，实时呈现。在顶栏切换主题或调色板，看这一页随之变化——没有变化的，就是写死的。",
    },
    palette: {
      title: "调色板生成器",
      blurb: "输入一个品牌色，输出两套主题——每个对比度都经过实测而非声称，每处取舍都明确说明。",
    },
    localisation: {
      title: "本地化",
      blurb: "组件库渲染的每一段文字，汇成一棵带类型的树——以及把译文一次性交给所有组件的 provider。",
    },
    inputs: {
      title: "输入",
      blurb:
        "采集一个值的各种方式。它们共用同一结构——浮动标签、值、下方的提示行——让整张表单读起来浑然一体。",
    },
    fields: {
      title: "文本字段",
      blurb: "输入框，以及应用用来组合自有字段的类名常量。",
    },
    choices: {
      title: "选择",
      blurb: "开或关、几项中选一项、刻度上的一个值——以及选择颜色、图标或卡片。",
    },
    numbers: {
      title: "数字与金额",
      blurb:
        "数字相关组件：带计算器的数字输入框、值为数字的字段、金额字段及其色调，以及货币选择器。",
    },
    dropdowns: {
      title: "下拉框与选择器",
      blurb: "Combobox、多选、分组选择器与底部面板选择器，以及它们底层的下拉基础组件。",
    },
    files: {
      title: "文件",
      blurb:
        "选择文件：可打开文件选择器或相机的按钮、拖放区域，以及显示在用户视线所在之处的拒绝提示——绝不使用 toast。",
    },
    "measured-grid": {
      title: "表格录入",
      blurb:
        "录入测量数据表：可用键盘操作的单元格网格、从电子表格粘贴的数据块，以及同一表格的文本形式——数千行，仅渲染可见行。",
    },
    dates: {
      title: "日期与时间",
      blurb:
        "在各种粒度上选择时间点：某一天、一段日期、某个月、某个时刻。",
    },
    "field-sync": {
      title: "字段同步状态",
      blurb:
        "数据库字段的同步状态，在离开字段时保存：边框颜色和字段末尾的图标表示已编辑、保存中、已保存或失败——将鼠标悬停在错误标记上可查看原因。",
    },
    "signature-password": {
      title: "签名、密码与确认",
      blurb: "采集签名（以及显示已保存的签名）、告诉用户密码的强度，并确认破坏性操作。",
    },
    "data-display": {
      title: "数据展示",
      blurb: "展示数值而非采集数值：基础构件、表格和图表。",
    },
    primitives: {
      title: "基础组件",
      blurb: "按钮、卡片、标签页、横幅、头像——其余一切都由这些构件搭建而成。",
    },
    "data-table": {
      title: "数据表格",
      blurb: "组件库中最大的组件：排序、筛选、选择、分页、URL 同步，以及它的纯函数工具。",
    },
    charts: {
      title: "图表",
      blurb:
        "基于 Recharts 的主题化图表外壳、它的配色系统、矩形树图（treemap），以及各应用共用的可缩放序列图。",
    },
    stats: {
      title: "统计卡片与迷你图",
      blurb:
        "每个仪表盘都会重复出现的 KPI 卡片——数值、变化、趋势——以及能放进表格单元格的迷你折线图。",
    },
    layout: {
      title: "折叠区域与对话框框架",
      blurb: "可以收起的区块，以及每个对话框都会重复的“标题—内容—操作”框架。",
    },
    overlays: {
      title: "浮层",
      blurb: "悬浮在页面之上的一切，以及它们关闭时共用的同一套时序。",
    },
    dialogs: {
      title: "对话框与弹出框",
      blurb: "模态框、全屏对话框、弹出框、悬停菜单和工具提示——以及共用的关闭过渡时序。",
    },
    "tour-search-files": {
      title: "引导、命令面板与文件",
      blurb: "新手引导、命令面板、文件拖放区，以及可滑动的列表行。",
    },
    "app-chrome": {
      title: "应用框架",
      blurb: "应用所处的框架，以及每个应用都会重复的流程：设置、多步骤表单、反馈。",
    },
    shell: {
      title: "外壳",
      blurb: "拆解你眼前的这个应用框架。",
    },
    settings: {
      title: "设置字段",
      blurb: "账户设置中的各行：主题、语言、个人资料、密码和双重验证。",
    },
    wizard: {
      title: "向导",
      blurb: "多步骤引擎、它的外框和确认步骤。",
    },
    "feedback-compose": {
      title: "反馈 — 撰写",
      blurb: "反馈表单及其附件字段。",
    },
    "feedback-inbox": {
      title: "反馈 — 收件箱",
      blurb: "共用的状态词汇、状态流转规则，以及构建收件箱所需的各个部件。",
    },
    "hooks-lib": {
      title: "Hooks 与 lib",
      blurb: "非可视化的导出：实时运行的 hooks，以及以“输入 → 输出”形式展示的纯函数工具。",
    },
    api: {
      title: "API",
      blurb:
        "去掉像素之后剩下的部分：构建组件所用的 hook，以及应用直接调用的纯函数与常量。",
    },
    helpers: {
      title: "辅助函数与常量",
      blurb:
        "输入框背后的函数与数据，以“输入 → 结果”展示：@eifi1/ui-kit/dates 的日期运算、计算器的求值器、货币表，以及组合自定义字段所用的类名常量。",
    },
  },

  // The kit's own words ship with the package — the same import an app writes.
  kit: UI_KIT_LABELS_ZH,
};
