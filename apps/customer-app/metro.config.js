const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [workspaceRoot];

// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Allow hierarchical lookup for nested package submodules
config.resolver.disableHierarchicalLookup = false;

// 4. Resolve singleton React & React Native paths dynamically across local and hoisted root node_modules
const resolveSingleton = (modulePath) => {
  try {
    return require.resolve(modulePath, { paths: [projectRoot, workspaceRoot] });
  } catch {
    return null;
  }
};

const reactPath = resolveSingleton('react');
const reactJsxRuntimePath = resolveSingleton('react/jsx-runtime');
const reactJsxDevRuntimePath = resolveSingleton('react/jsx-dev-runtime');
const reactNativePath = resolveSingleton('react-native');

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react' && reactPath) {
    return { filePath: reactPath, type: 'sourceFile' };
  }
  if (moduleName === 'react/jsx-runtime' && reactJsxRuntimePath) {
    return { filePath: reactJsxRuntimePath, type: 'sourceFile' };
  }
  if (moduleName === 'react/jsx-dev-runtime' && reactJsxDevRuntimePath) {
    return { filePath: reactJsxDevRuntimePath, type: 'sourceFile' };
  }
  if (moduleName === 'react-native' && reactNativePath) {
    return { filePath: reactNativePath, type: 'sourceFile' };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
