import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/i18n';
import { colors, fontSize, spacing } from '@/theme';

/**
 * Ecrã de definição de nova password, mostrado quando o utilizador chega via
 * link de recuperação (evento PASSWORD_RECOVERY). Substitui a necessidade de uma
 * página web (que fica para a próxima versão).
 */
export function ResetPasswordScreen() {
  const { completePasswordReset } = useAuth();
  const { t } = useI18n();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (password.length < 8) {
      return Alert.alert(t.auth.weakPasswordTitle, t.auth.weakPasswordMsg);
    }
    if (password !== confirm) {
      return Alert.alert(t.auth.passwordsDontMatchTitle, t.auth.passwordsDontMatchMsg);
    }
    setLoading(true);
    try {
      await completePasswordReset(password);
      Alert.alert(t.auth.passwordChangedTitle, t.auth.passwordChangedMsg);
    } catch (e: any) {
      Alert.alert(t.auth.errorTitle, e.message ?? t.auth.resetErrorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>{t.auth.resetTitle}</Text>
      <Text style={styles.subtitle}>{t.auth.resetSubtitle}</Text>
      <TextField
        label={t.auth.newPasswordMin}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TextField
        label={t.auth.confirmPassword}
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
      />
      <Button title={t.auth.savePassword} onPress={onSubmit} loading={loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  subtitle: { fontSize: fontSize.base, color: colors.textMuted, marginVertical: spacing.md },
});
