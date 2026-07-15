/*
  ==========================================================================
  LA PARLA WORKCAFÉ — Portal de Wifi — script.js
  ==========================================================================
  Este archivo tiene 5 partes:

    1. Parámetros del portal cautivo (lo que UniFi manda en la URL)
    2. Saludo dinámico según la hora        — PRD 5.1
    3. Navegación entre pantallas            — PRD 5.7
    4. Lógica de cada pantalla (formularios, validación de código)
    5. Puntos de integración pendientes      — marcados con TODO

  Nada de esto depende de un framework. Es JavaScript plano para que
  cualquiera lo pueda leer de arriba a abajo sin conocer una librería
  específica.
*/


/* ------------------------------------------------------------------
   0. CONFIGURACIÓN — URLs de los webhooks de n8n
   Reemplaza estas dos constantes con las Production URL reales una
   vez construyas los flujos "Coffee Pass — Validar código" y
   "Coffee Pass — Sesión guest" en n8n (instrucciones completas en
   n8n/SIGUIENTE-PASO-validacion.md, dentro del repositorio).

   Mientras estén vacías (''), el portal sigue funcionando en modo
   demo local (simulado), igual que hasta ahora — así nunca se rompe
   la demo mientras terminas de construir los webhooks reales.
   ------------------------------------------------------------------ */
const N8N_VALIDATE_CODE_URL = 'https://laparlaworkcafe.app.n8n.cloud/webhook/8d5ac6e3-e544-4435-a834-1f54a9af10f9';
const N8N_GUEST_SESSION_URL = 'https://laparlaworkcafe.app.n8n.cloud/webhook/e70badb2-f40a-4d7b-9252-5a62f91a156f';


/* ------------------------------------------------------------------
   1. PARÁMETROS DEL PORTAL CAUTIVO
   Cuando UniFi redirige a un dispositivo a este portal, agrega
   parámetros en la URL con información del dispositivo y del punto
   de acceso. Los nombres exactos dependen de cómo se configure el
   portal externo en UniFi Network — estos son los más comunes:

     ?id=<client_mac>&ap=<ap_mac>&t=<timestamp>&url=<url_original>&ssid=<ssid>

   Por ahora solo los leemos y los guardamos: la lógica real de
   autorización (avisarle a UniFi "autoriza este MAC") todavía no
   está conectada — eso es Sprint 6 (Integración), cuando llegue el
   Cloud Gateway Ultra. Ver PRD sección 6.4 y 6.6.
   ------------------------------------------------------------------ */
function getPortalParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    clientMac: params.get('id') || null,
    apMac: params.get('ap') || null,
    ssid: params.get('ssid') || null,
    originalUrl: params.get('url') || null,
  };
}
const portalParams = getPortalParams();
// console.log('Parámetros del portal cautivo:', portalParams);


/* ------------------------------------------------------------------
   2. SALUDO DINÁMICO — PRD 5.1
   ------------------------------------------------------------------ */
function setGreeting() {
  const hour = new Date().getHours();
  let text;
  if (hour < 12) {
    text = '☀️ Buenos días — Haz que las cosas sucedan';
  } else if (hour < 18) {
    text = '👋 Buenas tardes — Esperamos que estés teniendo una excelente jornada';
  } else {
    text = '🌙 Buenas noches — Gracias por elegir La Parla';
  }
  document.getElementById('greeting').textContent = text;
}
setGreeting();


/* ------------------------------------------------------------------
   3. NAVEGACIÓN ENTRE PANTALLAS
   Cada elemento con data-goto="nombreDePantalla" navega a esa
   pantalla al hacer clic. No hay que registrar cada botón a mano:
   basta con agregarle el atributo data-goto en el HTML.
   ------------------------------------------------------------------ */
function goToScreen(name) {
  document.querySelectorAll('.screen').forEach((el) => {
    el.classList.remove('screen--active');
  });
  const target = document.querySelector(`[data-screen="${name}"]`);
  if (!target) {
    console.error(`No existe una pantalla con data-screen="${name}"`);
    return;
  }
  target.classList.add('screen--active');

  // Reinicia las animaciones de entrada (si no se hace esto, solo
  // animan la primera vez que el navegador pinta el elemento).
  target.querySelectorAll('.card, .btn, .connected-icon').forEach((el) => {
    el.style.animation = 'none';
    void el.offsetWidth; // fuerza al navegador a "olvidar" la animación anterior
    el.style.animation = '';
  });
}

