import { Text, TextInput } from 'react-native';
import { fonts } from '@/theme/tokens';

/**
 * Define a fonte da marca (Quicksand) como predefinição em TODOS os componentes
 * de texto, sem ter de a repetir em cada ecrã. Os estilos locais continuam a
 * poder sobrepor (ex.: títulos com Quicksand Bold).
 *
 * Defensivo: envolvido em try/catch para nunca quebrar o arranque caso a API
 * de defaults mude numa futura versão do React Native.
 */
export function applyBrandFont(): void {
  try {
    const setDefault = (Comp: any) => {
      Comp.defaultProps = Comp.defaultProps || {};
      const prev = Comp.defaultProps.style;
      Comp.defaultProps.style = [{ fontFamily: fonts.bodyRegular }, prev].filter(Boolean);
      // Mantém o texto legível com fontes maiores (acessibilidade controlada).
      Comp.defaultProps.allowFontScaling = Comp.defaultProps.allowFontScaling ?? true;
    };
    setDefault(Text);
    setDefault(TextInput);
  } catch {
    // Se falhar, a app usa a fonte do sistema — sem quebrar.
  }
}
