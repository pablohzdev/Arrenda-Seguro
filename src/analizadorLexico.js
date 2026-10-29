import { IDIOMAS } from "./idiomas.js";
import { construirArbol, dividirOraciones, evaluarArbol } from "./arbolExpresiones.js";

const FRAGMENTO_MAX = 240;

// Por página devuelve:
//  - detecciones: términos sensibles (obligaciones, penalizaciones) activos;
//  - contexto: términos informativos (pagos, fechas), que no son alertas;
//  - descartes: términos sensibles anulados por negación o mitigador.
// Cada término lleva `posicion` (índice en el texto de la página).
export function analizarTexto(textoOPaginas, idiomaId = "es") {

  const idioma = IDIOMAS[idiomaId];
  const paginas = typeof textoOPaginas === 'string'
    ? [{ pagina: 1, texto: textoOPaginas }]
    : textoOPaginas;

  return paginas.map(p => {

    const detecciones = [];
    const contexto = [];
    const descartes = [];

    dividirOraciones(p.texto).forEach(oracion => {
      const arbol = construirArbol(oracion, idioma);
      const fragmento = oracion.texto.trim().slice(0, FRAGMENTO_MAX);

      evaluarArbol(arbol, idioma).forEach(r => {
        const item = { tipo: r.tipo, palabra: r.palabra, posicion: r.posicion, fragmento };
        if (!idioma.sensibles.includes(r.tipo)) {
          contexto.push(item);
        } else if (r.estado === "ACTIVO") {
          detecciones.push(item);
        } else {
          descartes.push({ ...item, estado: r.estado, motivo: r.motivo });
        }
      });
    });

    return {
      pagina: p.pagina,
      texto: p.texto,
      detecciones,
      contexto,
      descartes,
      descartadas: descartes.length
    };
  });
}
