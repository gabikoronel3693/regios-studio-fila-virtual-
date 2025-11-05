// js/fila.js
// Control de fila virtual y asignación de turnos

// --- Importaciones ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getDatabase, ref, onValue, set, get, update, remove
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

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
const db = getDatabase(app);
const auth = getAuth(app);

// --- Elementos del DOM ---
const btnGabiFila = document.getElementById('btnGabiFila');
const btnGabiCancel = document.getElementById('btnGabiCancel');
const spanFilaGabi = document.getElementById('fila-gabi');
const btnRollyFila = document.getElementById('btnRollyFila');
const btnRollyCancel = document.getElementById('btnRollyCancel');
const spanFilaRolly = document.getElementById('fila-rolly');

// --- Refs ---
const filaRef = barberId => ref(db, `fila/${barberId}`);
const userRef = uid => ref(db, `usuarios/${uid}`);

// --- Escuchar filas en tiempo real ---
function escucharFila(barberId, el) {
  onValue(filaRef(barberId), (snap) => {
    const data = snap.exists() ? snap.val() : {};
    el.textContent = Object.keys(data).length;
  });
}

escucharFila('gabi', spanFilaGabi);
escucharFila('rolly', spanFilaRolly);

// --- Anotarse ---
async function anotarse(barberId) {
  const user = auth.currentUser;
  if (!user) {
    alert('Debés iniciar sesión para anotarte.');
    return;
  }

  const uid = user.uid;
  const entryRef = ref(db, `fila/${barberId}/${uid}`);
  const code = `${uid.slice(0, 4).toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`;

  try {
    await set(entryRef, {
      uid,
      nombre: user.displayName || 'Cliente',
      email: user.email || '',
      code,
      ts: Date.now()
    });

    escucharBeneficios(code);

    // Crear modal si no existe
    if (!document.getElementById('turnoModal')) {
      document.body.insertAdjacentHTML('beforeend', `
        <div class="modal fade" id="turnoModal" tabindex="-1" aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content text-center p-4">
              <img src="images/cartel.png" alt="Regios" width="80" class="mb-2">
              <h5 class="fw-bold mb-1">¡Turno confirmado!</h5>
              <p class="text-muted">Tu código es: <strong id="turnoCode"></strong></p>
              <button class="btn btn-dark w-100 mt-2" data-bs-dismiss="modal">Aceptar</button>
            </div>
          </div>
        </div>`);
    }

    const codeEl = document.getElementById('turnoCode');
    const turnoModal = new bootstrap.Modal(document.getElementById('turnoModal'));
    codeEl.textContent = code;
    turnoModal.show();

  } catch (err) {
    console.error('Error al anotarse:', err);
    alert('No se pudo guardar el turno. Verificá las reglas.');
  }
}

// --- Cancelar turno ---
async function cancelarTurno(barberId) {
  const user = auth.currentUser;
  if (!user) return alert('Debés iniciar sesión.');
  try {
    await remove(ref(db, `fila/${barberId}/${user.uid}`));
    alert('Turno cancelado.');
  } catch (err) {
    console.error('Error al cancelar turno:', err);
  }
}

// --- Sistema de beneficios ---
const modalBeneficioHTML = `
  <div class="modal fade" id="modalBeneficio" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content text-center p-4">
        <h5 id="modalBeneficioLabel" class="fw-bold mb-2"></h5>
        <p id="modalBeneficioTexto" class="text-muted"></p>
        <button class="btn btn-dark w-100 mt-2" data-bs-dismiss="modal">Cerrar</button>
      </div>
    </div>
  </div>
`;
if (!document.getElementById('modalBeneficio')) document.body.insertAdjacentHTML('beforeend', modalBeneficioHTML);

const modal = new bootstrap.Modal(document.getElementById('modalBeneficio'));
const modalTitulo = document.getElementById('modalBeneficioLabel');
const modalTexto = document.getElementById('modalBeneficioTexto');
const tarjetaCliente = document.getElementById('tarjetaCliente');

function renderTarjeta(cortes) {
  if (!tarjetaCliente) return;
  tarjetaCliente.innerHTML = '';
  for (let i = 1; i <= 10; i++) {
    const div = document.createElement('div');
    div.classList.add('beneficio');
    div.textContent = 'RS';
    if (i <= cortes) div.classList.add('activo');
    tarjetaCliente.appendChild(div);
  }
}

function escucharBeneficios(codigoCliente) {
  const beneficiosRef = ref(db, `beneficios/${codigoCliente}`);
  onValue(beneficiosRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const cortes = data.cortes || 0;
      renderTarjeta(cortes);

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
        update(beneficiosRef, { nuevoPremio: false });
      }
    } else {
      renderTarjeta(0);
    }
  });
}

// --- Eventos ---
btnGabiFila?.addEventListener('click', () => anotarse('gabi'));
btnGabiCancel?.addEventListener('click', () => cancelarTurno('gabi'));
btnRollyFila?.addEventListener('click', () => anotarse('rolly'));
btnRollyCancel?.addEventListener('click', () => cancelarTurno('rolly'));
