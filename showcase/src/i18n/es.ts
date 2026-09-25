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

  // The kit's own words ship with the package — the same import an app writes.
  kit: UI_KIT_LABELS_ES,
};
