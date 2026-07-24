import { Linking, Platform } from 'react-native';

/**
 * Abre el perfil de Instagram del usuario dado.
 * Intenta la app nativa primero; si falla (no instalada), abre la web.
 */
export async function openInstagram(username: string): Promise<void> {
  const u = username.replace(/^@/, '');
  const appUrl =
    Platform.OS === 'ios'
      ? `instagram://user?username=${u}`
      : `instagram://user?username=${u}`;
  const webUrl = `https://www.instagram.com/${u}/`;

  try {
    const canOpen = await Linking.canOpenURL(appUrl);
    if (canOpen) {
      await Linking.openURL(appUrl);
    } else {
      await Linking.openURL(webUrl);
    }
  } catch {
    // La app nativa lanzó error — fallback a web
    await Linking.openURL(webUrl);
  }
}
