// Estado de la aplicación
let estadoApp = {
    loteActual: '',
    arbolActual: 1,
    tipoActual: 'India',
    distanciaActual: 15,
    segmentosTemporales: [],
    medicionesGuardadas: [],
    lotesGuardados: [],
    modoMedicion: null, // 'camera' o 'manual'
    calibracionAngulo: 0,
    anguloActual: 0,
    alturaOjo: 1.6 // Altura promedio del ojo del observador
};

// Variables para la cámara y sensores
let stream = null;
let videoElement = null;
let canvasOverlay = null;
let ctx = null;
let sensorActivo = false;
let animationFrameId = null;

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    inicializarElementos();
    configurarEventListeners();
    cargarDatosGuardados();
    actualizarVista();
    
    // Verificar soporte de sensores
    verificarSensores();
    
    // Service Worker para PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker registrado'))
            .catch(err => console.log('Error registrando SW:', err));
    }
});

function inicializarElementos() {
    videoElement = document.getElementById('videoElement');
    canvasOverlay = document.getElementById('canvasOverlay');
    ctx = canvasOverlay.getContext('2d');
}

function configurarEventListeners() {
    // Listeners de lote
    document.getElementById('btnNuevoLote').addEventListener('click', nuevoLote);
    document.getElementById('btnAbrirLote').addEventListener('click', toggleLotesGuardados);
    
    // Listeners de modo de medición
    document.getElementById('btnMedirCamara').addEventListener('click', iniciarModoCamara);
    document.getElementById('btnMedirManual').addEventListener('click', iniciarModoManual);
    
    // Listeners de cámara
    document.getElementById('btnCalibrar').addEventListener('click', mostrarModalCalibracion);
    document.getElementById('btnCapturar').addEventListener('click', capturarSegmento);
    document.getElementById('btnCerrarCamara').addEventListener('click', cerrarCamara);
    document.getElementById('btnEstablecerCero').addEventListener('click', establecerCero);
    document.getElementById('btnCancelarCalibracion').addEventListener('click', cerrarModalCalibracion);
    
    // Listeners de entrada manual
    document.getElementById('btnAgregarSegmento').addEventListener('click', agregarSegmentoManual);
    document.getElementById('btnCerrarManual').addEventListener('click', cerrarModoManual);
    
    // Listeners de guardado
    document.getElementById('btnGuardarMedicion').addEventListener('click', guardarMedicion);
    document.getElementById('btnSiguienteArbol').addEventListener('click', siguienteArbol);
    document.getElementById('btnGuardarLote').addEventListener('click', guardarLote);
    document.getElementById('btnExportar').addEventListener('click', exportarCSV);
    document.getElementById('btnExportarTodo').addEventListener('click', exportarTodoCSV);
    document.getElementById('btnLimpiar').addEventListener('click', limpiarTodo);
    
    // Listeners de cambios
    document.getElementById('lote').addEventListener('input', actualizarEstado);
    document.getElementById('numeroArbol').addEventListener('change', cambiarArbol);
    document.getElementById('tipoMedicion').addEventListener('change', cambiarTipo);
    document.getElementById('distancia').addEventListener('change', cambiarDistancia);
    
    // Enter en altura manual
    document.getElementById('altura').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            agregarSegmentoManual();
        }
    });
}

// Verificar soporte de sensores
function verificarSensores() {
    if (window.DeviceOrientationEvent) {
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            // iOS 13+ requiere permisos
            console.log('Dispositivo iOS detectado - se solicitarán permisos al usar cámara');
        } else {
            // Android o iOS antiguo
            console.log('Sensores de orientación disponibles');
        }
    } else {
        console.warn('Sensores de orientación no disponibles');
        mostrarMensaje('Los sensores de orientación no están disponibles en este dispositivo', 'warning');
    }
}

// Iniciar modo cámara
async function iniciarModoCamara() {
    estadoApp.modoMedicion = 'camera';
    
    // Solicitar permisos si es necesario (iOS)
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
            const response = await DeviceOrientationEvent.requestPermission();
            if (response !== 'granted') {
                mostrarMensaje('Permisos de sensores denegados', 'error');
                return;
            }
        } catch (error) {
            mostrarMensaje('Error solicitando permisos: ' + error, 'error');
            return;
        }
    }
    
    // Ocultar botones de modo
    document.querySelector('.measurement-mode').style.display = 'none';
    
    // Mostrar vista de cámara
    document.getElementById('cameraView').style.display = 'block';
    
    // Iniciar cámara
    iniciarCamara();
}

