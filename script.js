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

/* --- Guest: formulario --- */
document.getElementById('guestFormEl').addEventListener('submit', (event) => {
  event.preventDefault();

  // TODO(integración n8n): en vez de navegar directo, aquí se debería
  // llamar al webhook que registra la sesión guest (tabla guest_sessions,
  // ver PRD 6.6) y pedirle a UniFi que autorice este MAC por 1 hora.
  // Ejemplo de la llamada real (comentada hasta que exista el endpoint):
  //
  // fetch('https://TU-INSTANCIA-N8N.com/webhook/guest-session', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ mac: portalParams.clientMac, sede: 'torre-126' }),
  // }).then(...)

  showConnected('guest');
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
   Validación real de ejemplo para la demo: cualquier código de 4+
   caracteres se considera válido. Esto se reemplaza en Sprint 6 por
   una llamada real a n8n que consulta la tabla de vouchers (PRD 6.2). */
document.getElementById('codeFormEl').addEventListener('submit', (event) => {
  event.preventDefault();
  const code = document.getElementById('codeInput').value.trim();

  // TODO(integración n8n): reemplazar esta validación local por:
  //
  // fetch(`https://TU-INSTANCIA-N8N.com/webhook/validate-code?code=${code}`)
  //   .then((res) => res.json())
  //   .then((data) => {
  //     if (data.valid) { showConnected('coffeePass'); }
  //     else { showError(data.reason); } // 'invalido' | 'usado' | 'expirado'
  //   });

  if (code.length >= 4) {
    showConnected('coffeePass');
  } else {
    showError('invalido');
  }
});

/* --- Error: 3 variantes de mensaje, PRD 5.7 #7 --- */
function showError(reason) {
  const messages = {
    invalido: 'Ese código no es válido',
    usado: 'Ese código ya fue usado',
    expirado: 'Ese código ya expiró',
  };
  document.getElementById('errorTitle').textContent = messages[reason] || messages.invalido;
  goToScreen('error');
}


/* ------------------------------------------------------------------
   5. RESUMEN DE INTEGRACIONES PENDIENTES (Sprint 6)
   Todo lo marcado con TODO arriba depende de que exista:
     - Un webhook de n8n para sesiones guest (registrar MAC + hora)
     - Un webhook de n8n para validar códigos de Coffee Pass
     - El Cloud Gateway Ultra, para que UniFi pueda autorizar
       dispositivos por API en vez de solo mostrar el portal
   Hasta entonces, este código funciona como demo navegable completa,
   pero no autoriza wifi real en ningún dispositivo.
   ------------------------------------------------------------------ */

// Pantalla inicial
goToScreen('landing');
