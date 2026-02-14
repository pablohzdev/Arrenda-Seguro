// Referencias al DOM
const dropZone = document.getElementById('dropZone');
const pdfInput = document.getElementById('pdfInput');
const emptyState = document.getElementById('emptyState');
const fileState = document.getElementById('fileState');
const fileNameDisplay = document.getElementById('fileName');

// Prevenir comportamiento por defecto
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, e => {
        e.preventDefault();
        e.stopPropagation();
    });
});

// Efectos visuales
['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
        emptyState.classList.add('bg-primary/20', 'scale-[1.02]', 'border-primary');
        emptyState.classList.remove('bg-primary/5');
    });
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
        emptyState.classList.remove('bg-primary/20', 'scale-[1.02]', 'border-primary');
        emptyState.classList.add('bg-primary/5');
    });
});

// Manejar drop
dropZone.addEventListener('drop', e => {
    const file = e.dataTransfer.files[0];
    if (!file) return;

    mostrarArchivo(file);

    // Asignar archivo al input y disparar evento change
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    pdfInput.files = dataTransfer.files;

    pdfInput.dispatchEvent(new Event("change"));
});

// Mostrar visualmente el archivo
function mostrarArchivo(file) {
    emptyState.classList.add('hidden');
    fileState.classList.remove('hidden');
    fileState.classList.add('flex');
    fileNameDisplay.textContent = file.name;
}
