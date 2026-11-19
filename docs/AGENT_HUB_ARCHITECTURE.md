# Agent Hub — arquitectura inicial

## Objetivo
Evolucionar Mi Organizador hacia un centro web de organización y agentes IA, preservando calendario, tareas y notificaciones existentes.

## Principios
- Aprobación humana obligatoria antes de cualquier acción externa o irreversible.
- Los agentes preparan propuestas; no envían correos, publican, pagan, contratan ni modifican sistemas externos por su cuenta.
- Separar interfaz pública, backend y secretos.
- Registrar quién solicitó, qué agente trabajó, qué produjo y quién aprobó.
- No migrar ni borrar tareas existentes durante el MVP.

## Componentes
1. Frontend: aplicación web/PWA existente.
2. Backend: Supabase (Auth, Postgres y Edge Functions) o alternativa equivalente.
3. Orquestador: recibe pedidos, clasifica intención y asigna agente.
4. Agentes: Gerente, Ala Brokers, Organizador y Auditor.
5. Bandeja de aprobaciones: propuesta, evidencia, riesgos, botones aprobar/rechazar.
6. Registro de actividad: eventos inmutables de ejecución y aprobación.

## Flujo de estados
recibida -> clasificada -> asignada -> en_proceso -> lista_para_revision -> esperando_aprobacion -> aprobada -> ejecutada
Ramas alternativas: rechazada, requiere_informacion, fallida, cancelada.

## Seguridad
- Claves API exclusivamente en variables/secretos del backend.
- Autenticación individual y políticas RLS por usuario.
- Validación de permisos en servidor; ocultar un botón no constituye autorización.
- Aprobaciones vinculadas a una versión concreta de la propuesta.
- Caducidad de aprobaciones si cambia el contenido propuesto.
- Auditoría de accesos y cambios.
- Copia de seguridad antes de cambios de datos.

## Fases
1. Rama de desarrollo y documentación (esta fase).
2. Interfaz Agent Hub sin IA ni cambios al almacenamiento actual.
3. Modelo de datos y autenticación.
4. Backend seguro y conexión al proveedor de IA.
5. Agente Gerente y bandeja de aprobación.
6. Agente Organizador.
7. Agente Ala Brokers, con datos mínimos y permisos explícitos.
8. Auditoría, límites de consumo y pruebas.

## Fuera del MVP
- Ejecución autónoma de acciones externas.
- Lectura de Gmail/calendario sin conexión y permisos expresos.
- Compartir información sensible entre agentes sin necesidad.
- Prometer ejecuciones en segundo plano antes de implementar y probar el backend.
