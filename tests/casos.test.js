// Casos borde de cada módulo, sobre textos cortos.
import { test } from "node:test";
import assert from "node:assert/strict";
import { pagina } from "./pdf.js";
import { detectarIdioma } from "../src/idiomas.js";
import { analizarTexto } from "../src/analizadorLexico.js";
import { dividirOraciones } from "../src/arbolExpresiones.js";
import { analizarIncongruencias } from "../src/verificadorIncongruencias.js";
import { evaluarReglasEntorno, sugerirPais } from "../src/reglasEntorno.js";
import { escaparHTML, plegar } from "../src/texto.js";

const lexico = (texto, idioma = "es") => {
  const [p] = analizarTexto(pagina(texto), idioma);
  return { alertas: p.detecciones.map(d => d.palabra), descartes: p.descartes.map(d => d.palabra) };
};
const legales = (texto, pais, idioma = "es") => evaluarReglasEntorno(pagina(texto), pais, idioma).map(e => e.detalle);
const tipos = (texto, idioma = "es") => analizarIncongruencias(pagina(texto), idioma).map(i => i.tipo);

test("plegar conserva la longitud y quita acentos", () => {
  const texto = "Penalización DEBERÁ Ñandú";
  assert.equal(plegar(texto), "penalizacion debera nandu");
  assert.equal(plegar(texto).length, texto.length);
});

test("escaparHTML neutraliza marcado del PDF", () => {
  assert.equal(escaparHTML(`<img src=x onerror="a()">`), "&lt;img src=x onerror=&quot;a()&quot;&gt;");
});

test("idioma: vacío o desconocido no se da por reconocido", () => {
  assert.equal(detectarIdioma(pagina("")).reconocido, false);
  assert.equal(detectarIdioma(pagina("Contrat de bail entre le bailleur et le locataire.")).reconocido, false);
});

test("oraciones: abreviaturas y numerales de lista no cortan", () => {
  assert.equal(dividirOraciones("Ubicado en Av. del Sol, Carrera 7 No. 32, Bogotá. El canon es fijo.").length, 2);
  assert.equal(dividirOraciones("1. The rent is due. 2. The tenant pays.").length, 2);
});

test("negación: ventana, conjunciones y subordinadas", () => {
  assert.deepEqual(lexico("Tenant doesn't have to pay any penalty.", "en").alertas, []);
  assert.deepEqual(lexico("El inquilino no paga la luz y deberá pagar una multa.").alertas, ["deberá", "multa"]);
  assert.deepEqual(lexico("El inquilino que no pague deberá pagar una multa.").alertas, ["deberá", "multa"]);
  assert.deepEqual(lexico("No se aplicará multa alguna.").descartes, ["multa"]);
});

test("mitigador: depende de su cláusula vecina, no de toda la oración", () => {
  assert.deepEqual(lexico("Salvo fuerza mayor, el inquilino deberá pagar una multa.").alertas, []);
  assert.deepEqual(lexico("El inquilino deberá pagar una multa; el arrendador, salvo previo aviso, no entrará.").alertas, ["deberá", "multa"]);
});

test("pagos y fechas no son alertas, sólo contexto", () => {
  const [p] = analizarTexto(pagina("El pago de la renta será de $800 en la fecha pactada."), "es");
  assert.deepEqual(p.detecciones, []);
  assert.ok(p.contexto.length > 0);
});

test("reglas: todas las menciones, números en palabras y fracciones", () => {
  assert.equal(legales("El depósito es de un mes. La garantía adicional es de cinco meses.", "ES").length, 1);
  assert.match(legales("fianza de dieciocho meses", "MX")[0], /18 mes/);
  assert.match(legales("depósito de un mes y medio de renta", "MX")[0], /1\.5 mes/);
  assert.match(legales("fianza equivalente a 45 días de renta", "MX")[0], /1\.5 mes/);
  assert.match(legales("a security deposit of one and a half months' rent", "US-CA", "en")[0], /1\.5 mes/);
});

test("reglas: conceptos negados no se evalúan", () => {
  assert.deepEqual(legales("No se exigirá depósito de dos meses.", "MX"), []);
  assert.deepEqual(legales("No security deposit of two months is required.", "US-CA", "en"), []);
});

test("reglas España: penalización según los años que restan (LAU art. 11)", () => {
  const texto = "El contrato tendrá una vigencia de un año. En caso de desistimiento, el arrendatario pagará una penalización de dos meses de renta.";
  assert.match(legales(texto, "ES")[0], /supera el límite de 0\.5 mes/);
  assert.deepEqual(legales(texto.replace("un año", "cinco años"), "ES"), []);
});

test("país: se sugiere por las pistas del texto", () => {
  assert.equal(sugerirPais(pagina("Inmueble ubicado en Bogotá, Colombia.")), "CO");
  assert.equal(sugerirPais(pagina("Apartment located in San Diego, California.")), "US-CA");
  assert.equal(sugerirPais(pagina("Sin pistas de ubicación.")), null);
});

test("contradicción sólo si hablan del mismo tema", () => {
  assert.deepEqual(tipos("El arrendador podrá ingresar al jardín. El arrendatario no podrá subarrendar el inmueble."), []);
  assert.deepEqual(tipos("El arrendatario podrá subarrendar el inmueble. El arrendatario no podrá subarrendar el inmueble."), ["CONTRADICCIÓN"]);
});

test("pagos: la renta con dos importes distintos es inconsistente", () => {
  assert.deepEqual(tipos("La renta mensual será de $900 y los gastos de $1200."), []);
  assert.deepEqual(tipos("La renta mensual será de $900. El arrendatario pagará una renta de $950."), ["INCONSISTENCIA DE PAGO"]);
});

test("fechas: sólo se marcan conflictos reales", () => {
  assert.deepEqual(tipos("El contrato inicia el 01/03/2026 y vence el 15/02/2027."), []);
  assert.deepEqual(tipos("El contrato inicia el 01/03/2026 y vence el 15/02/2025."), ["FECHA CONTRADICTORIA"]);
  assert.deepEqual(tipos("Inicia el 01/03/2026. También inicia el 01/04/2026."), ["FECHA CONTRADICTORIA"]);
  assert.deepEqual(tipos("Vigencia de dos años, a partir del 01/01/2026 y hasta el 31/12/2026."), ["FECHA CONTRADICTORIA"]);
});
