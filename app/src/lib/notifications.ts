import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/lib/supabase';

/**
 * Notificações push (Fase 7).
 *
 * IMPORTANTE: push remoto NÃO funciona no Expo Go (SDK 53+). Estas funções
 * tratam isso graciosamente — em Expo Go / web / simulador simplesmente não
 * registam, sem rebentar. Num development build, o registo funciona e os
 * tokens são guardados no servidor (tabela device_tokens) para a Edge Function
 * send-notification os usar.
 */

// Como mostrar notificações com a app aberta.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let lastToken: string | null = null;

/** Regista o dispositivo para push e guarda o token no servidor. */
export async function registerForPush(): Promise<void> {
  try {
    // Push remoto só em dispositivo físico (não simulador) e não na web.
    if (Platform.OS === 'web' || !Device.isDevice) return;

    // Em Expo Go o registo de push remoto não é suportado (SDK 53+).
    if (Constants.appOwnership === 'expo') {
      console.log('[Tesed] Push indisponível no Expo Go — usar development build.');
      return;
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as any).easConfig?.projectId;

    const tokenResp = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const token = tokenResp.data;
    if (!token || token === lastToken) return;
    lastToken = token;

    await supabase.rpc('register_device_token', {
      p_token: token,
      p_platform: Platform.OS,
    });
  } catch (e: any) {
    console.warn('[Tesed] Falha a registar push:', e?.message ?? e);
  }
}

/** Remove o token do servidor (ex.: ao terminar sessão neste dispositivo). */
export async function unregisterForPush(): Promise<void> {
  try {
    if (!lastToken) return;
    await supabase.rpc('unregister_device_token', { p_token: lastToken });
    lastToken = null;
  } catch {
    // silencioso
  }
}
