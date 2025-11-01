// ==========================
// CONFIGURACIÓN FIREBASE
// ==========================
const CODIGO_ESTUDIANTE = "GRUPOSICO2026";
const CODIGO_ADMIN = "ADMINSHIDALGRA2026";

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
// Ojo: Esta variable es clave para aislar los datos por curso.
let cursoID = localStorage.getItem("cursoID") || ""; 

// Orden explícito del alfabeto griego para la ordenación
const NOMBRES_GRIEGOS_ORDEN = [
    "Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta", 
    "Iota", "Kappa", "Lambda", "Mu", "Nu", "Xi", "Omicron", "Pi"
];

// ==========================
// FUNCIONES DE CHAT
// ==========================
async function guardarMensaje(nombre, mensaje) {
    if (!cursoID) return;
    return db.collection(`${cursoID}_mensajes`).add({
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
                    await db.collection(`${cursoID}_mensajes`).doc(id).delete();
                    Swal.fire({ icon: "success", title: "Mensaje eliminado", timer: 1500, showConfirmButton: false });
                }
            });
        }

        lista.appendChild(li);
    });
}

function mostrarMensajes() {
    const lista = document.getElementById("listaMensajes");
    if (!lista || !cursoID) return;

    // Lógica para el botón de Borrar Todos los Mensajes (Solo accesible si el botón existe y es admin)
    if (tipoUsuario === "admin") {
        document.getElementById("btnBorrarTodos")?.addEventListener("click", async () => {
            const confirm = await Swal.fire({
                icon: "warning",
                title: "¿Borrar TODOS los mensajes?",
                text: `Esta acción eliminará TODOS los mensajes de la sesión **${cursoID}** y no se puede deshacer.`,
                showCancelButton: true,
                confirmButtonText: "Sí, borrar todo",
                cancelButtonText: "Cancelar",
                confirmButtonColor: "#d33"
            });

            if (confirm.isConfirmed) {
                const snapshot = await db.collection(`${cursoID}_mensajes`).get();
                const batch = db.batch();
                snapshot.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
                Swal.fire({ icon: "success", title: "Todos los mensajes eliminados", timer: 1500, showConfirmButton: false });
            }
        });
        
        document.getElementById("btnBorrarDBCompleta")?.addEventListener("click", borrarTodaLaBaseDeDatos);
    }

    db.collection(`${cursoID}_mensajes`)
        .orderBy("fecha", "asc")
        .onSnapshot(snapshot => {
            mensajesCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderizarMensajes(document.getElementById('busquedaMensajes')?.value || "");
        });
}

// ==========================
// FUNCIONES DE USUARIOS Y BORRADO TOTAL DEL CURSO ACTUAL
// ==========================

/**
 * Función que elimina TODAS las colecciones asociadas ÚNICAMENTE al cursoID actual.
 */
