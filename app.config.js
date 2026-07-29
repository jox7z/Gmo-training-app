// app.config.js takes precedence over app.json — allows process.env injection
/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  name: 'Gmo Training',
  slug: 'gmo-training-app',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'gmo',
  userInterfaceStyle: 'dark',
  backgroundColor: '#000000',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.gmo.trainingapp',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/icon.png',
      backgroundColor: '#000000',
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
    'expo-dev-client',
    [
      'expo-splash-screen',
      {
        image: './assets/icon.png',
        resizeMode: 'contain',
        backgroundColor: '#000000',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Permitir acceso a fotos para subir imágenes de entrenamientos.',
      },
    ],
    // Fija el toolchain nativo del development build. Coincide con el SDK de
    // Android instalado (platforms/android-36, build-tools/36.0.0) y con el
    // mínimo que exige @shopify/react-native-skia.
    // El NDK NO se fija aquí: `expo-build-properties@1.0.10` no tiene esa clave
    // en su esquema y ajv la descarta en silencio.
    [
      'expo-build-properties',
      {
        android: {
          minSdkVersion: 24,
          compileSdkVersion: 36,
          targetSdkVersion: 36,
          buildToolsVersion: '36.0.0',
        },
        ios: {
          deploymentTarget: '15.1',
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  },
};
