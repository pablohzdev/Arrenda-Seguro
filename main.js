import { leerPDF } from "./src/leerPDF.js";
import { analizarTexto } from "./src/analizadorLexico.js";


const inputPDF = document.getElementById("pdfInput");
const resultadoDiv = document.getElementById("resultado");

inputPDF.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  resultadoDiv.innerHTML = "⏳ Analizando contrato...";

  const paginas = await leerPDF(file);
  const analisis = analizarTexto(paginas);

  resultadoDiv.innerHTML = "";

  analisis.forEach(p => {
    const div = document.createElement("div");
    div.innerHTML = `
      <h3>Página ${p.pagina}</h3>
      <p>${p.texto}</p>
    `;
    resultadoDiv.appendChild(div);
  });
});
