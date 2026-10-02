import { useLayoutEffect, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { DateField, parseDateBR, formatDateBR } from '@/components/DateField';
import { Button } from '@/components/Button';
import { doctorUpdatePatient, doctorUpdateMember } from '@/lib/doctorProfiles';
import { colors, fontSize, spacing } from '@/theme';

/**
 * Terapeuta edita um perfil: titular (nome, data nasc., telemóvel) ou dependente
 * (nome, data nasc.). route.params = { kind, id, fullName, dob?, phone? }.
 * Ao gravar, volta atrás; a lista anterior recarrega no foco.
 */
export function DoctorEditProfileScreen({ route, navigation }: any) {
  const { kind, id, fullName, dob, phone } = route.params as {
    kind: 'patient' | 'member';
    id: string;
    fullName: string | null;
    dob: string | null;
    phone: string | null;
  };

  const [name, setName] = useState(fullName ?? '');
  const [dateStr, setDateStr] = useState(formatDateBR(dob));
  const [phoneStr, setPhoneStr] = useState(phone ?? '');
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: kind === 'member' ? 'Editar membro' : 'Editar dados' });
  }, [navigation, kind]);

  const onSave = async () => {
    if (!name.trim()) return Alert.alert('Falta o nome', 'Indica o nome completo.');

    // Data de nascimento: vazia = manter sem data; preenchida = tem de ser válida.
    let iso: string | null = null;
    if (dateStr.trim()) {
      iso = parseDateBR(dateStr);
      if (!iso) return Alert.alert('Data inválida', 'Usa o formato DD/MM/AAAA.');
    }

    setSaving(true);
    try {
      if (kind === 'member') {
        await doctorUpdateMember(id, name.trim(), iso);
      } else {
        await doctorUpdatePatient(id, name.trim(), iso, phoneStr.trim() || null);
      }
      Alert.alert('Guardado', 'Os dados foram atualizados.');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Não foi possível guardar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>{kind === 'member' ? 'Editar membro' : 'Editar dados do paciente'}</Text>

      <TextField label="Nome completo" value={name} onChangeText={setName} />
      <DateField label="Data de nascimento" value={dateStr} onChangeText={setDateStr} />
      {kind === 'patient' && (
        <TextField
          label="Telemóvel"
          value={phoneStr}
          onChangeText={setPhoneStr}
          keyboardType="phone-pad"
          placeholder="+351 912345678"
        />
      )}

      <Button title="Guardar alterações" onPress={onSave} loading={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginTop: spacing.md, marginBottom: spacing.lg },
});
