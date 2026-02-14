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

    let bloqueDetecciones = "";

    p.detecciones.forEach((d, index) => {

      bloqueDetecciones += `
        <div style="margin:10px 0; padding:10px; background:#f3f4f6; border-radius:8px;">
          <strong>🚨 ${d.tipo}</strong><br>
          <em>Palabra detectada:</em> ${d.palabra}<br><br>
          <small>"...${d.fragmento}..."</small>
        </div>
      `;
    });

    div.innerHTML = `
      <h3>Página ${p.pagina}</h3>
      ${bloqueDetecciones}
      <hr style="margin:20px 0;">
      <p>${p.texto}</p>
    `;

    resultadoDiv.appendChild(div);
  });

});
