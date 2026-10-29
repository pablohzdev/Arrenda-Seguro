// ==========================================
// 1. IMPORTACIONES DE TU LÓGICA DE NEGOCIO
// ==========================================
import { leerPDF } from "./src/leerPDF.js";
import { analizarTexto } from "./src/analizadorLexico.js";
import { analizarIncongruencias } from "./src/verificadorIncongruencias.js";
import { detectarIdioma, IDIOMAS } from "./src/idiomas.js";
import { evaluarReglasEntorno, PAISES, sugerirPais } from "./src/reglasEntorno.js";
import { escaparHTML } from "./src/texto.js";

document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 2. REFERENCIAS AL DOM (UI)
    // ==========================================
    const themeToggleBtn = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;
    
    const paisSelect = document.getElementById('country-select');
    const fileInput = document.getElementById('file-input');
    const dropzone = document.getElementById('dropzone');
    const browseBtn = document.getElementById('browse-btn');
    
    const uploadSection = document.getElementById('upload-section');
    const analyzingSection = document.getElementById('analyzing-section');
    const resultsSection = document.getElementById('results-section');
    const howItWorksSection = document.getElementById('how-it-works');
    
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    // Contenedores del informe
    const reportTitle = document.getElementById('report-title');
    const metaChips = document.getElementById('meta-chips');
    const avisos = document.getElementById('avisos');
    const resumen = document.getElementById('resumen');
    const hallazgos = document.getElementById('hallazgos');
    const fullTextContainer = document.getElementById('full-text-container');

