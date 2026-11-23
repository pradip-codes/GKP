// EAS Build lifecycle hook: eas-build-pre-install
// Installs Android SDK packages required by the Expo SDK 58 native toolchain
// that are missing from the default EAS build image.
const { spawnSync } = require('child_process');

if (process.env.EAS_BUILD_PLATFORM !== 'android') {
  process.exit(0);
}

const run = (cmd, args, input) => {
  const result = spawnSync(cmd, args, {
    stdio: input ? ['pipe', 'inherit', 'inherit'] : 'inherit',
    input,
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    console.error(`${cmd} ${args.join(' ')} failed with code ${result.status}`);
    process.exit(result.status || 1);
  }
};

// Accept any pending SDK licenses, then install the CMake version
// required by expo-modules-core / react-native-screens prefab builds.
run('sdkmanager', ['--licenses'], 'y\n'.repeat(50));
run('sdkmanager', ['cmake;3.31.6']);
