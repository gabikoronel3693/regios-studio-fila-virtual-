// js/barber.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getDatabase, ref, set, onValue, get } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

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
const provider = new GoogleAuthProvider();

// --- DOM ---
const btnAbrir = document.getElementById('btnAbrir');
const btnCerrar = document.getElementById('btnCerrar');
const estadoPunto = document.getElementById('estadoPunto');
const filaGabi = document.getElementById('filaGabi');
const filaRolly = document.getElementById('filaRolly');
const codigoInput = document.getElementById('codigoInput');
const verificarBtn = document.getElementById('verificarBtn');
const resultadoVerificacion = document.getElementById('resultadoVerificacion');

// --- Estado barbería realtime ---
const estadoRef = ref(db, "estadoBarberia/abierto");
onValue(estadoRef, (snap) => {
  const abierto = snap.val();
  estadoPunto.classList.remove("abierto", "cerrado");
  if (abierto === true) estadoPunto.classList.add("abierto");
  else if (abierto === false) estadoPunto.classList.add("cerrado");
});

// --- Login si hace falta ---
async function iniciarSesion() {
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    console.error("Error al iniciar sesión:", err);
  }
}

// --- Cambiar estado ---
async function abrirLocal() {
  try {
    await set(estadoRef, true);
  } catch (err) {
    alert("No tenés permisos. Revisá las reglas Firebase.");
  }
}
async function cerrarLocal() {
  try {
    await set(estadoRef, false);
  } catch (err) {
    alert("No tenés permisos. Revisá las reglas Firebase.");
  }
}
btnAbrir.addEventListener("click", abrirLocal);
btnCerrar.addEventListener("click", cerrarLocal);

// --- Mostrar filas realtime ---
function mostrarFila(barberId, contenedor) {
  const refFila = ref(db, `fila/${barberId}`);
  onValue(refFila, (snap) => {
    contenedor.innerHTML = "";
    if (!snap.exists()) {
      contenedor.innerHTML = `<p class="text-muted">Sin clientes en espera.</p>`;
      return;
    }
    const data = snap.val();
    Object.values(data).forEach((turno) => {
      const card = document.createElement('div');
      card.className = "tarjeta-turno";
      card.innerHTML = `
        <span class="rs">RS</span>
        <span>${turno.nombre || 'Cliente'}</span>
        <span class="codigo">${turno.code}</span>
      `;
      contenedor.appendChild(card);
    });
  });
}
mostrarFila("gabi", filaGabi);
mostrarFila("rolly", filaRolly);

// --- Verificación de código ---
verificarBtn.addEventListener("click", async () => {
  const codigo = codigoInput.value.trim().toUpperCase();
  if (!codigo) return;

  resultadoVerificacion.textContent = "Verificando...";
  resultadoVerificacion.style.color = "#555";

  const filaGabiSnap = await get(ref(db, "fila/gabi"));
  const filaRollySnap = await get(ref(db, "fila/rolly"));
  let encontrado = false;

  [filaGabiSnap, filaRollySnap].forEach((snap) => {
    if (snap.exists()) {
      const data = snap.val();
      Object.values(data).forEach((t) => {
        if (t.code && t.code.toUpperCase() === codigo) {
          encontrado = true;
        }
      });
    }
  });

  if (encontrado) {
    resultadoVerificacion.textContent = "✅ Código válido: cliente presente.";
    resultadoVerificacion.style.color = "#198754";
  } else {
    resultadoVerificacion.textContent = "❌ Código no encontrado.";
    resultadoVerificacion.style.color = "#dc3545";
  }

  codigoInput.value = "";
});
import { update, remove } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

// === Lógica de beneficios ===
const modal = new bootstrap.Modal(document.getElementById('modalBeneficio'));
const modalTitulo = document.getElementById('modalBeneficioLabel');
const modalTexto = document.getElementById('modalBeneficioTexto');
const tarjetaCliente = document.getElementById('tarjetaCliente');

function renderTarjeta(cortes) {
  tarjetaCliente.innerHTML = "";
  for (let i = 1; i <= 10; i++) {
    const div = document.createElement('div');
    div.classList.add('beneficio');
    div.textContent = "RS";
    if (i <= cortes) div.classList.add('activo');
    tarjetaCliente.appendChild(div);
  }
}

// Actualiza beneficios del cliente
async function registrarBeneficio(codigo, barber) {
  const refCliente = ref(db, `beneficios/${codigo}`);
  const snapshot = await get(refCliente);
  let cortes = 0;

  if (snapshot.exists()) {
    cortes = snapshot.val().cortes || 0;
  }

  cortes += 1;

  await set(refCliente, { cortes, barber, fecha: Date.now() });

  renderTarjeta(cortes);

  // Mostrar modal según cantidad de cortes
  if (cortes === 5) {
    modalTitulo.textContent = "🎉 ¡Felicitaciones!";
    modalTexto.textContent = "Lograste tu 5to corte: obtenés un 50% de descuento 💈🔥";
  } else if (cortes === 10) {
    modalTitulo.textContent = "💈 ¡Cliente VIP Regios!";
    modalTexto.textContent = "10 cortes completados: tu próximo corte es GRATIS 🏆";
  } else {
    modalTitulo.textContent = "🔥 ¡Qué facha!";
    modalTexto.textContent = `Ya llevás ${cortes} corte${cortes > 1 ? "s" : ""} con nosotros.`;
  }

  modal.show();
}

// Actualiza fila eliminando cliente verificado
async function eliminarTurno(codigo) {
  const filaGabiSnap = await get(ref(db, "fila/gabi"));
  const filaRollySnap = await get(ref(db, "fila/rolly"));

  const buscarYBorrar = async (snap, barber) => {
    if (!snap.exists()) return false;
    const data = snap.val();
    for (const key in data) {
      if (data[key].code === codigo) {
        await remove(ref(db, `fila/${barber}/${key}`));
        return barber;
      }
    }
    return false;
  };

  let barberEncontrado = await buscarYBorrar(filaGabiSnap, "gabi");
  if (!barberEncontrado) barberEncontrado = await buscarYBorrar(filaRollySnap, "rolly");

  return barberEncontrado;
}

// Modificamos el evento de verificación existente:
verificarBtn.addEventListener("click", async () => {
  const codigo = codigoInput.value.trim().toUpperCase();
  if (!codigo) return;

  resultadoVerificacion.textContent = "Verificando...";
  resultadoVerificacion.style.color = "#555";

  const filaGabiSnap = await get(ref(db, "fila/gabi"));
  const filaRollySnap = await get(ref(db, "fila/rolly"));
  let encontrado = false;
  let barberEncontrado = null;

  [filaGabiSnap, filaRollySnap].forEach((snap, i) => {
    if (snap.exists()) {
      const data = snap.val();
      Object.values(data).forEach((t) => {
        if (t.code && t.code.toUpperCase() === codigo) {
          encontrado = true;
          barberEncontrado = i === 0 ? "gabi" : "rolly";
        }
      });
    }
  });

  if (encontrado) {
    resultadoVerificacion.textContent = "✅ Código válido: cliente presente.";
    resultadoVerificacion.style.color = "#198754";

    const barber = await eliminarTurno(codigo);
    await registrarBeneficio(codigo, barber);
  } else {
    resultadoVerificacion.textContent = "❌ Código no encontrado.";
    resultadoVerificacion.style.color = "#dc3545";
  }

  codigoInput.value = "";
});
