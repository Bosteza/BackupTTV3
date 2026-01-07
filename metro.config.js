const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

const projectRoot = __dirname;

const config = {
  resolver: {
    extraNodeModules: {
      // tell Metro to use our shim whenever code imports 'react-native-fast-image'
      'react-native-fast-image': path.resolve(
        projectRoot,
        'shims/fast-image.js',
      ),
    },
  },
  // keep Metro watching the shims folder (nice-to-have)
  watchFolders: [path.resolve(projectRoot, 'shims')],
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
