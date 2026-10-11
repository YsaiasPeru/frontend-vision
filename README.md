# ♻️ EcoSort Vision — Frontend (React)

Aplicación **mobile-first** para clasificar residuos con IA real: apuntas la cámara del celular a un objeto y ves en qué tacho va, con consejo educativo y eco-puntos.

## Stack

- **React 19 + Vite** — desarrollo rápido, build ligero.
- **react-webcam** — acceso a la cámara trasera nativa.
- **PWA** — instalable en el celular (manifest + meta móvil).

## Funcionalidades

- 📷 **Cámara en vivo** con marco de encuadre y luz láser de guía.
- 🎯 **3 capturas** por escaneo (el backend promedia las confianzas para ser más robusto). Se muestran como miniaturas durante el análisis.
- 💡 **Resultado honesto**: tacho con color, nombre, confianza, consejo educativo y ejemplos. Si la IA duda, muestra alternativas en vez de decretar.
- 📚 **Guía** de los 9 tipos de residuo.
- 🕘 **Historial** de lo que separaste bien.
- 🏆 **Ranking** de eco-héroes.
- 🤔 **Botón "¿Está mal?"** para reportar una clasificación incorrecta.
- 📷 **Guía de primer uso** "cómo escanear bien" (solo aparece una vez).

## Seguridad

La identidad del dispositivo (`user_id` + `secret`) se genera en el navegador al montar la app. El `secret` se envía con cada escaneo y en la cabecera `X-User-Secret` del historial; el backend solo guarda su hash. Así se evita que alguien lea el historial de otro usuario (IDOR).

## Correr en local

```powershell
cd frontend-vision
npm install
npm run dev
# -> http://localhost:5173
```

En desarrollo, Vite proxya `/api` al backend de Rust en `:8080` (ver `vite.config.js`).

## Build de producción

```powershell
npm run build      # genera dist/
npm run preview    # previsualizar el build
```

## Conectar a un backend desplegado

En producción, cambia `API_BASE` en `src/api.js` a la URL pública de tu backend:

```js
export const API_BASE = import.meta.env.DEV ? '' : 'https://tu-backend.fly.dev';
```

> El backend correspondiente está en [YsaiasPeru/backend-vision](https://github.com/YsaiasPeru/backend-vision).

## Notas de implementación

- Las reglas de tacho (color, nombre, tip, puntos) vienen de la API — el frontend no tiene datos de reciclaje hardcodeados.
- Los puntos se guardan en el servidor; el `localStorage` solo cachea el último total para mostrarlo al instante.
