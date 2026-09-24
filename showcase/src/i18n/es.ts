import { formatFileSize } from "@eifi1/ui-kit";
import type { Dictionary } from "./types";

/**
 * Spanish (Spain).
 *
 * Written against en.ts and the kit's `DEFAULT_*` labels key for key. Conventions a
 * reviewer should know:
 *
 *  1. REGISTER. "Tú", which is what Spanish software says to a developer, and the
 *     infinitive for every button — Guardar, Cancelar, Cerrar, Buscar — because the
 *     imperative (Guarda, Cancela) reads as an order rather than a control.
 *  2. APIs STAY ENGLISH. `TokenSet`, `PickerSheet`, `Recharts`, `hooks`, `tokens`,
 *     `popover`.
 *  3. QUOTES are « » (the RAE's first choice) with no inner space. "Mayús" is the name
 *     printed on a Spanish keyboard's Shift key.
 *  4. PLURALS. Only 1 is singular ("1 fila", "0 filas"). Numbers go through
 *     `Intl.NumberFormat("es-ES")` — which, per the RAE, does not group four-digit
 *     numbers: "1234" but "12.345". That is correct, not a bug.
 */
const num = new Intl.NumberFormat("es-ES");
const n = (value: number) => num.format(value);
const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

export const es: Dictionary = {
  tag: "es-ES",
  name: "Español",
  country: "es",
  dir: "ltr",

  chrome: {
    brand: "@eifi1/ui-kit",
    onThisPage: "En esta página",
    previous: "Anterior",
    next: "Siguiente",
    notFoundTitle: "Esta página no existe",
    notFoundHint: "Esa ruta no corresponde a ningún componente del kit.",
    backToStart: "Volver a la introducción",
    toggleTheme: "Cambiar de tema",
    palette: "Paleta",
    language: "Idioma",
    renderedFrom: "Escaparate de @eifi1/ui-kit — generado desde src/, no desde dist/.",
    breadcrumb: "Ruta de navegación",
    pagination: "Paginación",
    sidebarStyle: "Estilo de la barra lateral",
    sidebarFlyout: "Páginas en un menú desplegable",
    sidebarInline: "Páginas listadas en la barra",
    contentsPosition: "Posición del índice",
    positionStart: "A la izquierda",
    positionEnd: "A la derecha",
  },

  groups: {
    "Getting started": "Primeros pasos",
    Foundations: "Fundamentos",
    Inputs: "Entradas",
    "Data display": "Visualización de datos",
    Overlays: "Superposiciones",
    // The frame around the app, not the browser — "chrome" in Spanish only means the browser.
    "App chrome": "Marco de la aplicación",
    API: "API",
  },

  pages: {
    overview: {
      title: "Introducción",
      blurb:
        "Qué es @eifi1/ui-kit, las seis capas sobre las que está construido y cómo leer una página de este escaparate.",
    },
    foundations: {
      title: "Fundamentos",
      blurb:
        "Los valores con los que pinta cada componente y el idioma que habla cada componente. Nada por debajo de esta capa fija en el código un color o una palabra.",
    },
    tokens: {
      title: "Tokens",
      blurb:
        "Cada valor del TokenSet activo, en vivo. Cambia el tema o la paleta en la barra superior y mira cómo se mueve esta página: lo que no se mueve está fijado en el código.",
    },
    palette: {
      title: "Generador de paletas",
      blurb:
        "Un color de marca de entrada, los dos temas de salida — cada relación de contraste medida en lugar de supuesta, y cada concesión con su nombre.",
    },
    localisation: {
      title: "Localización",
      blurb:
        "Cada texto que muestra el kit, como un único árbol tipado — y el provider que entrega una traducción a todos los componentes a la vez.",
    },
    inputs: {
      title: "Entradas",
      blurb:
        "Todas las formas de capturar un valor. Comparten una misma anatomía — una etiqueta flotante, el valor, una línea de ayuda debajo — para que un formulario se lea como un todo.",
    },
    fields: {
      title: "Campos de texto",
      blurb:
        "Los campos de entrada y las constantes de clase con las que una aplicación compone sus propios campos.",
    },
    choices: {
      title: "Opciones",
      blurb:
        "Activado o desactivado, una opción entre pocas, un valor en una escala — y elegir un color, un icono o una tarjeta.",
    },
    numbers: {
      title: "Números e importes",
      blurb:
        "La pila numérica: un campo numérico con calculadora, un campo cuyo valor es un número, el campo de importe con sus tonos y el selector de moneda.",
    },
    dropdowns: {
      title: "Desplegables y selectores",
      blurb:
        "Combobox, selección múltiple, selectores agrupados y en hoja, y las primitivas de desplegable sobre las que se construyen.",
    },
    files: {
      title: "Archivos",
      blurb:
        "Elegir archivos: un botón que abre el selector o la cámara, la zona para soltar y los rechazos comunicados donde el usuario está mirando, nunca como notificación emergente.",
    },
    "measured-grid": {
      title: "Entrada de tablas",
      blurb:
        "Escribir una tabla de medidas: una cuadrícula de celdas por teclado, un bloque pegado desde una hoja de cálculo y la misma tabla como texto — miles de filas, solo las visibles montadas.",
    },
    dates: {
      title: "Fechas y hora",
      blurb:
        "Elegir un momento en cualquier escala: un día, un intervalo de días, un mes, una hora.",
    },
    "field-sync": {
      title: "Estado de sincronización",
      blurb:
        "Estado de sincronización de un campo respaldado por base de datos, guardado al salir del campo: el color del borde y un icono al final del campo indican editado, guardando, guardado o error — pasa el cursor sobre la marca de error para ver el motivo.",
    },
    "signature-password": {
      title: "Firma, contraseña y confirmación",
      blurb:
        "Capturar una firma — y mostrar una guardada —, indicar al usuario lo segura que es su contraseña y confirmar una acción destructiva.",
    },
    "data-display": {
      title: "Visualización de datos",
      blurb:
        "Mostrar valores en lugar de capturarlos: las piezas básicas, la tabla y los gráficos.",
    },
    primitives: {
      title: "Primitivas",
      blurb:
        "Botones, tarjetas, pestañas, avisos, avatares — las piezas con las que se construye todo lo demás.",
    },
    "data-table": {
      title: "Tabla de datos",
      blurb:
        "El componente más grande del kit: ordenación, filtros, selección, paginación, sincronización con la URL y sus utilidades puras.",
    },
    charts: {
      title: "Gráficos",
      blurb:
        "El contenedor de gráficos con el tema del kit sobre Recharts, su sistema de colores, el gráfico de mosaicos (treemap) y el gráfico de series con zoom que comparten las aplicaciones.",
    },
    stats: {
      title: "Estadísticas y sparklines",
      blurb:
        "La tarjeta de KPI que repite cada panel — valor, variación, tendencia — y la diminuta línea que cabe en una celda de tabla.",
    },
    layout: {
      title: "Sección plegable y marco de diálogo",
      blurb:
        "Una sección que se pliega y el marco de cabecera, cuerpo y acciones que repite cada diálogo.",
    },
    overlays: {
      title: "Superposiciones",
      blurb:
        "Todo lo que flota sobre la página, y la única temporización que todos comparten al cerrarse.",
    },
    dialogs: {
      title: "Diálogos y popovers",
      blurb:
        "Modal, diálogo a pantalla completa, popover, menú al pasar el ratón y tooltip — además de la temporización de cierre común.",
    },
    "tour-search-files": {
      title: "Recorrido, paleta y archivos",
      blurb:
        "El recorrido guiado, la paleta de comandos, la zona para soltar archivos y la fila deslizable.",
    },
    "app-chrome": {
      title: "Marco de la aplicación",
      blurb:
        "El marco en el que vive una aplicación y los flujos que toda aplicación repite: ajustes, formularios de varios pasos, comentarios.",
    },
    shell: {
      title: "Estructura",
      blurb: "El marco de la aplicación que estás viendo, desmontado pieza a pieza.",
    },
    settings: {
      title: "Campos de ajustes",
      blurb:
        "Las filas de los ajustes de la cuenta: tema, idioma, perfil, contraseña y verificación en dos pasos.",
    },
    wizard: {
      title: "Asistente",
      blurb: "El motor de varios pasos, su marco y su paso de revisión.",
    },
    "feedback-compose": {
      title: "Comentarios — redactar",
      blurb: "El formulario de informe y su campo de adjuntos.",
    },
    "feedback-inbox": {
      title: "Comentarios — bandeja de entrada",
      blurb:
        "El vocabulario de estados compartido, la política de transiciones y las piezas con las que se construye una bandeja de entrada.",
    },
    "hooks-lib": {
      title: "Hooks y lib",
      blurb:
        "Las exportaciones no visuales: los hooks observados en vivo y las utilidades puras como entrada → salida.",
    },
    api: {
      title: "API",
      blurb:
        "Lo que queda al quitar los píxeles: los hooks con los que se construyen los componentes y las funciones puras y constantes que una aplicación llama directamente.",
    },
    helpers: {
      title: "Funciones y constantes",
      blurb:
        "Las funciones y los datos detrás de los campos, como entrada → resultado: la aritmética de fechas de @eifi1/ui-kit/dates, el evaluador de la calculadora, la tabla de monedas y las constantes de clase con las que se compone un campo propio.",
    },
  },

  kit: {
    measuredGrid: {
      view: "Vista de tabla",
      cellsView: "Celdas",
      textView: "Texto",
      addRow: "Añadir fila",
      removeRow: (row) => `Quitar la fila ${row}`,
      clear: "Vaciar tabla",
      pasteHint: "Pega un bloque de una hoja de cálculo en cualquier celda",
      cell: (column, row) => `${column}, fila ${row}`,
      rowNumber: "Fila",
      rowActions: "Acciones de fila",
      keyboardHint:
        "Las flechas mueven entre celdas. Escribe para reemplazar una celda, F2 para editarla, Escape para deshacer la edición. Intro baja y añade una fila al final.",
      lineError: (line) => `No se pudo leer la línea ${line}`,
      points: (count) => (count === 1 ? "1 punto" : `${count} puntos`),
      problems: (count) =>
        count === 1 ? "1 celda no es un número" : `${count} celdas no son números`,
    },
    pageContents: { title: "En esta página" },
    common: {
      close: "Cerrar",
      clear: "Borrar",
      search: "Buscar",
      done: "Listo",
      cancel: "Cancelar",
      save: "Guardar",
      back: "Atrás",
      next: "Siguiente",
      remove: "Quitar",
      loading: "Cargando…",
      noResults: "Sin resultados",
      fieldValue: (field, value) => `${field}: ${value}`,
    },
    dataTable: {
      columns: "Columnas",
      selectAllRows: "Seleccionar todas las filas",
      sortHint: "Haz clic para ordenar · Mayús+clic para añadir un criterio",
      filter: "Filtrar",
      close: "Cerrar",
      selectRow: "Seleccionar fila",
      autoSize: "Ajustar ancho de columnas",
      loading: "Cargando…",
      filters: "Filtros",
      clearAll: "Borrar todo",
      done: "Listo",
      pageSize: "Filas por página",
      pageSizeAll: "Todas",
      prevPage: "Página anterior",
      nextPage: "Página siguiente",
      clearFilter: "Borrar filtro",
      filterPlaceholder: "Filtrar…",
      selectFilter: "Seleccionar",
      selectAll: "Todos",
      selectNone: "Ninguno",
      dateFrom: "Desde",
      dateTo: "Hasta",
      numberMin: "Mín.",
      numberMax: "Máx.",
      numberAbs: "Valor absoluto",
      presets: {
        today: "Hoy",
        yesterday: "Ayer",
        this_week: "Esta semana",
        last_week: "Semana pasada",
        last_7_days: "Últimos 7 días",
        last_30_days: "Últimos 30 días",
        this_month: "Este mes",
        last_month: "Mes pasado",
        last_3_months: "Últimos 3 meses",
        ytd: "En lo que va de año",
        last_year: "Año pasado",
      },
      table: "Tabla de datos",
      filterResults: (shown, total) =>
        `${n(shown)} de ${n(total)} ${plural(total, "fila", "filas")}`,
      sortedAscending: (column) => `Ordenado por ${column}, ascendente`,
      sortedDescending: (column) => `Ordenado por ${column}, descendente`,
      sortCleared: (column) => `Orden por ${column} eliminado`,
      pageChanged: (page, totalPages) => `Página ${n(page)} de ${n(totalPages)}`,
      pageRange: (from, to, total) => `${n(from)}–${n(to)} / ${n(total)}`,
      rowCount: (total) => n(total),
      columnsCount: (visible, total) => `Columnas (${n(visible)}/${n(total)})`,
    },
    miniCalendar: {
      previousMonth: "Mes anterior",
      nextMonth: "Mes siguiente",
      // Already formatted in the provider's locale ("lunes, 14 de septiembre de 2026").
      day: (date) => date,
      chooseStart: "Elige una fecha de inicio",
      chooseEnd: "Elige una fecha de fin",
      // "Fecha" is feminine; the date follows a label rather than being the subject of
      // a participle it cannot agree with.
      startSelected: (date) => `Fecha de inicio: ${date}. Elige una fecha de fin.`,
      rangeSelected: (from, to) =>
        `Periodo seleccionado: del ${from} al ${to}. Elige una fecha de inicio para empezar de nuevo.`,
    },
    monthPicker: {
      previousYear: "Año anterior",
      nextYear: "Año siguiente",
      panel: "Elegir un mes",
      month: (monthYear) => monthYear,
    },
    datePicker: {
      panel: "Elegir una fecha",
      rangePanel: "Elegir un intervalo de fechas",
      clear: "Borrar",
      previousDay: "Día anterior",
      nextDay: "Día siguiente",
      today: "Hoy",
    },
    popover: {
      panel: "Ventana emergente",
    },
    combobox: {
      search: "Buscar",
      noResults: "Sin resultados",
      clear: "Borrar",
      loading: "Cargando…",
      create: (query) => `Crear «${query}»`,
      selectedCount: (count) =>
        `${n(count)} ${plural(count, "seleccionado", "seleccionados")}`,
      loadError: "No se han podido cargar los resultados",
      resultCount: (count) => `${n(count)} ${plural(count, "resultado", "resultados")}`,
      minChars: (count) =>
        `Escribe al menos ${n(count)} ${plural(count, "carácter", "caracteres")}`,
    },
    multiSelect: {
      search: "Buscar",
      selectAll: "Seleccionar todo",
      clear: "Borrar",
      all: "Todos",
      // The bare count, as in English: the trigger has always shown just the number.
      selectedCount: (count) => n(count),
    },
    calculator: {
      open: "Abrir calculadora",
      panel: "Calculadora",
      calculation: "Cálculo",
      backspace: "Retroceso",
      clear: "Borrar",
      equals: "Igual",
      done: "Listo",
      plus: "Más",
      minus: "Menos",
      times: "Por",
      divide: "Entre",
      decimal: "Separador decimal",
    },
    currency: {
      currency: "Moneda",
      search: "Buscar moneda",
    },
    chipInput: {
      added: (value) => `«${value}» añadido`,
      removed: (value) => `«${value}» quitado`,
      remove: "Quitar",
      atLimit: (max) =>
        `Límite de ${n(max)} ${plural(max, "elemento", "elementos")} alcanzado`,
      duplicate: (value) => `«${value}» ya está en la lista`,
    },
    swatchPicker: {
      none: "Sin color",
      mixed: "Mixto: los elementos seleccionados tienen colores distintos",
    },
    iconPicker: {
      none: "Sin icono",
      mixed: "Mixto: los elementos seleccionados tienen iconos distintos",
      search: "Buscar iconos",
      noResults: "Ningún icono coincide",
      resultCount: (count) => `${n(count)} ${plural(count, "icono", "iconos")}`,
    },
    fieldSync: {
      synced: "Guardado",
      edited: "Cambios sin guardar",
      pending: "Guardando…",
      error: "No se pudo guardar",
      retry: "Reintentar",
    },
    passwordReveal: {
      show: "Mostrar contraseña",
      hide: "Ocultar contraseña",
    },
    dangerConfirm: {
      arm: "Eliminar…",
      confirm: "Eliminar",
      cancel: "Cancelar",
      prompt: "Esta acción no se puede deshacer.",
      password: "Contraseña",
      phrase: (phrase) => `Escribe «${phrase}» para confirmar`,
    },
    tabs: {
      add: "Añadir pestaña",
      remove: (tab) => `Quitar ${tab}`,
    },
    appShell: {
      collapse: "Contraer barra lateral",
      expand: "Expandir barra lateral",
      toggleGroup: (groupLabel) => `${groupLabel}: páginas`,
    },
    topBar: {
      theme: "Cambiar de tema",
      palette: "Ajuste de apariencia",
      language: "Idioma",
      switchRole: "Cambiar de rol",
      role: (value) => `Rol: ${value}`,
    },
    pickerSheet: {
      close: "Cerrar",
    },
    dialogFrame: {
      close: "Cerrar",
    },
    swipeableRow: {
      actions: "Acciones de la fila",
    },
    file: {
      // The kit's own `Intl` unit formatting, pinned to this locale ("3,4 MB").
      size: (bytes) => formatFileSize(bytes, "es-ES"),
    },
    filePicker: {
      rejectedType: (name) => `El tipo de archivo de «${name}» no es compatible`,
      rejectedSize: (name, maxSize) => `«${name}» supera ${maxSize}`,
      rejectedCount: (name, maxFiles) =>
        `«${name}» no se ha añadido: como máximo ${n(maxFiles)} ${plural(maxFiles, "archivo", "archivos")}`,
      rejectedInvalid: (name) => `«${name}» no se puede usar aquí`,
      rejectedMany: (count) =>
        count === 1 ? "1 archivo no se ha añadido" : `${n(count)} archivos no se han añadido`,
      selected: (count, firstName) =>
        count === 1 ? `«${firstName}» seleccionado` : `${n(count)} archivos seleccionados`,
      remove: (name) => `Quitar «${name}»`,
      clearAll: "Quitar todos los archivos",
      removed: (name) => `«${name}» quitado`,
      cleared: "Se han quitado todos los archivos",
    },
    wizard: {
      cancel: "Cancelar",
      back: "Atrás",
      next: "Siguiente",
      skip: "Omitir",
      finish: "Finalizar",
      submitting: "Creando…",
      steps: "Pasos",
      step: (current, total) => `Paso ${n(current)} de ${n(total)}`,
      cancelTitle: "¿Descartar este formulario?",
      confirmCancel: "Se perderán los datos introducidos.",
      cancelConfirmLabel: "Descartar",
      cancelDismissLabel: "Seguir editando",
      reviewTitle: "Revisión",
      edit: "Editar",
      missingRequired: "Rellena todos los campos obligatorios.",
      genericError: "Se ha producido un error",
    },
    tour: {
      next: "Siguiente",
      back: "Atrás",
      skip: "Omitir",
      done: "Listo",
      awaitClickHint: "Haz clic en el elemento resaltado para continuar",
      step: (current, total) => `${n(current)} / ${n(total)}`,
    },
    commandPalette: {
      placeholder: "Buscar…",
      empty: "Sin resultados",
      loading: "Buscando…",
      dialog: "Búsqueda",
    },
    sparkline: {
      rising: (first, last) => `Sube de ${first} a ${last}`,
      falling: (first, last) => `Baja de ${first} a ${last}`,
      flat: (value) => `Estable en ${value}`,
      single: (value) => `Un único valor: ${value}`,
      noData: "Sin datos",
      named: (name, summary) => `${name}: ${summary}`,
    },
    statTile: {
      increase: (amount) => `Sube ${amount}`,
      decrease: (amount) => `Baja ${amount}`,
      unchanged: "Sin cambios",
      better: (change) => `${change} (favorable)`,
      worse: (change) => `${change} (desfavorable)`,
      noValue: "Sin datos",
      loading: "Cargando…",
    },
    signaturePad: {
      label: "Firma",
      instructions: "Firma en el recuadro con el ratón, el dedo o un lápiz.",
      typedFallbackHint: "Si no puedes dibujar, escribe tu nombre.",
      empty: "Aún no hay nada dibujado",
      signed: "Firma dibujada",
      undo: "Deshacer el último trazo",
      clear: "Borrar",
      save: "Guardar firma",
      useTyped: "Escribir el nombre",
      useDrawn: "Dibujar la firma",
      typedName: "Nombre completo",
      cleared: "Firma borrada",
      undone: "Último trazo eliminado",
      viewEmpty: "Sin firmar",
      viewDrawn: "Firma manuscrita",
      viewTyped: (name) => `Firmado con el nombre escrito ${name}`,
    },
    passwordStrength: {
      // Agrees with "contraseña" (feminine).
      tooShort: "Demasiado corta",
      weak: "Débil",
      fair: "Aceptable",
      good: "Buena",
      strong: "Fuerte",
      announcement: (level) => `Seguridad de la contraseña: ${level}`,
      // Unformatted, as in the English default.
      ruleLength: (minLength) =>
        `Al menos ${minLength} ${plural(minLength, "carácter", "caracteres")}`,
      ruleCase: "Mayúsculas y minúsculas",
      ruleDigit: "Un número",
      ruleSymbol: "Un símbolo",
      optional: (rule) => `${rule} (opcional)`,
      met: "Cumplido:",
      notMet: "No cumplido:",
      tooLong: (maxBytes) =>
        `Como máximo ${maxBytes} ${plural(maxBytes, "carácter", "caracteres")} (las letras con tilde y los emojis cuentan como más de uno).`,
    },
    seriesChart: {
      resetZoom: "Restablecer zoom",
      zoomHint:
        "Arrastra para ampliar: una selección más o menos cuadrada amplía ambos ejes; una larga y estrecha, solo el suyo. Haz doble clic para restablecer.",
      empty: "Sin datos",
      legend: "Series",
    },
  },
};
