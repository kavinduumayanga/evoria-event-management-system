const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const original = content;
      
      // Remove LinearGradient import
      content = content.replace(/import\s+\{\s*LinearGradient\s*\}\s+from\s+'expo-linear-gradient';?\n?/g, '');
      
      // Remove LinearGradient component entirely
      // Use regex to match <LinearGradient ... /> or <LinearGradient ... >...</LinearGradient>
      content = content.replace(/<LinearGradient[^>]*\/>/g, '');
      content = content.replace(/<LinearGradient[^>]*>[\s\S]*?<\/LinearGradient>/g, '');
      
      // Remove old hardcoded colors that might clash with light mode
      content = content.replace(/'#09060f'/g, "theme.colors.background");
      content = content.replace(/'#140f24'/g, "theme.colors.surface");
      content = content.replace(/backgroundColor:\s*['"]#05050A['"]/g, "backgroundColor: theme.colors.background");
      content = content.replace(/backgroundColor:\s*['"]#11111A['"]/g, "backgroundColor: theme.colors.surface");
      content = content.replace(/color:\s*['"]#F8F8F8['"]/g, "color: theme.colors.text");
      content = content.replace(/color:\s*['"]#A1A1AA['"]/g, "color: theme.colors.textSecondary");

      if (content !== original) {
        fs.writeFileSync(fullPath, content);
        console.log(`Stripped gradients from ${fullPath}`);
      }
    }
  }
}

processDir(path.join(__dirname, 'frontend/src/screens'));
processDir(path.join(__dirname, 'frontend/src/components'));
console.log('Done stripping gradients.');