// Iniciar cámara
async function iniciarCamara() {
    try {
        const constraints = {
            video: {
                facingMode: 'environment',
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        };
        
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        videoElement.srcObject = stream;
        
        // Ajustar canvas al tamaño del video
        videoElement.onloadedmetadata = () => {
            canvasOverlay.width = videoElement.videoWidth;
            canvasOverlay.height = videoElement.videoHeight;
            
            // Iniciar sensores
            iniciarSensores();
            
            // Iniciar animación
            animar();
        };
        
        mostrarMensaje('Cámara iniciada. Calibre la base del árbol', 'info');
        
    } catch (error) {
        console.error('Error accediendo a la cámara:', error);
        mostrarMensaje('Error al acceder a la cámara: ' + error.message, 'error');
        cerrarCamara();
    }
}

// Iniciar sensores de orientación
function iniciarSensores() {
    sensorActivo = true;
    
    window.addEventListener('deviceorientation', manejarOrientacion);
    
    // Para dispositivos que soporten orientación absoluta
    if (window.DeviceOrientationAbsoluteEvent) {
        window.addEventListener('deviceorientationabsolute', manejarOrientacion);
    }
}

// Manejar datos de orientación
function manejarOrientacion(evento) {
    if (!sensorActivo) return;
    
    // Beta es el ángulo de inclinación adelante/atrás (pitch)
    // Rango: -180 a 180 grados
    let angulo = evento.beta;
    
    // Normalizar ángulo
    if (angulo > 90) {
        angulo = 180 - angulo;
    } else if (angulo < -90) {
        angulo = -180 - angulo;
    }
    
    // Aplicar calibración
    estadoApp.anguloActual = angulo - estadoApp.calibracionAngulo;
    
    // Calcular altura
    const alturaCalculada = calcularAltura(estadoApp.anguloActual, estadoApp.distanciaActual);
    
    // Actualizar display
    actualizarDisplayAngulo(estadoApp.anguloActual, alturaCalculada);
}

// Calcular altura por trigonometría
function calcularAltura(angulo, distancia) {
    // Convertir ángulo a radianes
    const radianes = (angulo * Math.PI) / 180;
    
    // Calcular altura: h = d * tan(θ) + altura del ojo
    const altura = (distancia * Math.tan(radianes)) + estadoApp.alturaOjo;
    
    return Math.max(0, altura); // No permitir alturas negativas
}

// Actualizar display de ángulo y altura
function actualizarDisplayAngulo(angulo, altura) {
    document.getElementById('angleValue').textContent = angulo.toFixed(1) + '°';
    document.getElementById('heightValue').textContent = altura.toFixed(2) + 'm';
}

// Animar overlay de la cámara
function animar() {
    if (!sensorActivo) return;
    
    // Limpiar canvas
    ctx.clearRect(0, 0, canvasOverlay.width, canvasOverlay.height);
    
    // Dibujar retícula
    dibujarReticula();
    
    // Dibujar nivel
    dibujarNivel();
    
    // Continuar animación
    animationFrameId = requestAnimationFrame(animar);
}

// Dibujar retícula en el canvas
function dibujarReticula() {
    const centerX = canvasOverlay.width / 2;
    const centerY = canvasOverlay.height / 2;
    
    ctx.strokeStyle = '#4caf50';
    ctx.lineWidth = 2;
    
    // Línea horizontal
    ctx.beginPath();
    ctx.moveTo(centerX - 50, centerY);
    ctx.lineTo(centerX + 50, centerY);
    ctx.stroke();
    
    // Línea vertical
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - 50);
    ctx.lineTo(centerX, centerY + 50);
    ctx.stroke();
    
    // Círculo central
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
    ctx.stroke();
}

// Dibujar indicador de nivel
function dibujarNivel() {
    const centerX = canvasOverlay.width / 2;
    const bottomY = canvasOverlay.height - 50;
    
    // Fondo del nivel
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(centerX - 100, bottomY - 10, 200, 20);
    
    // Indicador de nivel
    const offset = (estadoApp.anguloActual / 90) * 100;
    ctx.fillStyle = Math.abs(estadoApp.anguloActual) < 2 ? '#4caf50' : '#ff9800';
    ctx.beginPath();
    ctx.arc(centerX + offset, bottomY, 8, 0, 2 * Math.PI);
    ctx.fill();
    
    // Línea central
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX, bottomY - 10);
    ctx.lineTo(centerX, bottomY + 10);
    ctx.stroke();
}

// Mostrar modal de calibración
function mostrarModalCalibracion() {
    document.getElementById('distanciaCalibracion').textContent = estadoApp.distanciaActual;
    document.getElementById('modalCalibracion').style.display = 'block';
}

// Cerrar modal de calibración
function cerrarModalCalibracion() {
    document.getElementById('modalCalibracion').style.display = 'none';
}

