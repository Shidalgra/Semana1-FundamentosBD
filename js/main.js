// ==========================
// CONFIGURACIÓN FIREBASE
// ==========================
const CODIGO_ADMIN = "ADMINSHIDALGRA2026";

// NUEVA CONFIGURACIÓN DE CURSOS Y CLAVES
// Aquí se definen los cursos que aparecerán en el login y su clave de acceso.
// Para añadir un nuevo curso, simplemente agrega una nueva línea.
const CURSOS_CONFIG = {
    "INF1003": "CLAVE2026A",
    "INF2003": "CLAVE2026B",
    "INF1004": "CLAVE2026C",
    "TCS1003": "CLAVE2026D"
};

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
        .orderBy("fecha", "desc")
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

            // 4. Eliminar el curso de la lista de cursos activos
            await db.collection('_cursosActivos').doc(cursoID).delete();

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
    const nombreInput = document.getElementById('nombre');
    const cedulaInput = document.getElementById('cedula');
    const nombre = nombreInput.value.trim();
    const cedula = cedulaInput.value.trim(); 
    const codigo = document.getElementById('codigo').value.trim();

    // 1. Validación de Curso ID
    // Ahora se valida que se haya seleccionado un curso del dropdown.
    if (!cursoID_input) {
        Swal.fire({ icon: 'warning', title: 'Selecciona un curso', text: 'Debes seleccionar un curso de la lista.', confirmButtonColor: '#004080' });
        return;
    }

    // 2. Validación de Nombre
    const palabras = nombre.split(" ").filter(p => p.length > 0);
    if (palabras.length < 2) {
        Swal.fire({ icon: 'warning', title: 'Nombre inválido', html: 'Debes ingresar al menos tu nombre y un apellido.', confirmButtonColor: '#004080' });
        return;
    }
    
    // 3. Validación de Cédula (ya limpia de guiones)
    if (!/^\d{9,12}$/.test(cedula)) {
        Swal.fire({ icon: 'warning', title: 'Cédula inválida', text: 'Por favor, ingresa un número de cédula válido (solo números).', confirmButtonColor: '#004080' });
        return;
    }

    // 4. Validación de Código de Acceso
    let tipoUsuarioDeterminado;
    const claveCorrectaEstudiante = CURSOS_CONFIG[cursoID_input];
    const cursosActivosRef = db.collection('_cursosActivos');

    if (codigo === CODIGO_ADMIN) {
        tipoUsuarioDeterminado = "admin";
        // El admin inicia el curso: se asegura de que el documento del curso exista.
        try {
            await cursosActivosRef.doc(cursoID_input).set({
                iniciadoPor: nombre,
                fechaInicio: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        } catch (error) {
            console.error("Error al inicializar el curso:", error);
            Swal.fire({ icon: 'error', title: 'Error de Red', text: 'No se pudo inicializar el curso. Revisa tu conexión.', confirmButtonColor: '#d33' });
            return;
        }
    } else if (codigo === claveCorrectaEstudiante) {
        tipoUsuarioDeterminado = "invitado";
        // El estudiante intenta ingresar: se verifica si el curso ya fue iniciado por un admin.
        try {
            const cursoDoc = await cursosActivosRef.doc(cursoID_input).get();
            if (!cursoDoc.exists) {
                Swal.fire({ icon: 'error', title: 'Curso no disponible', text: 'El docente aún no ha iniciado la sesión para este curso.', confirmButtonColor: '#d33' });
                return;
            }
        } catch (error) {
            console.error("Error al verificar el curso:", error);
            Swal.fire({ icon: 'error', title: 'Error de Red', text: 'No se pudo verificar el estado del curso. Revisa tu conexión.', confirmButtonColor: '#d33' });
            return;
        }
    } else {
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

    // --- NUEVA LÓGICA DE RE-GENERACIÓN ---
    // Si ya hay grupos, preguntar si se quiere re-generar todo o solo añadir.
    if (hayGruposExistentes) {
        const decision = await Swal.fire({
            title: 'Ya existen grupos',
            text: '¿Qué deseas hacer?',
            icon: 'question',
            showDenyButton: true,
            showCancelButton: true,
            confirmButtonText: 'Crear grupos nuevos (Incremental)',
            denyButtonText: 'Re-generar TODO desde cero',
            cancelButtonText: 'Cancelar'
        });

        if (decision.isDenied) {
            // Opción: Re-generar TODO desde cero.
            const confirmacionBorrado = await Swal.fire({
                title: '¿Estás seguro?',
                text: 'Se borrarán TODOS los grupos existentes y se crearán de nuevo con todos los estudiantes. Esta acción es irreversible.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                confirmButtonText: 'Sí, re-generar todo',
                cancelButtonText: 'Cancelar'
            });

            if (!confirmacionBorrado.isConfirmed) return;

            // Borrar todos los grupos existentes antes de continuar.
            const batchDelete = db.batch();
            snapshotGruposExistentes.docs.forEach(doc => batchDelete.delete(doc.ref));
            await batchDelete.commit();
        } else if (decision.isDismissed) {
            return; // El usuario canceló.
        }
        // Si es .isConfirmed, la función continúa con la lógica incremental normal.
    }

    // Volvemos a obtener el estado actual por si se borraron los grupos.
    const snapshotActualizado = await db.collection(`${cursoID}_gruposAsignados`).orderBy("fechaGeneracion", "desc").get();
    const hayGruposAhora = !snapshotActualizado.empty;

    // 1. OBTENER PARTICIPANTES NO ASIGNADOS
    const snapshotUsuarios = await db.collection(`${cursoID}_usuariosConectados`).where("tipoUsuario", "==", "invitado").get();
    const todosParticipantes = snapshotUsuarios.docs
        .map(doc => doc.data());

    const miembrosAsignados = new Set();
    let ultimoNumGrupo = 0;
    let tamanoGrupoAnterior = 0;

    if (hayGruposAhora) {
        snapshotActualizado.docs.forEach(doc => {
            const grupo = doc.data();
            grupo.miembros.forEach(m => miembrosAsignados.add(m.cedula));
        });
        
        const ultimoGrupo = snapshotActualizado.docs[0]?.data();
        if (ultimoGrupo && ultimoGrupo.miembros.length > 0) {
            tamanoGrupoAnterior = ultimoGrupo.miembros.length;
        }

        const gruposExistentesArray = snapshotActualizado.docs.map(doc => doc.data().nombreGrupo);
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
    const mensajeAdvertencia = hayGruposAhora 
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
    
    const gruposExistentesArray = snapshotActualizado.docs.map(doc => doc.data().nombreGrupo);
    
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
            const nuevoDocRef = coleccionGrupos.doc(); // Crea una referencia con un ID nuevo y único
            batchGuardado.set(nuevoDocRef, grupo);
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
        const snapshot = await db.collection(`${cursoID}_gruposAsignados`).get();
        if (snapshot.empty) {
            Swal.fire({ icon: "info", title: "Grupos aún no disponibles", text: `El administrador debe generar los grupos para el curso **${cursoID}** primero.`, confirmButtonColor: "#004080" });
            return;
        }

        try {
            const gruposArray = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
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
                grupos[data.nombreGrupo] = { miembros: data.miembros, id: data.id };
            });

        } catch (error) {
            Swal.fire({ icon: "error", title: "Error de conexión", text: "No se pudieron cargar los grupos desde Firebase.", confirmButtonColor: "#d33" });
            console.error("Error al cargar grupos:", error);
            return;
        }
    }
    
    const listaModal = document.getElementById("listaGruposModal");
    listaModal.innerHTML = "";
    
    for (const [nombreGrupo, dataGrupo] of Object.entries(grupos)) {
        const { miembros, id: idGrupo } = dataGrupo;
        const div = document.createElement("div");
        div.classList.add("grupo-card");

        const miembrosHTML = miembros.map(m => {
            const botonMover = tipoUsuario === 'admin' 
                ? `<button class="btn-mover-miembro" data-cedula-miembro="${m.cedula}" data-nombre-miembro="${m.nombre}" data-id-grupo-origen="${idGrupo}">🔄</button>` 
                : '';
            
            // La cédula solo se muestra si el usuario es un administrador.
            const cedulaHTML = tipoUsuario === 'admin' ? ` (Cédula: ${m.cedula})` : '';

            return `<li>${m.nombre}${cedulaHTML} ${botonMover}</li>`;
        }).join("");

        div.innerHTML = `<h3>${nombreGrupo} (${miembros.length} personas)</h3><ul>${miembrosHTML}</ul>`;
        listaModal.appendChild(div);
    }

    // Añadir listeners a los nuevos botones de mover
    if (tipoUsuario === 'admin') {
        document.querySelectorAll('.btn-mover-miembro').forEach(btn => {
            btn.addEventListener('click', (e) => moverMiembro(e, grupos));
        });
    }

    document.getElementById("modalGrupos").style.display = "flex";
}

