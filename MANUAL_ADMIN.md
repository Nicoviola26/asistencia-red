# 📖 Guía Paso a Paso para Coordinadores
## Sistema de Asistencia - Red Municipal de Formación Docente

Esta guía está escrita para ayudarte a usar el sistema de la manera más sencilla posible, incluso si no tienes mucha experiencia con computadoras.

---

## 1. ¿Qué es este sistema?
Es una herramienta digital para que la Municipalidad pueda:
1.  Saber quiénes asisten a las capacitaciones.
2.  Tener una lista de todos los docentes y directivos de la ciudad.
3.  Enviarles información y certificados por correo de forma automática.

---

## 2. Cómo entrar al sistema
1.  Entra a la dirección web que se te entregó (`https://asistencia-red.netlify.app`).
2.  Haz clic en el botón de **candado** en la esquina superior derecha (**"Acceso Administrador"**).
3.  Escribe la contraseña que te entregó la coordinación y presiona **"Entrar al Panel"**.

---

## 3. Cómo cargar a una Persona (Docente o Directivo) 👤
Si llega alguien nuevo que no está en el sistema, sigue estos pasos:
1.  En el menú de la izquierda, haz clic en **"Cargar Persona"**.
2.  Verás un formulario. Completa los datos:
    *   **DNI:** El número sin puntos ni espacios.
    *   **Nombre y Apellido.**
    *   **Correo Electrónico:** Es muy importante para que le lleguen los certificados.
    *   **Rol:** Elige si es Docente, Directivo o Estudiante.
3.  Haz clic en el botón verde **"Registrar Persona"**. ¡Listo!

> **Truco para expertos:** Si tienes una lista de Excel con muchas personas, también puedes usar el botón de "Importar desde Excel" en esa misma pantalla para cargarlas todas juntas.

---

## 4. Cómo crear una nueva Capacitación (Evento) 🎓
Antes de un evento, debes crearlo en el sistema:
1.  En el menú de la izquierda, ve a **"Gestionar Capacitaciones"**.
2.  Haz clic en el botón **"Nueva Capacitación"**.
3.  Completa los datos:
    *   **Nombre:** ¿Cómo se llama el curso o charla?
    *   **Día y Hora:** Cuándo se hace.
    *   **Disertante:** Quién da la charla.
    *   **Estado:** Asegúrate de que esté en **"Habilitada"** (así los docentes podrán inscribirse cuando lleguen).
4.  Presiona **"Crear Capacitación"**.

---

## 5. Cómo ver quiénes asistieron y sacar el PDF 📋
Cuando el evento termina y quieres la lista oficial:
1.  Ve a **"Control Asistencia"** en el menú.
2.  Arriba verás un buscador. Elige el nombre de la capacitación que acaba de pasar.
3.  Aparecerá la lista de todos los que pusieron su DNI ese día.
4.  Si quieres imprimirla o guardarla, haz clic en el botón **"Imprimir Acta"**.

---

## 5 bis. Cómo cargar el padrón de convocados (para que el % sea real) 👥
**Este paso es el más importante para que las estadísticas digan algo.** Si no cargás el padrón, el sistema divide la asistencia por *todas* las personas de la red (629), y el porcentaje sale artificialmente bajo.

1.  En **"Control Asistencia"**, elegí la capacitación.
2.  Presioná el botón verde **"Convocados / Presentes"** (arriba a la derecha). También aparece como **"Cargar Convocados"** en el cartel amarillo del panel lateral.
3.  Dentro del panel tenés dos formas de cargar:

    *   **Buscando una persona:** escribí el DNI, nombre o rol en el buscador y tocá la persona que aparezca. Se suma al padrón.
    *   **Importando un Excel:** presioná **"Importar Excel"** y elegí tu archivo (`.xlsx`, `.xls` o `.csv`). Solo necesita una columna con el **DNI**; el resto de las columnas se ignoran. Los DNIs que no estén en la base de personas se te listan en rojo para que los cargues desde **"Cargar Persona"**.

4.  Una vez cargado el padrón, el porcentaje pasa a calcularse sobre ese grupo y no sobre la red entera.

