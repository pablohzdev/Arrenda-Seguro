// Regresión sobre los contratos de contratos-prueba/: el resultado esperado de
// cada uno de los tres análisis y de la detección de idioma y país.
import { test } from "node:test";
import assert from "node:assert/strict";
import { leerContrato } from "./pdf.js";
import { detectarIdioma } from "../src/idiomas.js";
import { analizarTexto } from "../src/analizadorLexico.js";
import { analizarIncongruencias } from "../src/verificadorIncongruencias.js";
import { evaluarReglasEntorno, sugerirPais } from "../src/reglasEntorno.js";

async function analizar(nombre, paisId) {
  const paginas = await leerContrato(nombre);
  const idioma = detectarIdioma(paginas);
  const pais = paisId ?? sugerirPais(paginas);
  const lexico = analizarTexto(paginas, idioma.id);
  return {
    paginas,
    idioma,
    pais,
    alertas: lexico.flatMap(p => p.detecciones.map(d => d.palabra.toLowerCase())),
    descartes: lexico.flatMap(p => p.descartes.map(d => d.palabra.toLowerCase())),
    incongruencias: analizarIncongruencias(paginas, idioma.id).map(i => i.tipo),
    legales: evaluarReglasEntorno(paginas, pais, idioma.id)
  };
}

test("01 limpio (España): sin alertas ni violaciones", async () => {
  const r = await analizar("01-es-limpio-espana.pdf");
  assert.equal(r.idioma.id, "es");
  assert.ok(r.idioma.reconocido);
  assert.equal(r.pais, "ES");
  assert.deepEqual(r.alertas, []);
  assert.deepEqual(r.incongruencias, []);
  assert.deepEqual(r.legales, []);
});

test("02 abusivo (España): depósito, contradicciones, ambigüedades", async () => {
  const r = await analizar("02-es-abusivo-espana.pdf");
  assert.equal(r.pais, "ES");
  assert.equal(r.legales.length, 1);
  assert.match(r.legales[0].detalle, /3 mes\(es\).*LAU art\. 36\.1/);
  assert.equal(r.incongruencias.filter(t => t === "CONTRADICCIÓN").length, 2);
  assert.ok(r.incongruencias.includes("AMBIGÜEDAD"));
  // $900 de renta y $1200 de gastos son conceptos distintos.
  assert.ok(!r.incongruencias.includes("INCONSISTENCIA DE PAGO"));
  // Inicio y fin del contrato no son fechas contradictorias.
  assert.ok(!r.incongruencias.includes("FECHA CONTRADICTORIA"));
});

test("03 abusivo (Colombia): depósito prohibido y multa > 3 meses", async () => {
  const r = await analizar("03-es-abusivo-colombia.pdf");
  assert.equal(r.pais, "CO");
  assert.equal(r.legales.length, 2);
  assert.match(r.legales[0].detalle, /no está permitido.*art\. 16/);
  assert.match(r.legales[1].detalle, /5 mes\(es\).*art\. 25/);
});

test("04 falsos positivos (México): negaciones y mitigadores descartan", async () => {
  const r = await analizar("04-es-falsos-positivos.pdf");
  assert.equal(r.pais, "MX");
  assert.deepEqual(r.alertas, ["multa"]);
  assert.deepEqual(r.descartes, ["multa", "sanción", "multa", "deberá"]);
});

test("05 lease (inglés): idioma, contradicción y depósito en California", async () => {
  const r = await analizar("05-en-lease-abusive.pdf", "US-CA");
  assert.equal(r.idioma.id, "en");
  assert.ok(r.alertas.includes("penalty"));
  assert.ok(r.descartes.includes("penalty"));
  assert.ok(r.incongruencias.includes("CONTRADICCIÓN"));
  assert.equal(r.legales.length, 1);
  assert.match(r.legales[0].detalle, /3 mes\(es\).*1950\.5/);
});

test("las frases y posiciones de los resultados existen en el texto", async () => {
  for (const nombre of ["02-es-abusivo-espana.pdf", "03-es-abusivo-colombia.pdf", "05-en-lease-abusive.pdf"]) {
    const paginas = await leerContrato(nombre);
    const idioma = detectarIdioma(paginas).id;
    const rojos = [
      ...evaluarReglasEntorno(paginas, "CO", idioma),
      ...analizarIncongruencias(paginas, idioma)
    ];
    for (const r of rojos) {
      for (const { pagina, inicio, fin } of r.resaltados) {
        const texto = paginas.find(p => p.pagina === pagina).texto;
        assert.ok(inicio >= 0 && fin <= texto.length && inicio < fin, `${nombre}: ${r.tipo}`);
      }
    }
    for (const r of evaluarReglasEntorno(paginas, "CO", idioma)) {
      const { pagina, inicio, fin } = r.resaltados[0];
      assert.equal(paginas.find(p => p.pagina === pagina).texto.slice(inicio, fin), r.frase);
    }
  }
});
