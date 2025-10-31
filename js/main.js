// ==========================
// CONFIGURACIÓN FIREBASE
// ==========================
const CODIGO_ESTUDIANTE = "ALPHA2025";
const CODIGO_ADMIN = "ADMIN2025";

const firebaseConfig = {
  apiKey: "AIzaSyBC2UKajbQh3X1b7qGE0VwIfgx0qUFzkXM",
  authDomain: "formacion-grupos.firebaseapp.com",
  projectId: "formacion-grupos",
  storageBucket: "formacion-grupos.firebasestorage.app",
  messagingSenderId: "746940037408",
  appId: "1:746940037408:web:8aaaff3d4a09dc87bbff45"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ==========================
// VARIABLES GLOBALES
// ==========================
let mensajesCache = [];
// Al cargar el script, inicializamos tipoUsuario desde localStorage
let tipoUsuario = localStorage.getItem("tipoUsuario") || "invitado";

// ==========================
// FUNCIONES DE CHAT
// ==========================
async function guardarMensaje(nombre, mensaje) {
  return db.collection("mensajes").add({
    nombre,
    mensaje,
    tipoUsuario,
    fecha: firebase.firestore.FieldValue.serverTimestamp()
  });
}

function renderizarMensajes(filtro = "") {
  const lista = document.getElementById("listaMensajes");
  if (!lista) return;

  lista.innerHTML = "";
  const filtroLower = filtro.toLowerCase();

  mensajesCache.forEach(msg => {
    if (!(`${msg.nombre}: ${msg.mensaje}`.toLowerCase().includes(filtroLower))) return;

    const li = document.createElement("li");
    li.classList.add("mensaje-item");
    const fecha = msg.fecha ? msg.fecha.toDate().toLocaleString() : "(sin fecha)";
    li.innerHTML = `<strong>${msg.nombre}:</strong> ${msg.mensaje}<br><small>${fecha}</small>`;

    // Solo admin puede borrar mensajes individuales
    if (tipoUsuario === "admin") {
      const btnBorrar = document.createElement("button");
      btnBorrar.textContent = "🗑️";
      btnBorrar.classList.add("btn-borrar");
      btnBorrar.onclick = async () => {
        const confirm = await Swal.fire({
          icon: "warning",
          title: "¿Borrar mensaje?",
          text: "Esta acción no se puede deshacer.",
          showCancelButton: true,
          confirmButtonText: "Sí, borrar",
          cancelButtonText: "Cancelar",
          confirmButtonColor: "#d33"
        });
        if (confirm.isConfirmed) {
          await db.collection("mensajes").doc(msg.id).delete();
          Swal.fire({ icon: "success", title: "Mensaje eliminado", timer: 1500, showConfirmButton: false });
        }
      };
      li.appendChild(btnBorrar);
    }

    lista.appendChild(li);
  });
}

function mostrarMensajes() {
  const lista = document.getElementById("listaMensajes");
  if (!lista) return;

  // Se asegura de que las acciones de administración se muestren solo si es admin
  if (tipoUsuario === "admin") {
    const accionesAdmin = document.getElementById("accionesAdmin");
    if (accionesAdmin) accionesAdmin.style.display = "block";

    document.getElementById("btnBorrarTodos")?.addEventListener("click", async () => {
      const confirm = await Swal.fire({
        icon: "warning",
        title: "¿Borrar todos los mensajes?",
        text: "Esta acción eliminará TODOS los mensajes y no se puede deshacer.",
        showCancelButton: true,
        confirmButtonText: "Sí, borrar todo",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#d33"
      });

      if (confirm.isConfirmed) {
        const snapshot = await db.collection("mensajes").get();
        const batch = db.batch();
        snapshot.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        Swal.fire({ icon: "success", title: "Todos los mensajes eliminados", timer: 1500, showConfirmButton: false });
      }
    });
  }

  db.collection("mensajes")
    .orderBy("fecha", "asc")
    .onSnapshot(snapshot => {
      mensajesCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      renderizarMensajes(document.getElementById('busquedaMensajes')?.value || "");
    });
}

// ==========================
// FUNCIONES DE USUARIOS
// ==========================
function registrarUsuario(nombre) {
  if (!nombre || !tipoUsuario) return;
  const usuarioRef = db.collection("usuariosConectados").doc(nombre);
  usuarioRef.set({
    nombre,
    tipoUsuario,
    conectado: true,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });

  window.addEventListener("beforeunload", () => {
    usuarioRef.update({ conectado: false });
  });
}

// ==========================
// LOGIN
// ==========================
document.getElementById('btnIngresar')?.addEventListener('click', () => {
  const nombre = document.getElementById('nombre').value.trim();
  const codigo = document.getElementById('codigo').value.trim();

  const palabras = nombre.split(" ").filter(p => p.length > 0);
  if (palabras.length < 3 || !palabras.every(p => /^[A-Za-zÁÉÍÓÚáéíóúÑñ]{3,10}$/.test(p))) {
    Swal.fire({
      icon: 'warning',
      title: 'Nombre inválido',
      html: 'Debes usar al menos 3 palabras de 3-10 letras cada una.',
      confirmButtonColor: '#004080'
    });
    return;
  }

  // Determinar tipo de usuario
  if (codigo === CODIGO_ADMIN) tipoUsuario = "admin";
  else if (codigo === CODIGO_ESTUDIANTE) tipoUsuario = "invitado";
  else {
    Swal.fire({
      icon: 'error',
      title: 'Código incorrecto',
      text: 'Verifica con el profesor el código.',
      confirmButtonColor: '#004080'
    });
    return;
  }

  localStorage.setItem("nombreEstudiante", nombre);
  localStorage.setItem("tipoUsuario", tipoUsuario);

  Swal.fire({
    icon: 'success',
    title: `Bienvenido ${nombre}`,
    text: `Has ingresado como ${tipoUsuario}.`,
    confirmButtonColor: '#004080'
  }).then(() => window.location.href = "pagina-principal.html");
});

// ==========================
// BOTÓN SALIR
// ==========================
function activarBotonSalir() {
  document.getElementById("btnSalir")?.addEventListener("click", () => {
    Swal.fire({
      icon: "question",
      title: "¿Deseas salir?",
      showCancelButton: true,
      confirmButtonText: "Sí, salir",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#d33"
    }).then(result => {
      if (result.isConfirmed) {
        localStorage.removeItem("nombreEstudiante");
        localStorage.removeItem("tipoUsuario");
        window.location.href = "index.html";
      }
    });
  });
}

// ==========================
// FILTRO DE MENSAJES
// ==========================
document.getElementById('busquedaMensajes')?.addEventListener('input', e => {
  renderizarMensajes(e.target.value.toLowerCase());
});

// ==========================
// GENERACIÓN DE GRUPOS (EXCLUSIVA ADMIN)
// ==========================
async function generarGruposAleatorios() {
  // **VALIDACIÓN CLAVE:** Solo admin puede ejecutar la generación
  if (tipoUsuario !== "admin") {
    Swal.fire({
      icon: "error",
      title: "Acceso denegado",
      text: "Solo administradores pueden generar grupos.",
      confirmButtonColor: "#004080"
    });
    return;
  }

  const snapshot = await db.collection("usuariosConectados").get();
  const invitados = snapshot.docs
    .map(doc => doc.data())
    .filter(u => u.tipoUsuario === "invitado" && u.conectado)
    .map(u => u.nombre);

  if (invitados.length === 0) {
    Swal.fire({
      icon: "info",
      title: "No hay invitados conectados",
      text: "No hay participantes para formar grupos.",
      confirmButtonColor: "#004080"
    });
    return;
  }

  Swal.fire({
    title: "¿Número de personas por grupo?",
    input: "number",
    inputAttributes: { min: 1, step: 1 },
    inputPlaceholder: "Ej: 3",
    showCancelButton: true,
    confirmButtonText: "Generar",
    cancelButtonText: "Cancelar",
    preConfirm: num => (!num || num < 1) ? Swal.showValidationMessage("Número inválido") : parseInt(num)
  }).then(result => {
    if (!result.isConfirmed) return;

    const n = result.value;
    const shuffled = invitados.sort(() => Math.random() - 0.5);
    const nombresGrupos = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta"];
    const grupos = {};

    for (let i = 0, idx = 0; i < shuffled.length; i += n) {
      const nombreGrupo = nombresGrupos[idx] || `Grupo ${idx + 1}`;
      grupos[nombreGrupo] = shuffled.slice(i, i + n);
      idx++;
    }

    const listaModal = document.getElementById("listaGruposModal");
    listaModal.innerHTML = "";
    for (const [nombre, miembros] of Object.entries(grupos)) {
      const div = document.createElement("div");
      div.innerHTML = `<h3>${nombre}</h3><ul>${miembros.map(m => `<li>${m}</li>`).join("")}</ul>`;
      listaModal.appendChild(div);
    }

    Swal.fire({ icon: "success", title: "Grupos generados", timer: 1500, showConfirmButton: false });

    // Abre el modal para que el admin vea los grupos recién creados
    document.getElementById("modalGrupos").style.display = "flex";

  });
}

// ==========================
// FUNCIÓN PARA MOSTRAR GRUPOS (PARA TODOS)
// ==========================
function mostrarGrupos() {
  // Esta función solo se encarga de mostrar el modal con los resultados ya cargados
  const listaModal = document.getElementById("listaGruposModal");

  // Lógica para manejar el caso donde aún no hay grupos (si no se cargan de Firebase)
  if (!listaModal || listaModal.children.length === 0) {
    Swal.fire({
      icon: "info",
      title: "Grupos aún no disponibles",
      text: "El administrador debe generar los grupos primero.",
      confirmButtonColor: "#004080"
    });
    return;
  }

  // Si hay contenido (asumiendo que se cargará al iniciar o después de generar), muestra el modal
  document.getElementById("modalGrupos").style.display = "flex";
}


// ==========================
// MODAL DE GRUPOS
// ==========================
const modalGrupos = document.getElementById("modalGrupos");

// btnVerGrupos (Header) llama a mostrarGrupos() para que sea accesible para todos.
document.getElementById("btnVerGrupos")?.addEventListener("click", mostrarGrupos);


// btnGenerarGrupos (Chat) llama a generarGruposAleatorios() (solo admin pasa la validación interna).
document.getElementById("btnGenerarGrupos")?.addEventListener("click", generarGruposAleatorios);


document.querySelector(".close-modal")?.addEventListener("click", () => modalGrupos.style.display = "none");
window.addEventListener("click", e => { if (e.target === modalGrupos) modalGrupos.style.display = "none"; });

// ==========================
// INICIALIZACIÓN
// ==========================
document.addEventListener("DOMContentLoaded", () => {
  const nombre = localStorage.getItem("nombreEstudiante");
  const userType = localStorage.getItem("tipoUsuario");

  if (nombre && userType) {
    const nombreUsuario = document.getElementById("nombreUsuario");
    if (nombreUsuario) nombreUsuario.textContent = nombre;

    mostrarMensajes();
    activarBotonSalir();
    registrarUsuario(nombre);

    const form = document.getElementById("formMensaje");
    form?.addEventListener("submit", async e => {
      e.preventDefault();
      const mensaje = document.getElementById("mensaje").value.trim();
      if (!mensaje) return;
      await guardarMensaje(nombre, mensaje);
      document.getElementById("mensaje").value = "";
    });

    // 🛑 Lógica de Ocultamiento: Solo ocultamos btnGenerarGrupos para invitados
    const btnGenerarGrupos = document.getElementById("btnGenerarGrupos"); // Botón en el chat

    if (userType !== "admin") {

      // Ocultar SOLO btnGenerarGrupos (el que inicia el proceso)
      if (btnGenerarGrupos) {
        btnGenerarGrupos.classList.add("oculto-admin");
      }
    } else {
      // Si es admin, asegurar que los botones de generación estén visibles
      if (btnGenerarGrupos) {
        btnGenerarGrupos.classList.remove("oculto-admin");
        btnGenerarGrupos.style.display = "inline-block";
      }
    }
  }
});