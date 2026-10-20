import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { RyvoraMark } from './RyvoraLogo';

/**
 * Full-bleed backdrop for brand moments (sign-in, sign-up, first run): a faint
 * oversized mark at the top edge and a violet wash fading into charcoal.
 */
export function BrandBackdrop() {
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      <LinearGradient
        colors={['rgba(139, 124, 255, 0.13)', 'rgba(139, 124, 255, 0)']}
        start={{ x: 0.9, y: 0 }}
        end={{ x: 0.3, y: 0.55 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.mark}>
        <RyvoraMark size={300} color="rgba(139, 124, 255, 0.06)" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { position: 'absolute', top: -40, right: -110 },
});
