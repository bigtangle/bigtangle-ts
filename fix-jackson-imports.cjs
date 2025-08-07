#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function findFiles(dir, pattern) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findFiles(fullPath, pattern));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (pattern.test(content)) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

function fixJacksonImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if already fixed
  if (content.includes('import jackson from \'jackson-js\'')) {
    return false;
  }
  
  // Find all jackson-js imports
  const importRegex = /import\s*{([^}]+)}\s*from\s*["']jackson-js["']/g;
  const matches = [...content.matchAll(importRegex)];
  
  if (matches.length === 0) return false;
  
  let newContent = content;
  const imports = new Set();
  
  // Collect all imports
  for (const match of matches) {
    const names = match[1].split(',').map(n => n.trim());
    names.forEach(name => imports.add(name));
  }
  
  // Remove old imports
  newContent = newContent.replace(importRegex, '');
  
  // Add new import
  const importNames = Array.from(imports).join(', ');
  const newImport = `import jackson from 'jackson-js';\nconst { ${importNames} } = jackson;\n`;
  
  // Insert new import at the top (after existing imports)
  const lines = newContent.split('\n');
  let insertIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim().startsWith('import')) {
      insertIndex = i;
      break;
    }
  }
  
  lines.splice(insertIndex, 0, newImport);
  newContent = lines.join('\n');
  
  // Clean up extra newlines
  newContent = newContent.replace(/\n{3,}/g, '\n\n');
  
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log(`Fixed: ${filePath}`);
  return true;
}

// Main execution
console.log('Fixing jackson-js imports...');
const files = findFiles('src', /from\s*["']jackson-js["']/);
console.log(`Found ${files.length} files to fix`);

let fixedCount = 0;
for (const file of files) {
  try {
    if (fixJacksonImports(file)) {
      fixedCount++;
    }
  } catch (error) {
    console.error(`Error fixing ${file}:`, error.message);
  }
}

console.log(`Fixed ${fixedCount} files`);
