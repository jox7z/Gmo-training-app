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

Solo si añadiste `expo-updates`:
```powershell
eas update --branch preview --message "fix login flow"
```

La app se actualiza sola al siguiente arranque. **No funciona para cambios
nativos** (dependencias nuevas, plugins de Expo nuevos, assets del manifest).

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
