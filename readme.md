# 📷 Medición de Alturas con Cámara PWA v1.0

## 📋 Descripción
Aplicación web progresiva (PWA) profesional para medición de alturas forestales usando la cámara del dispositivo como **clinómetro digital**. Calcula alturas por trigonometría usando los sensores de orientación del dispositivo.

## ✨ Características Principales

### 🎯 Funcionalidades Core
- **📷 Medición con Cámara:** Usa la cámara y sensores como clinómetro digital
- **✏️ Entrada Manual:** Opción de ingresar alturas manualmente
- **📐 Cálculo Trigonométrico:** h = d × tan(θ) + altura del ojo
- **🎯 Calibración:** Establecer cero en la base del árbol
- **📏 Distancias Variables:** Selección de 10 a 20 metros
- **🌲 Dos Métodos:** India y 265
- **💾 Gestión de Lotes:** Crear, guardar y reabrir
- **📊 Exportación CSV:** Individual o global
- **🔄 100% Offline:** Funciona sin conexión
- **📱 PWA Instalable:** Como app nativa

## 📐 Sistema de Medición

### Principio de Funcionamiento
```
         /|
        / |
       /  | h (altura)
      /θ  |
     /    |
    /_____|
    d (distancia)
    
h = d × tan(θ) + altura_ojo
```

### Proceso de Medición
1. **Posicionarse** a distancia fija del árbol (10-20m)
2. **Calibrar** apuntando a la base (establecer 0°)
3. **Apuntar** a cada punto de medición
4. **Capturar** el segmento
5. **Repetir** hasta completar el árbol

## 📊 Estructura de Datos

```
Lote
├── Árbol 1
│   ├── Medición India
│   │   ├── Segmento 1: altura (método: cámara/manual)
│   │   ├── Segmento 2: altura (método: cámara/manual)
│   │   └── Segmento n: altura (método: cámara/manual)
│   └── Medición 265
│       └── Segmentos...
├── Árbol 2
│   └── ...
└── Árbol n
```

## 🔄 Flujo de Trabajo

### 1. Configuración Inicial
- Crear nuevo lote
- Establecer número de árbol
- Seleccionar distancia de medición

### 2. Medición con Cámara
- Click "📷 Medir con Cámara"
- Solicitar permisos (primera vez)
- Calibrar base del árbol (0°)
- Apuntar y capturar cada segmento
- El sistema calcula altura automáticamente

### 3. Medición Manual (alternativa)
- Click "✏️ Entrada Manual"
- Ingresar alturas acumuladas
- Sistema calcula largos

### 4. Guardado
- Guardar árbol/tipo/segmentos
- Cambio automático India → 265
- Siguiente árbol cuando complete ambos

## 📱 Instalación

### Requisitos
- Navegador moderno (Chrome, Edge, Safari)
- Dispositivo con cámara y giroscopio
- Permisos de cámara y sensores

### Pasos
1. Subir archivos a servidor web o GitHub Pages
2. Acceder desde navegador móvil
3. Menú → "Agregar a pantalla de inicio"

## 📁 Archivos Necesarios

```
medicion-alturas-camara-pwa/
├── index.html        # Estructura HTML
├── styles.css        # Estilos (verde teal)
├── app.js           # Lógica y sensores
├── manifest.json    # Configuración PWA
├── sw.js           # Service Worker
├── icon-192.png    # Icono pequeño (📷)
└── icon-512.png    # Icono grande (📷)
```

## 💾 Estructura del CSV Exportado

```csv
Lote,Arbol,Tipo,Segmento,Altura_Acumulada_m,Largo_Segmento_m,Metodo_Captura,Distancia_m,Altura_Total_m
Bosque Norte,1,India,1,3.26,3.26,camera,15,9.56
Bosque Norte,1,India,2,5.29,2.03,camera,15,9.56
Bosque Norte,1,India,3,9.56,4.27,manual,15,9.56
Bosque Norte,1,265,1,4.15,4.15,camera,15,11.25
```

### Columnas Adicionales vs App Manual:
- **Metodo_Captura:** `camera` o `manual`
- **Distancia_m:** Distancia de medición utilizada

## 🎯 Precisión y Calibración

### Factores de Precisión
- **Distancia exacta:** Crítico mantener distancia medida
- **Calibración correcta:** Base debe estar en 0°
- **Estabilidad:** Mantener dispositivo estable al capturar
- **Altura del ojo:** Ajustable en código (default 1.6m)

