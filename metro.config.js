const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

const projectRoot = __dirname;
const defaultConfig = getDefaultConfig(projectRoot);
const {assetExts} = defaultConfig.resolver;

const config = {
  resolver: {
    assetExts: assetExts.includes('pdf') ? assetExts : [...assetExts, 'pdf'],
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
