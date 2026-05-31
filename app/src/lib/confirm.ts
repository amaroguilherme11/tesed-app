import { Alert, Platform } from 'react-native';

/**
 * Confirmação cross-platform.
 * No telemóvel usa Alert.alert (com botões). Na WEB, o Alert.alert do
 * React Native Web NÃO dispara os callbacks dos botões, por isso usamos
 * window.confirm. Assim "Revogar"/"Remover" funcionam em ambos.
 */
export function confirmAction(params: {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}): void {
  const { title, message, confirmLabel = 'Confirmar', destructive = false, onConfirm } = params;

  if (Platform.OS === 'web') {
    const ok = (globalThis as any).window?.confirm(`${title}\n\n${message}`);
    if (ok) onConfirm();
    return;
  }

  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}
