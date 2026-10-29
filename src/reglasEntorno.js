import { IDIOMAS } from "./idiomas.js";
import { dividirOraciones } from "./arbolExpresiones.js";
import { extraerFechasConRol, mesesEntreFechas } from "./periodo.js";
import { negacionPrevia, patronDeFrases, plegar } from "./texto.js";

// Reglas de Entorno: límites legales por país, en meses de renta, por concepto
// (deposito | garantiaAdicional | penalizacion). `max` es un número o una
// función del contexto del contrato ({ duracionMeses }) que devuelve el límite
// (o undefined si no puede calcularse). `pistas` sirven para sugerir el país.
// Los valores son de referencia y deben validarse con un profesional.
export const PAISES = {
  ES: {
    nombre: "España",
    pistas: ["España", "Madrid", "Barcelona", "Valencia", "Sevilla", "Zaragoza", "Málaga", "Bilbao", "LAU", "Ley de Arrendamientos Urbanos", "euros", "€"],
    limites: {
      deposito: { max: 1, norma: "LAU art. 36.1" },
      garantiaAdicional: { max: 2, norma: "LAU art. 36.5" },
      // Desistimiento: 1 mensualidad por año restante, y sólo tras 6 meses de contrato.
      penalizacion: {
        max: ({ duracionMeses }) => (duracionMeses ? Math.max(0, (duracionMeses - 6) / 12) : undefined),
        norma: "LAU art. 11: una mensualidad por cada año que reste por cumplir"
      }
    }
  },
  MX: {
    nombre: "México (CDMX)",
    pistas: ["México", "Ciudad de México", "CDMX", "Guadalajara", "Monterrey", "Puebla", "Jalisco", "Nuevo León", "pesos mexicanos", "M.N."],
    limites: {
      deposito: { max: 1, norma: "Código Civil de la CDMX (artículo por confirmar)" }
    }
  },
  CO: {
    nombre: "Colombia",
    pistas: ["Colombia", "Bogotá", "Medellín", "Cali", "Barranquilla", "Cartagena", "Ley 820", "vivienda urbana"],
    limites: {
      deposito: { max: 0, norma: "Ley 820 de 2003, art. 16" },
      garantiaAdicional: { max: 0, norma: "Ley 820 de 2003, art. 16" },
      penalizacion: { max: 3, norma: "Ley 820 de 2003, art. 25" }
    }
  },
  "US-CA": {
    nombre: "Estados Unidos (California)",
    pistas: ["California", "Los Angeles", "San Francisco", "San Diego", "San Jose", "Sacramento", "Oakland", "Cal. Civ. Code", "Civil Code"],
    limites: {
      deposito: { max: 1, norma: "Cal. Civil Code §1950.5 (AB 12)" }
    }
  }
};

const ERROR = "ERR_SEM_007 - Violación de Ley Local";

const DESCRIPCION = {
  deposito: "El depósito o fianza",
  garantiaAdicional: "La garantía adicional",
  penalizacion: "La penalización por terminación"
};

const cache = new WeakMap();
function reglasDe(idioma) {
  if (cache.has(idioma)) return cache.get(idioma);

  const concepto = new Map();
  for (const [id, frases] of Object.entries(idioma.conceptos)) {
    for (const f of frases) if (!concepto.has(plegar(f))) concepto.set(plegar(f), id);
  }

  const numero = patronDeFrases(Object.keys(idioma.numeros));
  const conector = patronDeFrases(idioma.conectores);
  // "tres", "veinte y dos", "1,5", "seis (6)", "3 (tres)"
  const cantidad = `(?:\\d+(?:[.,]\\d+)?|(?:${numero})(?:(?:\\s+(?:${conector}))?[\\s-]+(?:${numero}))*)`;
  const parentesis = `(?:\\s*\\([^)]{1,30}\\))?`;
  const unidad = patronDeFrases(Object.keys(idioma.unidades));
  const medio = patronDeFrases(Object.keys(idioma.numeros).filter(n => idioma.numeros[n] === 0.5));

  const plegarClaves = obj => new Map(Object.entries(obj).map(([k, v]) => [plegar(k), v]));

  const reglas = {
    concepto,
    numeros: plegarClaves(idioma.numeros),
    unidades: plegarClaves(idioma.unidades),
    disparadores: new RegExp(patronDeFrases([...concepto.keys()]), "gu"),
    // 1: cantidad, 2: unidad, 3: "y medio" opcional
    importe: new RegExp(`(${cantidad})${parentesis}\\s+(?:de\\s+|of\\s+)?(${unidad})(\\s+(?:${conector})\\s+(?:${medio}))?`, "u"),
    numero: new RegExp(numero, "gu")
  };
  cache.set(idioma, reglas);
  return reglas;
}

