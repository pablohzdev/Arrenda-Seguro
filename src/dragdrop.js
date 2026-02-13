import { analizarTexto } from "./analizadorLexico";
import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs';
// Referencias al DOM
const dropZone = document.getElementById('dropZone');
const pdfInput = document.getElementById('pdfInput');
const emptyState = document.getElementById('emptyState');
const fileState = document.getElementById('fileState');
const fileNameDisplay = document.getElementById('fileName');
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';

// --- 1. Eventos de Drag & Drop ---

// Prevenir comportamientos por defecto del navegador (abrir el archivo en otra pestaña)
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// --- 2. Efectos Visuales al Arrastrar ---

// Cuando el archivo entra en la zona
['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
        emptyState.classList.add('bg-primary/20', 'scale-[1.02]', 'border-primary');
        emptyState.classList.remove('bg-primary/5');
    }, false);
});

// Cuando el archivo sale de la zona o se suelta
['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
        emptyState.classList.remove('bg-primary/20', 'scale-[1.02]', 'border-primary');
        emptyState.classList.add('bg-primary/5');
    }, false);
});

// --- 3. Manejar la caída (DROP) ---

dropZone.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;

    handleFiles(files);
}

// --- 4. Manejar el click normal (Input Change) ---

pdfInput.addEventListener('change', function() {
    handleFiles(this.files);
});

// --- 5. Lógica Principal de Procesamiento ---

async function handleFiles(files) {
    if (files.length > 0) {
        const file = files[0];
        if (file.type !== 'application/pdf') return;

        showFileSuccess(file);

        // --- PASO CLAVE: Leer el PDF ---
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        let textoCompleto = "";

        // Recorrer las páginas para extraer texto
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const strings = content.items.map(item => item.str);
            textoCompleto += strings.join(" ") + "\n";
        }

        // Ahora sí, envías el TEXTO al analizador
        console.log("Texto extraído con éxito");
        console.log("Texto:", textoCompleto.substring(0, 200)); // Log first 200 chars
        const resultados = analizarTexto(textoCompleto);
        console.log("Resultados:", resultados); // Log results
        
        // Función para mostrar resultados en el div #resultado
        mostrarResultadosEnPantalla(resultados);
    }
}

function showFileSuccess(file) {
    // Ocultar estado vacío
    emptyState.classList.add('hidden');
    // Mostrar estado con archivo
    fileState.classList.remove('hidden');
    fileState.classList.add('flex');
    
    // Actualizar nombre
    fileNameDisplay.textContent = file.name;
    
    // Sincronizar el input (opcional, por si se envía un form tradicional)
    // Nota: DataTransfer es necesario para asignar archivos manualmente a un input
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    pdfInput.files = dataTransfer.files;
}

function mostrarResultadosEnPantalla(resultados) {
    const resultadoDiv = document.getElementById('resultado');
    resultadoDiv.innerHTML = ''; // Clear previous results
    
    const iconMap = {
        'deposito': '💰',
        'garantia': '🔒',
        'reparacion': '🔧',
        'desalojo': '⚠️',
        'multa': '📋',
        'clausula': '⚖️',
        'ilegal': '🚫',
        'abusiva': '❌',
        'pago': '💳',
        'default': '📄'
    };
    
    resultados.forEach(resultado => {
        const div = document.createElement('div');
        div.className = 'p-4 rounded-xl glass-panel border border-slate-200 dark:border-slate-800';
        
        // Determine icon based on content
        let icon = iconMap['default'];
        for (const [key, value] of Object.entries(iconMap)) {
            if (resultado.texto.toLowerCase().includes(key)) {
                icon = value;
                break;
            }
        }
        
        div.innerHTML = `
            <div class="flex items-start gap-3">
                <span class="text-2xl shrink-0">${icon}</span>
                <div class="flex-1">
                    <h3 class="font-semibold text-sm mb-2 text-slate-800 dark:text-white">Página ${resultado.pagina}</h3>
                    <p class="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">${resultado.texto}</p>
                </div>
            </div>
        `;
        resultadoDiv.appendChild(div);
    });
}