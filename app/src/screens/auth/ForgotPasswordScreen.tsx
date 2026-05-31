import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';
import { colors, fontSize, spacing } from '@/theme';

export function ForgotPasswordScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) throw error;
      Alert.alert('Email enviado', 'Se a conta existir, vais receber instruções por email.');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Não foi possível enviar o email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Recuperar password</Text>
      <Text style={styles.subtitle}>
        Indica o teu email e enviamos um link para definires uma nova password.
      </Text>
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Button title="Enviar link" onPress={onSubmit} loading={loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  subtitle: { fontSize: fontSize.base, color: colors.textMuted, marginVertical: spacing.md },
});
