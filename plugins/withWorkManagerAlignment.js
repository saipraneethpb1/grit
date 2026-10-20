/**
 * Aligns AndroidX WorkManager across native dependencies.
 *
 * react-native-android-widget brings work-runtime 2.8.1, while another
 * dependency resolves work-runtime-ktx 2.7.1 transitively. From 2.8 the ktx
 * extensions live in work-runtime itself, so both on the classpath fail
 * `checkReleaseDuplicateClasses`. Forcing ktx to the same version leaves it an
 * empty shim and removes the duplicates.
 */
const { withAppBuildGradle } = require('expo/config-plugins');

const VERSION = '2.8.1';
const MARKER = '// ryvora: align WorkManager';

module.exports = function withWorkManagerAlignment(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (!cfg.modResults.contents.includes(MARKER)) {
      cfg.modResults.contents += `
${MARKER}
configurations.all {
    resolutionStrategy {
        force 'androidx.work:work-runtime:${VERSION}'
        force 'androidx.work:work-runtime-ktx:${VERSION}'
    }
}
`;
    }
    return cfg;
  });
};
