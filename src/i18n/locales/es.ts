import { formatFileSize } from "../kit-labels";
import type { UiKitLabels } from "../kit-labels";

/**
 * The kit's words in Spanish: every namespace of {@link UiKitLabels}, for
 * `<UiKitProvider labels={UI_KIT_LABELS_ES}>`.
 *
 * Self-contained on purpose — nothing but the kit's own `formatFileSize` — so it works
 * as a starting point to copy and adjust. Counts and sizes are formatted with
 * `es-ES` digits; {@link uiKitLabelsEs} takes another number locale
 * (e.g. `"de-CH"` for 1’234) without touching the words.
 */
export function uiKitLabelsEs(numberLocale = "es-ES"): UiKitLabels {
  const num = new Intl.NumberFormat(numberLocale);
  const n = (value: number) => num.format(value);
  const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

  return {
    feedbackAttachment: {
      attachmentAdd: "Adjuntar imagen",
      attachmentCapture: "Capturar pantalla",
      attachmentPaste: "…o pega una captura de pantalla desde el portapapeles.",
      attachmentRemove: "Quitar adjunto",
    },
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
      dismiss: "Cerrar",
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
      apply: "Aplicar",
      cancel: "Cancelar",
      presets: "Rangos rápidos",
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
      selectedCount: (count) => `${n(count)} ${plural(count, "seleccionado", "seleccionados")}`,
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
      atLimit: (max) => `Límite de ${n(max)} ${plural(max, "elemento", "elementos")} alcanzado`,
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
      size: (bytes) => formatFileSize(bytes, numberLocale),
    },
    filePicker: {
      dropzone: "Carga de archivos",
      browse: "Examinar",
      empty: "Suelte un archivo aquí",
      emptyMultiple: "Suelte archivos aquí",
      hint: (accept) => (accept ? `Aceptados: ${accept}` : "Cualquier tipo de archivo"),
      busy: "Subiendo…",
      rejectedPick: (count) =>
        count === 1 ? "El archivo no se añadió" : `No se añadió ninguno de los ${count} archivos`,
      rejectedType: (name) => `El tipo de archivo de «${name}» no es compatible`,
      rejectedTypeOnly: (accept) => `Solo archivos ${accept}`,
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
      error: "La búsqueda ha fallado. Inténtelo de nuevo.",
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
    confirmDialog: {
      confirm: "Confirmar",
      cancel: "Cancelar",
    },
    floatingPanel: {
      close: "Cerrar",
    },
    copyButton: {
      copy: "Copiar",
      copied: "Copiado",
      failed: "No se pudo copiar",
      copiedAnnouncement: "Copiado al portapapeles",
      failedAnnouncement: "No se pudo copiar al portapapeles",
    },
  };
}

export const UI_KIT_LABELS_ES: UiKitLabels = uiKitLabelsEs();
