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
    searchPlaceholder: "Buscar componentes, ejemplos o lo que necesitas…",
    searchComponents: "Componentes",
    searchExamples: "Ejemplos",
    searchNeeds: "¿Qué necesitas?",
    searchPages: "Páginas",
  },

  groups: {
    "Getting started": "Primeros pasos",
    Foundations: "Fundamentos",
    Inputs: "Entradas",
    "Pickers & entry": "Selectores y entrada",
    "Data display": "Visualización de datos",
    Charts: "Gráficos",
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
        "Qué es @eifi1/ui-kit, las ocho capas sobre las que está construido y cómo leer una página de este escaparate.",
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
    "month-view": {
      title: "Vista mensual del calendario",
      short: "Vista mes",
      blurb:
        "El calendario como página: un mes cuadriculado con los eventos de cada día en su celda, una cabecera propia de la página que lo controla y un panel para el día elegido.",
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
        "Mostrar valores en lugar de capturarlos: las piezas básicas, la respuesta y el progreso, listas, árboles y la tabla.",
    },
    buttons: {
      title: "Botones y superficies",
      short: "Botones",
      blurb:
        "Botones, grupos de botones, botones de icono, tarjetas, indicadores de carga y avatares — las piezas con las que se construye todo lo demás.",
    },
    "chips-toggles": {
      title: "Chips e interruptores",
      short: "Chips",
      blurb:
        "Los chips y el campo de chips, el grupo de interruptores y las pestañas — los controles pequeños que eligen uno entre pocos o guardan una lista corta.",
    },
    feedback: {
      title: "Respuesta y progreso",
      short: "Progreso",
      blurb:
        "Cuánto ha avanzado una tarea, que el contenido está en camino, que aquí no hay nada y que hay algo que leer: barras de progreso y medidores, esqueletos, estados vacíos y avisos.",
    },
    "description-list": {
      title: "Lista de descripción y tabla",
      short: "Listas y tablas",
      blurb:
        "Datos presentados sin ninguna maquinaria: una lista de términos y detalles, una tabla estática sencilla, y el separador y el área de desplazamiento que quedan entre ambas.",
    },
    "lists-menus": {
      title: "Listas y menús",
      short: "Listas y menús",
      blurb:
        "La fila que cada aplicación dibuja a mano — un botón, un enlace o un registro, con sus acciones al lado —, la fila de un menú y la barra que aparece al seleccionar filas.",
    },
    "tree-view": {
      title: "Vista de árbol",
      short: "Árbol",
      blurb:
        "Una jerarquía que recorres con el teclado — una sola parada de tabulación, flechas para abrir y cerrar, búsqueda al escribir — con hijos cargados bajo demanda, controlada desde fuera, de derecha a izquierda, y su fila por separado.",
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
    charts: {
      title: "Gráficos",
      blurb:
        "Los valores como imágenes: el contenedor con tema sobre Recharts, el gráfico de mosaicos, el gráfico de series con zoom con sus barras y áreas, y la tarjeta de KPI.",
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
    "series-chart-marks": {
      title: "Gráfico de series: barras, áreas y tiempo",
      short: "Barras y áreas",
      blurb:
        "El mismo gráfico dibujando barras, áreas y pilas, sobre categorías y tiempo real, con líneas de referencia, marcadores, puntos y clics — y una leyenda cuyos colores no cambian.",
    },
    stats: {
      title: "Estadísticas y sparklines",
      short: "Estadísticas",
      blurb:
        "La tarjeta de KPI que repite cada panel — valor, variación, tendencia — y la diminuta línea que cabe en una celda de tabla.",
    },
    "calendar-heatmap": {
      title: "Mapa de calor del calendario",
      short: "Mapa de calor",
      blurb:
        "Los días como cuadrados sombreados: un año en semanas o un mes, un día que se puede elegir, los niveles, el tope y el color de la escala, un periodo largo recortado a sus últimos días, y de derecha a izquierda.",
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
    "confirm-floating": {
      title: "Diálogo de confirmación y panel flotante",
      short: "Confirmar",
      blurb:
        "La promesa que sustituye a window.confirm — con tonos, palabras propias y una cola — y el panel no modal anclado en una esquina tras un botón flotante.",
    },
    "floating-actions": {
      title: "Acciones flotantes",
      short: "Flotantes",
      blurb:
        "Los controles de esquina: un botón extendido que informa de un estado y se anuncia cuando cambia, el tooltip del kit en un botón flotante y una píldora de interruptores, enlaces y contadores.",
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
    "page-structure": {
      title: "Encabezado de página y ruta de navegación",
      short: "Encabezado",
      blurb:
        "Las partes de una página que no son su contenido: el encabezado con su ruta y sus acciones, la ruta de navegación por sí sola, y la etiqueta de sección, el texto auxiliar y el punto de estado.",
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
    "clipboard-timing": {
      title: "Portapapeles y tiempos",
      short: "Portapapeles",
      blurb:
        "Copiar diciendo si ha funcionado, y esperar a que dejes de escribir: el botón de copiar y su hook, y el valor y el callback con debounce.",
    },
    helpers: {
      title: "Funciones y constantes",
      short: "Funciones",
      blurb:
        "Las funciones y los datos detrás de los campos, como entrada → resultado: la aritmética de fechas de @eifi1/ui-kit/dates, el evaluador de la calculadora, la tabla de monedas y las constantes de clase con las que se compone un campo propio.",
    },
  },


  // The top-bar search's "¿Qué necesitas?" rows: a task in the reader's words, and the
  // page that does it. Phrased as typed into a search box — lower case, no full stop.
  needs: {
    overview: [
      "empezar con el kit",
      "cómo está organizado el kit",
      "cómo leer una página del escaparate",
      "comparar con MUI",
      "instalar y configurar",
    ],
    foundations: [
      "ver los design tokens",
      "colores y temas",
      "traducir todo el kit",
      "paleta de colores de marca",
      "modo oscuro",
    ],
    tokens: [
      "ver todos los tokens de color",
      "cambiar entre tema claro y oscuro",
      "cambiar la paleta de colores",
      "mantener el tema al recargar",
      "valores de espaciado, radio y sombra",
      "colores de texto y superficies",
      "comprobar qué está escrito a mano",
    ],
    palette: [
      "generar una paleta a partir del color de marca",
      "comprobar el contraste de colores",
      "colores para gráficos",
      "escala de colores accesible",
      "obtener los colores del modo oscuro",
      "tema propio a partir de un color",
    ],
    localisation: [
      "traducir la interfaz",
      "cambiar el idioma",
      "traducción al alemán",
      "alemán informal con du",
      "ortografía del alemán de Suiza",
      "encontrar textos sin traducir",
      "configurar el idioma de fechas y números",
      "pasar los textos a todos los componentes",
    ],
    inputs: [
      "ver todos los componentes de entrada",
      "crear un formulario",
      "introducir texto, números o fechas",
      "disposición de los campos de un formulario",
      "elegir un valor",
    ],
    fields: [
      "escribir texto",
      "campo de texto con etiqueta flotante",
      "texto de varias líneas",
      "cuadro de búsqueda",
      "mostrar una ayuda bajo el campo",
      "mostrar un error de validación",
      "lista desplegable",
      "vaciar un campo",
      "crear un campo propio",
      "etiqueta encima del campo",
    ],
    forms: [
      "validar un formulario",
      "usar react-hook-form",
      "mensajes de error bajo los campos",
      "campos obligatorios",
      "enviar un formulario",
      "asociar la etiqueta a su campo",
      "formulario con esquema de validación",
      "validar un paso del asistente",
    ],
    choices: [
      "activar o desactivar un ajuste",
      "marcar una casilla",
      "elegir entre pocas opciones",
      "elegir un valor con un deslizador",
      "elegir un color",
      "elegir un icono",
      "elegir entre tarjetas",
      "seleccionar un rango con un deslizador",
      "tarjeta que inicia una acción",
    ],
    numbers: [
      "introducir un importe",
      "introducir un número",
      "elegir una moneda",
      "calculadora en el campo",
      "número con botones de más y menos",
      "teclado numérico en el móvil",
      "importes negativos en rojo",
      "formatear números según el idioma",
    ],
    calendars: [
      "elegir una fecha",
      "elegir un rango de fechas",
      "calendario",
      "rangos predefinidos como el mes pasado",
      "limitar las fechas seleccionables",
      "primer día de la semana",
      "elegir fecha de inicio y de fin",
      "volver a hoy",
    ],
    "month-view": [
      "página de calendario mensual",
      "mostrar eventos en un calendario",
      "cuadrícula mensual de agenda",
      "contenido propio en un día del calendario",
      "calendario con cabecera propia",
      "puntos en los días del calendario",
    ],
    "month-time": [
      "elegir un mes",
      "pasar al mes anterior o siguiente",
      "introducir una hora",
      "elegir horas y minutos",
      "periodo de facturación mensual",
      "limitar la hora a una franja",
    ],
    files: [
      "subir un archivo",
      "arrastrar y soltar archivos",
      "hacer una foto con la cámara",
      "elegir varios archivos",
      "permitir solo imágenes o PDF",
      "rechazar archivos demasiado grandes",
      "explicar por qué se rechazó un archivo",
    ],
    pickers: [
      "elegir de una lista",
      "elegir un registro",
      "introducir una tabla de valores",
      "guardar un campo al salir de él",
      "recoger una firma",
      "comprobar la seguridad de la contraseña",
    ],
    comboboxes: [
      "filtrar una lista larga escribiendo",
      "sugerencias mientras escribes",
      "autocompletar desde el servidor",
      "texto libre con sugerencias",
      "buscar mientras se escribe",
      "crear una opción nueva",
      "combobox",
    ],
    "entity-pickers": [
      "elegir un registro por id",
      "elegir un cliente o contacto",
      "seleccionar varios registros",
      "cargar opciones desde una API",
      "selector dentro de una tabla",
      "mostrar el estado de error",
      "elegir un elemento relacionado",
    ],
    "dropdown-parts": [
      "seleccionar varias opciones",
      "selección múltiple con casillas",
      "opciones agrupadas",
      "seleccionar todo",
      "selector como panel inferior en el móvil",
      "crear mi propio desplegable",
      "filtrar un desplegable escribiendo",
    ],
    "measured-grid": [
      "introducir una tabla de medidas",
      "pegar desde una hoja de cálculo",
      "cuadrícula con teclado como Excel",
      "miles de filas",
      "lista virtualizada",
      "convertir texto pegado en filas",
      "editar celdas con las flechas",
    ],
    "field-sync": [
      "guardar un campo al salir de él",
      "mostrar el estado guardando o guardado",
      "mostrar que no se pudo guardar",
      "guardado automático",
      "indicador de cambios sin guardar",
      "campo conectado a la base de datos",
    ],
    "signature-password": [
      "firmar un documento",
      "recoger una firma",
      "mostrar una firma guardada",
      "comprobar la seguridad de la contraseña",
      "confirmar con la contraseña",
      "pedir confirmación antes de borrar",
      "escribir el nombre para confirmar el borrado",
      "confirmar una acción peligrosa",
    ],
    "data-display": [
      "mostrar datos",
      "presentar valores",
      "tablas y listas",
      "progreso y avisos",
      "botones y tarjetas",
    ],
    buttons: [
      "un botón",
      "botones primarios y secundarios",
      "botón de icono",
      "grupo de botones",
      "contenedor de tarjeta",
      "indicador de carga",
      "avatar con iniciales",
      "botón desactivado",
      "punto de estado en un avatar",
    ],
    "chips-toggles": [
      "elegir entre pocas opciones",
      "control segmentado",
      "pestañas",
      "etiquetas o chips",
      "introducir varias etiquetas",
      "chips de filtro",
      "cambiar entre vistas",
      "quitar una etiqueta",
    ],
    feedback: [
      "mostrar el progreso",
      "barra de progreso",
      "marcador de carga",
      "skeleton mientras carga",
      "sin resultados",
      "mensaje de nada encontrado",
      "avisar al usuario",
      "banner de aviso o error",
      "mensaje de éxito",
      "indicador de porcentaje",
      "mostrar una confirmación breve",
      "deshacer tras borrar",
      "toast",
    ],
    "description-list": [
      "mostrar pares clave y valor",
      "detalles de un registro",
      "tabla estática sencilla",
      "tabla con fila de totales",
      "línea divisoria",
      "zona con desplazamiento",
      "alinear números a la derecha en una tabla",
    ],
    "lists-menus": [
      "lista de elementos",
      "fila de lista clicable",
      "fila con acciones",
      "marca de no leído",
      "lista de bandeja de entrada",
      "elemento de menú con marca",
      "elemento de menú peligroso",
      "seleccionar varias filas",
      "acciones en lote sobre la selección",
      "barra de herramientas de selección",
    ],
    "tree-view": [
      "mostrar datos jerárquicos",
      "árbol de carpetas",
      "expandir y contraer nodos",
      "cargar hijos bajo demanda",
      "recorrer un árbol con el teclado",
      "categorías anidadas",
      "organigrama como lista",
    ],
    "data-table": [
      "datos en tabla con ordenación",
      "ordenar una tabla",
      "filtrar filas de una tabla",
      "seleccionar filas",
      "expandir una fila para ver detalles",
      "tabla con paginación",
      "ocultar o reordenar columnas",
      "cuadrícula de datos",
      "buscar en una tabla",
    ],
    "data-table-server": [
      "paginación en el servidor",
      "guardar los filtros de la tabla en la URL",
      "tabla como tarjetas en el móvil",
      "acciones deslizando las filas",
      "agrupar filas",
      "cargar páginas desde una API",
      "compartir el enlace de una tabla filtrada",
    ],
    "data-table-parts": [
      "controles de paginación",
      "popover de filtros",
      "funciones de ordenación",
      "comprobar filas contra un filtro",
      "traducir los textos de la tabla",
      "selector de filas por página",
    ],
    layout: [
      "contraer una sección",
      "acordeón",
      "mostrar más o menos",
      "diálogo con cabecera y acciones",
      "panel desplegable",
      "animar la altura",
    ],
    charts: [
      "dibujar un gráfico",
      "visualizar datos",
      "colores de gráficos",
      "panel con KPI",
      "gráfico de líneas o de barras",
    ],
    "chart-shell": [
      "gráfico con el tema",
      "tooltip del gráfico",
      "leyenda del gráfico",
      "colores de las series",
      "usar Recharts con el tema",
      "gráfico circular o de barras",
      "gráfico adaptable",
    ],
    "tile-chart": [
      "treemap",
      "mostrar partes de un total",
      "profundizar en un gráfico",
      "mosaicos clicables",
      "gastos por categoría",
      "encajar las etiquetas en los mosaicos",
    ],
    "series-chart": [
      "gráfico a lo largo del tiempo",
      "hacer zoom en un gráfico",
      "gráfico de líneas con dos ejes",
      "mostrar u ocultar series desde la leyenda",
      "varios gráficos con un mismo zoom",
      "serie temporal",
      "medidas a lo largo del tiempo",
    ],
    "series-chart-marks": [
      "gráfico de barras",
      "gráfico de áreas apiladas",
      "línea de referencia o umbral",
      "marcadores en un gráfico",
      "hacer clic en un punto del gráfico",
      "gráfico por fechas",
      "colores de leyenda estables",
    ],
    stats: [
      "tarjeta de KPI",
      "mostrar una cifra con su variación",
      "tendencia al alza o a la baja",
      "sparkline en una celda",
      "cifras para un panel",
      "minigráfico de líneas",
    ],
    "calendar-heatmap": [
      "gráfico de contribuciones",
      "actividad por día",
      "calendario de gastos",
      "mapa de calor de días",
      "sombrear días por valor",
      "el año de un vistazo",
    ],
    overlays: [
      "mostrar algo encima de la página",
      "abrir un diálogo",
      "ventana emergente o menú",
      "tooltip",
      "paleta de comandos",
    ],
    dialogs: [
      "abrir un diálogo modal",
      "diálogo a pantalla completa",
      "cerrar al hacer clic fuera",
      "animar el cierre",
      "ventana emergente",
      "diálogo en el móvil",
    ],
    "confirm-floating": [
      "pedir confirmación antes de borrar",
      "diálogo de confirmación",
      "sustituir window.confirm",
      "¿estás seguro?",
      "botón de acción flotante",
      "panel fijo en una esquina",
      "panel de chat o de ayuda",
    ],
    "floating-actions": [
      "píldora de estado flotante",
      "anunciar un cambio de estado",
      "indicador sin conexión",
      "tooltip en un botón flotante",
      "botones de alternancia en una esquina",
      "insignia con un contador",
      "barra de herramientas flotante",
    ],
    popovers: [
      "mostrar un tooltip al pasar el ratón",
      "popover anclado a un botón",
      "menú al pasar el ratón",
      "menú desplegable",
      "colocar una ventana junto a un elemento",
      "explicar un icono",
    ],
    tour: [
      "visita guiada",
      "recorrido de bienvenida",
      "resaltar un elemento",
      "introducción paso a paso",
      "esperar a que el usuario haga clic",
      "tour del producto para nuevos usuarios",
    ],
    "command-palette": [
      "paleta de comandos",
      "búsqueda global",
      "atajo de teclado para buscar",
      "ir a una página",
      "búsqueda tolerante a erratas",
      "menú de acciones rápidas",
      "resultados de búsqueda del servidor",
    ],
    "swipeable-row": [
      "deslizar una fila para borrarla",
      "mostrar acciones al deslizar",
      "deslizar en el móvil",
      "archivar deslizando",
      "acciones en las filas de una lista",
    ],
    "app-chrome": [
      "estructura de la aplicación",
      "barra lateral y barra superior",
      "página de ajustes",
      "formulario en varios pasos",
      "recoger opiniones de los usuarios",
    ],
    "page-structure": [
      "título de página con acciones",
      "encabezado de página",
      "ruta de navegación",
      "ruta de navegación en el móvil",
      "etiqueta de sección pequeña en mayúsculas",
      "texto auxiliar bajo un campo",
      "punto de estado",
      "indicador de en línea",
      "punto de no leído en el avatar",
      "color de leyenda",
      "enlaces como píldoras que saltan de línea",
    ],
    shell: [
      "estructura de la aplicación con barra lateral",
      "barra superior",
      "menú de navegación",
      "navegación inferior en el móvil",
      "índice de contenidos",
      "cambiar de tema",
      "menú de idioma",
      "contraer la barra lateral",
      "menú de cuenta con avatar",
    ],
    settings: [
      "ajustes de la cuenta",
      "cambiar la contraseña",
      "autenticación en dos pasos",
      "editar el perfil",
      "elegir el tema",
      "elegir el idioma",
      "preferencias del usuario",
    ],
    wizard: [
      "formulario en varios pasos",
      "stepper",
      "asistente con paso de revisión",
      "avanzar y retroceder entre pasos",
      "proceso de bienvenida",
      "resumen antes de enviar",
    ],
    "feedback-compose": [
      "recoger opiniones de los usuarios",
      "informar de un error",
      "adjuntar una captura de pantalla",
      "formulario de comentarios",
      "enviar una sugerencia",
    ],
    "feedback-inbox": [
      "gestionar los comentarios recibidos",
      "flujo de estados de los comentarios",
      "clasificar informes de errores",
      "bandeja de soporte",
      "cambiar el estado de un informe",
    ],
    api: [
      "hooks y utilidades",
      "funciones sin interfaz",
      "funciones auxiliares",
      "constantes",
      "utilidades de fechas",
    ],
    "hooks-lib": [
      "reaccionar al tamaño de pantalla",
      "hook de media query",
      "cerrar un overlay con el botón atrás",
      "colocar un panel junto a su botón",
      "combinar nombres de clase",
      "detectar un móvil",
    ],
    "clipboard-timing": [
      "copiar al portapapeles",
      "botón de copiar con confirmación",
      "debounce al escribir",
      "esperar a que el usuario deje de escribir",
      "retrasar una búsqueda",
      "limitar la frecuencia de un callback",
    ],
    helpers: [
      "aritmética de fechas",
      "fecha de hoy en ISO",
      "rangos de fechas predefinidos",
      "evaluar una expresión matemática",
      "lista de monedas",
      "últimos meses completos",
      "clases de los campos",
    ],
  },


  // The kit's own words ship with the package — the same import an app writes.
  kit: UI_KIT_LABELS_ES,
};
