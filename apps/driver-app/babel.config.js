process.env.EXPO_ROUTER_APP_ROOT = process.env.EXPO_ROUTER_APP_ROOT || './app';

module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxRuntime: 'automatic' }]
    ],
    plugins: [
      function ({ types: t }) {
        return {
          name: 'expo-router-env-fix',
          visitor: {
            MemberExpression(path) {
              if (path.get('object').matchesPattern('process.env')) {
                const key = path.toComputedKey();
                if (t.isStringLiteral(key)) {
                  if (key.value === 'EXPO_ROUTER_APP_ROOT') {
                    path.replaceWith(t.stringLiteral('../../app'));
                  } else if (key.value === 'EXPO_ROUTER_IMPORT_MODE') {
                    path.replaceWith(t.stringLiteral('sync'));
                  } else if (key.value === 'EXPO_ROUTER_ABS_APP_ROOT') {
                    path.replaceWith(t.stringLiteral(__dirname + '/app'));
                  }
                }
              }
            },
          },
        };
      },
    ],
  };
};


