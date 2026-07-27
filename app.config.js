// app.config.js takes precedence over app.json — allows process.env injection
/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  name: 'Gmo Training',
  slug: 'gmo-training-app',
  version: '0.1.0',
  // String FIJO a propósito — NO usar la policy { policy: 'appVersion' }:
  // en proyectos SDK 54 `eas update` falla con "sdkVersion 54.0.0 is not supported"
  // (expo/expo #45276 / #45279, sin fix confirmado a julio 2026).
  // Al cambiar este valor se rompe la compatibilidad OTA: hay que re-buildear.
  runtimeVersion: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'gmo',
  userInterfaceStyle: 'dark',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0B0B0B',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.gmo.trainingapp',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0B0B0B',
    },
    package: 'com.gmo.trainingapp',
    softwareKeyboardLayoutMode: 'pan',
  },
  web: {
    bundler: 'metro',
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-updates',
    [
      'expo-image-picker',
      {
        photosPermission: 'Permitir acceso a fotos para subir imágenes de entrenamientos.',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
    // `eas init`/`eas update:configure` NO pueden escribir acá solos — este archivo
    // es config dinámica (.js), y eas-cli solo escribe automático sobre app.json
    // estático. Al correr `eas init`, el CLI imprime el projectId por consola:
    // descomentar la línea de abajo y pegarlo (no es secreto, es un id público).
    // eas: { projectId: 'PEGAR-ACÁ-EL-PROJECT-ID' },
  },
  // Idem: activar recién después de pegar el projectId de arriba. La URL se
  // deriva del mismo projectId, no hace falta pegarla aparte.
  // updates: { url: 'https://u.expo.dev/PEGAR-ACÁ-EL-PROJECT-ID' },
};
