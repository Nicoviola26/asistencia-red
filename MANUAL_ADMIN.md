# 📔 Manual del Administrador
## Red Municipal de Formación Docente - Sistema de Asistencia

Este manual detalla todas las funcionalidades del Panel de Administración, diseñado para gestionar de forma integral la formación docente de la red municipal.

---

## 1. Acceso y Panel Principal
El panel principal ofrece una visión general del sistema.
*   **Métricas en Vivo:** Visualiza el total de docentes inscritos, asistencias registradas y capacitaciones realizadas.
*   **Próximo Evento:** Una tarjeta destacada muestra la capacitación más cercana, su disertante, lugar y estado (Habilitada/Deshabilitada).
*   **Accesos Directos:** Botones rápidos para las tareas más frecuentes.

---

## 2. Gestión de Capacitaciones 🎓
Ubicación: `/admin/capacitaciones`
Desde aquí puedes crear, editar y eliminar los eventos de formación.
*   **Crear Evento:** Define nombre, fecha, hora, lugar, disertante y descripción.
*   **Estado Activa:** Solo las capacitaciones marcadas como "Activas" aparecerán en el formulario público para los docentes. Esto te permite preparar eventos con antelación sin que sean visibles todavía.

---

## 3. Control de Asistencia y Reportes 📋
Ubicación: `/admin/asistencia`
Permite visualizar quiénes asistieron a cada evento.
*   **Filtro por Evento:** Selecciona una capacitación para ver la lista de asistentes.
*   **Exportar PDF:** Genera un "Acta de Asistencia" limpia y profesional, lista para imprimir o archivar digitalmente.
*   **Búsqueda Rápida:** Filtra asistentes por nombre o DNI dentro de la lista.

---

## 4. Mensajería y Notificaciones (Sistema Robusto) ✉️
Ubicación: `/admin/mensajeria`
Este módulo permite comunicación directa con los docentes.

### Envío Individual
Busca a un docente por nombre o DNI, agrégalo a la lista de destinatarios y redacta un mensaje personalizado con archivos adjuntos.

### Envío Masivo (Broadcast)
*   **Por Capacitación:** Envía un mensaje a todos los que asistieron a un evento específico (ideal para enviar material de lectura o certificados).
*   **Por Rol:** Envía a todos los Docentes, Directivos o Estudiantes de la base de datos.

### Funcionamiento en Segundo Plano (QStash)
Al presionar "Enviar", el sistema encola los correos. **Puedes cerrar la pestaña del navegador inmediatamente**. Los correos se enviarán uno a uno automáticamente, asegurando que lleguen a destino aunque sean cientos de destinatarios.

---

## 5. Checklist de Coordinación ⚡
Ubicación: `/admin/checklist`
Una herramienta colaborativa para el equipo de coordinación.
*   **Pasos Pre-Evento:** (ej: Confirmar sonido, imprimir listas).
*   **Durante el Evento:** (ej: Control de refrigerio).
*   **Post-Evento:** (ej: Enviar encuestas de satisfacción).
*   **Sincronización Real:** Si un administrador marca una tarea como completa, todos los demás verán el cambio al instante.

---

## 6. Gestión de Personas 👥
Ubicación: `/admin/personas`
Administra la base de datos de la Red de Formación.
*   **Alta Individual:** Registro manual de un nuevo docente.
*   **Importación Masiva:** Permite cargar cientos de personas desde un archivo Excel siguiendo la plantilla correspondiente.

---

## 7. Modo Offline y Resiliencia 📡
El sistema está preparado para fallos de internet en los eventos:
1.  Si el sitio de registro pierde conexión, verás un aviso de **"Modo Offline"**.
2.  Los docentes pueden seguir registrando su DNI normalmente.
3.  Los datos se guardan en el dispositivo.
4.  Cuando el dispositivo recupera señal, el sistema **sincroniza automáticamente** todos los datos pendientes hacia la base de datos central sin intervención manual.

---

> **Soporte Técnico:** Para cambios en las variables de entorno o configuración de dominios, contactar al desarrollador del sistema.