// Establecer cero (calibración)
function establecerCero() {
    estadoApp.calibracionAngulo = estadoApp.anguloActual + estadoApp.calibracionAngulo;
    cerrarModalCalibracion();
    mostrarMensaje('Base calibrada en 0°. Puede comenzar a medir', 'success');
}

// Capturar segmento con cámara
function capturarSegmento() {
    const alturaActual = calcularAltura(estadoApp.anguloActual, estadoApp.distanciaActual);
    
    if (alturaActual < 0) {
        mostrarMensaje('Altura inválida. Apunte por encima de la base', 'error');
        return;
    }
    
    // Validar que sea mayor que el segmento anterior
    if (estadoApp.segmentosTemporales.length > 0) {
        const ultimoSegmento = estadoApp.segmentosTemporales[estadoApp.segmentosTemporales.length - 1];
        if (alturaActual <= ultimoSegmento.alturaAcumulada) {
            mostrarMensaje(`La altura debe ser mayor a ${ultimoSegmento.alturaAcumulada.toFixed(2)}m`, 'error');
            return;
        }
    }
    
    // Calcular largo del segmento
    let largoSegmento;
    if (estadoApp.segmentosTemporales.length === 0) {
        largoSegmento = alturaActual;
    } else {
        const alturaAnterior = estadoApp.segmentosTemporales[estadoApp.segmentosTemporales.length - 1].alturaAcumulada;
        largoSegmento = alturaActual - alturaAnterior;
    }
    
    // Agregar segmento
    const segmento = {
        numero: estadoApp.segmentosTemporales.length + 1,
        alturaAcumulada: parseFloat(alturaActual.toFixed(2)),
        largo: parseFloat(largoSegmento.toFixed(2)),
        metodo: 'camera',
        angulo: estadoApp.anguloActual.toFixed(1),
        distancia: estadoApp.distanciaActual
    };
    
    estadoApp.segmentosTemporales.push(segmento);
    
    actualizarListaSegmentos();
    actualizarEstadoActual();
    
    // Efecto visual de captura
    efectoCaptura();
    
    mostrarMensaje(`Segmento ${segmento.numero} capturado: ${alturaActual.toFixed(2)}m`, 'success');
}

// Efecto visual de captura
function efectoCaptura() {
    ctx.fillStyle = 'rgba(76, 175, 80, 0.3)';
    ctx.fillRect(0, 0, canvasOverlay.width, canvasOverlay.height);
    
    setTimeout(() => {
        ctx.clearRect(0, 0, canvasOverlay.width, canvasOverlay.height);
    }, 200);
}

// Cerrar cámara
function cerrarCamara() {
    // Detener stream
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    
    // Detener sensores
    sensorActivo = false;
    window.removeEventListener('deviceorientation', manejarOrientacion);
    window.removeEventListener('deviceorientationabsolute', manejarOrientacion);
    
    // Cancelar animación
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    
    // Ocultar vista de cámara
    document.getElementById('cameraView').style.display = 'none';
    
    // Mostrar botones de modo
    document.querySelector('.measurement-mode').style.display = 'flex';
    
    estadoApp.modoMedicion = null;
}

// Iniciar modo manual
function iniciarModoManual() {
    estadoApp.modoMedicion = 'manual';
    
    // Ocultar botones de modo
    document.querySelector('.measurement-mode').style.display = 'none';
    
    // Mostrar entrada manual
    document.getElementById('manualEntry').style.display = 'block';
    
    // Actualizar número de segmento
    document.getElementById('numeroSegmento').value = estadoApp.segmentosTemporales.length + 1;
    
    // Focus en campo de altura
    document.getElementById('altura').focus();
}

// Cerrar modo manual
function cerrarModoManual() {
    // Ocultar entrada manual
    document.getElementById('manualEntry').style.display = 'none';
    
    // Mostrar botones de modo
    document.querySelector('.measurement-mode').style.display = 'flex';
    
    // Limpiar campo
    document.getElementById('altura').value = '';
    
    estadoApp.modoMedicion = null;
}

