// --- CONFIGURACIÓN DEL CÓDIGO DE ACCESO ---
const CODIGO_ESTUDIANTE = "ALPHA2025";
const CODIGO_ADMIN = "ADMIN2025";

// --- CONFIGURACIÓN DE FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyBC2UKajbQh3X1b7qGE0VwIfgx0qUFzkXM",
  authDomain: "formacion-grupos.firebaseapp.com",
  projectId: "formacion-grupos",
  storageBucket: "formacion-grupos.firebasestorage.app",
  messagingSenderId: "746940037408",
  appId: "1:746940037408:web:8aaaff3d4a09dc87bbff45"
};

// Inicializa Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- VARIABLES GLOBALES ---
let mensajesCache = [];
let tipoUsuario = localStorage.getItem("tipoUsuario") || "invitado";

// --- FUNCIONES DE CHAT ---
function guardarMensaje(nombre, mensaje) {
  return db.collection("mensajes").add({
    nombre: nombre,
    mensaje: mensaje,
    tipoUsuario: tipoUsuario, // 👈 se guarda el tipo (admin, estudiante o invitado)
    fecha: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// Renderizar mensajes con filtro
function renderizarMensajes(filtro = "") {
  const lista = document.getElementById("listaMensajes");
  if (!lista) return;

  lista.innerHTML = "";
  const filtroLower = filtro.toLowerCase();

  mensajesCache.forEach(msg => {
    const texto = `${msg.nombre}: ${msg.mensaje}`.toLowerCase();
    if (!texto.includes(filtroLower)) return;

    const li = document.createElement("li");
    li.classList.add("mensaje-item");

    const fecha = msg.fecha ? msg.fecha.toDate().toLocaleString() : "(sin fecha)";
    li.innerHTML = `<strong>${msg.nombre}:</strong> ${msg.mensaje}<br><small>${fecha}</small>`;

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
          Swal.fire({
            icon: "success",
            title: "Mensaje eliminado",
            timer: 1500,
            showConfirmButton: false
          });
        }
      };
      li.appendChild(btnBorrar);
    }

    lista.appendChild(li);
  });
}

// Escuchar mensajes en tiempo real
function mostrarMensajes() {
  const lista = document.getElementById("listaMensajes");
  if (!lista) return;

  // Mostrar sección admin
  if (tipoUsuario === "admin") {
    const accionesAdmin = document.getElementById("accionesAdmin");
    if (accionesAdmin) accionesAdmin.style.display = "block";

    const btnBorrarTodos = document.getElementById("btnBorrarTodos");
    btnBorrarTodos?.addEventListener("click", async () => {
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

        Swal.fire({
          icon: "success",
          title: "Todos los mensajes han sido eliminados",
          timer: 1500,
          showConfirmButton: false
        });
      }
    });
  }

  db.collection("mensajes")
    .orderBy("fecha", "asc")
    .onSnapshot(snapshot => {
      mensajesCache = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      const filtroActual = document.getElementById('busquedaMensajes')?.value || "";
      renderizarMensajes(filtroActual);
    });
}

// --- BOTÓN SALIR ---
function activarBotonSalir() {
  const btnSalir = document.getElementById("btnSalir");
  btnSalir?.addEventListener("click", () => {
    Swal.fire({
      icon: "question",
      title: "¿Deseas salir?",
      showCancelButton: true,
      confirmButtonText: "Sí, salir",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#d33"
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem("nombreEstudiante");
        localStorage.removeItem("tipoUsuario");
        window.location.href = "index.html";
      }
    });
  });
}

