import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import * as Linking from 'expo-linking';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/i18n';
import { colors, fontSize, spacing } from '@/theme';

export function ForgotPasswordScreen({ navigation }: any) {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setLoading(true);
    try {
      // redirectTo abre a app (deep link) na rota de recuperação de password.
      const redirectTo = Linking.createURL('reset-password');
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });
      if (error) throw error;
      Alert.alert(t.auth.emailSentTitle, t.auth.emailSentMsg);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert(t.auth.errorTitle, e.message ?? t.auth.forgotErrorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>{t.auth.forgotTitle}</Text>
      <Text style={styles.subtitle}>{t.auth.forgotSubtitle}</Text>
      <TextField
        label={t.auth.email}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Button title={t.auth.sendLink} onPress={onSubmit} loading={loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  subtitle: { fontSize: fontSize.base, color: colors.textMuted, marginVertical: spacing.md },
});
