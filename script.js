// Variables globales
let distance = 10; // Distancia horizontal en metros
let measurements = [];
let treeNumber = 1;
let measuring = false;
let orientationPermissionGranted = false;

// Referencias a elementos de interfaz
const statusIndicator = document.getElementById('statusIndicator');
const distanceInput = document.getElementById('distanceInput');
const currentDistance = document.getElementById('currentDistance');
const angleDisplay = document.getElementById('angleDisplay');

// Inicialización cuando el DOM está listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('App inicializada');
    
    // Registrar Service Worker
    registerServiceWorker();
    
    // Configurar eventos
    setupEventListeners();
});

// Registrar Service Worker
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(registration => {
                    console.log('SW registrado exitosamente:', registration);
                })
                .catch(error => {
                    console.error('Error al registrar SW:', error);
                });
        });
    }
}

// Configurar event listeners
function setupEventListeners() {
    // Actualizar distancia cuando cambia el input
    distanceInput.addEventListener('input', function() {
        distance = parseFloat(this.value) || 10;
        currentDistance.textContent = distance;
    });

    // Prevenir zoom en iOS
    document.addEventListener('gesturestart', function(e) {
        e.preventDefault();
    });

    // Manejar orientación de pantalla
    window.addEventListener('orientationchange', function() {
        setTimeout(() => {
            if (window.screen && window.screen.orientation) {
                console.log('Orientación:', window.screen.orientation.angle);
            }
        }, 500);
    });
}

// Ajustar tamaño de la mira
function adjustCrosshairSize(size) {
    const crosshair = document.getElementById('crosshair');
    if (crosshair) {
        crosshair.style.width = size + 'px';
        crosshair.style.height = size + 'px';
    }
}

// Configurar sensor de orientación
function setupOrientationSensor() {
    // Verificar si DeviceOrientationEvent está disponible
    if (!window.DeviceOrientationEvent) {
        console.warn('DeviceOrientationEvent no disponible');
        return false;
    }

    // iOS 13+ requiere permiso explícito
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(response => {
                if (response === 'granted') {
                    console.log('Permiso de orientación concedido');
                    orientationPermissionGranted = true;
                    startOrientationListening();
                } else {
                    console.warn('Permiso de orientación denegado');
                    // Usar valores simulados para testing
                    simulateOrientation();
                }
            })
            .catch(error => {
                console.error('Error solicitando permiso:', error);
                simulateOrientation();
            });
    } else {
        // Android y navegadores más antiguos
        console.log('Iniciando sensor de orientación directo');
        orientationPermissionGranted = true;
        startOrientationListening();
    }

    return true;
}

// Iniciar escucha de orientación
function startOrientationListening() {
    window.addEventListener('deviceorientation', handleOrientationChange);
    console.log('Sensor de orientación iniciado');
}

// Manejar cambios de orientación
function handleOrientationChange(event) {
    // Calcular ángulo: beta es la inclinación hacia adelante/atrás
    let angle = 0;
    
    if (event.beta !== null) {
        // Ajustar el ángulo basado en la orientación del dispositivo
        angle = Math.round(event.beta - 90);
        
        // Limitar el rango de ángulos razonables
        angle = Math.max(-89, Math.min(89, angle));
    }
    
    // Actualizar display del ángulo
    if (angleDisplay) {
        angleDisplay.textContent = angle + '°';
    }
    
    // Actualizar altura en tiempo real
    updateLiveHeight(angle);
    
    // Cambiar color del indicador según el ángulo
    updateHeightIndicatorColor(angle);
}

// Actualizar altura en tiempo real
function updateLiveHeight(angle) {
    const height = calculateHeight(angle);
    const liveHeightElement = document.getElementById('liveHeight');
    
    if (liveHeightElement) {
        liveHeightElement.textContent = height.toFixed(2);
    }
}