// Agregar segmento manual
function agregarSegmentoManual() {
    const alturaAcumulada = parseFloat(document.getElementById('altura').value);
    const numeroSegmento = parseInt(document.getElementById('numeroSegmento').value);
    
    if (!alturaAcumulada || alturaAcumulada <= 0) {
        mostrarMensaje('Ingrese una altura válida', 'error');
        return;
    }
    
    // Validar que sea mayor que el anterior
    if (estadoApp.segmentosTemporales.length > 0) {
        const ultimoSegmento = estadoApp.segmentosTemporales[estadoApp.segmentosTemporales.length - 1];
        if (alturaAcumulada <= ultimoSegmento.alturaAcumulada) {
            mostrarMensaje(`La altura debe ser mayor a ${ultimoSegmento.alturaAcumulada}m`, 'error');
            return;
        }
    }
    
    // Calcular largo
    let largoSegmento;
    if (estadoApp.segmentosTemporales.length === 0) {
        largoSegmento = alturaAcumulada;
    } else {
        const alturaAnterior = estadoApp.segmentosTemporales[estadoApp.segmentosTemporales.length - 1].alturaAcumulada;
        largoSegmento = alturaAcumulada - alturaAnterior;
    }
    
    // Agregar segmento
    const segmento = {
        numero: numeroSegmento,
        alturaAcumulada: alturaAcumulada,
        largo: parseFloat(largoSegmento.toFixed(2)),
        metodo: 'manual',
        distancia: estadoApp.distanciaActual
    };
    
    estadoApp.segmentosTemporales.push(segmento);
    
    // Limpiar y preparar siguiente
    document.getElementById('altura').value = '';
    document.getElementById('numeroSegmento').value = numeroSegmento + 1;
    document.getElementById('altura').focus();
    
    actualizarListaSegmentos();
    actualizarEstadoActual();
    
    mostrarMensaje(`Segmento ${numeroSegmento}: ${alturaAcumulada.toFixed(2)}m agregado`, 'success');
}

// Actualizar lista de segmentos
function actualizarListaSegmentos() {
    const lista = document.getElementById('listaSegmentos');
    
    if (estadoApp.segmentosTemporales.length === 0) {
        lista.innerHTML = '<p class="empty-message">No hay segmentos capturados</p>';
        return;
    }
    
    lista.innerHTML = estadoApp.segmentosTemporales.map((seg, index) => {
        const claseMetodo = seg.metodo === 'camera' ? 'camera-captured' : '';
        const badgeMetodo = seg.metodo === 'camera' ? 
            '<span class="segment-method method-camera">📷</span>' : 
            '<span class="segment-method method-manual">✏️</span>';
        
        return `
            <div class="segment-item ${claseMetodo}">
                <div class="segment-info">
                    <span><strong>Segmento ${seg.numero}</strong></span>
                    ${badgeMetodo}
                    <span>Altura: <strong>${seg.alturaAcumulada.toFixed(2)} m</strong></span>
                    <span>Largo: <strong>${seg.largo.toFixed(2)} m</strong></span>
                    ${seg.angulo ? `<span>Ángulo: ${seg.angulo}°</span>` : ''}
                </div>
                <div class="segment-actions">
                    <button class="btn-edit" onclick="editarSegmento(${index})">✏️</button>
                    <button class="btn-delete" onclick="eliminarSegmento(${index})">×</button>
                </div>
            </div>
        `;
    }).join('');
    
    // Altura total
    if (estadoApp.segmentosTemporales.length > 0) {
        const alturaTotal = estadoApp.segmentosTemporales[estadoApp.segmentosTemporales.length - 1].alturaAcumulada;
        
        lista.innerHTML += `
            <div style="margin-top: 10px; padding: 10px; background: linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%); border-radius: 6px;">
                <strong>Altura Total: ${alturaTotal.toFixed(2)} m</strong>
                <br>
                <small>Segmentos: ${estadoApp.segmentosTemporales.length} | Distancia: ${estadoApp.distanciaActual}m</small>
            </div>
        `;
    }
}

// Funciones básicas de gestión (similares a la app anterior)

function nuevoLote() {
    const nombreLote = document.getElementById('lote').value.trim();
    
    if (!nombreLote) {
        mostrarMensaje('Ingrese un nombre de lote', 'error');
        return;
    }
    
    estadoApp.loteActual = nombreLote;
    estadoApp.arbolActual = 1;
    estadoApp.tipoActual = 'India';
    estadoApp.segmentosTemporales = [];
    estadoApp.medicionesGuardadas = [];
    
    document.getElementById('numeroArbol').value = 1;
    document.getElementById('tipoMedicion').value = 'India';
    
    actualizarVista();
    guardarEstado();
    mostrarMensaje(`Lote "${nombreLote}" iniciado`, 'success');
}

