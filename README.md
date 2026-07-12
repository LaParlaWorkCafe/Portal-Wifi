# La Parla WorkCafé — Portal de Wifi

Portal cautivo inteligente para el wifi de La Parla WorkCafé (Torre 126).
Este es el código real del Sprint 5 ("Desarrollo con IA"), construido a
partir del prototipo del Sprint 4 y del sistema de diseño del Sprint 3.

Si eres alguien nuevo llegando a este proyecto: lee primero el **PRD**
(`PRD_La_Parla_Digital.docx`) y el documento de **pantallas**
(`Pantallas_La_Parla_Digital.docx`) — ahí está el porqué de cada decisión.
Este README explica el **cómo** del código.

---

## 1. Qué es esto, en una frase

Un sitio estático (HTML + CSS + JS, sin frameworks) con las 7 pantallas
del portal de wifi, que hoy funciona como demo navegable completa, y que
está preparado —pero todavía no conectado— a Shopify, n8n y UniFi.

## 2. Cómo correrlo en tu computador

No necesita instalar nada. Dos formas:

1. **La más simple**: doble clic en `index.html`, se abre en tu navegador.
2. **Recomendada para desarrollo**: si usas Cursor o VS Code, instala la
   extensión "Live Server" y dale clic derecho a `index.html` → "Open with
   Live Server". Así, cada vez que guardes un cambio, el navegador se
   actualiza solo.

## 3. Estructura de archivos

```
index.html   → Las 7 pantallas, ya escritas en HTML (no se generan por JS)
style.css    → Todo el sistema de diseño: colores, tipografía, layout, animaciones
script.js    → La lógica: qué pantalla se muestra, formularios, validación
README.md    → Este archivo
```

**Por qué el HTML no se genera dinámicamente** (a diferencia del
prototipo del Sprint 4): con las 7 pantallas ya escritas como
`<section class="screen">`, es mucho más fácil de leer, de inspeccionar
en el navegador (clic derecho → Inspeccionar) y de editar en Cursor sin
tener que buscar el texto dentro de un string de JavaScript.

## 4. Cómo funciona la navegación

Cada botón que debe cambiar de pantalla tiene un atributo
`data-goto="nombreDePantalla"` en el HTML:

```html
<button class="btn" data-goto="guestForm">Comenzar</button>
```

`script.js` escucha clics en toda la página y, si el elemento tiene
`data-goto`, cambia la pantalla activa. No hay que registrar cada botón
a mano — con poner el atributo alcanza.

Los nombres de pantalla (`landing`, `guestForm`, `conectado`,
`tiempoAgotado`, `codigo`, `coffeePass`, `error`) son los mismos en el
HTML (`data-screen="..."`) y coinciden con la tabla de pantallas del
PRD, sección 5.7.

## 5. Qué SÍ funciona hoy (sin conexión a nada externo)

- Navegar las 7 pantallas completas, en mobile y desktop (el layout se
  adapta solo, no hay una versión "desktop" separada — es CSS
  responsive real, con un solo punto de quiebre en 768px).
- El formulario de guest "conecta" (visualmente) y muestra el contador.
- El campo de código valida de forma local: cualquier código de 4 o más
  caracteres se acepta, cualquier cosa más corta manda a la pantalla de
  error. Esto es solo para poder probar el flujo completo — no es
  seguridad real.
- El saludo cambia según la hora del día real de tu computador.

## 6. Qué NO funciona todavía (Sprint 6 — Integración)

Nada de esto autoriza wifi real todavía. Faltan tres cosas, todas
marcadas con `TODO` dentro de `script.js`:

| Falta | Para qué sirve | Dónde conecta |
|---|---|---|
| Webhook de n8n para sesiones guest | Registrar qué MAC ya usó su hora gratis hoy (PRD 6.6) | `guestFormEl` submit |
| Webhook de n8n para validar códigos | Revisar si un código de Coffee Pass es válido, ya usado, o expirado (PRD 6.2) | `codeFormEl` submit |
| Cloud Gateway Ultra + API de UniFi | Autorizar el dispositivo (MAC) en la red real | Pendiente de compra, ver PRD 6.5 |

Cuando esos tres estén listos, hay que reemplazar los bloques comentados
con `fetch(...)` en `script.js` — ya están escritos como ejemplo, solo
falta la URL real del webhook.

## 7. Cómo publicarlo (cuando esté listo)

Este es el stack que se definió desde el inicio del proyecto:

1. Subir esta carpeta a un repositorio en **GitHub**.
2. Conectar ese repositorio a **Cloudflare Pages** (gratis, se conecta
   directo desde su panel — no requiere configuración de servidor).
3. Apuntar el subdominio `wifi.laparla.co` al proyecto de Cloudflare
   Pages (esto se hace una sola vez, desde donde esté administrado el
   DNS de laparla.co).
4. Cada vez que se suba un cambio a GitHub, Cloudflare vuelve a publicar
   la página automáticamente — no hay que hacer nada manual después del
   primer setup.
5. En UniFi, configurar el portal cautivo externo para que redirija a
   `https://wifi.laparla.co` (esto ya estaba anotado como pendiente en
   el PRD, sección 6.4 — depende del Cloud Gateway Ultra).

## 8. Cómo seguir editando esto con Cursor

Todo el copy (textos, precios, mensajes) está en `index.html`, escrito
tal cual se ve en pantalla — no hay que buscarlo en ningún otro lado.
Para pedirle a Cursor un cambio, se le puede indicar directamente en
español, por ejemplo:

> "En la pantalla de Conoce tu Coffee Pass, cambia el precio del Coffee
> Pass Plus a $130.000"

Y Cursor va a encontrar el lugar correcto en `index.html` porque el
texto ya está ahí, legible, sin estar escondido dentro de JavaScript.