// Actualizar color del indicador de altura
function updateHeightIndicatorColor(angle) {
    const liveHeightIndicator = document.getElementById('liveHeightIndicator');
    
    if (liveHeightIndicator) {
        if (angle > 2) {
            liveHeightIndicator.style.color = '#00ff00'; // Verde para alturas positivas
        } else if (angle < -2) {
            liveHeightIndicator.style.color = '#ffaa00'; // Naranja para ángulos negativos
        } else {
            liveHeightIndicator.style.color = '#ffffff'; // Blanco para nivel
        }
    }
}

// Simular orientación para testing en escritorio
function simulateOrientation() {
    console.log('Modo simulación activado');
    let simulatedAngle = 0;
    
    setInterval(() => {
        // Simular pequeñas variaciones de ángulo
        simulatedAngle += (Math.random() - 0.5) * 2;
        simulatedAngle = Math.max(-45, Math.min(45, simulatedAngle));
        
        if (angleDisplay) {
            angleDisplay.textContent = Math.round(simulatedAngle) + '°';
        }
        
        updateLiveHeight(simulatedAngle);
        updateHeightIndicatorColor(simulatedAngle);
    }, 100);
}

// Cálculo de altura usando trigonometría
function calculateHeight(angleInDegrees) {
    const angleInRadians = angleInDegrees * (Math.PI / 180);
    return distance * Math.tan(angleInRadians);
}

// Iniciar medición
function startMeasurement() {
    measuring = true;
    measurements = [];
    updateMeasurementsList();
    
    // Actualizar UI
    document.getElementById('pointCount').textContent = '0';
    statusIndicator.textContent = 'Midiendo';
    statusIndicator.style.color = '#00ff00';
    
    // Efecto visual en la mira
    const crosshair = document.getElementById('crosshair');
    if (crosshair) {
        crosshair.style.filter = 'drop-shadow(0 0 8px rgba(0, 255, 0, 0.8))';
    }
    
    console.log('Medición iniciada');
}

// Nueva medición (nuevo árbol)
function newTree() {
    if (measurements.length > 0) {
        if (!confirm('¿Desea iniciar una nueva medición? Se perderán los datos actuales.')) {
            return;
        }
    }
    
    // Reset variables
    measuring = false;
    measurements = [];
    treeNumber++;
    
    // Actualizar UI
    document.getElementById('treeCount').textContent = treeNumber;
    document.getElementById('pointCount').textContent = '0';
    updateMeasurementsList();
    statusIndicator.textContent = 'Listo';
    statusIndicator.style.color = '#ffffff';
    
    // Quitar efecto visual de la mira
    const crosshair = document.getElementById('crosshair');
    if (crosshair) {
        crosshair.style.filter = 'none';
    }
    
    console.log('Nueva medición iniciada - Árbol #' + treeNumber);
}

// Capturar punto de medición
function capturePoint() {
    if (!measuring) {
        alert('Primero presione "Iniciar Medición"');
        return;
    }

    // Obtener ángulo actual
    const angleText = angleDisplay.textContent;
    const angle = parseFloat(angleText.replace('°', ''));
    const height = calculateHeight(angle);

    // Animación visual de captura
    const crosshairCenter = document.getElementById('crosshair-center');
    if (crosshairCenter) {
        crosshairCenter.classList.add('capture-animation');
        setTimeout(() => {
            crosshairCenter.classList.remove('capture-animation');
        }, 300);
    }

    // Vibración táctil si está disponible
    if ('vibrate' in navigator) {
        navigator.vibrate(50);
    }

    // Agregar medición
    const measurement = {
        point: measurements.length + 1,
        angle: angle,
        height: height.toFixed(2),
        distance: distance,
        timestamp: new Date().toLocaleTimeString()
    };

    measurements.push(measurement);

    // Actualizar UI
    document.getElementById('pointCount').textContent = measurements.length;
    updateMeasurementsList();
    
    console.log('Punto capturado:', measurement);
}

