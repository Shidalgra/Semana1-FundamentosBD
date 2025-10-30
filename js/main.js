// --- CONFIGURACIÓN DEL CÓDIGO DE ACCESO ---
const CODIGO_ACCESO = "ALPHA2025";

document.getElementById('btnIngresar')?.addEventListener('click', () => {
  const nombre = document.getElementById('nombre').value.trim();
  const codigo = document.getElementById('codigo').value.trim();

  if (!nombre) {
    Swal.fire({
      icon: 'warning',
      title: 'Falta tu nombre',
      text: 'Por favor escribe tu nombre completo antes de continuar.',
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#004080'
    });
    return;
  }

  if (codigo !== CODIGO_ACCESO) {
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
    title: 'Hola' + nombre,
    text: 'Tu acceso ha sido aprobado.',
    confirmButtonColor: '#004080'
  }).then(() => {
    localStorage.setItem("nombreEstudiante", nombre);
    window.location.href = "pagina-principal.html";
  });
});

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

// --- FUNCIÓN PARA GUARDAR MENSAJES ---
function guardarMensaje(nombre, mensaje) {
  return db.collection("mensajes").add({
    nombre: nombre,
    mensaje: mensaje,
    fecha: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// --- FUNCIÓN PARA MOSTRAR MENSAJES EN TIEMPO REAL ---
function mostrarMensajes() {
  const lista = document.getElementById("listaMensajes");
  if (!lista) return; // Evita error si no está en esta página

  db.collection("mensajes")
    .orderBy("fecha", "asc")
    .onSnapshot(snapshot => {
      lista.innerHTML = "";
      snapshot.forEach(doc => {
        const data = doc.data();
        const li = document.createElement("li");
        const fecha = data.fecha ? data.fecha.toDate().toLocaleString() : "(sin fecha)";
        li.textContent = `${data.nombre}: ${data.mensaje} — ${fecha}`;
        lista.appendChild(li);
      });
    });
}

// --- MOSTRAR NOMBRE Y ACTIVAR CHAT ---
document.addEventListener("DOMContentLoaded", () => {
  const nombre = localStorage.getItem("nombreEstudiante");
  const nombreUsuario = document.getElementById("nombreUsuario");

  // Mostrar nombre del usuario si existe
  if (nombreUsuario && nombre) nombreUsuario.textContent = nombre;

  // Activar chat si existe el formulario
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
});
