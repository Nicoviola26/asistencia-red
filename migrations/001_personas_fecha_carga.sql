-- Registra en que momento se cargo cada persona a la base.
--
-- Se usa en Mensajeria para ordenar a los alumnos del mas antiguo al mas
-- reciente (y agrupar los correos exportados de a 50).
--
-- Los alumnos que ya estaban cargados quedan con fecha_carga NULL porque no se
-- conoce cuando se los dio de alta. NULL se interpreta como "cargado antes de que
-- existiera el registro", por eso el indice los pone primero en el orden.
--
-- Los upserts que ya existen en la app (importacion de Excel y alta desde el
-- padron de Cuts) mandan solo columnas parciales, asi que al actualizar una
-- persona existente esta columna no se pisa y se conserva la fecha original.

ALTER TABLE personas
    ADD COLUMN IF NOT EXISTS fecha_carga TIMESTAMPTZ;

-- Solo aplica a las altas nuevas; las filas previas quedan en NULL.
ALTER TABLE personas
    ALTER COLUMN fecha_carga SET DEFAULT now();

CREATE INDEX IF NOT EXISTS personas_fecha_carga_idx
    ON personas (fecha_carga ASC NULLS FIRST);
