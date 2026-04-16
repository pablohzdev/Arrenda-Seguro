export function analizarIncongruencias(paginas) {

  const incongruencias = [];
  const frasesDetectadas = new Set();

  paginas.forEach(pagina => {

    const texto = pagina.texto;
    const numeroPagina = pagina.pagina;

    const oraciones = texto.split(/(?<=\.)\s+|(?<=\.)\n+/);

    function buscarOraciones(palabra) {
      return oraciones.filter(o =>
        o.toLowerCase().includes(palabra)
      );
    }

    // ===============================
    // AMBIGUEDADES
    // ===============================

    const ambiguas = [
      "sin previo aviso",
      "cuando se considere necesario",
      "podrá modificar",
      "según corresponda",
      "a criterio",
      "de ser necesario"
    ];

    ambiguas.forEach(palabra => {

      const frases = buscarOraciones(palabra);

      frases.forEach(f => {

        if (!frasesDetectadas.has(f)) {

          frasesDetectadas.add(f);

          incongruencias.push({
            tipo: "AMBIGÜEDAD",
            frase: f,
            pagina: numeroPagina
          });

        }

      });

    });

    // ===============================
    // PRECIOS
    // ===============================

    const precios = texto.match(/\$\s?\d+/g);

    if (precios && precios.length > 1) {

      incongruencias.push({
        tipo: "INCONSISTENCIA DE PAGO",
        frase: precios.join(" — "),
        pagina: numeroPagina
      });

    }

    // ===============================
    // FECHAS
    // ===============================

    const fechas = texto.match(/\d{1,2}\/\d{1,2}\/\d{4}/g);

    if (fechas && fechas.length > 1) {

      incongruencias.push({
        tipo: "FECHA CONTRADICTORIA",
        frase: fechas.join(" — "),
        pagina: numeroPagina
      });

    }

  });

  return incongruencias;

}