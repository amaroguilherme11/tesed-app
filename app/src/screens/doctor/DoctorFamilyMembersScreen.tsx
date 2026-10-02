import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { DoctorConsultation, getDoctorPatientConsultations } from '@/lib/consultations';
import { doctorSoftDeletePatient } from '@/lib/doctorProfiles';
import { confirmAction } from '@/lib/confirm';
import { HeaderMoreButton, OverlayMenu } from '@/components/HeaderMenu';
import { formatAge } from '@/lib/age';
import { colors, fontSize, radius, shadow, spacing } from '@/theme';

/**
 * Vista de FAMÍLIA do terapeuta: lista de membros (titular + dependentes COM
 * consultas). Tocar num membro abre as consultas SÓ desse membro (drill-down),
 * evitando o clutter de ver tudo junto. O menu "⋯" edita/apaga o TITULAR
 * (os membros editam-se/apagam-se no drill-down de cada um).
 * route.params = { patientId, patientName, patientPhone?, patientDob? }
 */
type MemberRow = {
  memberId: string | null; // null = titular
  label: string;
  dob: string | null;
  unanswered: number;
  standby: number;
  unread: boolean;
};

export function DoctorFamilyMembersScreen({ route, navigation }: any) {
  const { patientId, patientName, patientPhone, patientDob } = route.params;
  const [items, setItems] = useState<DoctorConsultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const load = useCallback(async () => {
    setItems(await getDoctorPatientConsultations(patientId));
    setLoading(false);
  }, [patientId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title: patientName ?? 'Família',
      headerRight: () => <HeaderMoreButton onPress={() => setMenuOpen(true)} />,
    });
  }, [navigation, patientName]);

  const goEditTitular = () =>
    navigation.navigate('DoctorEditProfile', {
      kind: 'patient',
      id: patientId,
      fullName: patientName ?? null,
      dob: patientDob ?? null,
      phone: patientPhone ?? null,
    });

  const onDeleteTitular = () =>
    confirmAction({
      title: 'Apagar conta',
      message: `Apagar a conta de ${patientName ?? ''} (e toda a família)? A pessoa deixa de conseguir entrar. Pode ser restaurada em 30 dias.`,
      confirmLabel: 'Apagar',
      destructive: true,
      onConfirm: async () => {
        try {
          await doctorSoftDeletePatient(patientId);
          navigation.popToTop();
        } catch (e: any) {
          Alert.alert('Erro', e.message ?? 'Não foi possível apagar.');
        }
      },
    });

  // Agrupa as consultas por membro (null = titular) e conta por-responder/standby.
  const rows = useMemo<MemberRow[]>(() => {
    const map = new Map<string, MemberRow>();
    for (const c of items) {
      const key = c.member_id ?? '__titular__';
      if (!map.has(key)) {
        map.set(key, {
          memberId: c.member_id ?? null,
          label: c.member_id ? c.member_name ?? 'Membro' : patientName ?? 'Titular',
          dob: c.member_id ? c.member_dob : patientDob ?? null,
          unanswered: 0,
          standby: 0,
          unread: false,
        });
      }
      const r = map.get(key)!;
      if (c.is_open && c.status === 'unanswered' && !c.is_standby) r.unanswered++;
      if (c.is_open && c.is_standby) r.standby++;
      if (c.has_unread) r.unread = true;
    }
    const titular = map.get('__titular__');
    const rest = [...map.entries()]
      .filter(([k]) => k !== '__titular__')
      .map(([, v]) => v)
      .sort((a, b) => a.label.localeCompare(b.label));
    return [...(titular ? [titular] : []), ...rest];
  }, [items, patientName, patientDob]);

  const openMember = (r: MemberRow) =>
    navigation.navigate('DoctorConsultations', {
      patientId,
      patientName,
      patientPhone,
      patientDob,
      memberId: r.memberId,
      memberName: r.memberId ? r.label : null,
      memberDob: r.memberId ? r.dob : null,
      filterMember: true,
      title: r.label,
    });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.memberId ?? '__titular__'}
        renderItem={({ item }) => {
          const age = formatAge(item.dob);
          return (
            <Pressable
              onPress={() => openMember(item)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <View style={styles.nameRow}>
                {item.unread && <View style={styles.unreadDot} />}
                <Text style={styles.name} numberOfLines={1}>
                  {item.label}
                  {age ? <Text style={styles.age}>{`  ·  ${age}`}</Text> : null}
                </Text>
              </View>
              <View style={styles.badges}>
                {item.unanswered > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.unanswered} POR RESPONDER</Text>
                  </View>
                )}
                {item.standby > 0 && (
                  <View style={[styles.badge, styles.badgeStandby]}>
                    <Text style={styles.badgeText}>{item.standby} EM STANDBY</Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        }}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.empty}>Esta família ainda não tem consultas.</Text>}
      />

      <OverlayMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        items={[
          { label: 'Editar dados (titular)', onPress: goEditTitular },
          { label: 'Apagar conta', danger: true, onPress: onDeleteTitular },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  listContent: { padding: spacing.md },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.base,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  rowPressed: { opacity: 0.85 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  unreadDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary, marginRight: spacing.sm },
  name: { fontSize: fontSize.base, fontWeight: '700', color: colors.text, flex: 1 },
  age: { fontWeight: '400', color: colors.textMuted, fontSize: fontSize.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.unanswered,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeStandby: { backgroundColor: colors.standby },
  badgeText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
});