function guardarMedicion() {
    if (!estadoApp.loteActual) {
        mostrarMensaje('Debe crear o abrir un lote primero', 'error');
        return;
    }
    
    if (estadoApp.segmentosTemporales.length === 0) {
        mostrarMensaje('Capture al menos un segmento', 'error');
        return;
    }
    
    const alturaTotal = estadoApp.segmentosTemporales[estadoApp.segmentosTemporales.length - 1].alturaAcumulada;
    
    const medicion = {
        arbol: estadoApp.arbolActual,
        tipo: estadoApp.tipoActual,
        segmentos: [...estadoApp.segmentosTemporales],
        alturaTotal: alturaTotal.toFixed(2),
        distancia: estadoApp.distanciaActual,
        fecha: new Date().toISOString()
    };
    
    estadoApp.medicionesGuardadas.push(medicion);
    
    // Limpiar segmentos
    estadoApp.segmentosTemporales = [];
    document.getElementById('numeroSegmento').value = 1;
    document.getElementById('altura').value = '';
    
    // Cerrar modos de medición si están abiertos
    if (estadoApp.modoMedicion === 'camera') {
        cerrarCamara();
    } else if (estadoApp.modoMedicion === 'manual') {
        cerrarModoManual();
    }
    
    // Cambiar tipo o siguiente árbol
    if (estadoApp.tipoActual === 'India') {
        estadoApp.tipoActual = '265';
        document.getElementById('tipoMedicion').value = '265';
        mostrarMensaje(`Árbol ${estadoApp.arbolActual} - India guardado (${alturaTotal.toFixed(2)}m). Ahora mida con 265`, 'success');
    } else {
        document.getElementById('btnSiguienteArbol').style.display = 'block';
        mostrarMensaje(`Árbol ${estadoApp.arbolActual} completado (India y 265)`, 'success');
    }
    
    actualizarVista();
    guardarEstado();
}

function siguienteArbol() {
    estadoApp.arbolActual++;
    estadoApp.tipoActual = 'India';
    estadoApp.segmentosTemporales = [];
    
    document.getElementById('numeroArbol').value = estadoApp.arbolActual;
    document.getElementById('tipoMedicion').value = 'India';
    document.getElementById('numeroSegmento').value = 1;
    document.getElementById('altura').value = '';
    document.getElementById('btnSiguienteArbol').style.display = 'none';
    
    actualizarVista();
    mostrarMensaje(`Iniciando medición del árbol ${estadoApp.arbolActual}`, 'info');
}

function cambiarArbol() {
    const nuevoArbol = parseInt(document.getElementById('numeroArbol').value);
    
    if (nuevoArbol > 0) {
        estadoApp.arbolActual = nuevoArbol;
        estadoApp.segmentosTemporales = [];
        document.getElementById('numeroSegmento').value = 1;
        actualizarVista();
    }
}

function cambiarTipo() {
    estadoApp.tipoActual = document.getElementById('tipoMedicion').value;
    actualizarEstadoActual();
}

function cambiarDistancia() {
    estadoApp.distanciaActual = parseInt(document.getElementById('distancia').value);
    actualizarEstadoActual();
}

function actualizarVista() {
    actualizarEstadoActual();
    actualizarListaSegmentos();
    actualizarResumen();
}

function actualizarEstadoActual() {
    document.getElementById('statusArbol').textContent = estadoApp.arbolActual;
    document.getElementById('statusTipo').textContent = estadoApp.tipoActual;
    document.getElementById('statusDistancia').textContent = estadoApp.distanciaActual + 'm';
    document.getElementById('statusSegmentos').textContent = estadoApp.segmentosTemporales.length;
}

function actualizarResumen() {
    const resumen = document.getElementById('resumenLote');
    
    if (estadoApp.medicionesGuardadas.length === 0) {
        resumen.innerHTML = '<p class="empty-message">No hay mediciones guardadas aún</p>';
        return;
    }
    
    const arboles = {};
    estadoApp.medicionesGuardadas.forEach(med => {
        if (!arboles[med.arbol]) {
            arboles[med.arbol] = [];
        }
        arboles[med.arbol].push(med);
    });
    
    resumen.innerHTML = Object.keys(arboles).map(arbol => {
        const mediciones = arboles[arbol];
        mediciones.sort((a, b) => {
            if (a.tipo === 'India' && b.tipo === '265') return -1;
            if (a.tipo === '265' && b.tipo === 'India') return 1;
            return 0;
        });
        
        const tipos = mediciones.map(m => m.tipo).join(', ');
        const alturas = mediciones.map(m => `${m.tipo}: ${m.alturaTotal}m`).join(' | ');
        
        return `
            <div class="summary-item">
                <div class="summary-info">
                    <strong>Árbol ${arbol}</strong>
                    <br>
                    <small>Métodos: ${tipos} | ${alturas}</small>
                </div>
            </div>
        `;
    }).join('');
    
    const totalArboles = Object.keys(arboles).length;
    const totalMediciones = estadoApp.medicionesGuardadas.length;
    
    resumen.innerHTML += `
        <div style="margin-top: 10px; padding: 10px; background: linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%); border-radius: 6px;">
            <strong>Total: ${totalArboles} árboles | ${totalMediciones} mediciones</strong>
        </div>
    `;
}

