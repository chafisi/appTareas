<!-- LÓGICA DE LA APLICACIÓN -->
<script>
    const API_URL = 'https://script.google.com/macros/s/AKfycbwCKnOnYSIoBSBZsVOecLPvCu0WWWtzN1hynTFRcwUL23Ph7qN_X414SQU1AkBa-bY/exec';
    
    let datosApp = {};
    let usuarioValidado = null; 
    let equipoValidado = null;  
    let rolValidado = null; // <--- AÑADE ESTA LÍNEA
    let modoEdicionId = null;


    // --- 1. NAVEGACIÓN Y CARGA INICIAL ---
    function navegarA(idSeccion) {
        document.querySelectorAll('.app-section').forEach(el => el.style.display = 'none');
        document.getElementById(idSeccion).style.display = 'block';
        if(idSeccion !== 'login-section' && idSeccion !== 'loading') {
            document.getElementById('user-header').style.display = 'block';
        }
    }

    document.addEventListener("DOMContentLoaded", function() {
        navegarA('loading');
        cargarDatosDesdeAPI(true); // true = es la primera carga (vamos a login)
    });

    // Función que descarga los datos (sirve para inicio y para refrescar tras guardar)
    function cargarDatosDesdeAPI(esCargaInicial = false, tipo = "todo") {
        const url = API_URL + "?tipo=" + tipo; // Le decimos al backend qué queremos
        return fetch(url) 
            .then(response => response.json())
            .then(data => {
                // Actualizamos solo las variables que nos devuelve el servidor
                if(data.clientes) datosApp.clientes = data.clientes;
                if(data.tipologias) datosApp.tipologias = data.tipologias;
                if(data.estados) datosApp.estados = data.estados;
                if(data.equipos) datosApp.equipos = data.equipos;
                if(data.usuarios) datosApp.usuarios = data.usuarios;
                if(data.tareas) datosApp.tareas = data.tareas;
                
                if(esCargaInicial) {
                    rellenarDesplegables();
                    configurarFechasPorDefecto();
                    navegarA('login-section');
                }
            })
            .catch(error => {
                console.error("Error al cargar datos:", error);
            });
    }

    function rellenarDesplegables() {
        const cargarOpciones = (selectId, lista) => {
            const select = document.getElementById(selectId);
            if(!select) return; 
            select.innerHTML = '<option value="">Todos...</option>'; 
            if(selectId === 'lugar' || selectId === 'filtro_lugar') select.innerHTML = '<option value="">Selecciona o escribe...</option>';
            
            lista.forEach(item => {
                let opcion = document.createElement("option");
                opcion.value = item.id; 
                opcion.text = item.nombre;
                select.appendChild(opcion);
            });
        };

        // Selectores
        cargarOpciones("lugar", datosApp.clientes);
        cargarOpciones("tipo", datosApp.tipologias);
        cargarOpciones("estado", datosApp.estados);
        cargarOpciones("filtro_lugar", datosApp.clientes);
        cargarOpciones("filtro_estado", datosApp.estados);
        cargarOpciones("filtro_tipo", datosApp.tipologias);

        // Lógica Admin
        if (rolValidado === "admin") {
            document.getElementById("zonaFiltrosAdmin").classList.remove("opacity-75");
            document.getElementById("filtro_usuario").disabled = false;
            document.getElementById("filtro_equipo").disabled = false;
            cargarOpciones("filtro_usuario", datosApp.usuarios);
            cargarOpciones("filtro_equipo", datosApp.equipos);
        }

        // --- INICIALIZACIÓN DE LOS BUSCADORES (TomSelect) ---
        // Buscador del formulario
        if (document.getElementById("lugar").tomselect) {
            document.getElementById("lugar").tomselect.destroy();
        }
        new TomSelect("#lugar", { create: false, sortField: { field: "text", direction: "asc" } });

        // Buscador del panel de filtros
        if (document.getElementById("filtro_lugar").tomselect) {
            document.getElementById("filtro_lugar").tomselect.destroy();
        }
        new TomSelect("#filtro_lugar", { create: false, sortField: { field: "text", direction: "asc" } });
    }

    // Genera los checks dinámicamente filtrando por el equipo del usuario logueado
    function cargarCompanerosEquipo() {
        const contenedor = document.getElementById("contenedorCompaneros");
        contenedor.innerHTML = "";
        
        // Buscamos usuarios del mismo equipo, excluyendo al usuario actual
        const misCompaneros = datosApp.usuarios.filter(u => u.extra === equipoValidado && u.id !== usuarioValidado);
        
        if(misCompaneros.length === 0) {
            contenedor.innerHTML = "<span class='text-muted small'>No hay otros compañeros en tu equipo.</span>";
            return;
        }

        misCompaneros.forEach(comp => {
            const idCheck = "chk_" + comp.id.replace(/[@.]/g, "_");
            contenedor.innerHTML += `
                <div class="form-check form-check-inline border rounded px-2 py-1 bg-white shadow-sm mb-0">
                    <input class="form-check-input ms-0 me-2" type="checkbox" id="${idCheck}" value="${comp.id}">
                    <label class="form-check-label small" for="${idCheck}">${comp.nombre}</label>
                </div>
            `;
        });
    }

    // Lee qué casillas están marcadas antes de enviar
    function obtenerCompanerosSeleccionados() {
        const checks = document.querySelectorAll("#contenedorCompaneros input[type='checkbox']:checked");
        return Array.from(checks).map(chk => chk.value).join(';');
    }
    
    function configurarFechasPorDefecto() {
        const hoy = new Date().toISOString().split('T')[0];
        document.getElementById("fecha_inicio").value = hoy;
        document.getElementById("fecha_fin").value = hoy;
    }

    // --- 2. LOGIN ---
    document.getElementById("btnLogin").addEventListener("click", function() {
        const emailIngresado = document.getElementById("emailInput").value.trim().toLowerCase();
        const usuarioEncontrado = datosApp.usuarios.find(u => u.id.toLowerCase() === emailIngresado);

        if (usuarioEncontrado) {
            usuarioValidado = usuarioEncontrado.id;
            equipoValidado = usuarioEncontrado.extra;
            rolValidado = usuarioEncontrado.rol || "tecnico"; 

            document.getElementById("headerNombre").innerText = usuarioEncontrado.nombre;
            const equipoObj = datosApp.equipos.find(e => e.id === equipoValidado);
            document.getElementById("headerEquipo").innerText = equipoObj ? equipoObj.nombre : equipoValidado;
            
            // Inyectamos el rol en la cabecera visual
            document.getElementById("headerRol").innerText = rolValidado;
            //Cargamos los compañeros
            cargarCompanerosEquipo();

            navegarA('menu-section');
        } else {
            document.getElementById("loginError").style.display = "block";
        }
    });

    // --- 3. LISTADO Y EDICIÓN ---

    // 1. Motor de fechas: Entiende cualquier cosa que mande Google y lo pasa a AAAA-MM-DD
    function normalizarFecha(fechaStr) {
        if (!fechaStr) return "";
        
        // Si ya viene como AAAA-MM-DD desde la base de datos, lo dejamos tal cual
        if (typeof fechaStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fechaStr.trim())) {
            return fechaStr.trim();
        }

        // Si viene con formato raro ("Mon Oct 19..."), Javascript lo lee y lo traduce
        let d = new Date(fechaStr);
        if (!isNaN(d)) {
            let month = '' + (d.getMonth() + 1);
            let day = '' + d.getDate();
            let year = d.getFullYear();
            if (month.length < 2) month = '0' + month;
            if (day.length < 2) day = '0' + day;
            return [year, month, day].join('-');
        }
        
        return fechaStr; // Fallback
    }

    // 2. Para el formulario (exige formato AAAA-MM-DD)
    function convertirAFechaInput(fechaStr) {
        return normalizarFecha(fechaStr); 
    }

    // 3. Para las tarjetas (Lo pone bonito: DD/MM/AAAA)
    function formatoFechaCorta(fechaStr) {
        let fechaLimpia = normalizarFecha(fechaStr);
        if (!fechaLimpia) return "Sin fecha";
        
        let partes = fechaLimpia.split('-');
        if (partes.length === 3) {
            return `${partes[2]}/${partes[1]}/${partes[0]}`; // Cambia 2026-10-19 a 19/10/2026
        }
        return fechaLimpia;
    }

    // --- MOTOR DE BÚSQUEDA Y FILTRADO ---

    function obtenerMisTareasBase() {
        if (rolValidado === "admin") return datosApp.tareas;
        
        return datosApp.tareas.filter(t => 
            t.usuario === usuarioValidado || 
            (t.companeros && t.companeros.includes(usuarioValidado))
        );
    }

    // 2. Filtros de la Barra Principal (Buscador y Mes)
    function aplicarFiltrosPrincipales() {
        const texto = document.getElementById("buscadorPartes").value.toLowerCase();
        const filtroMes = document.getElementById("filtroMes").value; // "actual" o "todo"
        
        let tareas = obtenerMisTareasBase();
        const mesActual = new Date().getMonth();
        const anoActual = new Date().getFullYear();

        tareas = tareas.filter(t => {
            // Filtro por texto
            let matchTexto = true;
            if (texto !== "") {
                const nomLugar = (datosApp.clientes.find(c => c.id === t.lugar)?.nombre || "").toLowerCase();
                const desc = t.descripcion_corta.toLowerCase();
                matchTexto = nomLugar.includes(texto) || desc.includes(texto);
            }

            // Filtro por mes
            let matchMes = true;
            if (filtroMes === "actual") {
                const fechaT = new Date(convertirAFechaInput(t.fecha_inicio));
                matchMes = (fechaT.getMonth() === mesActual && fechaT.getFullYear() === anoActual);
            }

            return matchTexto && matchMes;
        });

        renderizarTareas(tareas);
    }

    // 3. Filtros del Panel Lateral (Ignora el buscador principal)
    function aplicarFiltrosLaterales() {
        const idLugar = document.getElementById("filtro_lugar").value;
        const idEstado = document.getElementById("filtro_estado").value;
        const idTipo = document.getElementById("filtro_tipo").value;
        const fInicio = document.getElementById("filtro_fecha_inicio").value;
        const fFin = document.getElementById("filtro_fecha_fin").value;
        const idUsuario = document.getElementById("filtro_usuario").value;
        const idEquipo = document.getElementById("filtro_equipo").value;

        let tareas = obtenerMisTareasBase();

        tareas = tareas.filter(t => {
            if (idLugar && t.lugar !== idLugar) return false;
            if (idEstado && t.estado !== idEstado) return false;
            if (idTipo && t.tipo !== idTipo) return false;
            
            // Filtros Admin
            if (rolValidado === "admin") {
                if (idUsuario && t.usuario !== idUsuario) return false;
                if (idEquipo && t.equipo !== idEquipo) return false;
            }

            // Rango de fechas
            if (fInicio || fFin) {
                const fTarea = new Date(convertirAFechaInput(t.fecha_inicio));
                if (fInicio && fTarea < new Date(fInicio)) return false;
                if (fFin && fTarea > new Date(fFin)) return false;
            }
            
            return true;
        });

        // Cerramos el panel lateral
        const panel = bootstrap.Offcanvas.getInstance(document.getElementById('panelFiltros'));
        if(panel) panel.hide();

        renderizarTareas(tareas);
    }

    function limpiarFiltrosLaterales() {
        // Limpiamos el buscador TomSelect si existe
        const selectFiltroLugar = document.getElementById("filtro_lugar");
        if (selectFiltroLugar.tomselect) {
            selectFiltroLugar.tomselect.clear();
        } else {
            selectFiltroLugar.value = "";
        }

        // Limpiamos el resto de filtros estándar
        document.getElementById("filtro_estado").value = "";
        document.getElementById("filtro_tipo").value = "";
        document.getElementById("filtro_fecha_inicio").value = "";
        document.getElementById("filtro_fecha_fin").value = "";
        
        if(rolValidado === "admin"){
            document.getElementById("filtro_usuario").value = "";
            document.getElementById("filtro_equipo").value = "";
        }
        
        aplicarFiltrosPrincipales(); 
    }

    // Reemplaza a la antigua cargarListadoTareas
    function cargarListadoTareas() {
        aplicarFiltrosPrincipales();
    }

    // Obliga a bajar las tareas de internet antes de abrir la pantalla
    function abrirListadoActualizado() {
        // Mostramos algo visual mientras carga (opcional pero recomendado)
        const btnFiltro = document.getElementById("buscadorPartes");
        if(btnFiltro) btnFiltro.placeholder = "Sincronizando base de datos...";
        
        cargarDatosDesdeAPI(false, "tareas").then(() => {
            if(btnFiltro) btnFiltro.placeholder = "Buscar texto libre...";
            aplicarFiltrosPrincipales();
            navegarA('list-section');
        });
    }

    // Lógica del botón Eliminar
    function eliminarTarea(idTarea) {
        if (confirm("¿Estás seguro de que deseas eliminar este parte?\nEsta acción no se puede deshacer.")) {
            
            const payload = { modo: "eliminar", idRegistro: idTarea };
            
            // Mostramos feedback visual (usamos un alert por simplicidad, pero podrías usar un toast)
            fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            })
            .then(response => response.json())
            .then(data => {
                if(data.estado === "ok") {
                    alert("🗑️ Parte eliminado correctamente.");
                    // Refrescamos los datos desde Sheets y repintamos
                    cargarDatosDesdeAPI(false, "tareas").then(() => {
                        aplicarFiltrosPrincipales(); 
                    });
                } else {
                    alert("❌ Error al eliminar: " + data.error);
                }
            })
            .catch(error => alert("⚠️ Error de red al eliminar."));
        }
    }

    function renderizarTareas(listaTareas) {
        const contenedor = document.getElementById("contenedorListaTareas");
        contenedor.innerHTML = ""; 
        
        if(listaTareas.length === 0) {
            contenedor.innerHTML = "<p class='text-muted text-center mt-4'><i class='bi bi-inbox'></i> No se encontraron partes con estos filtros.</p>";
            return;
        }

        const tareasPorMes = {};
        listaTareas.forEach(tarea => {
            let mesAnio = "Fecha Desconocida";
            const fechaInput = convertirAFechaInput(tarea.fecha_inicio);
            const d = new Date(fechaInput);
            if (!isNaN(d)) {
                mesAnio = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
            }
            if(!tareasPorMes[mesAnio]) tareasPorMes[mesAnio] = [];
            tareasPorMes[mesAnio].push(tarea);
        });

        let htmlLista = "";
        for (const [mes, tareas] of Object.entries(tareasPorMes)) {
            htmlLista += `<h6 class="fw-bold text-primary mt-4 mb-3 text-uppercase border-bottom border-primary border-2 pb-1 d-inline-block">${mes}</h6>`;
            htmlLista += `<div class="list-group shadow-sm mb-4">`;
            
            tareas.forEach(tarea => {
                const nombreLugar = datosApp.clientes.find(c => c.id === tarea.lugar)?.nombre || "Lugar desconocido";
                const nombreEstado = datosApp.estados.find(e => e.id === tarea.estado)?.nombre || tarea.estado;
                const fInicioCorta = formatoFechaCorta(tarea.fecha_inicio);
                const fFinCorta = formatoFechaCorta(tarea.fecha_fin);
                
                let badgeColor = "bg-info text-dark";
                let iconEstado = "bi-info-circle";

                //v14
                let badgeCompaneros = "";
                // Si la tarea no es mía, pero estoy en la lista de compañeros
                if (tarea.usuario !== usuarioValidado && tarea.companeros && tarea.companeros.includes(usuarioValidado)) {
                    badgeCompaneros = `<span class="badge bg-secondary"><i class="bi bi-people-fill"></i> Compartida contigo</span>`;
                } 
                // Si la tarea es mía y he añadido compañeros
                else if (tarea.usuario === usuarioValidado && tarea.companeros && tarea.companeros !== "") {
                    badgeCompaneros = `<span class="badge bg-light text-dark border"><i class="bi bi-people"></i> Trabajo en equipo</span>`;
                }

                const estadoLower = nombreEstado.toLowerCase();
                
                if(estadoLower.includes("pendiente") || estadoLower.includes("curso")) {
                    badgeColor = "bg-warning text-dark";
                    iconEstado = "bi-clock-history";
                } else if(estadoLower.includes("resuelto") || estadoLower.includes("cerrado") || estadoLower.includes("fin")) {
                    badgeColor = "bg-success text-white";
                    iconEstado = "bi-check-circle";
                }

                htmlLista += `
                    <div class="list-group-item p-3">
                        <div class="row align-items-center g-3">
                            <div class="col-12 col-md-9">
                                <div class="d-flex justify-content-between align-items-start mb-1">
                                    <h5 class="fw-bold mb-0">${nombreLugar}</h5>
                                </div>
                                <p class="text-muted mb-2">${tarea.descripcion_corta}</p>
                                <div class="d-flex flex-wrap gap-2">
                                    <span class="badge bg-light text-dark border"><i class="bi bi-calendar-event text-secondary"></i> ${fInicioCorta} - ${fFinCorta}</span>
                                    <span class="badge ${badgeColor}"><i class="bi ${iconEstado}"></i> ${nombreEstado} </span>
                                    <i> ${badgeCompaneros}</i>
                                </div>
                            </div>
                            <div class="col-12 col-md-3 d-flex flex-row flex-md-column gap-2 justify-content-end">
                                <button class="btn btn-sm btn-outline-primary w-100" onclick="prepararEdicion('${tarea.id}')">
                                    <i class="bi bi-pencil-square"></i> Modificar
                                </button>
                                <button class="btn btn-sm btn-outline-danger w-100" onclick="eliminarTarea('${tarea.id}')">
                                    <i class="bi bi-trash"></i> Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });
            htmlLista += `</div>`;
        }
        contenedor.innerHTML = htmlLista;
    }

    function prepararEdicion(idTarea) {
        const tarea = datosApp.tareas.find(t => t.id === idTarea);
        if(!tarea) return;

        modoEdicionId = tarea.id;

        document.getElementById("lugar").tomselect.setValue(tarea.lugar);
        document.getElementById("tipo").value = tarea.tipo;
        document.getElementById("estado").value = tarea.estado;
        document.getElementById("descripcion_corta").value = tarea.descripcion_corta;
        
        // Uso de la función inteligente para asegurar que no se pierda la fecha
        document.getElementById("fecha_inicio").value = convertirAFechaInput(tarea.fecha_inicio);
        document.getElementById("fecha_fin").value = convertirAFechaInput(tarea.fecha_fin);

        let textoLimpio = tarea.parte;
        const regex = /^\[.*?\] - /;
        if(regex.test(textoLimpio)) {
            textoLimpio = textoLimpio.replace(regex, "");
        }
        document.getElementById("parte").value = textoLimpio; 
        //v14
        // Marcar los checks de los compañeros guardados
        document.querySelectorAll("#contenedorCompaneros input[type='checkbox']").forEach(chk => chk.checked = false);
        if (tarea.companeros) {
            const companerosArr = tarea.companeros.split(';');
            document.querySelectorAll("#contenedorCompaneros input[type='checkbox']").forEach(chk => {
                if (companerosArr.includes(chk.value)) chk.checked = true;
            });
     }
        //Manipular imagen para mostrar
        // Lógica de la mini-imagen con parche para URLs antiguas
        // Lógica de la mini-imagen (Extraemos el ID y usamos el visor de miniaturas de Google)
        if(tarea.imagen && tarea.imagen.includes("http")) {
            let urlGuardada = tarea.imagen;
            let idArchivo = "";

            // 1. Extraer el ID de la imagen sin importar el formato viejo o nuevo que tengamos guardado
            if (urlGuardada.includes("id=")) {
                idArchivo = urlGuardada.split("id=")[1].split("&")[0];
            } else if (urlGuardada.includes("/file/d/")) {
                idArchivo = urlGuardada.split("/file/d/")[1].split("/")[0];
            }

            if (idArchivo) {
                // 2. Generamos una URL especial para miniaturas que salta el bloqueo CORS (sz=w400 ajusta el ancho)
                let urlMiniatura = "https://drive.google.com/thumbnail?id=" + idArchivo + "&sz=w400";
                
                document.getElementById("contenedor_mini_imagen").style.display = "block";
                document.getElementById("mini_imagen_preview").src = urlMiniatura;
                
                // Mantenemos la URL original en el value oculto para no perder la máxima calidad al guardar
                document.getElementById("imagen_actual_url").value = urlGuardada; 
                document.getElementById("imagen").style.display = "none"; 
            } else {
                quitarImagenPrevia();
            }
        } else {
            quitarImagenPrevia();
        }

        // Cambiamos textos para modo edición
        document.querySelector("#form-section .card-title").innerText = "Modificar Parte";
        document.getElementById("btnEnviarParte").innerHTML = '<i class="bi bi-arrow-repeat"></i> Actualizar Parte';
        
        // Cambiamos el texto y acción del botón volver
        const btnVolver = document.querySelector("#form-section .btn-outline-secondary");
        if(btnVolver) btnVolver.innerHTML = '<i class="bi bi-arrow-left"></i> Volver al listado';

        navegarA('form-section');
    }

    // Navegación inteligente al cancelar/terminar de editar
    // --- NUEVAS FUNCIONES DE NAVEGACIÓN Y LIMPIEZA ---
    function limpiarFormulario() {
        modoEdicionId = null; // Apagamos el modo edición
        
        document.getElementById("formularioTareas").reset();
        if(document.getElementById("lugar").tomselect) {
            document.getElementById("lugar").tomselect.clear();
        }
        configurarFechasPorDefecto();
        quitarImagenPrevia();
        
        // Restauramos los textos originales del formulario
        document.querySelector("#form-section .card-title").innerText = "Nuevo Parte de Trabajo";
        document.getElementById("btnEnviarParte").innerHTML = '<i class="bi bi-send-check"></i> Enviar Parte';
        
        const btn = document.getElementById("btnEnviarParte");
        btn.innerHTML = '<i class="bi bi-send-check"></i> Enviar Parte';
        btn.disabled = false; // <--- ESTO ARREGLA EL BLOQUEO
        
        const btnVolver = document.querySelector("#form-section .btn-outline-secondary");
        if(btnVolver) btnVolver.innerHTML = '<i class="bi bi-arrow-left"></i> Volver al menú';
    }

    function accionVolver() {
        if (modoEdicionId) {
            // Si estábamos modificando: Limpiamos, repintamos las tareas y vamos al listado
            limpiarFormulario();
            cargarListadoTareas(); 
            navegarA('list-section');
        } else {
            // Si estábamos creando un parte nuevo: Limpiamos y vamos al menú principal
            limpiarFormulario();
            navegarA('menu-section');
        }
    }

    function quitarImagenPrevia() {
        document.getElementById("contenedor_mini_imagen").style.display = "none";
        document.getElementById("imagen_actual_url").value = "";
        document.getElementById("imagen").style.display = "block";
        document.getElementById("imagen").value = ""; 
    }

    function cancelarEdicionYVolver() {
        modoEdicionId = null;
        document.getElementById("formularioTareas").reset();
        document.getElementById("lugar").tomselect.clear();
        configurarFechasPorDefecto();
        quitarImagenPrevia();
        document.querySelector("#form-section .card-title").innerText = "Nuevo Parte de Trabajo";
        document.getElementById("btnEnviarParte").innerHTML = '<i class="bi bi-send-check"></i> Enviar Parte';
        navegarA('menu-section');
    }

    // --- 4. ENVÍO AL BACKEND (¡Único evento!) ---
    document.getElementById("formularioTareas").addEventListener("submit", function(e) {
        e.preventDefault(); 
        
        const btnEnviar = document.getElementById("btnEnviarParte");
        btnEnviar.disabled = true;
        btnEnviar.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Guardando...';

        const fInicio = new Date(document.getElementById("fecha_inicio").value);
        const fFin = new Date(document.getElementById("fecha_fin").value);
        const diffTiempo = Math.abs(fFin - fInicio);
        const dias = Math.ceil(diffTiempo / (1000 * 60 * 60 * 24)) + 1; 
        
        const fechaHoy = new Date().toLocaleDateString('es-ES');
        const textoParteFinal = `[${fechaHoy} | ${dias} Días] - ${document.getElementById("parte").value}`;
        
        const payload = {
            modo: modoEdicionId ? "editar" : "crear", 
            idRegistro: modoEdicionId,
            lugar: document.getElementById("lugar").value,
            tipo: document.getElementById("tipo").value,
            estado: document.getElementById("estado").value,
            descripcion_corta: document.getElementById("descripcion_corta").value,
            fecha_inicio: document.getElementById("fecha_inicio").value,
            fecha_fin: document.getElementById("fecha_fin").value,
            parte: textoParteFinal,
            usuario: usuarioValidado,
            equipo: equipoValidado,
            imagenBase64: "",
            mimeType: "",
            nombreArchivo: "",
            imagen_actual_url: document.getElementById("imagen_actual_url").value, 
            companeros: obtenerCompanerosSeleccionados()
        };

        const inputImagen = document.getElementById("imagen");
        if (inputImagen.files.length > 0) {
            const archivo = inputImagen.files[0];
            const reader = new FileReader();
            reader.onload = function(evento) {
                const idLugarSelec = document.getElementById("lugar").value;
                const clienteObj = datosApp.clientes.find(c => c.id === idLugarSelec);
                const nombreLugar = clienteObj ? clienteObj.nombre : "Lugar";
                const lugarNormalizado = nombreLugar.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
                const nombreOriginalLimpio = archivo.name.replace(/[^a-zA-Z0-9.]/g, "_").replace(/_+/g, "_");
                
                payload.imagenBase64 = evento.target.result.split(',')[1]; 
                payload.mimeType = archivo.type;
                payload.nombreArchivo = lugarNormalizado + "_" + nombreOriginalLimpio;
                
                
                enviarAlBackend(payload, btnEnviar);
            };
            reader.readAsDataURL(archivo);
        } else {
            enviarAlBackend(payload, btnEnviar);
        }
    });

    function enviarAlBackend(payload, btn) {
        fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        })
        .then(response => response.json())
        .then(data => {
            if(data.estado === "ok") {
                btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Sincronizando datos...';
                
                // Pedimos los datos frescos y ESPERAMOS a que lleguen (.then)
                cargarDatosDesdeAPI(false).then(() => {
                    alert("✅ ¡Parte guardado correctamente!");
                    
                    if (payload.modo === "editar") {
                        // Forzamos volver al listado con los datos nuevos recién bajados
                        limpiarFormulario();
                        cargarListadoTareas(); // <-- Aquí forzamos pintar las tarjetas actualizadas
                        navegarA('list-section');
                    } else {
                        // Si era nuevo, volvemos al menú principal
                        limpiarFormulario();
                        navegarA('menu-section');
                    }
                });

            } else {
                alert("❌ Error al guardar en Sheets: " + data.error);
                btn.disabled = false;
                btn.innerHTML = payload.modo === "editar" ? '<i class="bi bi-arrow-repeat"></i> Actualizar Parte' : '<i class="bi bi-send-check"></i> Enviar Parte';
            }
        })
        .catch(error => {
            console.error("Error en POST:", error);
            alert("⚠️ Error de red al enviar el parte. Revisa tu conexión.");
            btn.disabled = false;
            btn.innerHTML = payload.modo === "editar" ? '<i class="bi bi-arrow-repeat"></i> Actualizar Parte' : '<i class="bi bi-send-check"></i> Enviar Parte';
        });
    }

    // Eventos para búsqueda instantánea
    document.getElementById("buscadorPartes").addEventListener("input", aplicarFiltrosPrincipales);
    document.getElementById("filtroMes").addEventListener("change", aplicarFiltrosPrincipales);
</script>