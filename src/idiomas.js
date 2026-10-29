import { palabras } from "./texto.js";

// Gramáticas concurrentes: una por idioma. El detector elige cuál inyectar.
// Todas las listas se comparan sin acentos ni mayúsculas.
export const IDIOMAS = {
  es: {
    nombre: "Español",
    // Frase marcadora -> peso. Las frases propias del dominio pesan más que
    // las palabras funcionales.
    marcadores: {
      "contrato de arrendamiento": 6, "contrato de alquiler": 6,
      "arrendamiento": 3, "arrendador": 3, "arrendatario": 3, "inquilino": 3, "fianza": 3,
      "renta": 2, "canon": 2, "inmueble": 2, "vivienda": 2, "celebrado entre": 3,
      "el": 1, "la": 1, "los": 1, "las": 1, "de": 1, "del": 1, "que": 1, "y": 1,
      "por": 1, "con": 1, "entre": 1, "para": 1, "una": 1
    },
    tokens: {
      OBLIGACION: ["deberá", "se obliga", "se compromete", "estará obligado", "estará obligada"],
      PAGO: ["pago", "monto", "cantidad", "$"],
      FECHA: ["fecha", "plazo", "vigencia"],
      PENALIZACION: ["multa", "penalización", "sanción", "recargo", "indemnización"]
    },
    sensibles: ["OBLIGACION", "PENALIZACION"],
    negaciones: ["no", "sin", "ni", "nunca", "jamás", "tampoco", "exento", "exenta", "ningún", "ninguna", "ninguno"],
    // Cortan el alcance de una negación ("no paga y deberá...").
    conjunciones: ["y", "e", "o", "u", "pero", "aunque", "sino"],
    // Una negación tras estas palabras pertenece a una subordinada
    // ("el inquilino que no pague deberá...") y no niega la principal.
    subordinantes: ["que", "si", "cuando", "quien", "cuyo", "cuya", "donde"],
    mitigadores: ["salvo", "excepto", "siempre que", "a menos que", "previo aviso", "previa notificación", "de común acuerdo", "con el consentimiento", "fuerza mayor"],
    // Pares [afirmación, negación]. Sólo hay contradicción si ambas frases
    // hablan del mismo objeto o sujeto (comparten una palabra de contenido).
    contradicciones: [
      ["podrá", "no podrá"],
      ["deberá", "no deberá"],
      ["será responsable", "no será responsable"],
      ["se permiten", "no se permiten"],
      ["podrá subarrendar", "no podrá subarrendar"],
      ["con penalización", "sin penalización"]
    ],
    // Sujetos genéricos que no bastan para decir que dos frases tratan lo mismo.
    partes: ["arrendador", "arrendadora", "arrendatario", "arrendataria", "inquilino", "inquilina", "partes", "contrato", "presente"],
    ambiguas: ["sin previo aviso", "cuando se considere necesario", "podrá modificar", "según corresponda", "a criterio", "de ser necesario"],
    // Conceptos de pago cuyo importe debe ser único en todo el contrato.
    conceptosPago: ["renta", "canon", "alquiler", "arriendo", "mensualidad"],
    formatoFecha: "dmy",
    rolesFecha: {
      inicio: ["inicia", "iniciará", "comienza", "comenzará", "a partir del", "a partir de", "desde el", "entra en vigor", "fecha de inicio"],
      fin: ["vence", "vencerá", "finaliza", "finalizará", "termina", "terminará", "concluye", "hasta el", "fecha de término", "fecha de vencimiento"]
    },
    // Reglas de entorno: frases que introducen cada concepto regulado.
    conceptos: {
      garantiaAdicional: ["garantía adicional", "garantías adicionales"],
      deposito: ["depósito", "fianza", "garantía"],
      penalizacion: ["terminación anticipada", "rescisión anticipada", "desistimiento", "penalización", "multa", "indemnización"],
      duracion: ["vigencia", "duración", "plazo de duración", "por un plazo", "por un período", "por un periodo"]
    },
    unidades: { mes: 1, meses: 1, mensualidad: 1, mensualidades: 1, año: 12, años: 12, día: 1 / 30, días: 1 / 30 },
    conectores: ["y"],
    numeros: {
      un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8,
      nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15,
      dieciséis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20,
      veintiún: 21, veintiuno: 21, veintiuna: 21, veintidós: 22, veintitrés: 23, veinticuatro: 24,
      veinticinco: 25, veintiséis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
      treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80,
      noventa: 90, cien: 100, medio: 0.5, media: 0.5
    }
  },
  en: {
    nombre: "English",
    marcadores: {
      "lease agreement": 6, "rental agreement": 6, "residential lease": 6,
      "lease": 3, "landlord": 3, "tenant": 3, "lessor": 3, "lessee": 3, "premises": 2,
      "rent": 2, "shall": 2, "hereby": 2, "made between": 3,
      "the": 1, "of": 1, "and": 1, "this": 1, "between": 1, "for": 1, "is": 1, "to": 1
    },
    tokens: {
      OBLIGACION: ["shall", "must", "agrees to", "is obligated to", "is required to"],
      PAGO: ["payment", "amount", "rent", "$"],
      FECHA: ["date", "term", "deadline"],
      PENALIZACION: ["fine", "penalty", "late fee", "forfeit", "surcharge"]
    },
    sensibles: ["OBLIGACION", "PENALIZACION"],
    negaciones: ["no", "not", "without", "never", "nor", "neither", "exempt", "-n't"],
    conjunciones: ["and", "or", "but", "although"],
    subordinantes: ["that", "if", "when", "who", "which", "whose", "where"],
    mitigadores: ["unless", "except", "provided that", "subject to", "prior notice", "mutual agreement", "with consent", "force majeure"],
    contradicciones: [
      ["may sublet", "may not sublet"],
      ["shall be liable", "shall not be liable"],
      ["is permitted", "is not permitted"],
      ["with penalty", "without penalty"]
    ],
    partes: ["landlord", "tenant", "lessor", "lessee", "parties", "party", "lease", "agreement", "this"],
    ambiguas: ["without prior notice", "as deemed necessary", "may modify", "as applicable", "at its discretion", "if necessary"],
    conceptosPago: ["rent", "monthly rent"],
    formatoFecha: "mdy",
    rolesFecha: {
      inicio: ["starts", "start", "begins", "commences", "commencing", "effective", "from", "start date", "commencement date"],
      fin: ["ends", "end", "expires", "terminates", "until", "through", "end date", "expiration date"]
    },
    conceptos: {
      garantiaAdicional: ["additional guarantee", "additional security"],
      deposito: ["security deposit", "deposit"],
      penalizacion: ["early termination", "termination fee", "penalty", "fine"],
      duracion: ["term of", "for a term", "for a period", "lease term"]
    },
    unidades: { month: 1, months: 1, "month's": 1, "months'": 1, year: 12, years: 12, day: 1 / 30, days: 1 / 30 },
    conectores: ["and"],
    numeros: {
      a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
      nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
      sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30,
      forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
      hundred: 100, half: 0.5, "a half": 0.5
    }
  }
};

