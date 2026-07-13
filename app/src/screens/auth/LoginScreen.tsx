import { useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/i18n';
import { colors, fontSize, spacing } from '@/theme';

// Logótipo oficial Tesed (horizontal).
const logo = require('../../../assets/logo.png');

export function LoginScreen({ navigation }: any) {
  const { signIn } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (e: any) {
      Alert.alert(t.auth.loginErrorTitle, e.message ?? t.auth.unknownError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Image source={logo} style={styles.logo} resizeMode="contain" />
      <Text style={styles.subtitle}>{t.auth.tagline}</Text>

      <View style={styles.form}>
        <TextField
          label={t.auth.email}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <TextField
          label={t.auth.password}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />
        <Button title={t.auth.login} onPress={onSubmit} loading={loading} />
        <Button
          title={t.auth.forgotPassword}
          variant="ghost"
          onPress={() => navigation.navigate('ForgotPassword')}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>{t.auth.noAccount}</Text>
        <Button title={t.auth.createPatientAccount} variant="ghost" onPress={() => navigation.navigate('Register')} />
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
