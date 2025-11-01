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
let tipoUsuario = localStorage.getItem("tipoUsuario") || "invitado";

// Orden explícito del alfabeto griego para la ordenación
const NOMBRES_GRIEGOS_ORDEN = [
    "Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta", 
    "Iota", "Kappa", "Lambda", "Mu", "Nu", "Xi", "Omicron", "Pi"
];

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
        // Quitamos el emoji del botón de borrar para la vista admin
        const btnBorrarHTML = (tipoUsuario === "admin") ? `<button class="btn-borrar" data-id="${msg.id}">🗑️</button>` : '';

        li.innerHTML = `<strong>${msg.nombre}:</strong> ${msg.mensaje}<br><small>${fecha}</small>${btnBorrarHTML}`;

        if (tipoUsuario === "admin") {
            li.querySelector(".btn-borrar")?.addEventListener("click", async (e) => {
                const id = e.target.dataset.id;
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
                    await db.collection("mensajes").doc(id).delete();
                    Swal.fire({ icon: "success", title: "Mensaje eliminado", timer: 1500, showConfirmButton: false });
                }
            });
        }

        lista.appendChild(li);
    });
}

function mostrarMensajes() {
    const lista = document.getElementById("listaMensajes");
    if (!lista) return;

    if (tipoUsuario === "admin") {
        const accionesAdmin = document.getElementById("accionesAdmin");
        if (accionesAdmin) accionesAdmin.style.display = "flex";

        document.getElementById("btnBorrarTodos")?.addEventListener("click", async () => {
            const confirm = await Swal.fire({
                icon: "warning",
                title: "¿Borrar TODOS los mensajes?",
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
        
        document.getElementById("btnBorrarDBCompleta")?.addEventListener("click", borrarTodaLaBaseDeDatos);
    }

    db.collection("mensajes")
        .orderBy("fecha", "asc")
        .onSnapshot(snapshot => {
            mensajesCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderizarMensajes(document.getElementById('busquedaMensajes')?.value || "");
        });
}

// ==========================
// FUNCIONES DE USUARIOS Y BORRADO TOTAL
// ==========================

async function borrarTodaLaBaseDeDatos() {
    if (tipoUsuario !== "admin") {
        Swal.fire({ icon: "error", title: "Acceso Denegado", text: "Solo administradores pueden hacer esto.", confirmButtonColor: "#d33" });
        return;
    }

    const { value: confirmacion } = await Swal.fire({
        icon: 'warning',
        title: '¡PELIGRO! Borrar TODA la DB',
        html: 'Esta acción eliminará **TODAS las colecciones** (mensajes, usuarios conectados, grupos) y es **irreversible**. <br><br> Escribe la palabra **"BORRAR TODO"** para confirmar:',
        input: 'text',
        showCancelButton: true,
        confirmButtonText: 'Confirmar Borrado Total',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#d33',
        inputValidator: (value) => {
            if (value !== 'BORRAR TODO') {
                return 'Debes escribir "BORRAR TODO" exactamente para proceder.';
            }
        }
    });

    if (confirmacion) {
        try {
            const colecciones = ["mensajes", "usuariosConectados", "gruposAsignados"];
            
            for (const nombreColeccion of colecciones) {
                const snapshot = await db.collection(nombreColeccion).get();
                const batch = db.batch();
                snapshot.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
                console.log(`Colección ${nombreColeccion} eliminada.`);
            }

            Swal.fire({
                icon: 'success',
                title: 'Borrado Exitoso',
                text: 'Toda la base de datos ha sido eliminada.',
                confirmButtonColor: '#004080'
            });

        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error al borrar',
                text: 'Ocurrió un error al intentar borrar la base de datos.',
                confirmButtonColor: '#d33'
            });
            console.error("Error al borrar la DB:", error);
        }
    }
}

function registrarUsuario(nombre, cedula) {
    if (!nombre || !tipoUsuario || !cedula) return;
    
    const usuarioRef = db.collection("usuariosConectados").doc(cedula); 
    
    usuarioRef.set({
        nombre,
        cedula,
        tipoUsuario,
        conectado: true,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    window.addEventListener("beforeunload", () => {
        usuarioRef.update({ conectado: false });
    });
}

// ==========================
// LOGIN (Validación de Cédula/Nombre)
// ==========================
document.getElementById('btnIngresar')?.addEventListener('click', async () => {
    const nombre = document.getElementById('nombre').value.trim();
    const cedula = document.getElementById('cedula').value.trim();
    const codigo = document.getElementById('codigo').value.trim();

    const palabras = nombre.split(" ").filter(p => p.length > 0);
    if (palabras.length < 3 || !palabras.every(p => /^[A-Za-zÁÉÍÓÚáéíóúÑñ]{3,10}$/.test(p))) {
        Swal.fire({ icon: 'warning', title: 'Nombre inválido', html: 'Debes usar al menos 3 palabras de 3-10 letras cada una.', confirmButtonColor: '#004080' });
        return;
    }
    
    if (!/^\d{9,12}$/.test(cedula)) {
        Swal.fire({ icon: 'warning', title: 'Cédula inválida', text: 'Por favor, ingresa un número de cédula válido.', confirmButtonColor: '#004080' });
        return;
    }

    let tipoUsuarioDeterminado;
    if (codigo === CODIGO_ADMIN) tipoUsuarioDeterminado = "admin";
    else if (codigo === CODIGO_ESTUDIANTE) tipoUsuarioDeterminado = "invitado";
    else {
        Swal.fire({ icon: 'error', title: 'Código incorrecto', text: 'Verifica con el profesor el código.', confirmButtonColor: '#004080' });
        return;
    }

    try {
        const usuarioDoc = await db.collection("usuariosConectados").doc(cedula).get();
        if (usuarioDoc.exists) {
            const data = usuarioDoc.data();
            const storedNombre = data.nombre;

            if (storedNombre.toLowerCase() !== nombre.toLowerCase()) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error de Identidad',
                    text: `La cédula ${cedula} ya está registrada con el nombre: ${storedNombre}. No puedes cambiar el nombre de otro usuario.`,
                    confirmButtonColor: '#d33'
                });
                return;
            }
        }
    } catch (error) {
        console.error("Error al validar cédula:", error);
        Swal.fire({ icon: 'error', title: 'Error de Conexión', text: 'Hubo un problema al verificar la cédula. Inténtalo de nuevo.', confirmButtonColor: '#d33' });
        return;
    }
    
    tipoUsuario = tipoUsuarioDeterminado;
    localStorage.setItem("nombreEstudiante", nombre);
    localStorage.setItem("tipoUsuario", tipoUsuario);
    localStorage.setItem("cedulaEstudiante", cedula);

    Swal.fire({
        icon: 'success',
        title: `Bienvenido ${nombre}`,
        text: `Has ingresado como ${tipoUsuario}.`,
        confirmButtonColor: '#004080'
    }).then(() => window.location.href = "pagina-principal.html");
});

// ===============================================
// GENERACIÓN Y MANEJO DE GRUPOS (Incremental, Confirmación y Orden)
// ===============================================
async function generarGruposAleatorios() {
    if (tipoUsuario !== "admin") {
        Swal.fire({ icon: "error", title: "Acceso denegado", text: "Solo administradores pueden generar grupos.", confirmButtonColor: "#004080" });
        return;
    }

    const coleccionGrupos = db.collection("gruposAsignados");
    const snapshotGruposExistentes = await coleccionGrupos.orderBy("fechaGeneracion", "desc").get();
    const hayGruposExistentes = !snapshotGruposExistentes.empty;

    // 1. OBTENER PARTICIPANTES NO ASIGNADOS
    const snapshotUsuarios = await db.collection("usuariosConectados").get();
    const todosParticipantes = snapshotUsuarios.docs
        .map(doc => doc.data())
        .filter(u => u.tipoUsuario === "invitado");

    const miembrosAsignados = new Set();
    let ultimoNumGrupo = 0;
    let tamanoGrupoAnterior = 0;

    if (hayGruposExistentes) {
        snapshotGruposExistentes.docs.forEach(doc => {
            const grupo = doc.data();
            grupo.miembros.forEach(m => miembrosAsignados.add(m.cedula));
        });
        
        const ultimoGrupo = snapshotGruposExistentes.docs[0]?.data();
        if (ultimoGrupo && ultimoGrupo.miembros.length > 0) {
            tamanoGrupoAnterior = ultimoGrupo.miembros.length;
        }

        const gruposExistentesArray = snapshotGruposExistentes.docs.map(doc => doc.data().nombreGrupo);
        const maxNum = gruposExistentesArray.reduce((max, name) => {
            const match = name.match(/(\d+)$/);
            return match ? Math.max(max, parseInt(match[1])) : max;
        }, 0);
        ultimoNumGrupo = maxNum;
    }

    const participantesNuevos = todosParticipantes.filter(u => !miembrosAsignados.has(u.cedula));

    if (participantesNuevos.length === 0) {
        Swal.fire({
            icon: "info",
            title: "Todos los estudiantes asignados",
            text: "Los " + todosParticipantes.length + " estudiantes registrados ya tienen un grupo asignado.",
            confirmButtonColor: "#004080"
        });
        return;
    }

    // 2. CONFIRMACIÓN Y PREGUNTA DEL TAMAÑO
    const mensajeAdvertencia = hayGruposExistentes 
        ? `<p style="color: darkred; font-weight: bold;">ADVERTENCIA: Ya existen grupos. Se crearán grupos nuevos SÓLO con los ${participantesNuevos.length} estudiantes que faltan.</p>`
        : `<p>¡Esta es la primera asignación de grupos!</p>`;

    const tamanoSugerido = tamanoGrupoAnterior || 2;

    const { value: n } = await Swal.fire({
        title: `Generar Grupos Incrementales`,
        html: `${mensajeAdvertencia} <br> Total de estudiantes faltantes: <strong>${participantesNuevos.length}</strong>. <br><br> ¿Número de personas por grupo nuevo?`,
        input: "number",
        inputValue: tamanoSugerido,
        inputAttributes: { min: 1, step: 1, max: participantesNuevos.length },
        showCancelButton: true,
        confirmButtonText: "Crear Nuevos Grupos",
        cancelButtonText: "Cancelar",
        preConfirm: num => {
            const val = parseInt(num);
            if (!val || val < 1) return Swal.showValidationMessage("Número inválido.");
            if (val > participantesNuevos.length) return Swal.showValidationMessage(`El número no puede ser mayor a ${participantesNuevos.length} participantes restantes.`);
            return val;
        }
    });

    if (!n) return;

    // 3. Lógica de Agrupamiento Incremental
    const shuffled = participantesNuevos.sort(() => Math.random() - 0.5);
    const gruposParaGuardar = [];
    
    const gruposExistentesArray = snapshotGruposExistentes.docs.map(doc => doc.data().nombreGrupo);
    
    let nombreIndex = 0;
    while(nombreIndex < NOMBRES_GRIEGOS_ORDEN.length && gruposExistentesArray.includes(NOMBRES_GRIEGOS_ORDEN[nombreIndex])) {
        nombreIndex++;
    }

    for (let i = 0; i < shuffled.length; i += n) {
        const miembros = shuffled.slice(i, i + n);
        
        let nombreGrupo;
        if (nombreIndex < NOMBRES_GRIEGOS_ORDEN.length) {
            nombreGrupo = NOMBRES_GRIEGOS_ORDEN[nombreIndex];
            nombreIndex++;
        } else {
            ultimoNumGrupo++;
            nombreGrupo = `Grupo ${ultimoNumGrupo}`;
        }
        
        gruposParaGuardar.push({
            nombreGrupo: nombreGrupo,
            miembros: miembros.map(m => ({ nombre: m.nombre, cedula: m.cedula })),
            fechaGeneracion: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
        
    // 4. Guardar los nuevos grupos en Firestore
    try {
        const batchGuardado = db.batch();
        gruposParaGuardar.forEach(grupo => {
            const docRef = coleccionGrupos.doc();
            batchGuardado.set(docRef, grupo);
        });
        await batchGuardado.commit();

        Swal.fire({ 
            icon: "success", 
            title: "Grupos creados!", 
            text: `${gruposParaGuardar.length} nuevos grupos fueron asignados.`,
            timer: 2500, showConfirmButton: false 
        });
        
        mostrarGrupos(null); 

    } catch (error) {
        Swal.fire({ icon: "error", title: "Error", text: "Error al guardar grupos en Firebase.", confirmButtonColor: "#d33" });
        console.error("Error al guardar grupos:", error);
    }
}

// Función que carga, ordena y muestra los grupos en el modal.
async function mostrarGrupos(gruposRecibidos = null) {
    let grupos = {};

    if (gruposRecibidos) {
        grupos = gruposRecibidos;
    } else {
        try {
            const snapshot = await db.collection("gruposAsignados").get();
            if (snapshot.empty) {
                Swal.fire({ icon: "info", title: "Grupos aún no disponibles", text: "El administrador debe generar los grupos primero.", confirmButtonColor: "#004080" });
                return;
            }

            const gruposArray = snapshot.docs.map(doc => doc.data());
            
            // Lógica de ordenación EXPLICITA (Griego + Numérico)
            gruposArray.sort((a, b) => {
                const nameA = a.nombreGrupo;
                const nameB = b.nombreGrupo;
                
                const indexA = NOMBRES_GRIEGOS_ORDEN.indexOf(nameA);
                const indexB = NOMBRES_GRIEGOS_ORDEN.indexOf(nameB);

                // 1. Si ambos son nombres griegos, ordena por el índice definido
                if (indexA !== -1 && indexB !== -1) {
                    return indexA - indexB;
                }
                // 2. Si A es griego y B no (va primero)
                if (indexA !== -1) {
                    return -1;
                }
                // 3. Si B es griego y A no (va segundo)
                if (indexB !== -1) {
                    return 1;
                }

                // 4. Para nombres tipo "Grupo X" (orden numérico)
                const numA = parseInt(nameA.replace(/[^0-9]/g, ''));
                const numB = parseInt(nameB.replace(/[^0-9]/g, ''));
                
                if (!isNaN(numA) && !isNaN(numB) && nameA.startsWith('Grupo') && nameB.startsWith('Grupo')) {
                    return numA - numB;
                }
                
                // 5. Caso de fallback (orden alfabético simple)
                return nameA.localeCompare(nameB);
            });

            gruposArray.forEach(data => {
                grupos[data.nombreGrupo] = data.miembros;
            });

        } catch (error) {
            Swal.fire({ icon: "error", title: "Error de conexión", text: "No se pudieron cargar los grupos desde Firebase.", confirmButtonColor: "#d33" });
            console.error("Error al cargar grupos:", error);
            return;
        }
    }
    
    const listaModal = document.getElementById("listaGruposModal");
    listaModal.innerHTML = "";
    
    for (const [nombre, miembros] of Object.entries(grupos)) {
        const div = document.createElement("div");
        div.classList.add("grupo-card");
        const miembrosHTML = miembros.map(m => `<li>${m.nombre} (Cédula: ${m.cedula})</li>`).join("");
        div.innerHTML = `<h3>${nombre} (${miembros.length} personas)</h3><ul>${miembrosHTML}</ul>`;
        listaModal.appendChild(div);
    }

    document.getElementById("modalGrupos").style.display = "flex";
}


// ==========================
// MODAL DE GRUPOS Y LISTENERS
// ==========================
const modalGrupos = document.getElementById("modalGrupos");
document.getElementById("btnVerGrupos")?.addEventListener("click", () => mostrarGrupos(null));
document.getElementById("btnGenerarGrupos")?.addEventListener("click", generarGruposAleatorios);
document.querySelector(".close-modal")?.addEventListener("click", () => modalGrupos.style.display = "none");
window.addEventListener("click", e => { if (e.target === modalGrupos) modalGrupos.style.display = "none"; });

// ==========================
// INICIALIZACIÓN
// ==========================
document.addEventListener("DOMContentLoaded", () => {
    const nombre = localStorage.getItem("nombreEstudiante");
    const cedula = localStorage.getItem("cedulaEstudiante");
    const userType = localStorage.getItem("tipoUsuario"); 

    if (nombre && userType && cedula) {
        const nombreUsuario = document.getElementById("nombreUsuario");
        if (nombreUsuario) nombreUsuario.textContent = nombre;

        mostrarMensajes();
        activarBotonSalir();
        registrarUsuario(nombre, cedula);

        const form = document.getElementById("formMensaje");
        form?.addEventListener("submit", async e => {
            e.preventDefault();
            const mensaje = document.getElementById("mensaje").value.trim();
            if (!mensaje) return;
            await guardarMensaje(nombre, mensaje);
            document.getElementById("mensaje").value = "";
        });

        // Lógica de Ocultamiento/Visibilidad para Admin
        const btnGenerarGrupos = document.getElementById("btnGenerarGrupos");
        const btnBorrarDBCompleta = document.getElementById("btnBorrarDBCompleta");

        if (userType !== "admin") {
            if (btnGenerarGrupos) {
                btnGenerarGrupos.classList.add("oculto-admin");
            }
            if (btnBorrarDBCompleta) {
                btnBorrarDBCompleta.classList.add("oculto-admin");
            }
        } else {
            if (btnGenerarGrupos) {
                btnGenerarGrupos.classList.remove("oculto-admin");
                btnGenerarGrupos.style.display = "inline-block"; 
            }
            if (btnBorrarDBCompleta) {
                btnBorrarDBCompleta.classList.remove("oculto-admin");
                btnBorrarDBCompleta.style.display = "inline-block"; 
            }
        }
    }
});

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
                localStorage.removeItem("cedulaEstudiante");
                window.location.href = "index.html";
            }
        });
    });
}

document.getElementById('busquedaMensajes')?.addEventListener('input', e => {
    renderizarMensajes(e.target.value.toLowerCase());
});