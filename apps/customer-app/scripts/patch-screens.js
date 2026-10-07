const fs = require('fs');
const path = require('path');

// Target file path for react-native-screens ScreensModule.kt
const targetPaths = [
  path.resolve(__dirname, '../node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreensModule.kt'),
  path.resolve(__dirname, '../../../node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreensModule.kt')
];

let applied = false;

for (const filePath of targetPaths) {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('catch (exception: Exception)')) {
      content = content.replace('catch (exception: Exception)', 'catch (exception: Throwable)');
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`[patch-screens] Applied Throwable patch to: ${filePath}`);
      applied = true;
    } else if (content.includes('catch (exception: Throwable)')) {
      console.log(`[patch-screens] Patch already present in: ${filePath}`);
      applied = true;
    }
  }
}

if (!applied) {
  console.warn('[patch-screens] Warning: ScreensModule.kt was not found to patch.');
}
