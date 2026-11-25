# Protocolo Claude ↔ Codex

Las reglas generales (un escritor por turno, auditor de solo lectura, autorización explícita del propietario, seguridad, etc.) viven en `AGENTS.md` — este documento solo cubre la mecánica específica del protocolo de turnos y los prompts de arranque, sin repetir esas reglas.

## Secuencia de un turno

1. El propietario asigna escritor, auditor, alcance y base de Git (commit/checkpoint exacto). El escritor verifica ese estado y lo registra en `docs/agents/HANDOFF.md`.
2. El escritor implementa y prueba localmente; entrega diff y reporte, detiene sus propios procesos (servidores, Docker si lo levantó él) y cede el turno. Ningún commit sin autorización explícita para ese commit en particular.
3. El auditor revisa el diff y los contratos sin editar nada. Si necesita correr pruebas que muten datos, solo puede hacerlo tras una cesión explícita de recursos por parte del propietario (worktree + DB aislada propios, o turno serial con el stack ya libre). Entrega hallazgos con severidad, archivo/línea, evidencia, y distingue explícitamente hipótesis de hechos verificados.
4. El propietario decide qué corregir; el escritor original (o el que se autorice) aplica los cambios. El auditor verifica si corresponde, en un nuevo ciclo.
5. El propietario autoriza el commit de archivos explícitos. El escritor actualiza `docs/agents/HANDOFF.md` y `docs/agents/CHECKPOINTS.md` con el estado real (hash verdadero, nunca inventado) antes de ceder el turno. Ningún push ni deploy implícito por haber hecho commit.

## Antigravity

Abrir la raíz real del repositorio en ambos agentes. Instalar o iniciar sesión en las extensiones oficiales si son compatibles con la versión del IDE; alternativa válida: la CLI oficial de cada agente en una terminal integrada. Verificar que cada agente efectivamente lee `AGENTS.md` (ambos) y, si es Claude Code, también `CLAUDE.md`. No asumir que los dos agentes comparten sesión, memoria o permisos entre sí — cada uno parte de cero salvo lo que esté escrito en `docs/agents/`. Si el IDE tiene reglas propias (de Antigravity), alinearlas con lo de aquí sin duplicar políticas — y si hay conflicto, `AGENTS.md`/`docs/agents/SECURITY.md` prevalecen. Mantener la autoejecución limitada y pedir aprobación explícita para cualquier comando sensible (escritura, red, procesos).

## Primer prompt de Codex (solo lectura)

> Lee `AGENTS.md` y todo `docs/agents/`. Verifica HEAD, `git status`, `git log` y el diff del checkpoint 13 contra la base que se te indique. Revisa `getSetting`, `fetchSettingRaw`, `mergeSettingValue`, sus pruebas y la semántica de errores/defaults descrita en `docs/agents/REPORT-7B1.md`. Confirma que coincide con el código real y detecta cualquier regresión. Señala cualquier discrepancia entre estos documentos y el código o el historial de Git. No edites ningún archivo, no ejecutes pruebas mutantes, no leas secretos, no hagas commit/push/deploy. Entrega hallazgos con evidencia concreta (archivo/línea) y, si corresponde, una propuesta acotada para la fase siguiente — sin implementarla. Espera autorización antes de cualquier acción adicional.

## Prompt de cesión de turno

> Termina la tarea actual en el punto en que esté. Entrega: estado de Git (HEAD, rama, diff), archivos tocados, resultado de las pruebas que realmente corriste (o la aclaración de que no corriste ninguna), procesos y recursos que tengas ocupados. Detén únicamente los procesos que vos mismo iniciaste, y solo si es seguro hacerlo. No continúes ni modifiques nada más hasta recibir nueva autorización del propietario.
