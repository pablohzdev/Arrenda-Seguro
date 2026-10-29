// Utilidades de texto compartidas por el analizador léxico, el árbol de
// expresiones y las reglas de entorno.

// Pasa a minúsculas y quita acentos carácter por carácter, conservando la
// longitud: los índices hallados sobre el texto plegado valen en el original.
export function plegar(texto) {
  return texto.replace(/[^a-z0-9\s]/gsu, c => {
    const base = c.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
    return base.length === c.length ? base : c;
  });
}

export function escaparRegex(texto) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const LETRA = "[\\p{L}\\p{N}]";

// Alternativa de frases (más largas primero) con límites de palabra Unicode,
// para aplicar sobre texto plegado.
export function patronDeFrases(frases) {
  return [...frases]
    .map(plegar)
    .sort((a, b) => b.length - a.length)
    .map(f => {
      const ini = /^[\p{L}\p{N}]/u.test(f) ? `(?<!${LETRA})` : "";
      const fin = /[\p{L}\p{N}]$/u.test(f) ? `(?!${LETRA})` : "";
      return `${ini}${escaparRegex(f).replace(/ +/g, "\\s+")}${fin}`;
    })
    .join("|");
}

export function regexDeFrases(frases) {
  return new RegExp(`(?:${patronDeFrases(frases)})`, "gu");
}

// Une los items de texto de pdf.js respetando los saltos de línea reales.
export function textoDeItems(items) {
  return items.map(item => item.str + (item.hasEOL ? "\n" : " ")).join("").trimEnd();
}

export function escaparHTML(texto) {
  return String(texto ?? "").replace(/[&<>"']/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

const FECHA = /(?<!\d)(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?!\d)/g;

// Fechas numéricas de un texto. `formato` es "dmy" o "mdy"; las fechas
// imposibles (mes 13, 31/02...) se ignoran.
export function extraerFechas(texto, formato = "dmy") {
  const fechas = [];
  for (const m of texto.matchAll(FECHA)) {
    const [a, b, anio] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const [dia, mes] = formato === "mdy" ? [b, a] : [a, b];
    const fecha = new Date(Date.UTC(anio, mes - 1, dia));
    if (fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== dia) continue;
    fechas.push({ texto: m[0], indice: m.index, fecha });
  }
  return fechas;
}

export function palabras(texto) {
  return plegar(texto).match(/[\p{L}\p{N}']+/gu) || [];
}

// Negaciones con guion inicial ("-n't") se reconocen como sufijo de la palabra.
export function esNegacion(palabra, idioma) {
  return idioma.negaciones.some(n =>
    n.startsWith("-") ? palabra.endsWith(n.slice(1)) : palabra === plegar(n)
  );
}

const VENTANA_NEGACION = 5;

// Busca hacia atrás, en el texto que precede a un término, una negación que
// lo afecte: a ≤ 5 palabras, sin una conjunción en medio ("no paga y deberá")
// y que no pertenezca a una subordinada ("que no pague deberá").
// Devuelve la negación encontrada o null.
export function negacionPrevia(textoPrevio, idioma) {
  const lista = palabras(textoPrevio);
  const conjunciones = new Set(idioma.conjunciones.map(plegar));
  const subordinantes = new Set(idioma.subordinantes.map(plegar));

  for (let i = lista.length - 1; i >= Math.max(0, lista.length - VENTANA_NEGACION); i--) {
    if (conjunciones.has(lista[i])) return null;
    if (esNegacion(lista[i], idioma)) {
      return subordinantes.has(lista[i - 1]) ? null : lista[i];
    }
  }
  return null;
}
