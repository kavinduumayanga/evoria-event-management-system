const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'controllers');
const files = fs.readdirSync(dir);

files.forEach(file => {
  if (file.endsWith('.ts')) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace all instances of req.params.id with (req.params.id as string)
    // Avoid double replacing
    content = content.replace(/req\.params\.id as string/g, 'req.params.id');
    content = content.replace(/\(req\.params\.id\)/g, 'req.params.id');
    content = content.replace(/req\.params\.id/g, '(req.params.id as string)');

    fs.writeFileSync(filePath, content, 'utf8');
  }
});

console.log('Fixed req.params.id across controllers');
