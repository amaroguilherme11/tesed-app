import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { DateField, parseDateBR } from '@/components/DateField';
import { Button } from '@/components/Button';
import { useAuth } from '@/contexts/AuthContext';
import { colors, fontSize, radius, spacing } from '@/theme';

export function RegisterScreen({ navigation }: any) {
  const { signUpPatient } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!fullName.trim()) return Alert.alert('Falta o nome', 'Indica o teu nome completo.');
    const isoDob = parseDateBR(dob);
    if (!isoDob) {
      return Alert.alert('Data inválida', 'Indica a data de nascimento no formato DD/MM/AAAA.');
    }
    if (password.length < 8) {
      return Alert.alert('Password fraca', 'A password deve ter pelo menos 8 caracteres.');
    }
    setLoading(true);
    try {
      const { needsConfirmation } = await signUpPatient({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        consent,
        dateOfBirth: isoDob,
      });
      if (needsConfirmation) {
        // Confirmação de email ativa: ainda não há sessão. Volta ao login.
        Alert.alert(
          'Conta criada',
          'Confirma o teu email para ativar a conta e depois inicia sessão.'
        );
        navigation.navigate('Login');
      }
      // Caso contrário, o registo já criou sessão e a navegação por papel
      // leva o paciente diretamente à sua conversa — não navegar manualmente.
    } catch (e: any) {
      Alert.alert('Não foi possível criar a conta', e.message ?? 'Erro desconhecido.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Criar conta de paciente</Text>

      <View style={styles.form}>
        <TextField label="Nome completo" value={fullName} onChangeText={setFullName} />
        <DateField label="Data de nascimento" value={dob} onChangeText={setDob} />
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <TextField
          label="Password (mín. 8 caracteres)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {/* Consentimento RGPD explícito — dados de saúde são categoria especial (secção 10). */}
        <Pressable style={styles.consentRow} onPress={() => setConsent((c) => !c)}>
          <View style={[styles.checkbox, consent && styles.checkboxOn]}>
            {consent && <Text style={styles.check}>✓</Text>}
          </View>
          <Text style={styles.consentText}>
            Li e aceito a Política de Privacidade e o tratamento dos meus dados de saúde
            para efeitos de comunicação com o médico.
          </Text>
        </Pressable>

        <Button title="Criar conta" onPress={onSubmit} loading={loading} disabled={!consent} />
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
