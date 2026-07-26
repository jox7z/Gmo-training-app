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
  splash: {
    image: './assets/icon.png',
    resizeMode: 'contain',
    backgroundColor: '#0B0B0B',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.gmo.trainingapp',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/icon.png',
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
  },
};
