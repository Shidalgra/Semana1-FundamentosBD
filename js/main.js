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
