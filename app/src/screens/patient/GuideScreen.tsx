import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '@/i18n';
import { colors, fontSize, radius, shadow, spacing } from '@/theme';

/**
 * Guia visual de utilização (paciente) — dentro da app, bilingue (i18n).
 * Cada passo = número + título + captura + legenda curta.
 *
 * As CAPTURAS são fornecidas depois: coloca os ficheiros em
 * `app/assets/guide/` e mete o `require(...)` no índice certo de GUIDE_IMAGES
 * (a ordem segue os passos de `t.guide.steps`). Enquanto forem `null`, mostra-se
 * um espaço marcado.
 */
// Guarda as capturas em `app/assets/guide/` com estes nomes e, em cada linha,
// tira o `null, //` para deixar só o require(...) — a ordem segue os passos.
const GUIDE_IMAGES: any[] = [
  require('../../../assets/guide/guia-1.png'), // 1. Criar conta
  require('../../../assets/guide/guia-2.png'), // 2. Ativar a subscrição
  require('../../../assets/guide/guia-3.png'), // 3. Abrir uma consulta
  require('../../../assets/guide/guia-4.png'), // 4. Escrever e enviar
  require('../../../assets/guide/guia-5.png'), // 5. Consulta fechada
  require('../../../assets/guide/guia-6.png'), // 6. Plano família
  require('../../../assets/guide/guia-7.png'), // 7. Adicionar um membro
  require('../../../assets/guide/guia-8.png'), // 8. Trocar de idioma
];

export function GuideScreen() {
  const { t } = useI18n();
  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t.guide.title}</Text>
      <Text style={styles.subtitle}>{t.guide.subtitle}</Text>

      {t.guide.steps.map((s, i) => (
        <View key={i} style={styles.card}>
          <View style={styles.head}>
            <View style={styles.numBadge}>
              <Text style={styles.numText}>{i + 1}</Text>
            </View>
            <Text style={styles.stepTitle}>{s.title}</Text>
          </View>

          {GUIDE_IMAGES[i] ? (
            <Image source={GUIDE_IMAGES[i]} style={styles.shot} resizeMode="contain" />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>Captura {i + 1}</Text>
            </View>
          )}

          <Text style={styles.caption}>{s.caption}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text, marginTop: spacing.sm },
  subtitle: { fontSize: fontSize.base, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.base,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  numBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: { color: colors.white, fontWeight: '800', fontSize: fontSize.base },
  stepTitle: { flex: 1, fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  shot: {
    width: '100%',
    height: 460,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    marginBottom: spacing.sm,
  },
  placeholder: {
    width: '100%',
    height: 200,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  placeholderText: { color: colors.textMuted, fontSize: fontSize.sm, fontWeight: '600' },
  caption: { fontSize: fontSize.base, color: colors.text, lineHeight: 22 },
});
