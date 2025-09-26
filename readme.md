# 🌲 App Medición de Alturas Forestal

Una **Progressive Web App (PWA)** para medir alturas de árboles usando la cámara del dispositivo móvil y sensores de orientación, con distancia horizontal fija.

![Version](https://img.shields.io/badge/version-1.0.0-green)
![PWA](https://img.shields.io/badge/PWA-Ready-blue)
![Mobile](https://img.shields.io/badge/Mobile-Optimized-orange)

## 🎯 Características

- **🎯 Mira de precisión** con retícula ajustable para apuntar exactamente
- **📱 PWA completa** - Instalable como app nativa
- **📏 Cálculo trigonométrico** de alturas basado en ángulos y distancia fija
- **⚡ Tiempo real** - Visualización de altura mientras apuntas
- **🎨 Feedback visual** - Animaciones y colores dinámicos
- **📊 Múltiples puntos** por árbol para mediciones detalladas
- **🔄 Funciona offline** - Service Worker incluido
- **📳 Vibración táctil** al capturar puntos

## 📋 Requisitos

- **Dispositivo móvil** con cámara trasera
- **Sensores de orientación** (giroscopio/acelerómetro)
- **Navegador moderno** (Chrome, Safari, Firefox)
- **HTTPS** requerido para acceso a cámara

## 🚀 Instalación Rápida en GitHub Pages

### 1. Crear Repositorio
```bash
# Crear nuevo repositorio en GitHub
# Nombre sugerido: medicion-alturas-forestal
```

### 2. Estructura de Archivos
Crear esta estructura en tu repositorio:

```
medicion-alturas-forestal/
├── index.html          # Página principal
├── styles.css          # Estilos CSS
├── script.js           # Lógica JavaScript
├── manifest.json       # Configuración PWA
├── sw.js              # Service Worker
├── README.md          # Este archivo
└── icons/             # Íconos de la app
    ├── icon-72.png
    ├── icon-96.png
    ├── icon-128.png
    ├── icon-144.png
    ├── icon-152.png
    ├── icon-192.png
    ├── icon-384.png
    └── icon-512.png
```

### 3. Activar GitHub Pages
1. Ve a **Settings** → **Pages**
2. Selecciona **Deploy from a branch**
3. Elige **main branch** → **/ (root)**
4. Guarda los cambios

### 4. Acceder a la App
- URL: `https://[tu-usuario].github.io/medicion-alturas-forestal`
- **Importante**: Abre desde el móvil para acceso a cámara y sensores

## 📱 Uso de la Aplicación

### Configuración Inicial
1. **Abrir la app** en el navegador móvil
2. **Permitir acceso** a cámara y sensores de orientación
3. **Configurar distancia** horizontal fija (por defecto 10m)

### Proceso de Medición
1. **Posicionarse** a la distancia configurada del árbol
2. **Presionar "Iniciar Medición"**
3. **Apuntar** con la mira (punto rojo) a la base del árbol
4. **Capturar punto base** (altura ≈ 0m)
5. **Apuntar** a diferentes alturas del tronco
6. **Capturar** cada punto de interés
7. **Observar** las alturas calculadas en tiempo real

### Controles de la Mira
- **Tamaño ajustable** con control deslizante
- **Cruz verde** para alineación general
- **Punto rojo central** para precisión máxima
- **Brillo dinámico** cuando está midiendo

## 🔧 Desarrollo Local

### Servidor Local
```bash
# Opción 1: Python
python -m http.server 8000

# Opción 2: Node.js
npx http-server

# Opción 3: Live Server (VS Code)
# Instalar extensión Live Server
```

### Testing en Móvil
```bash
# Obtener IP local
ipconfig getifaddr en0  # macOS
hostname -I            # Linux
ipconfig               # Windows

# Acceder desde móvil
https://[IP-LOCAL]:8000
```

## 🎨 Personalización

### Colores del Tema
En `styles.css`:
```css
:root {
    --primary-color: #2e7d32;    /* Verde principal */
    --secondary-color: #4caf50;  /* Verde secundario */
    --accent-color: #00ff88;     /* Verde acento */
    --background: #1e4620;       /* Fondo oscuro */
}
```

### Configuración de Medición
En `script.js`:
```javascript
// Distancia por defecto
let distance = 10; // metros

// Límites de ángulo
const MAX_ANGLE = 89;  // grados
const MIN_ANGLE = -89; // grados
```

## 📐 Fundamentos Matemáticos

### Cálculo de Altura
```
altura = distancia × tan(ángulo)

Donde:
- distancia = distancia horizontal al árbol (metros)
- ángulo = ángulo de elevación del dispositivo (grados)
- altura = altura del punto medido (metros)
```

### Precisión
- **Distancia óptima**: 10-20 metros
- **Ángulos recomendados**: -45° a +60°
- **Error típico**: ±5% con técnica correcta

## 🔒 Permisos Requeridos

### Cámara
```javascript
navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment' }
})
```

### Orientación (iOS 13+)
```javascript
DeviceOrientationEvent.requestPermission()
```

### Instalación PWA
```javascript
// Evento beforeinstallprompt manejado automáticamente
```

## 🐛 Resolución de Problemas

### Cámara no funciona
- ✅ Verificar permisos del navegador
- ✅ Usar HTTPS (requerido)
- ✅ Probar diferentes navegadores
- ✅ Reiniciar el navegador

### Sensores no responden
- ✅ Verificar orientación del dispositivo
- ✅ Calibrar brújula/giroscopio
- ✅ Habilitar sensores en configuración
- ✅ Probar en modo simulación (escritorio)

### Service Worker falla
- ✅ Verificar que `sw.js` esté en la raíz
- ✅ Comprobar HTTPS activo
- ✅ Limpiar cache del navegador
- ✅ Verificar consola de errores

## 📈 Mejoras Futuras

- [ ] **Exportación CSV** de mediciones
- [ ] **Notas por árbol** con geo-localización
- [ ] **Calibración automática** de sensores
- [ ] **Modo comparación** de árboles
- [ ] **Sincronización en la nube**
- [ ] **Análisis estadístico** de datos

## 🤝 Contribuir

1. **Fork** el repositorio
2. **Crear** rama de feature (`git checkout -b feature/nueva-funcionalidad`)
3. **Commit** cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. **Push** a la rama (`git push origin feature/nueva-funcionalidad`)
5. **Crear** Pull Request

## 📄 Licencia

MIT License - Ver archivo `LICENSE` para detalles

## 👨‍💻 Autor

Desarrollado para análisis de **big data en plantaciones forestales**

---

### 🚀 ¡Listo para usar!

Copia cada archivo, súbelo a GitHub y activa GitHub Pages. Tu app estará funcionando en minutos.

**URL final**: `https://[tu-usuario].github.io/[nombre-repo]`