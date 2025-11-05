// js/app.js
// Login + Perfil + Estado en tiempo real

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

// --- Configuración Firebase ---
const firebaseConfig = {
  apiKey: "AIzaSyDAGjyqp7JeH2PCjlm2k0ELhrZvkghJ-LU",
  authDomain: "regiosfilavirtual-4d464.firebaseapp.com",
  databaseURL: "https://regiosfilavirtual-4d464-default-rtdb.firebaseio.com",
  projectId: "regiosfilavirtual-4d464",
  storageBucket: "regiosfilavirtual-4d464.firebasestorage.app",
  messagingSenderId: "1062487827077",
  appId: "1:1062487827077:web:f1fca32d5caa1f741c3fec"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getDatabase(app);

// --- DOM helpers ---
const $ = id => document.getElementById(id);
const perfilModalEl = $('perfilModal');
const estadoPunto = $('estadoPunto');
const perfilNombre = $('perfilNombre');
const cerrarCuentaBtn = $('cerrarCuentaBtn');

// --- Crear loginModal si no existe ---
let loginModalEl = $('loginModal');
if (!loginModalEl) {
  document.body.insertAdjacentHTML('beforeend', `
  <div class="modal fade" id="loginModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content text-center p-4">
        <img src="images/cartel.png" alt="Regios" width="80" class="mb-2">
        <h5 class="fw-bold mb-1">Ingresá con Google</h5>
        <p class="text-muted mb-3">Necesitamos tu cuenta para anotarte y usar la fila en tiempo real.</p>
        <button id="btnGoogleLogin" class="btn btn-dark w-100">Iniciar sesión con Google</button>
      </div>
    </div>
  </div>`);
  loginModalEl = $('loginModal');
}

const loginModal = new bootstrap.Modal(loginModalEl, { backdrop: 'static', keyboard: false });
const perfilModal = perfilModalEl ? new bootstrap.Modal(perfilModalEl, { backdrop: 'static', keyboard: false }) : null;

const btnGoogleLogin = $('btnGoogleLogin');

// --- Login manual ---
if (btnGoogleLogin) {
  btnGoogleLogin.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      btnGoogleLogin.disabled = true;
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error('Error al iniciar sesión:', err);
      alert('Error al iniciar sesión. Revisa la consola.');
    } finally {
      btnGoogleLogin.disabled = false;
    }
  });
}

// --- Cerrar sesión ---
if (cerrarCuentaBtn) {
  cerrarCuentaBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await signOut(auth);
      try { perfilModal && perfilModal.hide(); } catch(e) {}
      setTimeout(() => { try { loginModal.show(); } catch(e) {} }, 300);
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
      alert('No se pudo cerrar sesión.');
    }
  });
}

// --- Auth State ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    try { loginModal.hide(); } catch(e) {}
    if (perfilNombre) perfilNombre.textContent = `Hola, ${user.displayName || user.email}`;
    try { perfilModal && perfilModal.show(); } catch(e) {}
  } else {
    try { perfilModal && perfilModal.hide(); } catch(e) {}
    try { loginModal.show(); } catch(e) {}
  }
});

// --- Estado Barbería en tiempo real ---
const estadoRef = ref(db, 'estadoBarberia/abierto');
onValue(estadoRef, (snap) => {
  const val = snap.exists() ? snap.val() : null;
  if (!estadoPunto) return;
  estadoPunto.classList.remove('abierto', 'cerrado');
  if (val === true) estadoPunto.classList.add('abierto');
  else if (val === false) estadoPunto.classList.add('cerrado');
});

export { auth, db, provider };

const btnMiTurno = document.getElementById('btnMiTurno');
const miTurnoModalEl = document.getElementById('miTurnoModal');
const miTurnoModal = miTurnoModalEl ? new bootstrap.Modal(miTurnoModalEl) : null;

if (btnMiTurno) {
  btnMiTurno.addEventListener('click', () => {
    const data = JSON.parse(sessionStorage.getItem('regios_turn') || 'null');

    if (!data) {
      alert('Todavía no te anotaste en ninguna fila.');
      return;
    }

    const info = `
      Barbero: <strong>${data.barberId}</strong><br>
      Fecha: ${data.date}
    `;
    document.getElementById('turnoInfo').innerHTML = info;
    document.getElementById('turnoCodigo').textContent = data.code;

    try { miTurnoModal.show(); } catch (e) {}
  });
}
// Escucha en tiempo real los beneficios del cliente
export function escucharBeneficios(codigoCliente) {
  const beneficiosRef = ref(db, `beneficios/${codigoCliente}`);
  onValue(beneficiosRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const cortes = data.cortes || 0;
      renderTarjeta(cortes);

      // Mostrar modal solo si se acaba de alcanzar un hito
      if (data.nuevoPremio) {
        if (cortes === 5) {
          modalTitulo.textContent = "🎉 ¡Felicitaciones!";
          modalTexto.textContent = "¡Lograste tu 5to corte y ganaste 50% de descuento!";
        } else if (cortes === 10) {
          modalTitulo.textContent = "🏆 ¡Cliente VIP!";
          modalTexto.textContent = "10 cortes completados. ¡Tu próximo corte es GRATIS!";
        } else {
          modalTitulo.textContent = "🔥 Seguís sumando estilo";
          modalTexto.textContent = `Ya llevás ${cortes} corte${cortes > 1 ? "s" : ""}. ¡Sos un Regio fiel!`;
        }
        modal.show();

        // Limpiar el flag para no repetir modal
        update(beneficiosRef, { nuevoPremio: false });
      }
    } else {
      renderTarjeta(0);
    }
  });
}