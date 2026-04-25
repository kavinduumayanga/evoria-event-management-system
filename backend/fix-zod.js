const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'controllers');
const files = fs.readdirSync(dir);

files.forEach(file => {
  if (file.endsWith('.ts')) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace the ZodError catch block
    content = content.replace(/if \(error instanceof z\.ZodError\) \{([^}]*)\} else if/g, 'if (error instanceof z.ZodError) {\n      const zodErr = error as z.ZodError<any>;\n      return next(new AppError(zodErr.issues.map((e: any) => e.message).join(\', \'), 400));\n    } else if');

    // More generic replace for the one-liners that were there originally:
    content = content.replace(/if \(error instanceof z\.ZodError\) return next\(new AppError\(error\.errors\.map\(e => e\.message\)\.join\(\', \'\), 400\)\);/g, 'if (error instanceof z.ZodError) {\n      const zodErr = error as z.ZodError<any>;\n      return next(new AppError(zodErr.issues.map((e: any) => e.message).join(\', \'), 400));\n    }');

    // And fix auth.controller.ts which I already modified partially
    content = content.replace(/zodErr\.errors\.map/g, 'zodErr.issues.map');

    fs.writeFileSync(filePath, content, 'utf8');
  }
});

console.log('Fixed ZodError issues');
