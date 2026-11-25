@AGENTS.md

## Claude Code — específico

Aplica las instrucciones compartidas de `AGENTS.md` tal cual; esta sección solo agrega lo que es exclusivo de Claude Code, sin repetir nada de allí.

- Si Codex tiene el turno de escritura según `docs/agents/HANDOFF.md`, actuar solo como auditor: revisar diff y contratos sin editar archivos ni ejecutar suites mutantes, y entregar hallazgos al propietario.
- No iniciar tareas paralelas ni nuevas fases por cuenta propia, aunque el propietario esté inactivo.
- La skill `run-hattrick-store` (`.claude/skills/run-hattrick-store/SKILL.md`) es específica de Claude Code — no asumir que Codex la lee o la soporta igual.
