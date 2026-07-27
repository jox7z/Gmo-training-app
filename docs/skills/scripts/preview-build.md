# Script: preview build (APK Android)

## Qué hace

Genera un APK distribuible para que probadores instalen la app sin
necesitar Expo Go ni estar en la misma red.

## Pre-requisitos

- `eas-cli` instalado globalmente: `npm install -g eas-cli`
- Cuenta Expo: `eas login`
- Secretos cargados en EAS:
  ```powershell
  eas secret:list
  ```
  Debe aparecer `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
  Si faltan:
  ```powershell
  eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://..."
  eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJ..."
  ```

## Cómo correr

```powershell
eas build --profile preview --platform android
```

- Si pide generar keystore → **Yes, generate new keystore** (EAS lo guarda)
- Sube los archivos (1-3 min)
- Compila en la nube (10-25 min en cola gratis)
- Al terminar imprime URL `https://expo.dev/.../builds/<id>`

## Distribuir a probadores

1. Abrir la URL del build
2. Botón **Install** → da QR + link de descarga del `.apk`
3. Probador: descarga APK → Android pide permitir "fuentes desconocidas"
   → habilita el permiso al navegador → instala

## Subir versión sin re-buildear (OTA)

`expo-updates` ya está instalado y `eas.json` define 3 canales:
`development`, `preview`, `production` (uno por perfil de build).

```powershell
eas update --branch preview --message "fix login flow"
# o --branch development / --branch production
```

El `--branch` debe coincidir con el `channel` del build que instaló el probador,
si no el update no le llega.

La app se actualiza sola al siguiente arranque. **No funciona para cambios
nativos** (dependencias nuevas, plugins de Expo nuevos, assets del manifest).

> ⚠️ **Falta activarlo (pasos con credenciales, aún no ejecutados):**
> ```powershell
> eas login
> eas init              # crea/vincula el proyecto, IMPRIME el projectId por consola
> eas update:configure  # ídem para confirmar canales/updates.url
> ```
> `app.config.js` es config **dinámica** (`.js`) — `eas-cli` NO puede escribirle
> automático (solo escribe sobre `app.json` estático), así que estos comandos
> imprimen el `projectId` en vez de guardarlo solos. Copiarlo a mano en
> `app.config.js`: descomentar `extra.eas.projectId` y `updates.url` (ya están
> ahí como placeholder comentado, con la instrucción inline).
>
> Recién después: un `eas build` nuevo (el APK debe incluir `expo-updates`) y
> luego ya sirven los `eas update`. Un build viejo NO recibe OTA.
>
> `runtimeVersion` está fijado a `'1.0.0'` (string literal, no la policy
> `appVersion` — falla en SDK 54, expo/expo #45276). Un update solo llega a
> builds con el MISMO `runtimeVersion`: si lo cambiás, hay que re-buildear.

## Errores típicos

| Error | Solución |
|---|---|
| Build falla en "Install dependencies" | Borrar `package-lock.json` local, `npm install`, commit |
| App crashea al abrir tras instalar | Secretos no cargados — verifica con `eas secret:list` |
| Android dice "no se pudo instalar" | APK firmado con otra keystore — desinstala primero la versión anterior |
| Tamaño del APK >100 MB | Normal hasta cierto punto. Si crece más, revisa assets sin comprimir |

## Cuándo correr

- Cuando termines un sprint relevante para usuarios externos
- Para enviar a un probador específico (amigo, beta tester)
- NO para cada commit — gasta cuota de builds de EAS