function aMeses(cantidad, unidad, medio, reglas) {
  let valor = /^\d/.test(cantidad)
    ? Number(cantidad.replace(",", "."))
    : [...cantidad.matchAll(reglas.numero)].reduce((suma, m) => suma + reglas.numeros.get(m[0]), 0);
  if (medio) valor += 0.5;
  return valor * reglas.unidades.get(unidad);
}

function formatear(meses) {
  return Number.isInteger(meses) ? String(meses) : meses.toFixed(1).replace(".0", "");
}

// Recorre cada oración: por cada frase que introduce un concepto regulado,
// busca el importe que la sigue (hasta el próximo disparador) y lo pasa a
// meses. Se ignoran los conceptos negados ("no se exigirá depósito").
export function extraerCantidades(paginas, idiomaId) {
  const idioma = IDIOMAS[idiomaId];
  const reglas = reglasDe(idioma);
  const hallazgos = [];

  paginas.forEach(pagina => {
    dividirOraciones(pagina.texto).forEach(oracion => {
      const plegada = plegar(oracion.texto);
      const disparos = [...plegada.matchAll(reglas.disparadores)];

      disparos.forEach((d, i) => {
        const clausulaPrevia = plegada.slice(0, d.index).split(/[,;:]/).pop();
        if (negacionPrevia(clausulaPrevia, idioma)) return;

        const finVentana = disparos[i + 1]?.index ?? plegada.length;
        const ventana = plegada.slice(d.index + d[0].length, finVentana);
        const m = ventana.match(reglas.importe);
        if (!m) return;

        const inicio = d.index;
        const fin = d.index + d[0].length + m.index + m[0].length;
        hallazgos.push({
          concepto: reglas.concepto.get(d[0]),
          meses: aMeses(m[1], m[2], m[3], reglas),
          frase: oracion.texto.slice(inicio, fin),
          pagina: pagina.pagina,
          inicio: oracion.inicio + inicio,
          fin: oracion.inicio + fin
        });
      });
    });
  });

  return hallazgos;
}

// Duración del contrato en meses: la declarada ("vigencia de un año") o, si
// no la hay, la que resulta de las fechas de inicio y fin.
export function duracionDelContrato(paginas, idiomaId, hallazgos = extraerCantidades(paginas, idiomaId)) {
  const declaradas = hallazgos.filter(h => h.concepto === "duracion").map(h => h.meses);
  if (declaradas.length > 0) return Math.max(...declaradas);
  return mesesEntreFechas(extraerFechasConRol(paginas, IDIOMAS[idiomaId]));
}

export function evaluarReglasEntorno(paginas, paisId, idiomaId) {
  const pais = PAISES[paisId];
  if (!pais || !IDIOMAS[idiomaId]) return [];

  const hallazgos = extraerCantidades(paginas, idiomaId);
  const contexto = { duracionMeses: duracionDelContrato(paginas, idiomaId, hallazgos) };
  const errores = [];

  hallazgos.forEach(h => {
    const limite = pais.limites[h.concepto];
    if (!limite) return;
    const max = typeof limite.max === "function" ? limite.max(contexto) : limite.max;
    if (max === undefined || !(h.meses > max)) return;

    const motivo = max === 0
      ? `no está permitido en ${pais.nombre}`
      : `supera el límite de ${formatear(max)} mes(es) permitido en ${pais.nombre}`;
    const duracion = typeof limite.max === "function"
      ? ` Calculado para un contrato de ${formatear(contexto.duracionMeses)} mes(es).`
      : "";

    errores.push({
      tipo: ERROR,
      frase: h.frase,
      pagina: h.pagina,
      resaltados: [{ pagina: h.pagina, inicio: h.inicio, fin: h.fin }],
      detalle: `${DESCRIPCION[h.concepto]} de ${formatear(h.meses)} mes(es) ${motivo} (${limite.norma}).${duracion}`
    });
  });

  return errores;
}

// Sugiere el país del contrato por las pistas que aparecen en el texto
// (ciudades, leyes, moneda). Devuelve null si no hay pistas o hay empate.
export function sugerirPais(paginas) {
  const texto = plegar(paginas.map(p => p.texto).join(" "));
  const puntajes = Object.entries(PAISES).map(([id, pais]) => [
    id,
    [...texto.matchAll(new RegExp(patronDeFrases(pais.pistas), "gu"))].length
  ]).sort((a, b) => b[1] - a[1]);

  const [[mejor, puntaje], [, segundo] = [null, 0]] = puntajes;
  return puntaje > 0 && puntaje > segundo ? mejor : null;
}
