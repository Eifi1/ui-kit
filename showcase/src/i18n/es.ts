import { UI_KIT_LABELS_ES } from "@eifi1/ui-kit/i18n/es";
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
    devicePreview: "Vista previa por tamaño de pantalla",
    previewHint:
      "La página en los tres tamaños de pantalla más comunes, en directo: desplázate y haz clic en cada marco. El tema, la paleta y el idioma siguen la barra superior.",
    phone: "Móvil",
    tablet: "Tableta",
    desktop: "Escritorio",
  },

  groups: {
    "Getting started": "Primeros pasos",
    Foundations: "Fundamentos",
    Inputs: "Entradas",
    "Pickers & entry": "Selectores y entrada",
    "Data display": "Visualización de datos",
    Overlays: "Superposiciones",
    // The frame around the app, not the browser — "chrome" in Spanish only means the browser.
    "App chrome": "Marco de la aplicación",
    API: "API",
  },

  groupShort: {
    "Getting started": "Inicio",
    Foundations: "Tokens",
    "Pickers & entry": "Selectores",
    "Data display": "Datos",
    "App chrome": "Marco",
  },

  pages: {
    overview: {
      title: "Introducción",
      short: "Introducción",
      blurb:
        "Qué es @eifi1/ui-kit, las siete capas sobre las que está construido y cómo leer una página de este escaparate.",
    },
    foundations: {
      title: "Fundamentos",
      blurb:
        "Los valores con los que pinta cada componente y el idioma que habla cada componente. Nada por debajo de esta capa fija en el código un color o una palabra.",
    },
    tokens: {
      title: "Tokens",
      short: "Tokens",
      blurb:
        "Cada valor del TokenSet activo, en vivo. Cambia el tema o la paleta en la barra superior y mira cómo se mueve esta página: lo que no se mueve está fijado en el código.",
    },
    palette: {
      title: "Generador de paletas",
      short: "Paleta",
      blurb:
        "Un color de marca de entrada, los dos temas de salida — cada relación de contraste medida en lugar de supuesta, y cada concesión con su nombre.",
    },
    localisation: {
      title: "Localización",
      short: "Localización",
      blurb:
        "Cada texto que muestra el kit, como un único árbol tipado — y el provider que entrega una traducción a todos los componentes a la vez.",
    },
    inputs: {
      title: "Entradas",
      blurb:
        "Todas las formas de escribir o ajustar un valor: texto, opciones, números, fechas, archivos y el adaptador de formularios que los rodea. Comparten una misma anatomía — una etiqueta flotante, el valor, una línea de ayuda debajo — para que un formulario se lea como un todo.",
    },
    fields: {
      title: "Campos de texto",
      short: "Texto",
      blurb:
        "Los campos de entrada y las constantes de clase con las que una aplicación compone sus propios campos.",
    },
    forms: {
      title: "Formularios (react-hook-form)",
      short: "Formularios",
      blurb:
        "El adaptador de react-hook-form en @eifi1/ui-kit/rhf: la etiqueta, el control, la descripción y el mensaje de un campo conectados entre sí y con el estado del formulario, con los mensajes solo donde el usuario puede verlos.",
    },
    choices: {
      title: "Opciones",
      short: "Opciones",
      blurb:
        "Activado o desactivado, una opción entre pocas, un valor en una escala — y elegir un color, un icono o una tarjeta.",
    },
    numbers: {
      title: "Números e importes",
      short: "Números",
      blurb:
        "La pila numérica: un campo numérico con calculadora, un campo cuyo valor es un número, el campo de importe con sus tonos y el selector de moneda.",
    },
    calendars: {
      title: "Calendarios y selectores de fecha",
      short: "Calendarios",
      blurb:
        "Elegir un día o un intervalo de días: el calendario en sí, los selectores de fecha y de intervalo construidos sobre él, sus atajos y sus límites, y el primer día de la semana.",
    },
    "month-time": {
      title: "Mes y hora",
      short: "Mes y hora",
      blurb:
        "La escala más gruesa y la más fina: un mes elegido por sí solo, en un campo o entre botones de paso, y una hora del día.",
    },
    files: {
      title: "Archivos",
      short: "Archivos",
      blurb:
        "Elegir archivos: un botón que abre el selector o la cámara, la zona para soltar y los rechazos comunicados donde el usuario está mirando, nunca como notificación emergente.",
    },
    pickers: {
      title: "Selectores y entrada",
      blurb:
        "Elegir de una lista en lugar de escribir, y las formas de entrada más exigentes: una tabla de medidas, un campo que se guarda al salir de él, una firma, una contraseña.",
    },
    comboboxes: {
      title: "Combobox",
      short: "Combobox",
      blurb:
        "Texto libre con sugerencias: el combobox cuyo valor es lo que se escribió, y el autocompletado que busca mientras escribes.",
    },
    "entity-pickers": {
      title: "Selectores de entidades",
      short: "Entidades",
      blurb:
        "Elegir un registro por su id: selectores con forma de campo o de botón, opciones fijas o cargadas, varios a la vez, y los estados no válido, error y deshabilitado que comparten.",
    },
    "dropdown-parts": {
      title: "Piezas del desplegable",
      short: "Piezas",
      blurb:
        "La selección múltiple, el selector agrupado y la hoja para móvil — y los hooks y el panel con los que se construye cada desplegable del kit.",
    },
    "measured-grid": {
      title: "Entrada de tablas",
      short: "Entrada de tablas",
      blurb:
        "Escribir una tabla de medidas: una cuadrícula de celdas por teclado, un bloque pegado desde una hoja de cálculo y la misma tabla como texto — miles de filas, solo las visibles montadas.",
    },
    "field-sync": {
      title: "Estado de sincronización",
      short: "Sincronización",
      blurb:
        "Estado de sincronización de un campo respaldado por base de datos, guardado al salir del campo: el color del borde y un icono al final del campo indican editado, guardando, guardado o error — pasa el cursor sobre la marca de error para ver el motivo.",
    },
    "signature-password": {
      title: "Firma, contraseña y confirmación",
      short: "Firma",
      blurb:
        "Capturar una firma — y mostrar una guardada —, indicar al usuario lo segura que es su contraseña y confirmar una acción destructiva.",
    },
    "data-display": {
      title: "Visualización de datos",
      blurb:
        "Mostrar valores en lugar de capturarlos: las piezas básicas, la tabla y los gráficos.",
    },
    buttons: {
      title: "Botones y superficies",
      short: "Botones",
      blurb:
        "Botones, botones de icono, tarjetas, indicadores de carga, estados vacíos, avatares y avisos — las piezas con las que se construye todo lo demás.",
    },
    "chips-toggles": {
      title: "Chips e interruptores",
      short: "Chips",
      blurb:
        "Los chips y el campo de chips, el grupo de interruptores y las pestañas — los controles pequeños que eligen uno entre pocos o guardan una lista corta.",
    },
    "data-table": {
      title: "Tabla de datos",
      short: "Tabla",
      blurb:
        "El componente más grande del kit, completo: ordenación, filtros, selección y expansión, control desde fuera, tabla corta sin paginación, relleno de un panel y de derecha a izquierda.",
    },
    "data-table-server": {
      title: "Tabla de datos: servidor, URL y móvil",
      short: "Servidor y móvil",
      blurb:
        "La tabla cuando no lo controla todo: la vista guardada en la dirección, las filas paginadas por un servidor y el diseño para móvil con tarjetas, grupos y acciones al deslizar.",
    },
    "data-table-parts": {
      title: "Tabla de datos: piezas y utilidades",
      short: "Piezas de tabla",
      blurb:
        "Aquello de lo que está hecha la tabla, utilizable por separado: el paginador, el popover de filtro, el árbol de etiquetas y las utilidades puras de ordenación, filtro y URL.",
    },
    "chart-shell": {
      title: "Contenedor de gráficos",
      short: "Gráficos",
      blurb:
        "El contenedor de gráficos con el tema del kit sobre Recharts — contenedor, tooltip y leyenda — y el sistema de colores del que se nutre cada gráfico del kit.",
    },
    "tile-chart": {
      title: "Gráfico de mosaicos",
      short: "Mosaicos",
      blurb:
        "El treemap: la parte de un todo como mosaicos, con etiquetas que caben y mosaicos en los que se puede hacer clic — y el desglose, con un gráfico de barras igual que con mosaicos.",
    },
    "series-chart": {
      title: "Gráfico de series",
      short: "Series",
      blurb:
        "El gráfico de series con zoom que comparten las aplicaciones: un eje por unidad, una leyenda de interruptores, un solo zoom para una pila de gráficos y las utilidades que hay debajo.",
    },
    stats: {
      title: "Estadísticas y sparklines",
      short: "Estadísticas",
      blurb:
        "La tarjeta de KPI que repite cada panel — valor, variación, tendencia — y la diminuta línea que cabe en una celda de tabla.",
    },
    layout: {
      title: "Sección plegable y marco de diálogo",
      short: "Plegable",
      blurb:
        "Una sección que se pliega y el marco de cabecera, cuerpo y acciones que repite cada diálogo.",
    },
    overlays: {
      title: "Superposiciones",
      blurb:
        "Todo lo que flota sobre la página, y la única temporización que todos comparten al cerrarse.",
    },
    dialogs: {
      title: "Diálogos",
      short: "Diálogos",
      blurb:
        "El modal y el diálogo a pantalla completa, la pulsación en el fondo que los cierra y la temporización de cierre que comparten todas las superposiciones.",
    },
    popovers: {
      title: "Popovers, menús y tooltips",
      short: "Popovers",
      blurb:
        "Las superposiciones ancladas a un disparador: popover, menú al pasar el ratón y tooltip — volteados y contenidos en la ventana, reflejados de derecha a izquierda — y el cálculo puro de posición que hay detrás.",
    },
    tour: {
      title: "Recorrido guiado",
      short: "Recorrido",
      blurb:
        "Un recorrido con foco sobre la página real: pasos que señalan cualquier elemento por selector, esperan un clic, ejecutan código antes y sobreviven a un objetivo que falta.",
    },
    "command-palette": {
      title: "Paleta de comandos",
      short: "Comandos",
      blurb:
        "La paleta ⌘K: una lista de lugares y acciones en la que buscar, abierta con el atajo en cualquier parte de la página, con resultados que pueden llegar tarde.",
    },
    "swipeable-row": {
      title: "Fila deslizable",
      short: "Deslizar",
      blurb:
        "Una fila de lista que muestra sus acciones al arrastrarla hacia un lado — con el dedo o el ratón, por etapas, de derecha a izquierda — con las mismas acciones accesibles por teclado.",
    },
    "app-chrome": {
      title: "Marco de la aplicación",
      blurb:
        "El marco en el que vive una aplicación y los flujos que toda aplicación repite: ajustes, formularios de varios pasos, comentarios.",
    },
    shell: {
      title: "Estructura",
      short: "Estructura",
      blurb: "El marco de la aplicación que estás viendo, desmontado pieza a pieza.",
    },
    settings: {
      title: "Campos de ajustes",
      short: "Ajustes",
      blurb:
        "Las filas de los ajustes de la cuenta: tema, idioma, perfil, contraseña y verificación en dos pasos.",
    },
    wizard: {
      title: "Asistente",
      short: "Asistente",
      blurb: "El motor de varios pasos, su marco y su paso de revisión.",
    },
    "feedback-compose": {
      title: "Comentarios — redactar",
      short: "Redactar",
      blurb: "El formulario de informe y su campo de adjuntos.",
    },
    "feedback-inbox": {
      title: "Comentarios — bandeja de entrada",
      short: "Bandeja",
      blurb:
        "El vocabulario de estados compartido, la política de transiciones y las piezas con las que se construye una bandeja de entrada.",
    },
    api: {
      title: "API",
      blurb:
        "Lo que queda al quitar los píxeles: los hooks con los que se construyen los componentes y las funciones puras y constantes que una aplicación llama directamente.",
    },
    "hooks-lib": {
      title: "Hooks y lib",
      short: "Hooks",
      blurb:
        "Las exportaciones no visuales: los hooks observados en vivo y las utilidades puras como entrada → salida.",
    },
    helpers: {
      title: "Funciones y constantes",
      short: "Funciones",
      blurb:
        "Las funciones y los datos detrás de los campos, como entrada → resultado: la aritmética de fechas de @eifi1/ui-kit/dates, el evaluador de la calculadora, la tabla de monedas y las constantes de clase con las que se compone un campo propio.",
    },
  },


  // The kit's own words ship with the package — the same import an app writes.
  kit: UI_KIT_LABELS_ES,
};
