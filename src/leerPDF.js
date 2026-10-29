import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs';
import { textoDeItems } from './texto.js';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';

// `alAvanzar(leidas, total)` se llama tras leer cada página.
export async function leerPDF(file, alAvanzar = () => {}) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;

  let paginas = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    paginas.push({
      pagina: i,
      texto: textoDeItems(content.items)
    });
    alAvanzar(i, pdf.numPages);
  }

  return paginas;
}