async function moverMiembro(evento, gruposActuales) {
    const { cedulaMiembro, nombreMiembro, idGrupoOrigen } = evento.target.dataset;

    // --- VALIDACIÓN CRÍTICA ---
    // Si solo hay un grupo (o menos), no se puede mover a nadie.
    if (Object.keys(gruposActuales).length <= 1) {
        const decision = await Swal.fire({
            icon: 'info',
            title: 'No hay a dónde mover',
            text: 'Solo existe un grupo. Debes generar más grupos para poder mover a los miembros.',
            showCancelButton: true,
            confirmButtonText: 'Generar nuevos grupos',
            cancelButtonText: 'Entendido',
            confirmButtonColor: '#004080'
        });

        if (decision.isConfirmed) {
            generarGruposAleatorios(); // Llama a la función para crear más grupos.
        }
        return; // Detiene la ejecución de la función de mover.
    }

    // Crear un mapa de opciones para el dropdown de Swal
    const opcionesGrupos = {};
    const nombreGrupoOrigen = Object.keys(gruposActuales).find(key => gruposActuales[key].id === idGrupoOrigen);

    Object.entries(gruposActuales).forEach(([nombre, data]) => {
        opcionesGrupos[data.id] = nombre;
    });

    // Deshabilitar el grupo de origen en las opciones
    const inputAttributes = { [idGrupoOrigen]: 'disabled' };

    const { value: idGrupoDestino } = await Swal.fire({
        title: `Mover a ${nombreMiembro}`,
        text: 'Selecciona el grupo de destino:',
        input: 'select',
        inputOptions: opcionesGrupos,
        inputPlaceholder: 'Seleccionar un grupo',
        inputAttributes,
        showCancelButton: true,
        confirmButtonText: 'Mover',
        cancelButtonText: 'Cancelar'
    });

    if (!idGrupoDestino) return;

    try {
        const dbBatch = db.batch();
        const refGrupoOrigen = db.collection(`${cursoID}_gruposAsignados`).doc(idGrupoOrigen);
        const refGrupoDestino = db.collection(`${cursoID}_gruposAsignados`).doc(idGrupoDestino);

        // 1. Quitar miembro del grupo origen
        const miembrosOrigen = gruposActuales[Object.keys(gruposActuales).find(k => gruposActuales[k].id === idGrupoOrigen)].miembros;
        const nuevosMiembrosOrigen = miembrosOrigen.filter(m => m.cedula !== cedulaMiembro);
        dbBatch.update(refGrupoOrigen, { miembros: nuevosMiembrosOrigen });

        // 2. Añadir miembro al grupo destino
        const miembroAMover = miembrosOrigen.find(m => m.cedula === cedulaMiembro);
        dbBatch.update(refGrupoDestino, { 
            miembros: firebase.firestore.FieldValue.arrayUnion(miembroAMover) 
        });

        await dbBatch.commit();

        Swal.fire({
            icon: 'success',
            title: '¡Movido!',
            text: `${nombreMiembro} ha sido movido de grupo.`,
            timer: 2000,
            showConfirmButton: false
        });

        mostrarGrupos(); // Recargar la vista de grupos
    } catch (error) {
        console.error("Error al mover miembro:", error);
        Swal.fire('Error', 'No se pudo mover al miembro.', 'error');
    }
}


