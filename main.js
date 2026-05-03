// ==========================================
// 1. IMPORTACIONES DE TU LÓGICA DE NEGOCIO
// ==========================================
import { leerPDF } from "./src/leerPDF.js";
import { analizarTexto } from "./src/analizadorLexico.js";
import { analizarIncongruencias } from "./src/verificadorIncongruencias.js";

document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 2. REFERENCIAS AL DOM (UI)
    // ==========================================
    const themeToggleBtn = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;
    
    const fileInput = document.getElementById('file-input');
    const dropzone = document.getElementById('dropzone');
    const browseBtn = document.getElementById('browse-btn');
    
    const uploadSection = document.getElementById('upload-section');
    const analyzingSection = document.getElementById('analyzing-section');
    const resultsSection = document.getElementById('results-section');
    const howItWorksSection = document.getElementById('how-it-works');
    
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    // Contenedor donde inyectaremos las tarjetas de resultados
    // Seleccionamos el grid dentro de la sección de resultados
    const resultsGrid = resultsSection.querySelector('.grid.lg\\:col-span-12');
    const documentView = document.getElementById('document-view');
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
    // 5. FUNCIÓN PRINCIPAL DE ANÁLISIS
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

        // Simular progreso visual mientras ocurre el análisis real de fondo
        let progress = 0;
        const interval = setInterval(() => {
            if (progress < 85) { // Lo frenamos al 85% hasta que la promesa termine
                progress += Math.floor(Math.random() * 10) + 5;
                progressBar.style.width = `${progress}%`;
                progressText.textContent = `${progress}%`;
            }
        }, 300);

        try {
            // --- LÓGICA DE ANÁLISIS REAL ---
            const textoCompleto = await leerPDF(file);
            const analisis = analizarTexto(textoCompleto);
            const incongruencias = analizarIncongruencias(textoCompleto);

            // Completar la barra al 100%
            clearInterval(interval);
            progressBar.style.width = `100%`;
            progressText.textContent = `100%`;

            // Limpiar resultados anteriores
            resultsGrid.innerHTML = '';

            let hayResultados = false;

            // --- RENDERIZAR INCONGRUENCIAS (Tarjetas Rojas - Nivel Alto) ---
            if (incongruencias && incongruencias.length > 0) {
                hayResultados = true;
                incongruencias.forEach(i => {
                    const card = document.createElement('div');
                    card.className = "glass-card rounded-2xl p-lg flex flex-col gap-md border-t-4 border-t-rose-500";
                    card.innerHTML = `
                        <div class="flex justify-between items-start">
                            <span class="bg-rose-500/10 text-rose-400 px-3 py-1 rounded-full text-label-caps font-bold">Alta - Incongruencia</span>
                            <span class="material-symbols-outlined text-rose-500" data-icon="warning" style="font-variation-settings: 'FILL' 1">warning</span>
                        </div>
                        <div>
                            <h4 class="font-body-md font-bold text-white mb-xs">${i.tipo || "Posible problema detectado"}</h4>
                            <p class="text-xs text-slate-500 mb-2">Página detectada: ${i.pagina || "No detectada"}</p>
                            <p class="text-slate-400 text-body-sm italic border-l-2 border-slate-800 pl-3 mb-md">
                                "...${i.frase || i.fragmento || i.texto || ""}..."
                            </p>
                            <p class="text-body-sm text-slate-300 bg-slate-900/50 p-3 rounded-lg">
                                <strong class="text-rose-400">Riesgo Legal:</strong> Se ha detectado una incongruencia o contradicción en el contrato que requiere revisión inmediata.
                            </p>
                        </div>
                    `;
                    resultsGrid.appendChild(card);
                });
            }

            // --- RENDERIZAR DETECCIONES LÉXICAS (Tarjetas Amarillas - Nivel Medio) ---
            if (analisis && analisis.length > 0) {
                analisis.forEach(p => {
                    if (p.detecciones && p.detecciones.length > 0) {
                        hayResultados = true;
                        p.detecciones.forEach((d) => {
                            const card = document.createElement('div');
                            card.className = "glass-card rounded-2xl p-lg flex flex-col gap-md border-t-4 border-t-amber-500";
                            card.innerHTML = `
                                <div class="flex justify-between items-start">
                                    <span class="bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full text-label-caps font-bold">Precaución</span>
                                    <span class="material-symbols-outlined text-amber-500" data-icon="info" style="font-variation-settings: 'FILL' 1">info</span>
                                </div>
                                <div>
                                    <h4 class="font-body-md font-bold text-white mb-xs">${d.tipo || 'Término de Riesgo'}</h4>
                                    <p class="text-xs text-slate-500 mb-2">Palabra clave: <span class="text-amber-400">${d.palabra}</span> | Página: ${p.pagina}</p>
                                    <p class="text-slate-400 text-body-sm italic border-l-2 border-slate-800 pl-3 mb-md">
                                        "...${d.fragmento}..."
                                    </p>
                                    <p class="text-body-sm text-slate-300 bg-slate-900/50 p-3 rounded-lg">
                                        <strong class="text-amber-400">Nota:</strong> Se detectó léxico asociado a cláusulas frecuentemente abusivas. Revise el contexto completo.
                                    </p>
                                </div>
                            `;
                            resultsGrid.appendChild(card);
                        });
                    }
                });
            }

            // Si el contrato está limpio
            if (!hayResultados) {
                resultsGrid.innerHTML = `
                    <div class="col-span-full glass-card rounded-2xl p-lg flex flex-col items-center text-center gap-md border-t-4 border-t-green-500">
                        <span class="material-symbols-outlined text-green-500 text-5xl" style="font-variation-settings: 'FILL' 1">check_circle</span>
                        <h4 class="font-body-md font-bold text-white">¡Todo parece en orden!</h4>
                        <p class="text-slate-400 text-body-sm max-w-md">No hemos detectado incongruencias severas ni léxico abusivo en este contrato. Aún así, te recomendamos leerlo detenidamente.</p>
                    </div>
                `;
            }

            // ==========================================
            // RENDERIZAR TEXTO COMPLETO SUBRAYADO
            // ==========================================
            if (hayResultados || analisis.length > 0) {
                documentView.classList.remove('hidden');
                let htmlDocumento = '';

                analisis.forEach((pagina) => {
                    let textoPagina = pagina.texto || '';

                    // 1. Resaltar detecciones léxicas (Amarillo)
                    if (pagina.detecciones && pagina.detecciones.length > 0) {
                        pagina.detecciones.forEach(d => {
                            if (!d.palabra) return;
                            // Escapar la palabra para que Regex no se confunda con caracteres especiales
                            const palabraEscapada = d.palabra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                            // \b asegura que coincida con la palabra completa, no partes de otras palabras
                            const regex = new RegExp(`\\b(${palabraEscapada})\\b`, 'gi');
                            
                            textoPagina = textoPagina.replace(regex, `<span class="bg-amber-200 dark:bg-amber-500/30 text-amber-900 dark:text-amber-200 px-1 rounded font-bold border-b-2 border-amber-400 dark:border-amber-500 transition-colors">$&</span>`);
                        });
                    }

                    // 2. Resaltar incongruencias de esta página (Rojo)
                    if (incongruencias && incongruencias.length > 0) {
                        incongruencias.forEach(inc => {
                            if (inc.pagina === pagina.pagina) {
                                let frase = inc.frase || inc.fragmento || inc.texto;
                                if (frase) {
                                    const fraseEscapada = frase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                    const regex = new RegExp(`(${fraseEscapada})`, 'gi');
                                    
                                    textoPagina = textoPagina.replace(regex, `<span class="bg-rose-200 dark:bg-rose-500/30 text-rose-900 dark:text-rose-200 px-1 rounded font-bold border-b-2 border-rose-400 dark:border-rose-500 transition-colors">$&</span>`);
                                }
                            }
                        });
                    }

                    // Agregar la página procesada al HTML final
                    htmlDocumento += `
                        <div class="mb-8">
                            <h4 class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Página ${pagina.pagina}</h4>
                            <p class="whitespace-pre-wrap">${textoPagina}</p>
                        </div>
                    `;
                });

                fullTextContainer.innerHTML = htmlDocumento;
            } else {
                // Si no hay texto para mostrar, ocultamos el contenedor
                documentView.classList.add('hidden');
            }

            // --- TRANSICIÓN DE UI: MOSTRAR RESULTADOS ---
            setTimeout(() => {
                analyzingSection.classList.add('hidden');
                resultsSection.classList.remove('hidden');
            }, 800); // Pequeña pausa para que el usuario vea la barra al 100%

        } catch (error) {
            clearInterval(interval);
            console.error(error);
            alert(`❌ Error al analizar el contrato: ${error.message}`);
            
            // Volver al estado inicial si hay error
            analyzingSection.classList.add('hidden');
            uploadSection.classList.remove('hidden');
            howItWorksSection.classList.remove('hidden');
        }
    }
});