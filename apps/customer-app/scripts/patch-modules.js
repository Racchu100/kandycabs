const fs = require('fs');
const path = require('path');

function patchFile(filePath, searchStr, replaceStr) {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(searchStr)) {
      fs.writeFileSync(filePath, content.replace(searchStr, replaceStr), 'utf8');
      console.log(`Successfully patched: ${filePath}`);
    }
  }
}

// Search both local and monorepo root node_modules
const searchDirs = [
  path.resolve(__dirname, '..', 'node_modules'),
  path.resolve(__dirname, '..', '..', '..', 'node_modules')
];

for (const baseDir of searchDirs) {
  // Patch expo-image
  const expoImageGradle = path.join(baseDir, 'expo-image', 'android', 'build.gradle');
  if (fs.existsSync(expoImageGradle)) {
    let content = fs.readFileSync(expoImageGradle, 'utf8');
    if (content.includes("workingDir(projectDir)")) {
      content = content.replace(
        /def getNodeModulesPackageVersion\(packageName, overridePropName\) \{[\s\S]*?return versionToNumber\([\s\S]*?\)\s*\}/,
        `def getNodeModulesPackageVersion(packageName, overridePropName) {
  def version = rootProject.hasProperty(overridePropName) ? rootProject.property(overridePropName) : (rootProject.ext.has(overridePropName) ? rootProject.ext.get(overridePropName) : null)
  if (!version) {
    try {
      version = providers.exec {
        workingDir(rootDir)
        commandLine("node", "-e", "console.log(require('$packageName/package.json').version);")
      }.standardOutput.asText.get().trim()
    } catch (Exception e) {
      version = "0.74.5"
    }
  }
  def coreVersion = version.split("-")[0]
  def (major, minor, patch) = coreVersion.tokenize('.').collect { it.toInteger() }

  return versionToNumber(
      major,
      minor,
      patch
  )
}`
      );
      fs.writeFileSync(expoImageGradle, content, 'utf8');
      console.log(`Patched expo-image build.gradle at ${expoImageGradle}`);
    }
  }

  // Patch expo-modules-core
  const expoCorePlugin = path.join(baseDir, 'expo-modules-core', 'android', 'ExpoModulesCorePlugin.gradle');
  if (fs.existsSync(expoCorePlugin)) {
    let content = fs.readFileSync(expoCorePlugin, 'utf8');
    if (!content.includes('project.components.findByName("release") != null')) {
      content = content.replace(
        /project\.afterEvaluate \{\s*publishing \{\s*publications \{\s*release\(MavenPublication\) \{\s*from components\.release\s*\}\s*\}\s*repositories \{\s*maven \{\s*url = mavenLocal\(\)\.url\s*\}\s*\}\s*\}\s*\}/,
        `project.afterEvaluate {
    if (project.components.findByName("release") != null) {
      publishing {
        publications {
          release(MavenPublication) {
            from project.components.release
          }
        }
        repositories {
          maven {
            url = mavenLocal().url
          }
        }
      }
    }
  }`
      );
      fs.writeFileSync(expoCorePlugin, content, 'utf8');
      console.log(`Patched ExpoModulesCorePlugin.gradle at ${expoCorePlugin}`);
    }
  }
}