// ==========================
// MODAL DE GRUPOS Y LISTENERS
// ==========================
function inicializarListenersUI() {
    const modalGrupos = document.getElementById("modalGrupos");
    const btnMenu = document.getElementById("btn-menu-hamburguesa");
    const menuDesplegable = document.getElementById("menu-desplegable");

    // --- Lógica del Menú Hamburguesa ---
    btnMenu?.addEventListener("click", () => {
        btnMenu.classList.toggle("active");
        menuDesplegable.classList.toggle("active");
    });

    // Cerrar menú si se hace clic fuera
    window.addEventListener("click", e => {
        if (!btnMenu?.contains(e.target) && !menuDesplegable?.contains(e.target)) {
            btnMenu?.classList.remove("active");
            menuDesplegable?.classList.remove("active");
        }
        // Cerrar modal de grupos si se hace clic fuera
        if (e.target === modalGrupos) modalGrupos.style.display = "none";
    });

    // --- Lógica del Modal de Grupos ---
    document.getElementById("btnVerGruposMenu")?.addEventListener("click", () => mostrarGrupos(null));
    document.querySelector(".close-modal")?.addEventListener("click", () => modalGrupos.style.display = "none");

}
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
        }).then((result) => {
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
        inicializarListenersUI(); // Inicializa el nuevo menú y modal
        activarBotonSalir(); // Activa el botón de salir del footer
        registrarUsuario(nombre, cedula);

        const form = document.getElementById("formMensaje"); // Formulario de chat
        form?.addEventListener("submit", async e => {
            e.preventDefault();
            const mensaje = document.getElementById("mensaje").value.trim();
            if (!mensaje) return;
            await guardarMensaje(nombre, mensaje);
            document.getElementById("mensaje").value = "";
        });

        // Lógica de VISIBILIDAD DE ADMINISTRADOR:
        // Se obtienen las referencias a los botones DENTRO del menú.
        const btnGenerarGruposMenu = document.getElementById("btnGenerarGruposMenu");
        const btnBorrarMensajesMenu = document.getElementById("btnBorrarMensajesMenu");
        const btnBorrarDBMenu = document.getElementById("btnBorrarDBMenu");
        const btnSalirMenu = document.getElementById("btnSalirMenu");

        if (userType === "admin") {
            // Si es admin, se quita la clase que los oculta.
            btnGenerarGruposMenu?.classList.remove("oculto-admin");
            btnBorrarMensajesMenu?.classList.remove("oculto-admin");
            btnBorrarDBMenu?.classList.remove("oculto-admin");

            // Conectar los botones del menú a sus funciones
            btnGenerarGruposMenu?.addEventListener("click", generarGruposAleatorios);
            btnBorrarMensajesMenu?.addEventListener("click", borrarTodosLosMensajes); // Conectado a la función
            btnBorrarDBMenu?.addEventListener("click", borrarTodaLaBaseDeDatos);
        } else {
            // No es necesario hacer nada, los botones ya están ocultos por defecto.
        }
        // Conectar el botón de salir del menú directamente a la función de salir.
        btnSalirMenu?.addEventListener("click", () => activarBotonSalir(true)); 
    } 
    // --- Lógica en index.html (Página de Login) ---
    else if (window.location.pathname.endsWith("index.html") || window.location.pathname === "/") {
        const cedulaInput = document.getElementById('cedula');
        const cursoIDInput = document.getElementById('cursoID');
        const nombreInput = document.getElementById('nombre'); 

        // Llenar el dropdown de cursos dinámicamente
        if (cursoIDInput && cursoIDInput.tagName === 'SELECT') {
            Object.keys(CURSOS_CONFIG).forEach(curso => {
                const option = document.createElement('option');
                option.value = curso;
                option.textContent = curso;
                cursoIDInput.appendChild(option);
            });
        }

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
            cursoIDInput.addEventListener('change', () => {
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

/**
 * Función reutilizable para borrar todos los mensajes del curso actual.
 * Ahora es independiente y puede ser llamada desde cualquier botón.
 */
async function borrarTodosLosMensajes() {
    if (tipoUsuario !== "admin" || !cursoID) return;

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
        try {
            const snapshot = await db.collection(`${cursoID}_mensajes`).get();
            const batch = db.batch();
            snapshot.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            Swal.fire({ icon: "success", title: "Todos los mensajes eliminados", timer: 1500, showConfirmButton: false });
        } catch (error) {
            console.error("Error al borrar mensajes:", error);
        }
    }
}