// ==========================================
    // 3. MODO OSCURO (Persistencia y Sistema)
    // ==========================================
    
    // Función para actualizar el icono según si tiene la clase dark o no
    const actualizarIconoTema = () => {
        const themeIcon = themeToggleBtn.querySelector('span');
        themeIcon.textContent = htmlElement.classList.contains('dark') ? 'light_mode' : 'dark_mode';
    };

    // Actualizamos el ícono nada más cargar la página (ya que el script del <head> ya aplicó el tema)
    actualizarIconoTema();

    themeToggleBtn.addEventListener('click', () => {
        // Alternamos la clase en el HTML
        htmlElement.classList.toggle('dark');
        
        // Revisamos si quedó oscuro o claro
        const esOscuro = htmlElement.classList.contains('dark');
        
        // Guardamos la decisión en el localStorage del navegador
        if (esOscuro) {
            localStorage.setItem('theme', 'dark');
        } else {
            localStorage.setItem('theme', 'light');
        }
        
        // Actualizamos el icono
        actualizarIconoTema();
    });

    // ==========================================
    // 4. EVENTOS DE CARGA DE ARCHIVO (Drag & Drop + Input)
    // ==========================================
    browseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });
    
    dropzone.addEventListener('click', () => fileInput.click());

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => {
            dropzone.classList.add('border-primary', 'bg-primary/5');
            dropzone.classList.remove('border-outline-variant');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => {
            dropzone.classList.remove('border-primary', 'bg-primary/5');
            dropzone.classList.add('border-outline-variant');
        });
    });

    dropzone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if(files.length > 0) procesarArchivo(files[0]);
    });

    fileInput.addEventListener('change', (e) => {
        if(e.target.files.length > 0) procesarArchivo(e.target.files[0]);
    });

    // ==========================================
    // 5. CATÁLOGO VISUAL DE HALLAZGOS
    // ==========================================
    // Tres niveles de severidad; las clases van completas para que Tailwind las detecte.
    const TONOS = {
        rose: {
            etiqueta: "Alto",
            borde: "border-l-rose-500",
            chip: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
            icono: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
            marca: "bg-rose-200 dark:bg-rose-500/30 text-rose-950 dark:text-rose-100 border-b-2 border-rose-400 dark:border-rose-500"
        },
        amber: {
            etiqueta: "Medio",
            borde: "border-l-amber-500",
            chip: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
            icono: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
            marca: "bg-amber-100 dark:bg-amber-500/25 text-amber-950 dark:text-amber-100 border-b-2 border-amber-400 dark:border-amber-500"
        },
        sky: {
            etiqueta: "Revisar",
            borde: "border-l-sky-500",
            chip: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
            icono: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
            marca: "bg-sky-100 dark:bg-sky-500/25 text-sky-950 dark:text-sky-100 border-b-2 border-sky-400 dark:border-sky-500"
        }
    };
    const PRIORIDAD = { sky: 1, amber: 2, rose: 3 };

    const CATEGORIAS = {
        "ERR_SEM_007 - Violación de Ley Local": { titulo: "Violación de ley local", icono: "gavel", tono: "rose", grupo: "ley", codigo: "ERR_SEM_007" },
        "CONTRADICCIÓN": { titulo: "Cláusulas contradictorias", icono: "compare_arrows", tono: "rose", grupo: "incongruencias" },
        "INCONSISTENCIA DE PAGO": { titulo: "Renta con importes distintos", icono: "payments", tono: "rose", grupo: "incongruencias" },
        "FECHA CONTRADICTORIA": { titulo: "Fechas inconsistentes", icono: "event_busy", tono: "rose", grupo: "incongruencias" },
        "AMBIGÜEDAD": { titulo: "Redacción ambigua", icono: "help", tono: "amber", grupo: "incongruencias" },
        OBLIGACION: { titulo: "Obligación impuesta", icono: "assignment", tono: "sky", grupo: "lexico" },
        PENALIZACION: { titulo: "Penalización", icono: "money_off", tono: "sky", grupo: "lexico" }
    };

    const GRUPOS = [
        { id: "ley", titulo: "Ley local", descripcion: "Valores que superan los límites legales del país.", icono: "gavel" },
        { id: "incongruencias", titulo: "Incongruencias", descripcion: "Contradicciones, ambigüedades e inconsistencias internas.", icono: "rule" },
        { id: "lexico", titulo: "Términos a revisar", descripcion: "Obligaciones y penalizaciones activas; no son ilegales por sí mismas.", icono: "visibility" }
    ];

    const categoria = tipo => CATEGORIAS[tipo] || { titulo: tipo, icono: "warning", tono: "rose", grupo: "incongruencias" };

    // ==========================================
    // 6. RENDERIZADO SEGURO
    // ==========================================
    // Todo texto que viene del PDF pasa por escaparHTML antes de ir a innerHTML.

    // Resalta por posiciones: cada carácter toma la marca de mayor prioridad
    // que lo cubra; los tramos se emiten escapados, con <mark> si están marcados.
    function resaltarTexto(texto, marcas) {
        const marcaDe = new Array(texto.length).fill(null);
        marcas.forEach(m => {
            for (let i = Math.max(0, m.inicio); i < Math.min(m.fin, texto.length); i++) {
                if (!marcaDe[i] || PRIORIDAD[m.tono] > PRIORIDAD[marcaDe[i].tono]) marcaDe[i] = m;
            }
        });

        let html = '';
        let i = 0;
        while (i < texto.length) {
            let j = i;
            while (j < texto.length && marcaDe[j] === marcaDe[i]) j++;
            const tramo = escaparHTML(texto.slice(i, j));
            const m = marcaDe[i];
            html += m
                ? `<mark data-ref="${m.ref}" class="${TONOS[m.tono].marca} rounded px-0.5 transition-shadow">${tramo}</mark>`
                : tramo;
            i = j;
        }
        return html;
    }

    function actualizarProgreso(porcentaje) {
        progressBar.style.width = `${porcentaje}%`;
        progressText.textContent = `${porcentaje}%`;
    }

    function chip(icono, texto) {
        return `
            <span class="inline-flex items-center gap-xs rounded-full bg-slate-100 dark:bg-surface-container px-3 py-1 text-xs font-medium text-slate-600 dark:text-on-surface-variant">
                <span class="material-symbols-outlined text-[16px]">${icono}</span>${escaparHTML(texto)}
            </span>`;
    }

    function aviso(texto) {
        return `
            <div class="flex items-start gap-sm rounded-xl border border-amber-300/60 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-md py-sm text-body-sm text-amber-900 dark:text-amber-200">
                <span class="material-symbols-outlined text-[20px] shrink-0">info</span>
                <span>${escaparHTML(texto)}</span>
            </div>`;
    }

    // Veredicto global según la severidad más alta encontrada.
    function veredicto(lista) {
        if (lista.some(h => h.tono === "rose")) {
            return { titulo: "Riesgo alto", texto: "Hay cláusulas que conviene negociar o corregir antes de firmar.", icono: "gpp_bad", clases: "from-rose-500/15 border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-300" };
        }
        if (lista.some(h => h.tono === "amber")) {
            return { titulo: "Riesgo moderado", texto: "Hay redacciones ambiguas que conviene precisar.", icono: "shield", clases: "from-amber-500/15 border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-300" };
        }
        if (lista.length > 0) {
            return { titulo: "Revisión recomendada", texto: "Sin incongruencias; revisa las obligaciones y penalizaciones señaladas.", icono: "verified_user", clases: "from-sky-500/15 border-sky-300 dark:border-sky-500/40 text-sky-700 dark:text-sky-300" };
        }
        return { titulo: "Sin riesgos detectados", texto: "No encontramos incongruencias ni términos abusivos. Aun así, lee el contrato completo.", icono: "verified", clases: "from-emerald-500/15 border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300" };
    }

    function renderResumen(lista) {
        const v = veredicto(lista);
        const cuenta = grupo => lista.filter(h => h.grupo === grupo).length;
        const tile = (grupo, etiqueta, icono) => `
            <a href="#grupo-${grupo}" class="glass-card rounded-2xl p-md flex flex-col gap-xs hover:border-indigo-400 dark:hover:border-primary/60 transition-colors ${cuenta(grupo) ? '' : 'opacity-60 pointer-events-none'}">
                <span class="material-symbols-outlined text-slate-400 text-[20px]">${icono}</span>
                <span class="text-h2 font-semibold text-slate-900 dark:text-white tabular-nums">${cuenta(grupo)}</span>
                <span class="text-body-sm text-slate-500 dark:text-slate-400">${etiqueta}</span>
            </a>`;

        resumen.innerHTML = `
            <div class="col-span-2 lg:col-span-1 rounded-2xl border bg-gradient-to-br to-transparent p-md flex flex-col gap-xs ${v.clases}">
                <span class="material-symbols-outlined text-[28px]" style="font-variation-settings: 'FILL' 1">${v.icono}</span>
                <span class="font-h3 text-h3">${v.titulo}</span>
                <span class="text-body-sm text-slate-600 dark:text-slate-300">${v.texto}</span>
            </div>
            ${tile("ley", "Violaciones de ley local", "gavel")}
            ${tile("incongruencias", "Incongruencias", "rule")}
            ${tile("lexico", "Términos a revisar", "visibility")}
        `;
    }

    function tarjetaHallazgo(h) {
        const tono = TONOS[h.tono];
        return `
            <button type="button" data-ref="${h.ref}"
                class="hallazgo w-full text-left glass-card rounded-xl border-l-4 ${tono.borde} p-md flex gap-md hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-shadow">
                <span class="material-symbols-outlined shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-[22px] ${tono.icono}">${h.icono}</span>
                <span class="min-w-0 flex-1 flex flex-col gap-sm">
                    <span class="flex flex-wrap items-center gap-sm">
                        <span class="font-semibold text-slate-900 dark:text-white">${escaparHTML(h.titulo)}</span>
                        <span class="rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${tono.chip}">${tono.etiqueta}</span>
                        ${h.codigo ? `<span class="rounded bg-slate-100 dark:bg-surface-container px-1.5 py-0.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">${h.codigo}</span>` : ""}
                    </span>
                    <span class="text-body-sm italic text-slate-600 dark:text-slate-400 border-l-2 border-slate-200 dark:border-slate-700 pl-sm line-clamp-3">"${escaparHTML(h.frase)}"</span>
                    ${h.detalle ? `<span class="text-body-sm text-slate-700 dark:text-slate-300">${escaparHTML(h.detalle)}</span>` : ""}
                    ${h.nota ? `<span class="text-xs text-slate-500">${escaparHTML(h.nota)}</span>` : ""}
                    <span class="flex items-center gap-xs text-xs font-medium text-indigo-600 dark:text-primary">
                        Página ${escaparHTML(h.pagina)} · Ver en el documento
                        <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </span>
                </span>
            </button>`;
    }

    function renderHallazgos(lista, descartes) {
        let html = GRUPOS.map(g => {
            const delGrupo = lista.filter(h => h.grupo === g.id);
            if (delGrupo.length === 0) return "";
            return `
                <section id="grupo-${g.id}" class="flex flex-col gap-md scroll-mt-24">
                    <header class="flex items-start gap-sm">
                        <span class="material-symbols-outlined text-slate-400 mt-0.5">${g.icono}</span>
                        <div>
                            <h3 class="font-body-md font-semibold text-slate-900 dark:text-white">${g.titulo} <span class="text-slate-400 font-normal tabular-nums">(${delGrupo.length})</span></h3>
                            <p class="text-xs text-slate-500 dark:text-slate-400">${g.descripcion}</p>
                        </div>
                    </header>
                    ${delGrupo.map(tarjetaHallazgo).join("")}
                </section>`;
        }).join("");

        if (descartes.length > 0) {
            html += `
                <details class="glass-card rounded-xl p-md group">
                    <summary class="cursor-pointer list-none flex items-center gap-sm text-body-sm font-semibold text-slate-700 dark:text-slate-300">
                        <span class="material-symbols-outlined text-slate-400 text-[20px] group-open:rotate-90 transition-transform">chevron_right</span>
                        ${descartes.length} término(s) descartado(s) por contexto
                    </summary>
                    <p class="mt-sm text-xs text-slate-500">No se marcan porque están negados o condicionados por un mitigador.</p>
                    <ul class="mt-md flex flex-col gap-sm">
                        ${descartes.map(d => `
                            <li class="text-body-sm text-slate-600 dark:text-slate-400 border-l-2 border-slate-200 dark:border-slate-700 pl-sm">
                                <span class="font-semibold text-slate-800 dark:text-slate-200">${escaparHTML(d.palabra)}</span>
                                <span class="text-xs text-slate-500"> · pág. ${d.pagina} · ${escaparHTML(d.motivo)}</span>
                                <span class="block italic">"${escaparHTML(d.fragmento)}"</span>
                            </li>`).join("")}
                    </ul>
                </details>`;
        }

        if (lista.length === 0) {
            html = `
                <div class="glass-card rounded-xl p-lg flex flex-col items-center text-center gap-sm">
                    <span class="material-symbols-outlined text-emerald-500 text-[40px]" style="font-variation-settings: 'FILL' 1">check_circle</span>
                    <p class="font-semibold text-slate-900 dark:text-white">Nada que señalar</p>
                    <p class="text-body-sm text-slate-500">Revisa igualmente el texto completo a la derecha.</p>
                </div>` + html;
        }

        hallazgos.innerHTML = html;
    }

    // Al pulsar un hallazgo, desplaza el documento hasta su marca y la destaca.
    hallazgos.addEventListener('click', (e) => {
        const tarjeta = e.target.closest('.hallazgo');
        if (!tarjeta) return;
        const marcas = fullTextContainer.querySelectorAll(`mark[data-ref="${tarjeta.dataset.ref}"]`);
        if (marcas.length === 0) return;
        fullTextContainer.querySelectorAll('.marca-activa').forEach(m => m.classList.remove('marca-activa'));
        marcas.forEach(m => m.classList.add('marca-activa'));
        marcas[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    // ==========================================
    // 7. FUNCIÓN PRINCIPAL DE ANÁLISIS
    // ==========================================
    async function procesarArchivo(file) {
        // VALIDAR QUE SEA PDF
        if (file.type !== "application/pdf") {
            alert("❌ Tipo de archivo incorrecto. Por favor, selecciona un archivo en formato .PDF");
            return;
        }

        // --- TRANSICIÓN DE UI: INICIAR CARGA ---
        uploadSection.classList.add('hidden');
        howItWorksSection.classList.add('hidden');
        analyzingSection.classList.remove('hidden');
        actualizarProgreso(0);

        try {
            // --- LECTURA (0-80%) Y ANÁLISIS (80-100%) ---
            const paginas = await leerPDF(file, (leidas, total) => {
                actualizarProgreso(Math.round((leidas / total) * 80));
            });

            const { id: idiomaId, confianza, reconocido } = detectarIdioma(paginas);
            const paisSugerido = sugerirPais(paginas);
            const paisId = paisSelect.value === 'AUTO' ? paisSugerido : paisSelect.value;
            actualizarProgreso(90);

            const analisis = analizarTexto(paginas, idiomaId);
            const incongruencias = [
                ...evaluarReglasEntorno(paginas, paisId, idiomaId),
                ...analizarIncongruencias(paginas, idiomaId)
            ];
            actualizarProgreso(100);

            // --- ENCABEZADO, CHIPS Y AVISOS ---
            reportTitle.textContent = file.name.replace(/\.pdf$/i, '');
            metaChips.innerHTML = [
                chip('translate', reconocido ? `${IDIOMAS[idiomaId].nombre} · ${Math.round(confianza * 100)}%` : `${IDIOMAS[idiomaId].nombre} (supuesto)`),
                chip('public', paisId ? `${PAISES[paisId].nombre}${paisSelect.value === 'AUTO' ? ' · detectado' : ''}` : 'País sin determinar'),
                chip('article', `${paginas.length} página(s)`)
            ].join('');

            const textosAviso = [];
            if (!reconocido) {
                textosAviso.push(`No reconocimos el idioma con certeza; se analizó como ${IDIOMAS[idiomaId].nombre}. Los resultados pueden ser incompletos.`);
            }
            if (!paisId) {
                textosAviso.push("No pudimos determinar el país del contrato, así que no se evaluaron límites de ley local. Elige el país manualmente y vuelve a analizar.");
            } else if (paisSugerido && paisSugerido !== paisId) {
                textosAviso.push(`Se evaluó con la ley de ${PAISES[paisId].nombre}, pero el contrato parece de ${PAISES[paisSugerido].nombre}.`);
            }
            avisos.innerHTML = textosAviso.map(aviso).join('');

            // --- LISTA UNIFICADA DE HALLAZGOS ---
            const lista = [];
            incongruencias.forEach(inc => {
                const c = categoria(inc.tipo);
                lista.push({
                    ...c,
                    ref: `h${lista.length}`,
                    frase: inc.frase,
                    detalle: inc.detalle,
                    pagina: inc.pagina,
                    nota: c.grupo === "ley" ? "Límite de referencia; confírmalo con un profesional antes de actuar." : null,
                    marcas: inc.resaltados || []
                });
            });
            analisis.forEach(p => p.detecciones.forEach(d => {
                lista.push({
                    ...categoria(d.tipo),
                    ref: `h${lista.length}`,
                    titulo: `${categoria(d.tipo).titulo}: «${d.palabra}»`,
                    frase: d.fragmento,
                    pagina: p.pagina,
                    marcas: [{ pagina: p.pagina, inicio: d.posicion, fin: d.posicion + d.palabra.length }]
                });
            }));

            const descartes = analisis.flatMap(p => p.descartes.map(d => ({ ...d, pagina: p.pagina })));

            renderResumen(lista);
            renderHallazgos(lista, descartes);

            // --- TEXTO COMPLETO CON MARCAS (por posiciones) ---
            fullTextContainer.innerHTML = analisis.map(pagina => {
                const marcas = lista.flatMap(h => h.marcas
                    .filter(m => m.pagina === pagina.pagina)
                    .map(m => ({ ...m, tono: h.tono, ref: h.ref })));
                return `
                    <div class="mb-lg">
                        <h4 class="sticky top-0 bg-white/90 dark:bg-[#131b2e]/90 backdrop-blur py-xs mb-sm text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Página ${pagina.pagina}</h4>
                        <p class="whitespace-pre-wrap">${resaltarTexto(pagina.texto, marcas)}</p>
                    </div>
                `;
            }).join('');

            // --- TRANSICIÓN DE UI: MOSTRAR RESULTADOS ---
            setTimeout(() => {
                analyzingSection.classList.add('hidden');
                resultsSection.classList.remove('hidden');
            }, 400); // Pequeña pausa para que el usuario vea la barra al 100%

        } catch (error) {
            console.error(error);
            alert(`❌ Error al analizar el contrato: ${error.message}`);

            // Volver al estado inicial si hay error
            analyzingSection.classList.add('hidden');
            uploadSection.classList.remove('hidden');
            howItWorksSection.classList.remove('hidden');
        }
    }
});
