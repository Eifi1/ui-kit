import { formatFileSize } from "@eifi1/ui-kit";
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
const num = new Intl.NumberFormat("zh-CN");
const n = (value: number) => num.format(value);

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
      title: "复选框、开关与滑块",
      blurb: "选择而非输入：开或关、几项中选一项，以及刻度上的一个值。",
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
      title: "签名与密码强度",
      blurb:
        "用笔、手指或鼠标采集签名（也可改为输入姓名），并告诉用户所选密码的强度。",
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

  kit: {
    pageContents: { title: "本页目录" },
    common: {
      close: "关闭",
      clear: "清除",
      search: "搜索",
      done: "完成",
      cancel: "取消",
      save: "保存",
      back: "上一步",
      next: "下一步",
      remove: "移除",
      loading: "加载中…",
      noResults: "无结果",
      // Full-width colon, no space after it.
      fieldValue: (field, value) => `${field}：${value}`,
    },
    dataTable: {
      columns: "列",
      selectAllRows: "全选所有行",
      sortHint: "点击排序 · 按住 Shift 点击可添加排序",
      filter: "筛选",
      close: "关闭",
      selectRow: "选择行",
      autoSize: "自动调整列宽",
      loading: "加载中…",
      filters: "筛选条件",
      clearAll: "全部清除",
      done: "完成",
      pageSize: "每页行数",
      pageSizeAll: "全部",
      prevPage: "上一页",
      nextPage: "下一页",
      clearFilter: "清除筛选",
      filterPlaceholder: "筛选…",
      selectFilter: "选择",
      selectAll: "全部",
      selectNone: "无",
      dateFrom: "从",
      dateTo: "至",
      numberMin: "最小值",
      numberMax: "最大值",
      numberAbs: "绝对值",
      presets: {
        today: "今天",
        yesterday: "昨天",
        this_week: "本周",
        last_week: "上周",
        last_7_days: "最近 7 天",
        last_30_days: "最近 30 天",
        this_month: "本月",
        last_month: "上月",
        last_3_months: "最近 3 个月",
        ytd: "今年至今",
        last_year: "去年",
      },
      table: "数据表格",
      filterResults: (shown, total) => `显示 ${n(shown)} 行，共 ${n(total)} 行`,
      sortedAscending: (column) => `已按“${column}”升序排序`,
      sortedDescending: (column) => `已按“${column}”降序排序`,
      sortCleared: (column) => `已取消“${column}”的排序`,
      pageChanged: (page, totalPages) => `第 ${n(page)} 页，共 ${n(totalPages)} 页`,
      pageRange: (from, to, total) => `${n(from)}–${n(to)} / ${n(total)}`,
      rowCount: (total) => n(total),
      columnsCount: (visible, total) => `列（${n(visible)}/${n(total)}）`,
    },
    miniCalendar: {
      previousMonth: "上个月",
      nextMonth: "下个月",
      // Already formatted in the provider's locale ("2026年9月14日星期一").
      day: (date) => date,
      chooseStart: "请选择开始日期",
      chooseEnd: "请选择结束日期",
      startSelected: (date) => `已选择 ${date} 为开始日期。请选择结束日期。`,
      rangeSelected: (from, to) => `已选择 ${from} 至 ${to}。如需重新选择，请先选择开始日期。`,
    },
    monthPicker: {
      previousYear: "上一年",
      nextYear: "下一年",
      panel: "选择月份",
      month: (monthYear) => monthYear,
    },
    datePicker: {
      panel: "选择日期",
      rangePanel: "选择日期范围",
      clear: "清除",
      previousDay: "前一天",
      nextDay: "后一天",
      today: "今天",
    },
    popover: {
      panel: "弹出框",
    },
    combobox: {
      search: "搜索",
      noResults: "无结果",
      clear: "清除",
      loading: "加载中…",
      create: (query) => `创建“${query}”`,
      selectedCount: (count) => `已选 ${n(count)} 项`,
    },
    multiSelect: {
      search: "搜索",
      selectAll: "全选",
      clear: "清除",
      all: "全部",
      // The bare count, as in English: the trigger has always shown just the number.
      selectedCount: (count) => n(count),
    },
    calculator: {
      open: "打开计算器",
      panel: "计算器",
      calculation: "算式",
      backspace: "退格",
      clear: "清除",
      equals: "等于",
      done: "完成",
      plus: "加",
      minus: "减",
      times: "乘",
      divide: "除以",
      decimal: "小数点",
    },
    currency: {
      currency: "货币",
      search: "搜索货币",
    },
    chipInput: {
      added: (value) => `已添加“${value}”`,
      removed: (value) => `已移除“${value}”`,
      remove: "移除",
      atLimit: (max) => `已达上限（${n(max)} 项）`,
      duplicate: (value) => `“${value}”已在列表中`,
    },
    fieldSync: {
      synced: "已保存",
      edited: "有未保存的更改",
      pending: "正在保存…",
      error: "保存失败",
      retry: "重试",
    },
    passwordReveal: {
      show: "显示密码",
      hide: "隐藏密码",
    },
    appShell: {
      collapse: "收起侧边栏",
      expand: "展开侧边栏",
      toggleGroup: (groupLabel) => `${groupLabel}：页面`,
    },
    topBar: {
      theme: "切换主题",
      palette: "外观预设",
      language: "语言",
      switchRole: "切换角色",
      role: (value) => `角色：${value}`,
    },
    pickerSheet: {
      close: "关闭",
    },
    swipeableRow: {
      actions: "行操作",
    },
    file: {
      // The kit's own `Intl` unit formatting, pinned to this locale.
      size: (bytes) => formatFileSize(bytes, "zh-CN"),
    },
    wizard: {
      cancel: "取消",
      back: "上一步",
      next: "下一步",
      skip: "跳过",
      finish: "完成",
      submitting: "正在创建…",
      steps: "步骤",
      step: (current, total) => `第 ${n(current)} 步，共 ${n(total)} 步`,
      cancelTitle: "放弃此表单？",
      confirmCancel: "已填写的内容将会丢失。",
      cancelConfirmLabel: "放弃",
      cancelDismissLabel: "继续编辑",
      reviewTitle: "确认信息",
      edit: "编辑",
      missingRequired: "请填写所有必填字段。",
      genericError: "发生错误",
    },
    tour: {
      next: "下一步",
      back: "上一步",
      skip: "跳过",
      done: "完成",
      awaitClickHint: "点击高亮的元素以继续",
      step: (current, total) => `${n(current)} / ${n(total)}`,
    },
    commandPalette: {
      placeholder: "搜索…",
      empty: "无结果",
      loading: "搜索中…",
      dialog: "搜索",
    },
    sparkline: {
      rising: (first, last) => `从 ${first} 上升到 ${last}`,
      falling: (first, last) => `从 ${first} 下降到 ${last}`,
      flat: (value) => `保持在 ${value} 不变`,
      single: (value) => `仅一个值：${value}`,
      noData: "无数据",
      named: (name, summary) => `${name}：${summary}`,
    },
    statTile: {
      increase: (amount) => `上升 ${amount}`,
      decrease: (amount) => `下降 ${amount}`,
      unchanged: "无变化",
      better: (change) => `${change}（向好）`,
      worse: (change) => `${change}（变差）`,
      noValue: "无数据",
      loading: "加载中…",
    },
    signaturePad: {
      label: "签名",
      instructions: "请使用鼠标、手指或触控笔在框内签名。",
      typedFallbackHint: "如果无法手写，可以改为输入姓名。",
      empty: "尚未签名",
      signed: "已签名",
      undo: "撤销上一笔",
      clear: "清除",
      save: "保存签名",
      useTyped: "改为输入姓名",
      useDrawn: "改为手写",
      typedName: "姓名",
      cleared: "签名已清除",
      undone: "已撤销上一笔",
    },
    passwordStrength: {
      tooShort: "太短",
      weak: "弱",
      fair: "一般",
      good: "良好",
      strong: "强",
      announcement: (level) => `密码强度：${level}`,
      // Unformatted, as in the English default.
      ruleLength: (minLength) => `至少 ${minLength} 个字符`,
      ruleCase: "包含大写和小写字母",
      ruleDigit: "包含数字",
      ruleSymbol: "包含符号",
      optional: (rule) => `${rule}（可选）`,
      met: "已满足：",
      notMet: "未满足：",
      tooLong: (maxBytes) =>
        `最多 ${maxBytes} 个字符（带重音的字母和表情符号按多个字符计算）。`,
    },
    seriesChart: {
      resetZoom: "重置缩放",
      zoomHint:
        "拖动以缩放：近似正方形的选区同时缩放两条坐标轴，细长的选区只缩放其所沿的那条轴。双击可重置。",
      empty: "无数据",
      legend: "数据系列",
    },
  },
};