### Marcar y desmarcar asistencia a mano
En la tabla del padrón, la columna **"Asistió"** tiene un botón por persona:
*   Click en el ícono para **darle la asistencia** (si el participante no puso su DNI en el día, pero estuvo).
*   Click de nuevo para **darle de baja**.

También podés filtrar con los botones **Todos / Asistieron / Ausentes**, y quitar a alguien del padrón con el ícono de papelera.

> **Ejemplo real:** en el *Seminario de Danza Folklórica* hay 79 convocados y 36 asistentes. Con el padrón cargado el sistema muestra **46%**; sin él, mostraba **6%** (36 de 629).

---

## 6. Cómo cargar certificados (PDF de cada participante) 📄
Cuando una capacitación ya se dictó y querés cargar los certificados de los participantes:
1.  En el menú de la izquierda, ve a **"Carga de Certificados"**.
2.  Arriba, seleccioná la **capacitación dictada** (solo aparecen las que ya pasaron de fecha).
3.  Seleccioná **todos los PDFs juntos** (podés elegir varios a la vez). Cada archivo debe llamarse con el **DNI del participante** (ej: `30123456.pdf`) — el DNI se toma de ahí, no se pide en el formulario.
4.  Presiona **"Cargar N Certificados"**.

**Cómo funciona la validación:**
- Los certificados de DNIs que **existen** en la base de personas se cargan.
- Los DNIs que **no existen** se listan en rojo abajo del selector y se avisan, pero **no frenan la carga** de los demás.

**En el listado:**
- Cada fila muestra el DNI, el archivo, la capacitación, la fecha de carga y la cantidad de **vistas** (cuántas veces se abrió el PDF, con el ícono de ojo).
- Podés marcar **varios certificados con los casilleros** y pulsar **"Eliminar seleccionados"** para borrarlos todos juntos. También podés ver el PDF o borrarlo individualmente desde cada fila.

---

## 7. Cómo generar el pedido de certificados (Excel) 📊
Para armarla planilla que se envía para la impresión de los certificados:
1.  En el menú de la izquierda, ve a **"Pedido de Certificados"**.
2.  Elegí la **capacitación**. Se autocompletan el día/mes y el lugar.
3.  Revisá o completá: **días (num) de (mes)**, **mes de emisión**, **programa**, **carga horaria**, **lugar** y **firmantes**.
4.  Presiona **"Generar Excel de Certificados"**.

Se descargará un `.xlsx` con una fila por cada **asistente registrado** en esa capacitación (nombre, apellido, DNI, capacitación, día/mes, programa, horas, emisión, lugar, firmantes y condición).

---

## 8. Enviar mensajes por correo ✉️
¿Quieres enviarles material de lectura a todos los que asistieron?
1.  Ve a **"Mensajería"**.
2.  Busca la sección **"Envío Masivo"**.
3.  Elige "Por Capacitación" y selecciona el evento.
4.  Escribe el **Asunto** y el **Mensaje** (como si fuera un mail normal).
5.  Presiona **"Iniciar Envío Masivo"**.
6.  **Importante:** Ya puedes cerrar la página. El sistema seguirá enviando los mails uno por uno aunque tú apagues la computadora.

---

## 9. Preguntas Frecuentes (S.O.S)
*   **¿Qué pasa si se corta el internet en el evento?**
    Nada. El sistema seguirá recibiendo los DNI de los docentes y los guardará "escondidos" en el navegador. En cuanto el aparato vuelva a tener internet, se subirán solos a la lista.
*   **¿Puedo abrir esto desde mi celular?**
    Sí. Todo el sistema funciona perfecto en celulares y tablets.
*   **Subí un certificado y dice que el DNI no está en la base: ¿qué hago?**
    Ese participante aún no fue dado de alta. Cargalo primero en **"Cargar Persona"** y volvé a subir su certificado.
*   **¿El certificado con cuántas vistas?**
    La columna **Vistas** muestra cuántas veces cada participante abrió su PDF desde la página pública de descarga.

---

*Manual redactado para una gestión simple y eficiente.*
