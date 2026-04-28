import { TOKENS } from "./tokens.js";

function escaparRegex(texto) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function analizarTexto(textoOPaginas) {

  const paginas = typeof textoOPaginas === 'string'
    ? [{ pagina: 1, texto: textoOPaginas }]
    : textoOPaginas;

  return paginas.map(p => {

    let textoOriginal = p.texto;
    let textoMarcado = textoOriginal;
    let detecciones = [];

    for (const tipo in TOKENS) {

      TOKENS[tipo].forEach(token => {

        const tokenEscapado = escaparRegex(token);
        const regex = new RegExp(`\\b${tokenEscapado}\\b`, "gi");

        let match;

        while ((match = regex.exec(textoOriginal)) !== null) {

          const inicio = Math.max(0, match.index - 80);
          const fin = Math.min(textoOriginal.length, match.index + match[0].length + 80);

          const fragmento = textoOriginal.substring(inicio, fin);

          detecciones.push({
            tipo,
            palabra: match[0],
            fragmento
          });
        }

        textoMarcado = textoMarcado.replace(regex, `<mark>$&</mark>`);
      });
    }

    return {
      pagina: p.pagina,
      texto: textoMarcado,
      detecciones
    };
  });
}