document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-goto]');
  if (trigger) {
    goToScreen(trigger.dataset.goto);
  }
});


/* ------------------------------------------------------------------
   4. LÓGICA DE CADA PANTALLA
   ------------------------------------------------------------------ */

/* --- Guest: formulario ---
   Si N8N_GUEST_SESSION_URL ya está configurada, llama al webhook real
   (que aplica el reset diario de 24h, PRD 6.6). Si no, simula
   localmente para que la demo siga funcionando. */
document.getElementById('guestFormEl').addEventListener('submit', (event) => {
  event.preventDefault();

  if (!N8N_GUEST_SESSION_URL) {
    showConnected('guest'); // modo demo, sin webhook configurado todavía
    return;
  }

  fetch(N8N_GUEST_SESSION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mac_address: portalParams.clientMac }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.valid) {
        showConnected('guest');
      } else {
        // Ya usó su hora gratis en las últimas 24h — PRD 5.8
        goToScreen('coffeePass');
      }
    })
    .catch((err) => {
      console.error('Error llamando al webhook de sesión guest:', err);
      showConnected('guest'); // fallback: no bloquear al usuario si n8n falla
    });
});

/* --- Conectado: dos variantes (guest / coffeePass) --- */
function showConnected(variant) {
  const badge = document.getElementById('connectedBadge');
  const simulateBtn = document.getElementById('simulateExpire');

  if (variant === 'guest') {
    badge.textContent = '58 min restantes';
    simulateBtn.hidden = false;
  } else {
    badge.textContent = 'Internet Premium — sin límite hoy';
    simulateBtn.hidden = true;
  }
  goToScreen('conectado');
}
document.getElementById('simulateExpire').addEventListener('click', () => {
  goToScreen('tiempoAgotado');
});

/* --- Ingreso de código ---
   Si N8N_VALIDATE_CODE_URL ya está configurada, llama al webhook real
   (que aplica el límite de 2 dispositivos, PRD 6.8). Si no, simula
   localmente para que la demo siga funcionando. */
document.getElementById('codeFormEl').addEventListener('submit', (event) => {
  event.preventDefault();
  const code = document.getElementById('codeInput').value.trim();

  if (!N8N_VALIDATE_CODE_URL) {
    // Modo demo: cualquier código de 4+ caracteres se considera válido
    if (code.length >= 4) {
      showConnected('coffeePass');
    } else {
      showError('invalido');
    }
    return;
  }

  fetch(N8N_VALIDATE_CODE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ voucher: code, mac_address: portalParams.clientMac }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.valid) {
        showConnected('coffeePass');
      } else {
        showError(data.reason); // 'invalido' | 'usado' | 'expirado' | 'limite_dispositivos'
      }
    })
    .catch((err) => {
      console.error('Error llamando al webhook de validación de código:', err);
      showError('invalido');
    });
});

/* --- Error: 4 variantes de mensaje, PRD 5.7 #7 (se agregó "limite_dispositivos" el 14 jul 2026, PRD 6.8) --- */
function showError(reason) {
  const messages = {
    invalido: 'Ese código no es válido',
    usado: 'Ese código ya fue usado',
    expirado: 'Ese código ya expiró',
    limite_dispositivos: 'Este código ya alcanzó el máximo de dispositivos',
  };
  document.getElementById('errorTitle').textContent = messages[reason] || messages.invalido;
  goToScreen('error');
}


/* ------------------------------------------------------------------
   5. RESUMEN DE INTEGRACIONES (actualizado 14 jul 2026)
   - Webhook de compra (Shopify → n8n → voucher → correo): CONSTRUIDO
     y probado, ver n8n/README.md en el repositorio.
   - Webhook de validación de código y de sesión guest: DISEÑADOS,
     con las instrucciones completas para construirlos en
     n8n/SIGUIENTE-PASO-validacion.md. Mientras N8N_VALIDATE_CODE_URL
     y N8N_GUEST_SESSION_URL (arriba del todo de este archivo) sigan
     vacías, el portal sigue funcionando en modo demo/simulado.
   - El Cloud Gateway Ultra (para que UniFi autorice dispositivos por
     API) sigue pendiente de compra — sin eso, ningún wifi real se
     autoriza todavía, aunque toda esta lógica ya esté lista.
   ------------------------------------------------------------------ */

// Pantalla inicial
goToScreen('landing');
