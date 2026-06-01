import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { useAuth } from '@/contexts/AuthContext';
import { colors, fontSize, spacing } from '@/theme';

/**
 * Ecrã de definição de nova password, mostrado quando o utilizador chega via
 * link de recuperação (evento PASSWORD_RECOVERY). Substitui a necessidade de uma
 * página web (que fica para a próxima versão).
 */
export function ResetPasswordScreen() {
  const { completePasswordReset } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (password.length < 8) {
      return Alert.alert('Password fraca', 'A password deve ter pelo menos 8 caracteres.');
    }
    if (password !== confirm) {
      return Alert.alert('Não coincidem', 'As duas passwords têm de ser iguais.');
    }
    setLoading(true);
    try {
      await completePasswordReset(password);
      Alert.alert('Password alterada', 'Já podes iniciar sessão com a nova password.');
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Não foi possível alterar a password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Definir nova password</Text>
      <Text style={styles.subtitle}>Escolhe uma nova password para a tua conta.</Text>
      <TextField
        label="Nova password (mín. 8 caracteres)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TextField
        label="Confirmar password"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
      />
      <Button title="Guardar password" onPress={onSubmit} loading={loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  subtitle: { fontSize: fontSize.base, color: colors.textMuted, marginVertical: spacing.md },
});
