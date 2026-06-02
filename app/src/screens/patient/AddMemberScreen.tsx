import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { DateField, parseDateBR } from '@/components/DateField';
import { Button } from '@/components/Button';
import { addMemberProfile } from '@/lib/family';
import { colors, fontSize, spacing } from '@/theme';

/**
 * Formulário para o titular adicionar um dependente (nome + data de nascimento).
 * Sem email/conta — é um perfil gerido pelo titular.
 */
export function AddMemberScreen({ navigation }: any) {
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!fullName.trim()) {
      return Alert.alert('Falta o nome', 'Indica o nome completo do membro.');
    }
    // Data de nascimento obrigatória (tal como o nome).
    const isoDob = parseDateBR(dob);
    if (!isoDob) {
      return Alert.alert('Data inválida', 'Indica a data de nascimento no formato DD/MM/AAAA.');
    }
    setLoading(true);
    try {
      await addMemberProfile(fullName.trim(), isoDob);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Não foi possível adicionar', e.message ?? 'Erro desconhecido.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Adicionar membro da família</Text>
      <Text style={styles.muted}>
        Cria um perfil para um familiar (ex.: um filho). Cada membro tem o seu próprio
        chat com o terapeuta, para separar os casos.
      </Text>
      <TextField label="Nome completo" value={fullName} onChangeText={setFullName} />
      <DateField label="Data de nascimento" value={dob} onChangeText={setDob} />
      <Button title="Adicionar membro" onPress={onSubmit} loading={loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  muted: { fontSize: fontSize.sm, color: colors.textMuted, marginVertical: spacing.md, lineHeight: 20 },
});
