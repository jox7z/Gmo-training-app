---
name: eas-updates-handoff
description: EAS Update (OTA) — config de código lista en repo, pero la activación con credenciales EAS la hace el usuario, no el agente
metadata:
  type: project
---

La config de EAS Update quedó preparada en el repo (2026-07-27, branch
`feat/roadmap-sprint7`): `expo-updates`, `runtimeVersion` fijo, `eas.json`
(canales development/preview/production) y `.easignore`. **Falta la activación**:
`eas login` → `eas init` → `eas update:configure` → primer build.

**Why:** esos comandos crean/vinculan un proyecto real en la cuenta Expo del
usuario y escriben `extra.eas.projectId` + `updates.url` automáticamente. Si el
agente inventa esos valores a mano, rompe el flujo automático de `eas init`.

**How to apply:** nunca correr `eas login`/`init`/`update:configure`/`build`/
`update` — dejarlos como pasos manuales listados al usuario. `runtimeVersion` se
mantiene como string literal (`'1.0.0'`), NO la policy `appVersion`: rompe
`eas update` en SDK 54 (expo/expo #45276). Ver [[project_overview]].
