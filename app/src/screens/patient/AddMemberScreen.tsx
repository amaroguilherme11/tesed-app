import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { DateField, parseDateBR } from '@/components/DateField';
import { Button } from '@/components/Button';
import { addMemberProfile } from '@/lib/family';
import { useI18n } from '@/i18n';
import { colors, fontSize, spacing } from '@/theme';

/**
 * Formulário para o titular adicionar um dependente (nome + data de nascimento).
 * Sem email/conta — é um perfil gerido pelo titular.
 */
export function AddMemberScreen({ navigation }: any) {
  const { t } = useI18n();
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!fullName.trim()) {
      return Alert.alert(t.addMember.missingNameTitle, t.addMember.missingNameMsg);
    }
    // Data de nascimento obrigatória (tal como o nome).
    const isoDob = parseDateBR(dob);
    if (!isoDob) {
      return Alert.alert(t.auth.invalidDateTitle, t.auth.invalidDateMsg);
    }
    setLoading(true);
    try {
      await addMemberProfile(fullName.trim(), isoDob);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert(t.addMember.couldNotAddTitle, e.message ?? t.common.unknownError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>{t.addMember.title}</Text>
      <Text style={styles.muted}>{t.addMember.hint}</Text>
      <TextField label={t.auth.fullName} value={fullName} onChangeText={setFullName} />
      <DateField label={t.auth.dateOfBirth} value={dob} onChangeText={setDob} />
      <Button title={t.addMember.addButton} onPress={onSubmit} loading={loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  muted: { fontSize: fontSize.sm, color: colors.textMuted, marginVertical: spacing.md, lineHeight: 20 },
});
