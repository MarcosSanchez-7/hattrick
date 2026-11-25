<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## HATTRICK — instrucciones compartidas (Claude Code y Codex)

Este archivo es la fuente principal de instrucciones compartidas para cualquier agente que trabaje en este repositorio. `CLAUDE.md` añade solo lo específico de Claude Code; Codex lee este archivo directamente, sin un archivo adicional. Todo lo de abajo vive **fuera** del bloque administrado por Next.js de arriba — `next dev` nunca lo toca ni lo borra (ver `node_modules/next/dist/server/lib/generate-agent-files.js`: solo reemplaza el contenido entre `BEGIN:nextjs-agent-rules`/`END:nextjs-agent-rules`).

Antes de cualquier tarea, lee `docs/agents/HANDOFF.md`, `docs/agents/PLAN.md` y `docs/agents/SECURITY.md`. Consulta el resto de `docs/agents/` según la tarea:

- `PROJECT_CONTEXT.md` — qué es HATTRICK, objetivo vigente, restricciones de negocio.
- `ARCHITECTURE.md` — arquitectura reportada (caché, ISR, prefetch, cuellos de botella pendientes).
- `TESTING.md` — entorno de pruebas aislado, guard obligatorio, suites existentes.
- `BENCHMARKS.md` — mediciones históricas, con su alcance y limitaciones.
- `CHECKPOINTS.md` — historial de commits verificado contra Git.
- `WORKFLOW.md` — protocolo de coordinación entre agentes.

El código y el historial de Git prevalecen siempre sobre lo escrito en estos documentos. Una discrepancia se informa al propietario; nunca se corrige en silencio ni se asume que el Markdown tiene razón.

### Reglas de coordinación multiagente

- Un único agente tiene permiso de escritura por turno, asignado explícitamente por el propietario en `docs/agents/HANDOFF.md`. Cualquier otro agente es auditor de solo lectura por defecto.
- El auditor nunca modifica `HANDOFF.md`. Solo el escritor autorizado del turno lo actualiza.
- Un informe de auditoría nunca concede permiso de implementación, commit, push ni avance de fase — eso lo decide el propietario por separado, incluso si el informe no encontró problemas.
- Ningún agente se asigna un turno a sí mismo, ni extiende el alcance autorizado por su cuenta.
- Antes de actuar: verificar raíz real del repositorio, HEAD, rama, `git status`, el alcance autorizado y quién tiene el turno vigente. Si aparecen cambios ajenos inesperados o una tarea activa de otro agente, detenerse y consultar al propietario.
- Git worktrees separan archivos de trabajo, **no** Docker, Supabase local, puertos ni procesos. Ningún agente ejecuta un reset de Supabase (`supabase db reset` o equivalente) mientras otro esté usando el mismo stack local. No iniciar trabajo paralelo mutante sin aislamiento real de esos recursos verificado primero.
- No usar `git reset --hard`, `git clean`, force push ni otras operaciones destructivas de Git sin autorización específica para esa acción puntual.
- No hacer commit, push, deploy ni ninguna escritura remota sin autorización explícita para ese cambio concreto.
- No leer, imprimir ni exponer credenciales reales, secretos o `.env.local` en ningún documento, log o salida.
- Cambios pequeños, reversibles, sin refactors fuera del alcance autorizado. No modificar lógica comercial, TTL, invalidaciones, esquema SQL ni seguridad fuera de lo explícitamente pedido.
- Solo Supabase local y los lanzadores de prueba aislados (`dev:test`/`build:test`/`start:test`, guard obligatorio) para cualquier prueba que mute datos — ver `docs/agents/TESTING.md`. Nunca producción ni infraestructura externa.
- Medir antes/después con el mismo dataset cuando corresponda; distinguir HTTP efectivo, construcción de query builders, SQL, caché y bytes. No confundir una medición local con una estimación de facturación.
- Entregar siempre diff, evidencia, pruebas ejecutadas (o la aclaración explícita de que no se ejecutaron), limitaciones, procedimiento de rollback y estado final de Git. No declarar pruebas como aprobadas si no se corrieron.
- Mantener la documentación modular (un documento por tema en `docs/agents/`) para no inflar el contexto que cada agente tiene que cargar.
