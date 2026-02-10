import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

export async function leerPDF(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  const paginas = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    let texto = "";
    let lastY = null;

    content.items.forEach(item => {
      if (lastY !== null && item.transform[5] !== lastY) {
        texto += "\n";
      }
      texto += item.str + " ";
      lastY = item.transform[5];
    });

    // 🔥 LIMPIEZA AQUÍ
    let textoLimpio = texto
      .replace(/\$/g, "")
      .replace(/\s+/g, " ")
      .trim();

    paginas.push({
      pagina: i,
      texto: textoLimpio
    });
  }

  return paginas;
}