const PREAMBULO_MAX = 1500;
const PUNTAJE_MINIMO = 8;
const CONFIANZA_MINIMA = 0.6;

// Autómata finito determinista sobre palabras: un trie compartido por todas
// las gramáticas. Cada nodo es un estado; los estados de aceptación indican
// qué idioma reconoce la frase leída hasta ahí y con qué peso.
function construirAutomata() {
  const raiz = { sig: new Map(), acepta: [] };
  for (const [id, idioma] of Object.entries(IDIOMAS)) {
    for (const [frase, peso] of Object.entries(idioma.marcadores)) {
      let estado = raiz;
      for (const palabra of palabras(frase)) {
        if (!estado.sig.has(palabra)) estado.sig.set(palabra, { sig: new Map(), acepta: [] });
        estado = estado.sig.get(palabra);
      }
      estado.acepta.push({ id, peso });
    }
  }
  return raiz;
}

const AUTOMATA = construirAutomata();

// Lee el preámbulo y devuelve el idioma ganador junto con su confianza.
// `reconocido` es false si el texto no se parece lo suficiente a ningún
// idioma soportado (vacío, escaneado, francés...).
export function detectarIdioma(paginas) {
  const texto = typeof paginas === "string" ? paginas : paginas.map(p => p.texto).join(" ");
  const lista = palabras(texto.slice(0, PREAMBULO_MAX));

  const puntaje = Object.fromEntries(Object.keys(IDIOMAS).map(id => [id, 0]));
  for (let i = 0; i < lista.length; i++) {
    let estado = AUTOMATA;
    for (let j = i; j < lista.length; j++) {
      estado = estado.sig.get(lista[j]);
      if (!estado) break;
      for (const { id, peso } of estado.acepta) puntaje[id] += peso;
    }
  }

  const total = Object.values(puntaje).reduce((a, b) => a + b, 0);
  const id = Object.keys(puntaje).reduce((mejor, id) => (puntaje[id] > puntaje[mejor] ? id : mejor), "es");
  const confianza = total ? puntaje[id] / total : 0;

  return {
    id,
    confianza,
    reconocido: puntaje[id] >= PUNTAJE_MINIMO && confianza >= CONFIANZA_MINIMA
  };
}
