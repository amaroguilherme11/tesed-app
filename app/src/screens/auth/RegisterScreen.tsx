import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { DateField, parseDateBR } from '@/components/DateField';
import { PhoneField, composePhone } from '@/components/PhoneField';
import { Button } from '@/components/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/i18n';
import { colors, fontSize, radius, spacing } from '@/theme';

export function RegisterScreen({ navigation }: any) {
  const { signUpPatient } = useAuth();
  const { t } = useI18n();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [dial, setDial] = useState('351'); // Portugal por defeito
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!fullName.trim()) return Alert.alert(t.auth.missingNameTitle, t.auth.missingNameMsg);
    const isoDob = parseDateBR(dob);
    if (!isoDob) {
      return Alert.alert(t.auth.invalidDateTitle, t.auth.invalidDateMsg);
    }
    const phone = composePhone(dial, phoneNumber);
    if (!phone) {
      return Alert.alert(t.auth.invalidPhoneTitle, t.auth.invalidPhoneMsg);
    }
    if (password.length < 8) {
      return Alert.alert(t.auth.weakPasswordTitle, t.auth.weakPasswordMsg);
    }
    setLoading(true);
    try {
      const { needsConfirmation } = await signUpPatient({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        consent,
        dateOfBirth: isoDob,
        phone,
      });
      if (needsConfirmation) {
        // Confirmação de email ativa: ainda não há sessão. Volta ao login.
        Alert.alert(t.auth.accountCreatedTitle, t.auth.accountCreatedMsg);
        navigation.navigate('Login');
      }
      // Caso contrário, o registo já criou sessão e a navegação por papel
      // leva o paciente diretamente à sua conversa — não navegar manualmente.
    } catch (e: any) {
      Alert.alert(t.auth.createErrorTitle, e.message ?? t.auth.unknownError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>{t.auth.registerTitle}</Text>

      <View style={styles.form}>
        <TextField label={t.auth.fullName} value={fullName} onChangeText={setFullName} />
        <DateField label={t.auth.dateOfBirth} value={dob} onChangeText={setDob} />
        <PhoneField
          label={t.auth.phone}
          dial={dial}
          onChangeDial={setDial}
          number={phoneNumber}
          onChangeNumber={setPhoneNumber}
        />
        <TextField
          label={t.auth.email}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <TextField
          label={t.auth.passwordMin}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {/* Consentimento RGPD explícito — dados de saúde são categoria especial (secção 10). */}
        <Pressable style={styles.consentRow} onPress={() => setConsent((c) => !c)}>
          <View style={[styles.checkbox, consent && styles.checkboxOn]}>
            {consent && <Text style={styles.check}>✓</Text>}
          </View>
          <Text style={styles.consentText}>{t.auth.consent}</Text>
        </Pressable>

        <Button title={t.auth.createAccount} onPress={onSubmit} loading={loading} disabled={!consent} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  form: { marginTop: spacing.lg },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.lg, gap: spacing.sm },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxOn: { backgroundColor: colors.primary },
  check: { color: colors.white, fontWeight: '700' },
  consentText: { flex: 1, color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 },
});
