import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { useAuth } from '@/contexts/AuthContext';
import { colors, fontSize, spacing } from '@/theme';

export function LoginScreen({ navigation }: any) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (e: any) {
      Alert.alert('Não foi possível entrar', e.message ?? 'Erro desconhecido.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Tesed</Text>
      <Text style={styles.subtitle}>Comunicação com o seu médico, sem se perder nada.</Text>

      <View style={styles.form}>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />
        <Button title="Entrar" onPress={onSubmit} loading={loading} />
        <Button
          title="Esqueci-me da password"
          variant="ghost"
          onPress={() => navigation.navigate('ForgotPassword')}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Ainda não tem conta?</Text>
        <Button title="Criar conta de paciente" variant="ghost" onPress={() => navigation.navigate('Register')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.primary, marginTop: spacing.xl },
  subtitle: { fontSize: fontSize.base, color: colors.textMuted, marginTop: spacing.sm },
  form: { marginTop: spacing.xl },
  footer: { marginTop: 'auto', alignItems: 'center', paddingTop: spacing.xl },
  footerText: { color: colors.textMuted, fontSize: fontSize.sm },
});
