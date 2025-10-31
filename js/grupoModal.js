// ==========================
// MODAL DE GRUPOS + LÓGICA
// ==========================

// Referencias
const modalGrupos = document.getElementById("modalGrupos");
const btnVerGrupos = document.getElementById("btnVerGrupos");
const closeModal = document.querySelector(".close-modal");
const listaGruposModal = document.getElementById("listaGruposModal");

// Función para mostrar el modal
btnVerGrupos.addEventListener("click", () => {
  generarGrupos();
  modalGrupos.style.display = "flex";
});

// Cerrar modal con la X
closeModal.addEventListener("click", () => {
  modalGrupos.style.display = "none";
});

// Cerrar al hacer clic fuera
window.addEventListener("click", (e) => {
  if (e.target === modalGrupos) {
    modalGrupos.style.display = "none";
  }
});

// ==========================
// FUNCIÓN: GENERAR GRUPOS
// ==========================
function generarGrupos() {
  // Limpia contenido previo
  listaGruposModal.innerHTML = "";

  // Obtener lista de usuarios desde Firebase
  const dbRef = firebase.database().ref("usuarios");
  dbRef.once("value").then((snapshot) => {
    const usuarios = [];
    snapshot.forEach((child) => {
      const user = child.val();
      if (user && user.rol !== "admin") {
        usuarios.push(user.nombre);
      }
    });

    if (usuarios.length === 0) {
      listaGruposModal.innerHTML = "<p>No hay usuarios invitados disponibles.</p>";
      return;
    }

    // Preguntar cuántos grupos crear
    Swal.fire({
      title: "¿Cuántos grupos deseas crear?",
      input: "number",
      inputAttributes: {
        min: 1,
        step: 1,
      },
      inputPlaceholder: "Ejemplo: 3",
      showCancelButton: true,
      confirmButtonText: "Crear",
      cancelButtonText: "Cancelar",
      preConfirm: (num) => {
        if (!num || num < 1) {
          Swal.showValidationMessage("Debes ingresar un número válido.");
          return false;
        }
        return parseInt(num);
      },
    }).then((result) => {
      if (result.isConfirmed) {
        const numGrupos = result.value;
        crearYMostrarGrupos(usuarios, numGrupos);
      }
    });
  });
}

// ==========================
// FUNCIÓN: CREAR Y MOSTRAR
// ==========================
function crearYMostrarGrupos(usuarios, numGrupos) {
  // Barajar usuarios aleatoriamente
  usuarios.sort(() => Math.random() - 0.5);

  const nombresGrupos = [
    "Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Omega"
  ];

  const grupos = Array.from({ length: numGrupos }, (_, i) => ({
    nombre: nombresGrupos[i] || `Grupo ${i + 1}`,
    miembros: [],
  }));

  // Repartir usuarios equitativamente
  usuarios.forEach((usuario, index) => {
    const grupoIndex = index % numGrupos;
    grupos[grupoIndex].miembros.push(usuario);
  });

  // Mostrar en el modal
  listaGruposModal.innerHTML = "";
  grupos.forEach((grupo) => {
    const div = document.createElement("div");
    div.innerHTML = `
      <h3>${grupo.nombre}</h3>
      <ul>${grupo.miembros.map((m) => `<li>${m}</li>`).join("")}</ul>
    `;
    listaGruposModal.appendChild(div);
  });

  // Mensaje de éxito
  Swal.fire({
    icon: "success",
    title: "¡Grupos creados!",
    text: "Los grupos se han generado correctamente.",
    timer: 1500,
    showConfirmButton: false,
  });
}