function eliminarSegmento(index) {
    estadoApp.segmentosTemporales.splice(index, 1);
    
    // Renumerar y recalcular largos
    estadoApp.segmentosTemporales.forEach((seg, i) => {
        seg.numero = i + 1;
        
        if (i === 0) {
            seg.largo = seg.alturaAcumulada;
        } else {
            seg.largo = parseFloat((seg.alturaAcumulada - estadoApp.segmentosTemporales[i - 1].alturaAcumulada).toFixed(2));
        }
    });
    
    document.getElementById('numeroSegmento').value = estadoApp.segmentosTemporales.length + 1;
    
    actualizarListaSegmentos();
    actualizarEstadoActual();
    mostrarMensaje('Segmento eliminado', 'info');
}

function editarSegmento(index) {
    const segmento = estadoApp.segmentosTemporales[index];
    const nuevaAltura = prompt(`Editar altura acumulada del segmento ${segmento.numero} (actual: ${segmento.alturaAcumulada}m):`, segmento.alturaAcumulada);
    
    if (nuevaAltura !== null && !isNaN(nuevaAltura) && parseFloat(nuevaAltura) > 0) {
        const alturaNum = parseFloat(nuevaAltura);
        
        // Validaciones
        if (index > 0) {
            const segmentoAnterior = estadoApp.segmentosTemporales[index - 1];
            if (alturaNum <= segmentoAnterior.alturaAcumulada) {
                mostrarMensaje(`La altura debe ser mayor a ${segmentoAnterior.alturaAcumulada}m`, 'error');
                return;
            }
        }
        
        if (index < estadoApp.segmentosTemporales.length - 1) {
            const segmentoSiguiente = estadoApp.segmentosTemporales[index + 1];
            if (alturaNum >= segmentoSiguiente.alturaAcumulada) {
                mostrarMensaje(`La altura debe ser menor a ${segmentoSiguiente.alturaAcumulada}m`, 'error');
                return;
            }
        }
        
        // Actualizar
        estadoApp.segmentosTemporales[index].alturaAcumulada = alturaNum;
        estadoApp.segmentosTemporales[index].metodo = 'manual'; // Cambiar a manual si se edita
        
        // Recalcular largos
        for (let i = index; i < estadoApp.segmentosTemporales.length; i++) {
            if (i === 0) {
                estadoApp.segmentosTemporales[i].largo = estadoApp.segmentosTemporales[i].alturaAcumulada;
            } else {
                estadoApp.segmentosTemporales[i].largo = parseFloat(
                    (estadoApp.segmentosTemporales[i].alturaAcumulada - 
                     estadoApp.segmentosTemporales[i - 1].alturaAcumulada).toFixed(2)
                );
            }
        }
        
        actualizarListaSegmentos();
        mostrarMensaje('Segmento actualizado', 'success');
    }
}

function toggleLotesGuardados() {
    const listaLotes = document.getElementById('lotesGuardados');
    
    if (listaLotes.style.display === 'none') {
        mostrarLotesGuardados();
        listaLotes.style.display = 'block';
    } else {
        listaLotes.style.display = 'none';
    }
}

function mostrarLotesGuardados() {
    const listaLotes = document.getElementById('lotesGuardados');
    
    if (estadoApp.lotesGuardados.length === 0) {
        listaLotes.innerHTML = '<p class="empty-message">No hay lotes guardados</p>';
        return;
    }
    
    listaLotes.innerHTML = '<h3>Lotes Guardados:</h3>' + 
        estadoApp.lotesGuardados.map((lote, index) => `
            <div class="lote-item" onclick="cargarLote(${index})">
                <div>
                    <strong>${lote.nombre}</strong>
                    <br>
                    <small>Árboles: ${obtenerTotalArboles(lote.mediciones)} | 
                    Fecha: ${new Date(lote.fecha).toLocaleDateString()}</small>
                </div>
                <button class="btn-delete" onclick="event.stopPropagation(); eliminarLoteGuardado(${index})">×</button>
            </div>
        `).join('');
}

function cargarLote(index) {
    const lote = estadoApp.lotesGuardados[index];
    
    estadoApp.loteActual = lote.nombre;
    estadoApp.medicionesGuardadas = lote.mediciones || [];
    estadoApp.arbolActual = obtenerSiguienteArbol();
    estadoApp.tipoActual = 'India';
    estadoApp.segmentosTemporales = [];
    
    document.getElementById('lote').value = lote.nombre;
    document.getElementById('numeroArbol').value = estadoApp.arbolActual;
    document.getElementById('tipoMedicion').value = 'India';
    document.getElementById('lotesGuardados').style.display = 'none';
    
    actualizarVista();
    mostrarMensaje(`Lote "${lote.nombre}" cargado`, 'success');
}

