// Lee los PDFs de contratos-prueba/ con pdfjs-dist (Node) y la misma unión de
// texto que usa src/leerPDF.js en el navegador.
import { readFileSync } from "node:fs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { textoDeItems } from "../src/texto.js";

const DIR = new URL("../contratos-prueba/", import.meta.url);

export async function leerContrato(nombre) {
  const data = new Uint8Array(readFileSync(new URL(nombre, DIR)));
  const pdf = await getDocument({ data, verbosity: 0 }).promise;
  const paginas = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const contenido = await (await pdf.getPage(i)).getTextContent();
    paginas.push({ pagina: i, texto: textoDeItems(contenido.items) });
  }
  return paginas;
}

export const pagina = texto => [{ pagina: 1, texto }];
