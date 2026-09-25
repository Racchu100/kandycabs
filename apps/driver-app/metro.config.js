const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const metroResolver = require('metro-resolver');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');
const react1820Dir = path.resolve('D:/Rakshith/standalone-router-test/node_modules/react');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo + the react 18.2.0 directory
config.watchFolders = [monorepoRoot, react1820Dir];

// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

config.resolver.blockList = [
  /.*\/dist\/.*/,
  /.*\/android\/app\/build\/.*/,
  /.*\/android\/\.gradle\/.*/,
  /.*\/apps\/web\/\.next\/.*/,
  /.*\/apps\/admin\/\.next\/.*/,
];

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  'react': react1820Dir,
  '@kandy-cabs/shared': path.resolve(monorepoRoot, 'packages/shared'),
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react') {
    return {
      filePath: path.resolve(react1820Dir, 'index.js'),
      type: 'sourceFile',
    };
  }
  if (moduleName === 'react/jsx-runtime') {
    return {
      filePath: path.resolve(react1820Dir, 'jsx-runtime.js'),
      type: 'sourceFile',
    };
  }
  if (moduleName === 'react/jsx-dev-runtime') {
    return {
      filePath: path.resolve(react1820Dir, 'jsx-dev-runtime.js'),
      type: 'sourceFile',
    };
  }
  return metroResolver.resolve(context, moduleName, platform);
};

module.exports = config;