// Actualizar lista de mediciones
function updateMeasurementsList() {
    const listElement = document.getElementById('measurementsList');
    
    if (!listElement) return;
    
    if (measurements.length === 0) {
        listElement.innerHTML = '<div style="padding: 15px; text-align: center; opacity: 0.7; font-style: italic;">No hay mediciones</div>';
        return;
    }

    let html = '';
    measurements.forEach((measurement, index) => {
        const heightColor = parseFloat(measurement.height) >= 0 ? '#00ff88' : '#ffaa44';
        html += `
            <div class="measurement-item">
                <div>
                    <strong>Punto ${measurement.point}</strong><br>
                    <small style="opacity: 0.7;">${measurement.angle}° • ${measurement.distance}m</small>
                </div>
                <div style="text-align: right;">
                    <span style="color: ${heightColor}; font-weight: bold; font-size: 15px;">
                        ${measurement.height} m
                    </span><br>
                    <small style="opacity: 0.6;">${measurement.timestamp}</small>
                </div>
            </div>
        `;
    });
    
    listElement.innerHTML = html;
    
    // Scroll al final de la lista
    listElement.scrollTop = listElement.scrollHeight;
}

// Solicitar acceso a la cámara
async function requestCamera() {
    try {
        console.log('Solicitando acceso a cámara...');
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'environment', // Cámara trasera
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
        });
        
        const video = document.getElementById('cameraView');
        if (video) {
            video.srcObject = stream;
            
            // Esperar a que el video esté listo
            video.addEventListener('loadedmetadata', () => {
                console.log('Video cargado, dimensiones:', video.videoWidth, 'x', video.videoHeight);
            });
        }
        
        // Mostrar interfaz de cámara
        document.getElementById('cameraContainer').style.display = 'block';
        document.getElementById('noCameraMode').style.display = 'none';
        
        // Configurar sensor de orientación
        setupOrientationSensor();
        
        console.log('Cámara iniciada exitosamente');
        return true;
        
    } catch (error) {
        console.error('Error accessing camera:', error);
        
        // Mostrar mensaje de error específico
        let errorMessage = 'Error al acceder a la cámara';
        if (error.name === 'NotAllowedError') {
            errorMessage = 'Permiso de cámara denegado. Por favor, habilite el acceso a la cámara.';
        } else if (error.name === 'NotFoundError') {
            errorMessage = 'No se encontró cámara en el dispositivo.';
        } else if (error.name === 'NotSupportedError') {
            errorMessage = 'Cámara no soportada en este navegador.';
        }
        
        // Mostrar modo sin cámara
        document.getElementById('cameraContainer').style.display = 'none';
        document.getElementById('noCameraMode').style.display = 'flex';
        document.querySelector('#noCameraMode p').textContent = errorMessage;
        
        return false;
    }
}

// Inicializar aplicación principal
async function initializeApp() {
    console.log('Inicializando aplicación...');
    
    // Ocultar pantalla de inicio
    document.getElementById('startupScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    
    // Solicitar cámara
    const cameraSuccess = await requestCamera();
    
    if (cameraSuccess) {
        // Inicializar lista de mediciones
        updateMeasurementsList();
        console.log('Aplicación inicializada correctamente');
    } else {
        console.warn('Aplicación iniciada sin cámara');
    }
}

// Exportar datos (función futura)
function exportMeasurements() {
    if (measurements.length === 0) {
        alert('No hay mediciones para exportar');
        return;
    }

    // Crear CSV
    let csv = 'Punto,Angulo,Altura(m),Distancia(m),Hora\n';
    measurements.forEach(m => {
        csv += `${m.point},${m.angle},${m.height},${m.distance},${m.timestamp}\n`;
    });

    // Descargar archivo
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mediciones_arbol_${treeNumber}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    console.log('Mediciones exportadas');
}

// Funciones de utilidad
function formatHeight(height) {
    const h = parseFloat(height);
    return h >= 0 ? `+${h.toFixed(2)}m` : `${h.toFixed(2)}m`;
}

// Debug: Log de orientación (solo en desarrollo)
function logOrientation(event) {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('Orientación:', {
            alpha: event.alpha, // Rotación Z
            beta: event.beta,   // Rotación X (inclinación)
            gamma: event.gamma  // Rotación Y
        });
    }
}