### Tips para Mayor Precisión
1. Usar trípode o apoyo si es posible
2. Calibrar con cuidado en la base
3. Verificar distancia con cinta métrica
4. Capturar con dispositivo estable
5. Verificar con medición manual ocasional

## ⚙️ Características Técnicas

### APIs Utilizadas
- **getUserMedia:** Acceso a cámara
- **DeviceOrientationEvent:** Sensores de orientación
- **Canvas API:** Overlay de medición
- **LocalStorage:** Guardado de datos
- **Service Worker:** Funcionamiento offline

### Compatibilidad
- ✅ Chrome Android (v80+)
- ✅ Samsung Internet
- ✅ Edge Mobile
- ✅ Safari iOS (requiere permisos)
- ⚠️ Firefox Android (limitado)

### Permisos Requeridos
- Cámara
- Sensores de movimiento (iOS 13+)
- Almacenamiento local

## 📊 Diferencias con Apps Hermanas

| Característica | Inventario DAP | Medición Manual | Medición Cámara |
|---------------|---------------|-----------------|-----------------|
| **Medición** | Diámetro | Alturas manual | Alturas con cámara |
| **Entrada** | Manual | Manual | Cámara + Manual |
| **Cálculo** | CAP | Largos | Trigonometría |
| **Color** | Verde 🌲 | Azul 📏 | Teal 📷 |
| **Sensores** | No | No | Sí |
| **Complejidad** | Simple | Media | Alta |

## 🛠️ Configuración Avanzada

### Ajustar Altura del Ojo
En `app.js`, modificar:
```javascript
alturaOjo: 1.6 // Cambiar según necesidad (metros)
```

### Calibración de Sensores
Algunos dispositivos requieren calibración adicional:
```javascript
// Ajustar factor de corrección si es necesario
estadoApp.anguloActual = angulo * FACTOR_CORRECCION;
```

### Límites de Distancia
Para agregar más opciones de distancia, editar el `<select>` en `index.html`

## 🔧 Solución de Problemas

### Cámara no funciona
- Verificar permisos en configuración del navegador
- Asegurar HTTPS (requerido para cámara)
- Probar en otro navegador

### Sensores no responden
- iOS: Habilitar "Motion & Orientation Access"
- Android: Verificar que el dispositivo tenga giroscopio
- Calibrar sensores del dispositivo

### Mediciones incorrectas
- Verificar distancia real con cinta métrica
- Re-calibrar en la base del árbol
- Mantener dispositivo más estable
- Verificar altura del ojo configurada

### No se instala como app
- Verificar HTTPS
- Limpiar caché del navegador
- Esperar que cargue completamente antes de instalar

## 📈 Casos de Uso

### Ideal para:
- Inventarios forestales profesionales
- Medición rápida de múltiples árboles
- Terrenos difíciles donde equipos tradicionales son complicados
- Educación y capacitación forestal
- Verificación cruzada con clinómetros tradicionales

### Ventajas sobre Métodos Tradicionales:
- Sin costo de equipos especializados
- Datos digitales inmediatos
- Cálculos automáticos
- Registro fotográfico posible
- Exportación directa a Excel

## 🚀 Actualizaciones Futuras

- [ ] Captura de foto con cada medición
- [ ] GPS automático por árbol
- [ ] Visualización 3D del árbol medido
- [ ] Calibración mejorada con acelerómetro
- [ ] Modo de medición continua
- [ ] Integración con mapas
- [ ] Cálculo de volumen de madera

## 🔒 Privacidad y Seguridad

- **Sin servidor:** Todos los datos locales
- **Sin tracking:** No se envía información
- **Cámara:** Solo durante medición activa
- **Exportación:** Control total del usuario

## 📝 Notas Importantes

1. **Precisión:** Comparable a clinómetros digitales comerciales (±0.5m en condiciones ideales)
2. **Batería:** El uso de cámara y sensores consume más batería
3. **Respaldo:** Exportar CSV regularmente como backup
4. **Capacitación:** Practicar calibración para mejores resultados

## 📱 Soporte

### Dispositivos Probados
- Samsung Galaxy S20+
- iPhone 12 Pro
- Xiaomi Redmi Note 9
- iPad Pro 2021

### Requisitos Mínimos
- Android 8.0+ o iOS 13+
- Cámara trasera
- Giroscopio
- 50MB almacenamiento libre

## 👨‍💻 Desarrollo

**Versión:** 1.0  
**Fecha:** Noviembre 2024  
**Stack:** HTML5, CSS3, JavaScript ES6, PWA  
**APIs:** MediaDevices, DeviceOrientation, Canvas

---

**Para soporte o sugerencias, mantener registro en el repositorio GitHub.**