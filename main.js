import { leerPDF } from "./src/leerPDF.js";
import { analizarTexto } from "./src/analizadorLexico.js";
import { analizarIncongruencias } from "./src/verificadorIncongruencias.js";

const inputPDF = document.getElementById("pdfInput");
const resultadoDiv = document.getElementById("resultado");

inputPDF.addEventListener("change", async (e) => {

  const file = e.target.files[0];
  if (!file) return;

  resultadoDiv.innerHTML = "⏳ Analizando contrato...";

  try {

    // Leer PDF
    const textoCompleto = await leerPDF(file);

    // Análisis léxico
    const analisis = analizarTexto(textoCompleto);

    // Incongruencias
    const incongruencias = analizarIncongruencias(textoCompleto);

    resultadoDiv.innerHTML = "";

    // ===============================
    // INCONGRUENCIAS COMO DETECCIONES
    // ===============================

    if (incongruencias.length > 0) {

      const divIncongruencias = document.createElement("div");

      let bloque = "";

      incongruencias.forEach(i => {

        bloque += `
          <div style="
            margin:10px 0;
            padding:12px;
            background:#fee2e2;
            border-left:4px solid #ef4444;
            border-radius:8px;
          ">
            <strong>🚨 INCONGRUENCIA</strong><br>
            <strong>Tipo:</strong> ${i.tipo || "Posible problema"}<br>
            <strong>Página:</strong> ${i.pagina || "No detectada"}<br><br>

            <strong>Frase detectada:</strong><br>
            <small>"...${i.frase || i.fragmento || i.texto || ""}..."</small>
            
          </div>
        `;

      });

      divIncongruencias.innerHTML = `
        <h3>🚨 Incongruencias Detectadas</h3>
        ${bloque}
        <hr style="margin:20px 0;">
      `;

      resultadoDiv.appendChild(divIncongruencias);
    }


    // ===============================
    // DETECCIONES NORMALES
    // ===============================

    analisis.forEach(p => {

      const div = document.createElement("div");

      let bloqueDetecciones = "";

      p.detecciones.forEach((d) => {

        bloqueDetecciones += `
          <div style="
            margin:10px 0;
            padding:10px;
            background:#f3f4f6;
            border-radius:8px;
          ">
            <strong>🚨 ${d.tipo}</strong><br>
            <em>Palabra detectada:</em> ${d.palabra}<br><br>
            <small>"...${d.fragmento}..."</small>
          </div>
        `;
      });

      div.innerHTML = `
        <h3>📄 Página ${p.pagina}</h3>
        ${bloqueDetecciones}
        <hr style="margin:20px 0;">
        <p>${p.texto}</p>
      `;

      resultadoDiv.appendChild(div);

    });

  } catch (error) {

    console.error(error);

    resultadoDiv.innerHTML = `
      ❌ Error al analizar el contrato <br><br>
      ${error.message}
    `;
  }

});