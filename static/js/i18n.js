/*
 * Lightweight client-side i18n for DNS RasPi Management.
 *
 * Strategy: English is the source language (text lives in the templates/JS).
 * When Spanish is selected we walk the DOM and translate text nodes and a few
 * attributes by looking up their normalized English text in DICT.es. A
 * MutationObserver re-runs translation on nodes that page scripts inject later
 * (tables, status messages, chart-adjacent labels), so the 7 page scripts need
 * no changes. Switching language persists the choice and reloads, which cleanly
 * restores English source when going back to 'en'.
 */
(function () {
    'use strict';

    var DICT = {
        es: {
            // ── Navigation / sidebar ──
            "Monitoring Panel": "Panel de Monitoreo",
            "Top Clients & Domains": "Principales Clientes y Dominios",
            "Internet Connectivity": "Conectividad a Internet",
            "DNS Cache": "Caché DNS",
            "Response Policy": "Política de Respuesta",
            "Compare Performance": "Comparar Rendimiento",
            "System Users": "Usuarios del Sistema",
            "Change Password": "Cambiar Contraseña",
            "Logout": "Cerrar Sesión",
            "Super Admin": "Súper Admin",
            "Admin": "Administrador",
            "User": "Usuario",
            "Developed by: Jazmin Alejandra Coromi Cruz": "Desarrollado por: Jazmin Alejandra Coromi Cruz",
            "Developed by:": "Desarrollado por:",
            "Language": "Idioma",

            // ── Change Password modal ──
            "Current Password": "Contraseña Actual",
            "New Password": "Nueva Contraseña",
            "Confirm New Password": "Confirmar Nueva Contraseña",
            "Cancel": "Cancelar",
            "Update Password": "Actualizar Contraseña",
            "Enter current password": "Ingrese la contraseña actual",
            "Min. 6 characters": "Mín. 6 caracteres",
            "Repeat new password": "Repita la nueva contraseña",
            "Updating...": "Actualizando...",
            "All fields are required.": "Todos los campos son obligatorios.",
            "New password must be at least 6 characters.": "La nueva contraseña debe tener al menos 6 caracteres.",
            "New passwords do not match.": "Las contraseñas no coinciden.",
            "Password updated successfully!": "¡Contraseña actualizada con éxito!",
            "Failed to update password.": "No se pudo actualizar la contraseña.",
            "Network error. Please try again.": "Error de red. Inténtelo de nuevo.",

            // ── Dashboard ──
            "System Health": "Estado del Sistema",
            "Real BIND Data": "Datos Reales de BIND",
            "Simulated Data": "Datos Simulados",
            "Start Monitoring": "Iniciar Monitoreo",
            "Stop Monitoring": "Detener Monitoreo",
            "Pause Monitoring": "Pausar Monitoreo",
            "Checking BIND...": "Verificando BIND...",
            "BIND Active": "BIND Activo",
            "BIND Offline": "BIND Inactivo",
            "CPU Usage": "Uso de CPU",
            "RAM Usage": "Uso de RAM",
            "Temperature": "Temperatura",
            "OS Uptime": "Tiempo de Actividad del SO",
            "BIND Version: Loading...": "Versión de BIND: Cargando...",
            "Query Statistics & Performance": "Estadísticas de Consultas y Rendimiento",
            "Queries per Second (QPS)": "Consultas por Segundo (QPS)",
            "Query Types": "Tipos de Consulta",
            "Success Rate (NOERROR)": "Tasa de Éxito (NOERROR)",
            "Failure Rate (NXDOMAIN – SERVFAIL)": "Tasa de Fallos (NXDOMAIN – SERVFAIL)",
            "Avg Latency": "Latencia Promedio",

            // ── Top Talkers ──
            "Show 5": "Mostrar 5",
            "Show 10": "Mostrar 10",
            "Show 20": "Mostrar 20",
            "Show 30": "Mostrar 30",
            "Show 40": "Mostrar 40",
            "Show 50": "Mostrar 50",
            "Refresh Data": "Actualizar Datos",
            "Total RPZ Actions Triggered": "Total de Acciones RPZ Activadas",
            "Top Clients (IPs)": "Principales Clientes (IPs)",
            "Client IP": "IP del Cliente",
            "Requests": "Solicitudes",
            "Top Requested Domains": "Dominios Más Solicitados",
            "Domain": "Dominio",
            "Hits": "Aciertos",
            "Recent RPZ Activity (Response Policy Zone)": "Actividad RPZ Reciente (Zona de Política de Respuesta)",
            "Requested Domain": "Dominio Solicitado",
            "Action Taken": "Acción Tomada",
            "Event Count": "Recuento de Eventos",
            "Blocked": "Bloqueado",
            "Blocked (NXDOMAIN)": "Bloqueado (NXDOMAIN)",
            "Blocked (DROP)": "Bloqueado (DROP)",
            "Redirected (A)": "Redirigido (A)",
            "Redirected (AAAA)": "Redirigido (AAAA)",
            "Redirected (CNAME)": "Redirigido (CNAME)",

            // ── Check Internet ──
            "Internet Connectivity Diagnostics": "Diagnóstico de Conectividad a Internet",
            "Run Full Test": "Ejecutar Prueba Completa",
            "Running...": "Ejecutando...",
            "Last check: Never": "Última verificación: Nunca",
            "Last check: Failed to retrieve data.": "Última verificación: No se pudieron obtener los datos.",
            "1. Gateway & Global Connectivity Status": "1. Estado de Puerta de Enlace y Conectividad Global",
            "2. DNS-Specific Connectivity": "2. Conectividad Específica de DNS",
            "3. Public Identity & ISP Data": "3. Identidad Pública y Datos del ISP",
            "Gateway Reachability (": "Alcance de Puerta de Enlace (",
            "Global Ping (8.8.8.8)": "Ping Global (8.8.8.8)",
            "Packet Loss": "Pérdida de Paquetes",
            "Upstream Resolver (8.8.8.8)": "Resolvedor Ascendente (8.8.8.8)",
            "Upstream Resolver (1.1.1.1)": "Resolvedor Ascendente (1.1.1.1)",
            "Root Hints Reachability": "Alcance de Servidores Raíz",
            "Resolution Test (google.com)": "Prueba de Resolución (google.com)",
            "Public IP Address": "Dirección IP Pública",
            "ISP Name & ASN": "Nombre del ISP y ASN",
            "Geographic Location": "Ubicación Geográfica",
            "Reachable": "Alcanzable",
            "Unreachable": "Inalcanzable",
            "Unreachable (ISP Blocked / Offline)": "Inalcanzable (ISP Bloqueado / Desconectado)",
            "Failed": "Fallido",

            // ── DNS Cache ──
            "DNS Cache Performance & Memory": "Rendimiento y Memoria de Caché DNS",
            "Refresh": "Actualizar",
            "Flush Entire Cache": "Vaciar Toda la Caché",
            "Hit Ratio (Hits / Total)": "Proporción de Aciertos (Aciertos / Total)",
            "Total Latency Saved (Est.)": "Latencia Total Ahorrada (Est.)",
            "Memory Footprint": "Huella de Memoria",
            "Total Cache Entries": "Total de Entradas en Caché",
            "Cache Expiration Overview": "Resumen de Expiración de Caché",
            "Expiring Soon (<5m)": "Expira Pronto (<5m)",
            "Long Lifetime (≥5m)": "Larga Duración (≥5m)",
            "Search & Flush Domain": "Buscar y Vaciar Dominio",
            "Look up domains in cache or force flush a specific domain.": "Busque dominios en caché o fuerce el vaciado de un dominio específico.",
            "Search": "Buscar",
            "Flush": "Vaciar",
            "Top Cached Domains": "Dominios en Caché Principales",
            "Record Type": "Tipo de Registro",
            "Value": "Valor",
            "Instances": "Instancias",
            "Top Top-Level Domains (TLDs)": "Principales Dominios de Nivel Superior (TLDs)",
            "Count": "Recuento",
            "Cache Record Types": "Tipos de Registro en Caché",
            "e.g. google.com": "ej. google.com",
            "Flushing...": "Vaciando...",
            "Cache is empty.": "La caché está vacía.",
            "No data.": "Sin datos.",
            "No matching domains found in cache.": "No se encontraron dominios coincidentes en la caché.",
            "Action": "Acción",

            // ── Response Policy ──
            "Response Policy Zone (RPZ) Management": "Gestión de Zona de Política de Respuesta (RPZ)",
            "RPZ Rule Manager": "Administrador de Reglas RPZ",
            "Domain (Trigger)": "Dominio (Disparador)",
            "Action Type": "Tipo de Acción",
            "Target (for CNAME/A)": "Destino (para CNAME/A)",
            "Comments/Reason": "Comentarios/Razón",
            "Actions": "Acciones",
            "Save Rules to File": "Guardar Reglas en Archivo",
            "Bulk Operations & Import": "Operaciones Masivas e Importación",
            "Bulk Import Domains": "Importación Masiva de Dominios",
            "Paste Text / Domains": "Pegar Texto / Dominios",
            "Import Domains": "Importar Dominios",
            "Safety & Service": "Seguridad y Servicio",
            "Reload Service (rndc)": "Recargar Servicio (rndc)",
            "Reload Service": "Recargar Servicio",
            "Sync Feed": "Sincronizar Fuente",
            "Feed URL (e.g., StevenBlack hosts)": "URL de Fuente (ej., StevenBlack hosts)",
            "Delete": "Eliminar",
            "Saving...": "Guardando...",
            "Reloading...": "Recargando...",
            "Syncing...": "Sincronizando...",

            // ── System Users ──
            "User Management": "Gestión de Usuarios",
            "Sort by:": "Ordenar por:",
            "Role (SAdmin first)": "Rol (SAdmin primero)",
            "Username (A-Z)": "Usuario (A-Z)",
            "Add User": "Agregar Usuario",
            "Username": "Usuario",
            "Password": "Contraseña",
            "Role": "Rol",
            "Last Login": "Último Acceso",
            "Edit": "Editar",
            "Save": "Guardar",
            "Enter username": "Ingrese el usuario",
            "Enter password": "Ingrese la contraseña",
            "New Password (leave blank to keep current)": "Nueva Contraseña (dejar en blanco para mantener la actual)",
            "Username and password are required.": "El usuario y la contraseña son obligatorios.",
            "Network error.": "Error de red.",

            // ── Compare Performance ──
            "DNS Resolver Race": "Carrera de Resolvedores DNS",
            "Start Race": "Iniciar Carrera",
            "Speed Comparison (Cold vs Cached)": "Comparación de Velocidad (Frío vs Caché)",
            "Detailed Metrics": "Métricas Detalladas",
            "Resolver": "Resolvedor",
            "Cold Start (ms)": "Arranque en Frío (ms)",
            "Cached Response (ms)": "Respuesta en Caché (ms)",
            "Success Rate (%)": "Tasa de Éxito (%)",
            "Benchmark Domain List (50 Domains)": "Lista de Dominios de Prueba (50 Dominios)",
            "Save Domains": "Guardar Dominios",
            "Pi Wins!": "¡Pi Gana!",
            "Saved!": "¡Guardado!",
            "Error!": "¡Error!",
            "Running test against all resolvers. This may take a few seconds...": "Ejecutando prueba contra todos los resolvedores. Esto puede tardar unos segundos...",
            "Benchmark failed to complete.": "La prueba no se pudo completar.",

            // ── DNSSEC Validation Explorer ──
            "DNSSEC Explorer": "Explorador DNSSEC",
            "DNSSEC Validation Explorer": "Explorador de Validación DNSSEC",
            "Test Validation": "Probar Validación",
            "Validating...": "Validando...",
            "Enter a domain to trace how the recursive resolver builds and validates the DNSSEC Chain of Trust, from the Root Zone down to the signed A record.": "Ingrese un dominio para rastrear cómo el resolvedor recursivo construye y valida la Cadena de Confianza DNSSEC, desde la Zona Raíz hasta el registro A firmado.",
            "Chain of Trust": "Cadena de Confianza",
            "Raw Cryptographic Records": "Registros Criptográficos",
            "Validation Trace (delv)": "Traza de Validación (delv)",
            "Run a validation to see the trace.": "Ejecute una validación para ver la traza.",
            "Run a validation to build the chain.": "Ejecute una validación para construir la cadena.",
            "Please enter a domain.": "Por favor ingrese un dominio.",
            "e.g. example.com": "ej. example.com",
            "Root Zone (.)": "Zona Raíz (.)",
            "Resource Record Set (RRset)": "Conjunto de Registros (RRset)",
            "A record signed by the Zone Signing Key (ZSK).": "Registro A firmado por la Clave de Firma de Zona (ZSK).",
            "A record has no RRSIG signature.": "El registro A no tiene firma RRSIG.",
            "Root DNSKEY verified against the built-in Trust Anchor.": "DNSKEY raíz verificado contra el Ancla de Confianza integrada.",
            "DNSKEY (KSK / ZSK)": "DNSKEY (KSK / ZSK)",
            "DS (Delegation Signer)": "DS (Firmante de Delegación)",
            "RRSIG (Signatures)": "RRSIG (Firmas)",
            "A Records": "Registros A",
            "No records returned.": "No se devolvieron registros.",
            "No trace available.": "No hay traza disponible.",
            "None.": "Ninguno.",
            "SECURE": "SEGURO",
            "INSECURE": "INSEGURO",
            "BOGUS": "NO VÁLIDO",

            // ── Login ──
            "Sign In": "Iniciar Sesión",
            "Enter your username": "Ingrese su usuario",
            "Enter your password": "Ingrese su contraseña",
            "Login successful!": "¡Inicio de sesión exitoso!",
            "Invalid username or password.": "Usuario o contraseña inválidos."
        }
    };

    var STORAGE_KEY = "dnsraspi_lang";
    var ATTRS = ["placeholder", "title", "aria-label"];

    function getLang() {
        try { return localStorage.getItem(STORAGE_KEY) || "en"; }
        catch (e) { return "en"; }
    }

    function setLang(lang) {
        try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    }

    function norm(s) {
        return s.replace(/\s+/g, " ").trim();
    }

    // Allow ?lang=es to force + persist a language (deep-linking / testing).
    try {
        var qp = new URLSearchParams(location.search).get("lang");
        if (qp === "en" || qp === "es") setLang(qp);
    } catch (e) {}

    var lang = getLang();
    var table = DICT[lang] || null;

    function lookup(text) {
        if (!table) return null;
        var key = norm(text);
        if (!key) return null;
        var val = table[key];
        return (val && val !== key) ? val : null;
    }

    var observer = null;

    function translateTextNode(node) {
        var t = lookup(node.nodeValue);
        if (t !== null) node.nodeValue = t;
    }

    function translateElementAttrs(el) {
        for (var i = 0; i < ATTRS.length; i++) {
            var a = ATTRS[i];
            if (el.hasAttribute && el.hasAttribute(a)) {
                var t = lookup(el.getAttribute(a));
                if (t !== null) el.setAttribute(a, t);
            }
        }
    }

    var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1 };

    function shouldSkip(el) {
        // Don't retranslate the language selector's own options.
        return el.id === "langSelect" || (el.closest && el.closest("#langSelect"));
    }

    function walk(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            translateTextNode(node);
            return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        if (SKIP_TAGS[node.tagName]) return;
        if (shouldSkip(node)) return;
        translateElementAttrs(node);
        var child = node.firstChild;
        while (child) {
            var next = child.nextSibling;
            walk(child);
            child = next;
        }
    }

    function translateAll() {
        if (!table) return;
        if (observer) observer.disconnect();
        walk(document.body);
        if (document.title) {
            var tt = lookup(document.title);
            if (tt !== null) document.title = tt;
        }
        if (observer) observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    }

    function startObserver() {
        if (!table || !window.MutationObserver) return;
        observer = new MutationObserver(function (mutations) {
            observer.disconnect();
            for (var i = 0; i < mutations.length; i++) {
                var m = mutations[i];
                if (m.type === "characterData") {
                    translateTextNode(m.target);
                } else {
                    for (var j = 0; j < m.addedNodes.length; j++) {
                        walk(m.addedNodes[j]);
                    }
                }
            }
            observer.observe(document.body, { childList: true, subtree: true, characterData: true });
        });
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    }

    function wireSelector() {
        var sel = document.getElementById("langSelect");
        if (!sel) return;
        sel.value = lang;
        sel.addEventListener("change", function () {
            setLang(sel.value);
            location.reload();
        });
    }

    function init() {
        wireSelector();
        translateAll();
        startObserver();
    }

    // Expose a translator for any script that wants explicit lookups.
    window.I18N = {
        t: function (text) { var v = lookup(text); return v !== null ? v : text; },
        lang: lang
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
