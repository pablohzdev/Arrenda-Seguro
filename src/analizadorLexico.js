import { TOKENS } from "./tokens.js";

function escaparRegex(texto) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function analizarTexto(paginas) {
  return paginas.map(p => {
    let texto = p.texto;

    for (const tipo in TOKENS) {
      TOKENS[tipo].forEach(token => {
        const tokenEscapado = escaparRegex(token);
        const regex = new RegExp(`\\b${tokenEscapado}\\b`, "gi");
        texto = texto.replace(regex, `<mark>$&</mark>`);
      });
    }

    return {
      pagina: p.pagina,
      texto
    };
  });
}
