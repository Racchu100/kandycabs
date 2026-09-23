const fs = require('fs');
const path = require('path');

// Search both local and monorepo root node_modules
const searchDirs = [
  path.resolve(__dirname, '..', 'node_modules'),
  path.resolve(__dirname, '..', '..', '..', 'node_modules'),
  path.resolve(process.cwd(), 'node_modules')
];

for (const baseDir of searchDirs) {
  const expoCorePlugin = path.join(baseDir, 'expo-modules-core', 'android', 'ExpoModulesCorePlugin.gradle');
  if (fs.existsSync(expoCorePlugin)) {
    let content = fs.readFileSync(expoCorePlugin, 'utf8');
    if (!content.includes('project.components.findByName("release") != null')) {
      content = content.replace(
        /from\s+components\.release/g,
        'if (project.components.findByName("release") != null) { from project.components.release }'
      );
      fs.writeFileSync(expoCorePlugin, content, 'utf8');
      console.log(`[patch-modules] Patched ExpoModulesCorePlugin.gradle at ${expoCorePlugin}`);
    }
  }
}