// --- BOTÓN INGRESAR ---
document.getElementById('btnIngresar')?.addEventListener('click', () => {
  const nombre = document.getElementById('nombre').value.trim();
  const codigo = document.getElementById('codigo').value.trim();

  const palabras = nombre.split(" ").filter(p => p.length > 0);
  const nombreValido = palabras.length >= 3 && palabras.every(p => /^[A-Za-zÁÉÍÓÚáéíóúÑñ]{3,10}$/.test(p));

  if (!nombreValido) {
    Swal.fire({
      icon: 'warning',
      title: 'Nombre inválido',
      html: 'El nombre debe tener al menos 3 palabras, cada palabra entre 3 y 10 letras,<br>solo letras, sin números ni caracteres especiales.',
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#004080'
    });
    return;
  }

  tipoUsuario = "invitado";
  if (codigo === CODIGO_ADMIN) tipoUsuario = "admin";
  else if (codigo === CODIGO_ESTUDIANTE) tipoUsuario = "estudiante";
  else {
    Swal.fire({
      icon: 'error',
      title: 'Código incorrecto',
      text: 'Verifica con el profesor el código de acceso.',
      confirmButtonColor: '#004080'
    });
    return;
  }

  Swal.fire({
    icon: 'success',
    title: `Bienvenido ${nombre}`,
    text: `Has ingresado como ${tipoUsuario}.`,
    confirmButtonColor: '#004080'
  }).then(() => {
    localStorage.setItem("nombreEstudiante", nombre);
    localStorage.setItem("tipoUsuario", tipoUsuario);
    window.location.href = "pagina-principal.html";
  });
});

// --- INICIALIZACIÓN ---
document.addEventListener("DOMContentLoaded", () => {
  const nombre = localStorage.getItem("nombreEstudiante");
  const nombreUsuario = document.getElementById("nombreUsuario");

  if (nombreUsuario && nombre) nombreUsuario.textContent = nombre;

  const form = document.getElementById("formMensaje");
  if (form && nombre) {
    mostrarMensajes();

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const mensaje = document.getElementById("mensaje").value.trim();
      if (!mensaje) return;

      await guardarMensaje(nombre, mensaje);
      document.getElementById("mensaje").value = "";
    });
  }

  activarBotonSalir();

  // --- REGISTRO DE USUARIO EN FIRESTORE ---
  if (nombre && tipoUsuario) {
    const usuarioRef = db.collection("usuariosConectados").doc(nombre);

    usuarioRef.set({
      nombre: nombre,
      tipoUsuario: tipoUsuario,
      conectado: true,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Al salir o cerrar pestaña, marcar desconectado
    window.addEventListener("beforeunload", () => {
      usuarioRef.update({ conectado: false });
    });
  }
});

// --- FILTRO DE MENSAJES ---
const inputBusqueda = document.getElementById('busquedaMensajes');
if (inputBusqueda) {
  inputBusqueda.addEventListener('input', (e) => {
    const filtro = e.target.value.trim().toLowerCase();
    renderizarMensajes(filtro);
  });
}

document.getElementById('btnGenerarGrupos')?.addEventListener('click', async () => {
  const personasPorGrupo = parseInt(document.getElementById('personasPorGrupo').value);
  if (!personasPorGrupo || personasPorGrupo < 1) {
    Swal.fire({
      icon: 'warning',
      title: 'Número inválido',
      text: 'Debes indicar un número válido de personas por grupo.',
      confirmButtonColor: '#004080'
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
      icon: 'info',
      title: 'No hay invitados conectados',
      text: 'Aún no hay participantes conectados para formar grupos.',
      confirmButtonColor: '#004080'
    });
    return;
  }

  // Mezclar invitados aleatoriamente
  const shuffled = invitados.sort(() => 0.5 - Math.random());

  const grupos = {};
  const nombresGrupos = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta"];
  let indexGrupo = 0;

  for (let i = 0; i < shuffled.length; i += personasPorGrupo) {
    const grupoNombre = nombresGrupos[indexGrupo] || `Grupo ${indexGrupo + 1}`;
    grupos[grupoNombre] = shuffled.slice(i, i + personasPorGrupo);
    indexGrupo++;
  }

  // Mostrar los grupos en el modal
  const listaGruposModal = document.getElementById('listaGruposModal');
  listaGruposModal.innerHTML = "";
  for (const [nombre, integrantes] of Object.entries(grupos)) {
    const div = document.createElement('div');
    div.innerHTML = `<strong>${nombre}:</strong><br>${integrantes.join('<br>')}`;
    listaGruposModal.appendChild(div);
  }

  Swal.fire({
    title: 'Grupos generados exitosamente',
    icon: 'success',
    confirmButtonColor: '#004080'
  });
});