function guardarLote() {
    if (!estadoApp.loteActual) {
        mostrarMensaje('No hay lote activo', 'error');
        return;
    }
    
    const indexExistente = estadoApp.lotesGuardados
        .findIndex(l => l.nombre === estadoApp.loteActual);
    
    const loteData = {
        nombre: estadoApp.loteActual,
        mediciones: [...estadoApp.medicionesGuardadas],
        fecha: new Date().toISOString()
    };
    
    if (indexExistente >= 0) {
        estadoApp.lotesGuardados[indexExistente] = loteData;
        mostrarMensaje(`Lote "${estadoApp.loteActual}" actualizado`, 'success');
    } else {
        estadoApp.lotesGuardados.push(loteData);
        mostrarMensaje(`Lote "${estadoApp.loteActual}" guardado`, 'success');
    }
    
    guardarEstado();
}

function exportarCSV() {
    if (estadoApp.medicionesGuardadas.length === 0) {
        mostrarMensaje('No hay mediciones para exportar', 'error');
        return;
    }
    
    // Ordenar mediciones
    const medicionesOrdenadas = [...estadoApp.medicionesGuardadas].sort((a, b) => {
        if (a.arbol === b.arbol) {
            if (a.tipo === 'India' && b.tipo === '265') return -1;
            if (a.tipo === '265' && b.tipo === 'India') return 1;
        }
        return a.arbol - b.arbol;
    });
    
    let csv = 'Lote,Arbol,Tipo,Segmento,Altura_Acumulada_m,Largo_Segmento_m,Metodo_Captura,Distancia_m,Altura_Total_m\n';
    
    medicionesOrdenadas.forEach(medicion => {
        medicion.segmentos.forEach(segmento => {
            csv += `${estadoApp.loteActual},${medicion.arbol},${medicion.tipo},${segmento.numero},`;
            csv += `${segmento.alturaAcumulada.toFixed(2)},${segmento.largo.toFixed(2)},`;
            csv += `${segmento.metodo || 'manual'},${segmento.distancia || medicion.distancia},${medicion.alturaTotal}\n`;
        });
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const fecha = new Date().toISOString().split('T')[0];
    const filename = `alturas_camara_${estadoApp.loteActual}_${fecha}.csv`;
    
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    
    mostrarMensaje('CSV del lote actual exportado', 'success');
}

function exportarTodoCSV() {
    const hayDatosActuales = estadoApp.medicionesGuardadas.length > 0;
    const hayLotesGuardados = estadoApp.lotesGuardados.length > 0;
    
    if (!hayDatosActuales && !hayLotesGuardados) {
        mostrarMensaje('No hay datos para exportar', 'error');
        return;
    }
    
    let csv = 'Lote,Arbol,Tipo,Segmento,Altura_Acumulada_m,Largo_Segmento_m,Metodo_Captura,Distancia_m,Altura_Total_m,Fecha_Medicion\n';
    
    let totalArboles = 0;
    let totalLotes = 0;
    
    // Exportar lotes guardados
    estadoApp.lotesGuardados.forEach(lote => {
        const fecha = lote.fecha ? new Date(lote.fecha).toLocaleDateString() : '';
        
        const medicionesOrdenadas = [...lote.mediciones].sort((a, b) => {
            if (a.arbol === b.arbol) {
                if (a.tipo === 'India' && b.tipo === '265') return -1;
                if (a.tipo === '265' && b.tipo === 'India') return 1;
            }
            return a.arbol - b.arbol;
        });
        
        medicionesOrdenadas.forEach(medicion => {
            medicion.segmentos.forEach(segmento => {
                csv += `${lote.nombre},${medicion.arbol},${medicion.tipo},${segmento.numero},`;
                csv += `${segmento.alturaAcumulada.toFixed(2)},${segmento.largo.toFixed(2)},`;
                csv += `${segmento.metodo || 'manual'},${segmento.distancia || medicion.distancia},`;
                csv += `${medicion.alturaTotal},${fecha}\n`;
            });
        });
        totalLotes++;
        totalArboles += obtenerTotalArboles(lote.mediciones);
    });
    
    // Agregar lote actual
    if (hayDatosActuales && estadoApp.loteActual) {
        const fechaActual = new Date().toLocaleDateString();
        
        const medicionesOrdenadas = [...estadoApp.medicionesGuardadas].sort((a, b) => {
            if (a.arbol === b.arbol) {
                if (a.tipo === 'India' && b.tipo === '265') return -1;
                if (a.tipo === '265' && b.tipo === 'India') return 1;
            }
            return a.arbol - b.arbol;
        });
        
        medicionesOrdenadas.forEach(medicion => {
            medicion.segmentos.forEach(segmento => {
                csv += `${estadoApp.loteActual},${medicion.arbol},${medicion.tipo},${segmento.numero},`;
                csv += `${segmento.alturaAcumulada.toFixed(2)},${segmento.largo.toFixed(2)},`;
                csv += `${segmento.metodo || 'manual'},${segmento.distancia || medicion.distancia},`;
                csv += `${medicion.alturaTotal},${fechaActual}\n`;
            });
        });
        totalLotes++;
        totalArboles += obtenerTotalArboles(estadoApp.medicionesGuardadas);
    }
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const fecha = new Date().toISOString().split('T')[0];
    const filename = `alturas_camara_TODOS_${fecha}.csv`;
    
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    
    mostrarMensaje(`CSV exportado: ${totalLotes} lotes, ${totalArboles} árboles`, 'success');
}

function limpiarTodo() {
    if (confirm('¿Está seguro de limpiar todos los datos?')) {
        estadoApp = {
            loteActual: '',
            arbolActual: 1,
            tipoActual: 'India',
            distanciaActual: 15,
            segmentosTemporales: [],
            medicionesGuardadas: [],
            lotesGuardados: estadoApp.lotesGuardados,
            modoMedicion: null,
            calibracionAngulo: 0,
            anguloActual: 0,
            alturaOjo: 1.6
        };
        
        document.getElementById('lote').value = '';
        document.getElementById('numeroArbol').value = '1';
        document.getElementById('tipoMedicion').value = 'India';
        document.getElementById('distancia').value = '15';
        document.getElementById('numeroSegmento').value = '1';
        document.getElementById('altura').value = '';
        
        actualizarVista();
        guardarEstado();
        mostrarMensaje('Datos limpiados', 'info');
    }
}

function guardarEstado() {
    localStorage.setItem('medicionAlturasCamara', JSON.stringify(estadoApp));
    
    const estado = document.getElementById('estadoGuardado');
    estado.textContent = '✓ Datos guardados';
    
    setTimeout(() => {
        estado.textContent = 'Guardado automático activo';
    }, 2000);
}

function cargarDatosGuardados() {
    const datosGuardados = localStorage.getItem('medicionAlturasCamara');
    
    if (datosGuardados) {
        const datosParseados = JSON.parse(datosGuardados);
        // Mantener valores por defecto para propiedades nuevas
        estadoApp = {
            ...estadoApp,
            ...datosParseados
        };
        
        document.getElementById('lote').value = estadoApp.loteActual || '';
        document.getElementById('numeroArbol').value = estadoApp.arbolActual || 1;
        document.getElementById('tipoMedicion').value = estadoApp.tipoActual || 'India';
        document.getElementById('distancia').value = estadoApp.distanciaActual || 15;
        
        actualizarVista();
    }
}

function actualizarEstado() {
    estadoApp.loteActual = document.getElementById('lote').value;
    guardarEstado();
}

function obtenerTotalArboles(mediciones) {
    const arboles = new Set(mediciones.map(m => m.arbol));
    return arboles.size;
}

function obtenerSiguienteArbol() {
    if (estadoApp.medicionesGuardadas.length === 0) return 1;
    
    const maxArbol = Math.max(...estadoApp.medicionesGuardadas.map(m => m.arbol));
    return maxArbol + 1;
}

function eliminarLoteGuardado(index) {
    if (confirm('¿Eliminar este lote guardado?')) {
        estadoApp.lotesGuardados.splice(index, 1);
        guardarEstado();
        mostrarLotesGuardados();
        mostrarMensaje('Lote eliminado', 'info');
    }
}

function mostrarMensaje(mensaje, tipo) {
    const msgDiv = document.createElement('div');
    msgDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 12px 24px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 2000;
        animation: slideIn 0.3s ease;
        max-width: 90%;
        text-align: center;
    `;
    
    switch(tipo) {
        case 'success':
            msgDiv.style.background = '#4caf50';
            break;
        case 'error':
            msgDiv.style.background = '#f44336';
            break;
        case 'warning':
            msgDiv.style.background = '#ff9800';
            break;
        case 'info':
            msgDiv.style.background = '#00bcd4';
            break;
    }
    
    msgDiv.textContent = mensaje;
    document.body.appendChild(msgDiv);
    
    const duracion = mensaje.length > 50 ? 4000 : 3000;
    
    setTimeout(() => {
        msgDiv.remove();
    }, duracion);
}