async function borrarTodaLaBaseDeDatos() {
    // 1. Verificación de seguridad y contexto
    if (tipoUsuario !== "admin" || !cursoID) {
        Swal.fire({ icon: "error", title: "Acceso Denegado", text: "Solo administradores pueden hacer esto.", confirmButtonColor: "#d33" });
        return;
    }

    // 2. Confirmación con input para evitar errores
    const { value: confirmacion } = await Swal.fire({
        icon: 'warning',
        title: `¡PELIGRO! Borrar TODA la DB de **${cursoID}**`,
        html: `Esta acción eliminará **TODAS las colecciones** (mensajes, usuarios conectados, grupos) para **SOLO el curso ${cursoID}** y es **irreversible**. <br><br> Escribe la palabra **"BORRAR TODO"** para confirmar:`,
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
            // 3. Colecciones dinámicas basadas ÚNICAMENTE en cursoID para aislamiento
            // ¡Esta es la clave de la seguridad! Solo borra las colecciones del curso activo.
            const colecciones = [`${cursoID}_mensajes`, `${cursoID}_usuariosConectados`, `${cursoID}_gruposAsignados`];
            
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
                text: `Toda la base de datos para el curso ${cursoID} ha sido eliminada.`,
                confirmButtonColor: '#004080'
            }).then(() => {
                // Forzar salida al login después del borrado exitoso
                localStorage.removeItem("nombreEstudiante");
                localStorage.removeItem("tipoUsuario");
                localStorage.removeItem("cedulaEstudiante");
                localStorage.removeItem("cursoID"); 
                window.location.href = "index.html";
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
    const cursoActual = cursoID; 
    const tipoUsuarioActual = tipoUsuario;

    if (!nombre || !cedula || !cursoActual || !tipoUsuarioActual) {
        console.error("No se pudo registrar: Faltan datos críticos.", { nombre, cedula, cursoActual, tipoUsuarioActual });
        return;
    }

    const usuarioRef = db.collection(`${cursoActual}_usuariosConectados`).doc(cedula); 
    
    usuarioRef.set({
        nombre,
        cedula,
        tipoUsuario: tipoUsuarioActual,
        cursoID: cursoActual, 
        conectado: true,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true })
    .then(() => {
        console.log(`✅ Usuario ${nombre} (Cédula: ${cedula}) registrado/actualizado en curso: ${cursoActual}`);
    })
    .catch(error => {
        console.error("Error al registrar el usuario en Firebase:", error);
    });

    window.addEventListener("beforeunload", () => {
        usuarioRef.update({ conectado: false });
    });
}


// ===================================
// FUNCIÓN MODIFICADA: AUTO-COMPLETAR/LIMPIAR NOMBRE
// ===================================

/**
 * Busca en Firebase si existe un registro de usuario para la cédula
 * y cursoID dados. Rellena el campo de nombre si lo encuentra,
 * o lo limpia si la cédula/curso no tienen un match válido.
 */
async function checkAndFillName(cedula, cursoID) {
    const nombreInput = document.getElementById('nombre');
    const cleanCedula = cedula.replace(/[^0-9]/g, '');
    const cleanCursoID = cursoID.trim().toUpperCase();
    
    // Si la cédula es muy corta o el curso no tiene formato, salimos.
    if (cleanCedula.length < 6 || cleanCursoID.length < 4) {
        return;
    }

    try {
        const usuarioDoc = await db.collection(`${cleanCursoID}_usuariosConectados`).doc(cleanCedula).get();
        
        if (usuarioDoc.exists) {
            const nombreGuardado = usuarioDoc.data().nombre;
            // Rellenar el input, guardar el nombre traído y deshabilitar.
            nombreInput.value = nombreGuardado;
            nombreInput.dataset.fetchedName = nombreGuardado;
            nombreInput.setAttribute('disabled', true); // Deshabilitar para que no lo cambie
        } else {
             // Si NO existe, aseguramos que esté vacío y habilitado.
             nombreInput.value = "";
             nombreInput.removeAttribute('data-fetched-name');
             nombreInput.removeAttribute('disabled'); // Habilitar para que pueda escribir el nombre
        }
    } catch (error) {
        // En caso de error de conexión, solo habilitar el campo para que pueda escribir manualmente
        nombreInput.removeAttribute('disabled');
        console.error("Error during auto-fill lookup:", error);
    }
}


// ==========================
// LOGIN (Validación de Cédula/Nombre y CURSO)
// ==========================
document.getElementById('btnIngresar')?.addEventListener('click', async () => {
    const cursoID_input = document.getElementById('cursoID').value.trim().toUpperCase();
    const nombre = document.getElementById('nombre').value.trim();
    // La cédula ya está limpia gracias al listener
    const cedula = document.getElementById('cedula').value.trim(); 
    const codigo = document.getElementById('codigo').value.trim();

    // 1. Validación de Curso ID
    if (!/^[A-Z0-9]{4,10}$/.test(cursoID_input)) {
        Swal.fire({ icon: 'warning', title: 'Código de Curso Inválido', html: 'El código del curso debe ser alfanumérico (letras y números) y tener entre 4 y 10 caracteres (Ej: INF1004).', confirmButtonColor: '#004080' });
        return;
    }

    // 2. Validación de Nombre
    const palabras = nombre.split(" ").filter(p => p.length > 0);
    if (palabras.length < 3 || !palabras.every(p => /^[A-Za-zÁÉÍÓÚáéíóúÑñ]{3,10}$/.test(p))) {
        Swal.fire({ icon: 'warning', title: 'Nombre inválido', html: 'Debes usar al menos 3 palabras de 3-10 letras cada una.', confirmButtonColor: '#004080' });
        return;
    }
    
    // 3. Validación de Cédula (ya limpia de guiones)
    if (!/^\d{9,12}$/.test(cedula)) {
        Swal.fire({ icon: 'warning', title: 'Cédula inválida', text: 'Por favor, ingresa un número de cédula válido (solo números).', confirmButtonColor: '#004080' });
        return;
    }

    // 4. Validación de Código de Acceso
    let tipoUsuarioDeterminado;
    if (codigo === CODIGO_ADMIN) tipoUsuarioDeterminado = "admin";
    else if (codigo === CODIGO_ESTUDIANTE) tipoUsuarioDeterminado = "invitado";
    else {
        Swal.fire({ icon: 'error', title: 'Código incorrecto', text: 'Verifica con el profesor el código.', confirmButtonColor: '#004080' });
        return;
    }

    // 5. Validación de Identidad (Separada por Curso)
    try {
        const usuarioDoc = await db.collection(`${cursoID_input}_usuariosConectados`).doc(cedula).get();
        if (usuarioDoc.exists) {
            const data = usuarioDoc.data();
            const storedNombre = data.nombre;

            // Se valida que el nombre ingresado coincida con el almacenado.
            if (storedNombre.toLowerCase() !== nombre.toLowerCase()) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error de Identidad',
                    text: `La cédula **${cedula}** ya está registrada en el curso **${cursoID_input}** con el nombre: **${storedNombre}**. Por favor, asegúrate de que el nombre sea el correcto.`,
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
    
    // 6. Almacenamiento en LocalStorage y Redirección
    tipoUsuario = tipoUsuarioDeterminado;
    cursoID = cursoID_input;
    localStorage.setItem("nombreEstudiante", nombre);
    localStorage.setItem("tipoUsuario", tipoUsuario);
    localStorage.setItem("cedulaEstudiante", cedula);
    localStorage.setItem("cursoID", cursoID_input); 

    Swal.fire({
        icon: 'success',
        title: `Bienvenido ${nombre}`,
        text: `Has ingresado al curso **${cursoID}** como ${tipoUsuario}.`,
        confirmButtonColor: '#004080'
    }).then(() => window.location.href = "pagina-principal.html");
});

// ===============================================
// GENERACIÓN Y MANEJO DE GRUPOS 
// ===============================================

async function generarGruposAleatorios() {
    if (tipoUsuario !== "admin" || !cursoID) {
        Swal.fire({ icon: "error", title: "Acceso denegado", text: "Solo administradores pueden generar grupos.", confirmButtonColor: "#004080" });
        return;
    }

    const coleccionGrupos = db.collection(`${cursoID}_gruposAsignados`);
    const snapshotGruposExistentes = await coleccionGrupos.orderBy("fechaGeneracion", "desc").get();
    const hayGruposExistentes = !snapshotGruposExistentes.empty;

    // 1. OBTENER PARTICIPANTES NO ASIGNADOS
    const snapshotUsuarios = await db.collection(`${cursoID}_usuariosConectados`).get();
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
            text: "Los " + todosParticipantes.length + " estudiantes registrados ya tienen un grupo asignado en el curso **"+cursoID+"**.",
            confirmButtonColor: "#004080"
        });
        return;
    }

    // 2. CONFIRMACIÓN Y PREGUNTA DEL TAMAÑO
    const mensajeAdvertencia = hayGruposExistentes 
        ? `<p style="color: darkred; font-weight: bold;">ADVERTENCIA: Ya existen grupos en **${cursoID}**. Se crearán grupos nuevos SÓLO con los ${participantesNuevos.length} estudiantes que faltan.</p>`
        : `<p>¡Esta es la primera asignación de grupos para **${cursoID}**!</p>`;
    
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
            text: `${gruposParaGuardar.length} nuevos grupos fueron asignados al curso **${cursoID}** .`,
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
        if (!cursoID) return;
        try {
            const snapshot = await db.collection(`${cursoID}_gruposAsignados`).get();
            if (snapshot.empty) {
                Swal.fire({ icon: "info", title: "Grupos aún no disponibles", text: `El administrador debe generar los grupos para el curso **${cursoID}** primero.`, confirmButtonColor: "#004080" });
                return;
            }

            const gruposArray = snapshot.docs.map(doc => doc.data());
            
            // Lógica de ordenación EXPLICITA (Griego + Numérico)
            gruposArray.sort((a, b) => {
                const nameA = a.nombreGrupo;
                const nameB = b.nombreGrupo;
                
                const indexA = NOMBRES_GRIEGOS_ORDEN.indexOf(nameA);
                const indexB = NOMBRES_GRIEGOS_ORDEN.indexOf(nameB);

                if (indexA !== -1 && indexB !== -1) {
                    return indexA - indexB;
                }
                if (indexA !== -1) {
                    return -1;
                }
                if (indexB !== -1) {
                    return 1;
                }

                const numA = parseInt(nameA.replace(/[^0-9]/g, ''));
                const numB = parseInt(nameB.replace(/[^0-9]/g, ''));
                
                if (!isNaN(numA) && !isNaN(numB) && nameA.startsWith('Grupo') && nameB.startsWith('Grupo')) {
                    return numA - numB;
                }
                
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
// FUNCIONES AUXILIARES
// ==========================
function activarBotonSalir() {
    document.getElementById("btnSalir")?.addEventListener("click", () => {
        Swal.fire({
            icon: "question",
            title: "¿Deseas salir?",
            text: `Se cerrará la sesión del curso **${cursoID}**.`,
            showCancelButton: true,
            confirmButtonText: "Sí, salir",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#d33"
        }).then(result => {
            if (result.isConfirmed) {
                // Eliminar todos los datos de sesión, incluido el curso
                localStorage.removeItem("nombreEstudiante");
                localStorage.removeItem("tipoUsuario");
                localStorage.removeItem("cedulaEstudiante");
                localStorage.removeItem("cursoID"); 
                window.location.href = "index.html";
            }
        });
    });
}

document.getElementById('busquedaMensajes')?.addEventListener('input', e => {
    renderizarMensajes(e.target.value.toLowerCase());
});


// ==========================
// INICIALIZACIÓN
// ==========================
document.addEventListener("DOMContentLoaded", () => {
    const nombre = localStorage.getItem("nombreEstudiante");
    const cedula = localStorage.getItem("cedulaEstudiante");
    const userType = localStorage.getItem("tipoUsuario"); 
    const curso = localStorage.getItem("cursoID"); 

    // --- Lógica en página-principal.html ---
    if (window.location.pathname.endsWith("pagina-principal.html")) {
        // Si falta cualquier dato, forzar el regreso al login
        if (!nombre || !userType || !cedula || !curso) {
            window.location.href = "index.html";
            return;
        }

        cursoID = curso; 
        
        const nombreUsuario = document.getElementById("nombreUsuario");
        if (nombreUsuario) nombreUsuario.textContent = nombre;

        const tituloPrincipal = document.querySelector('.exam-title .title');
        if (tituloPrincipal) {
             tituloPrincipal.textContent = `Formación de Grupos (${curso})`;
        }

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

        // Lógica de VISIBILIDAD DE ADMINISTRADOR:
        const accionesAdminSection = document.getElementById("accionesAdmin"); // Contiene Borrar Mensajes
        const btnGenerarGrupos = document.getElementById("btnGenerarGrupos");
        const btnBorrarDBCompleta = document.getElementById("btnBorrarDBCompleta");

        if (userType === "admin") {
            if (accionesAdminSection) accionesAdminSection.classList.remove("oculto-admin");
            if (btnGenerarGrupos) btnGenerarGrupos.style.display = "inline-block";
            if (btnBorrarDBCompleta) btnBorrarDBCompleta.classList.remove("oculto-admin");
            
        } else {
            if (accionesAdminSection) accionesAdminSection.classList.add("oculto-admin");
            if (btnGenerarGrupos) btnGenerarGrupos.style.display = "none";
            if (btnBorrarDBCompleta) btnBorrarDBCompleta.classList.add("oculto-admin");
        }
    } 
    // --- Lógica en index.html (Página de Login) ---
    else if (window.location.pathname.endsWith("index.html") || window.location.pathname === "/") {
        const cedulaInput = document.getElementById('cedula');
        const cursoIDInput = document.getElementById('cursoID');
        const nombreInput = document.getElementById('nombre'); 

        if (cedulaInput && cursoIDInput && nombreInput) {
            
            // Función auxiliar para limpiar y habilitar el campo de nombre (antes de cualquier validación)
            const cleanNameField = () => {
                // Solo limpiar el valor si fue autocompletado previamente
                if (nombreInput.dataset.fetchedName) {
                    nombreInput.value = ""; 
                }
                nombreInput.removeAttribute('data-fetched-name');
                nombreInput.removeAttribute('disabled'); // Asegurar que siempre esté habilitado si no ha sido validado
            };

            // Listener para limpiar Cédula de no-dígitos y llamar a auto-completado/limpieza
            cedulaInput.addEventListener('input', () => {
                // 1. Limpieza de input (elimina guiones y otros caracteres)
                const oldValue = cedulaInput.value;
                const newValue = oldValue.replace(/[^0-9]/g, '');
                if (oldValue !== newValue) {
                    cedulaInput.value = newValue;
                }
                
                // 2. Limpieza y re-validación.
                cleanNameField(); // Limpiar el nombre ANTES de la búsqueda
                checkAndFillName(newValue, cursoIDInput.value);
            });
            
            // Listener para el cursoID y llamar a auto-completado/limpieza
            cursoIDInput.addEventListener('input', () => {
                // 1. Asegurar que el cursoID sea siempre mayúsculas
                cursoIDInput.value = cursoIDInput.value.toUpperCase();
                
                // 2. Limpiar el campo de nombre y re-validar
                cleanNameField(); // Limpiar el nombre ANTES de la búsqueda
                checkAndFillName(cedulaInput.value, cursoIDInput.value);
            });
            
            // Listener para el nombre (en caso de que el usuario lo modifique manualmente)
            nombreInput.addEventListener('input', () => {
                // Si el usuario empieza a escribir manualmente, quitamos la marca de autocompletado
                nombreInput.removeAttribute('data-fetched-name');
                nombreInput.removeAttribute('disabled');
            });

            // Inicializar la validación en caso de que el navegador guarde valores
            checkAndFillName(cedulaInput.value, cursoIDInput.value);
        }
    }
});