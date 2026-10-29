# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **pnpm** (`pnpm-lock.yaml`, `pnpm-workspace.yaml`); don't use npm.

- `pnpm install` — install deps
- `pnpm dev` — Vite dev server at http://localhost:5173
- `pnpm build` / `pnpm preview` — production build to `dist/` / serve it
- `pnpm test` — `node --test` over `tests/*.test.js`; single file: `node --test tests/casos.test.js`

`tests/contratos.test.js` is a regression suite over the PDFs in `contratos-prueba/` (read with `pdfjs-dist` in Node through `tests/pdf.js`, using the same `textoDeItems` join as the browser); `tests/casos.test.js` holds short edge cases. Every module in `src/` except `leerPDF.js` (CDN import) runs in Node. No linter is configured.

## Architecture

Client-only Vite app (vanilla JS + Tailwind v4 via `@tailwindcss/vite`, no backend) that analyzes rental-contract PDFs for abusive clauses. UI text and code identifiers are in Spanish. `main.js` is the entry point and orchestrates the whole flow in `procesarArchivo`:

1. `leerPDF` (`src/leerPDF.js`) → array of `{pagina, texto}`, reporting progress per page. pdf.js is loaded **from a CDN** (cdnjs 4.0.379), not from the `pdfjs-dist` npm dependency (which only the tests use). Real line breaks are kept (`hasEOL`).
2. `detectarIdioma` (`src/idiomas.js`) runs a word-level trie automaton built from every language's weighted `marcadores` over the preamble and returns `{id, confianza, reconocido}`. `sugerirPais` (`src/reglasEntorno.js`) picks the country from `PAISES[*].pistas` when `#country-select` is `AUTO`.
3. Three analyses whose results `main.js` renders as cards plus a highlighted full-text view:
   - `analizarTexto` (`src/analizadorLexico.js`) — builds an expression tree per sentence (`src/arbolExpresiones.js`: Oración → Cláusula → Token). Only `idioma.sensibles` types become `detecciones` (amber cards); other types go to `contexto`. Sensitive tokens are discarded into `descartes` (with `motivo`) when negated (`negacionPrevia` in `src/texto.js`: ≤5 words back, same clause, cut by conjunctions, ignoring negations inside subordinates) or when a mitigator governs their clause (same clause, or the neighbouring one if the mitigator's clause has no sensitive token).
   - `analizarIncongruencias` (`src/verificadorIncongruencias.js`) — contradictions only when both sentences share a content word near the phrase (party nouns in `idioma.partes` don't count), ambiguities, rent with more than one amount, and start/end dates that conflict or disagree with the declared duration (`src/periodo.js` assigns date roles).
   - `evaluarReglasEntorno` (`src/reglasEntorno.js`) — `extraerCantidades` parses the amount after each non-negated `idioma.conceptos` trigger into months; each is compared with `PAISES[pais].limites[concepto].max`, which may be a function of `{duracionMeses}` (Spain's LAU art. 11), emitting `ERR_SEM_007 - Violación de Ley Local`.

Red-card results share the shape `{tipo, frase, pagina, detalle, resaltados: [{pagina, inicio, fin}]}`; `main.js` highlights by those positions (and amber by `posicion`), escaping all PDF text with `escaparHTML` — never insert PDF-derived strings into `innerHTML` unescaped.

All matching is accent- and case-insensitive via `plegar` (`src/texto.js`), which preserves string length so indices map back to the original text; phrase regexes from `patronDeFrases` tolerate line breaks between words.

**Adding a language:** add an entry to `IDIOMAS` in `src/idiomas.js` (every key the `es`/`en` entries have) — the other modules read everything from that object. **Adding a country:** add to `PAISES` (with `pistas`) and to the `<select>` in `index.html`. The legal limits in `PAISES` are reference values not yet verified by a legal professional (Mexico's article is unconfirmed).

`tailwind.config.js` holds the Material-style design tokens and `darkMode: "class"`; the theme class on `<html>` is set by an inline script in `index.html` and toggled in `main.js` (persisted in `localStorage`).
