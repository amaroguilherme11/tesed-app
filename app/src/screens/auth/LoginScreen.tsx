import { useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { useAuth } from '@/contexts/AuthContext';
import { colors, fontSize, spacing } from '@/theme';

// Logótipo oficial Tesed (horizontal).
const logo = require('../../../assets/logo.png');

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
      <Image source={logo} style={styles.logo} resizeMode="contain" />
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
  logo: { width: '70%', height: 90, alignSelf: 'center', marginTop: spacing.xl },
  subtitle: { fontSize: fontSize.base, color: colors.textMuted, marginTop: spacing.md, textAlign: 'center' },
  form: { marginTop: spacing.xl },
  footer: { marginTop: 'auto', alignItems: 'center', paddingTop: spacing.xl },
  footerText: { color: colors.textMuted, fontSize: fontSize.sm },
});
