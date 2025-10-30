// --- CONFIGURACIÓN DEL CÓDIGO DE ACCESO ---
const CODIGO_ACCESO = "ALPHA2025";

document.getElementById('btnIngresar').addEventListener('click', () => {
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
    title: 'Bienvenido ' + nombre,
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
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
