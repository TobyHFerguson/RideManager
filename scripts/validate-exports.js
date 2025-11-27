#!/usr/bin/env node

/**
 * Validate that all modules referenced in Exports.js are defined
 * This catches loading order issues before deployment to GAS
 */

const fs = require('fs');
const path = require('path');

// Read Exports.js
const exportsPath = path.join(__dirname, '../src/Exports.js');
const exportsContent = fs.readFileSync(exportsPath, 'utf8');

// Extract all getter property names from Exports object
const getterPattern = /get\s+(\w+)\s*\(\)/g;
const modules = [];
let match;

while ((match = getterPattern.exec(exportsContent)) !== null) {
    modules.push(match[1]);
}

console.log(`\n📦 Validating ${modules.length} modules in Exports.js...\n`);

let errors = [];
let warnings = [];

// Track all global declarations across all files to detect duplicates
const globalDeclarations = new Map(); // identifier -> [{file, line, type}]

// Scan all JS files for global declarations
const srcDir = path.join(__dirname, '../src');
const allJsFiles = fs.readdirSync(srcDir).filter(f => f.endsWith('.js'));

allJsFiles.forEach(file => {
    const filePath = path.join(srcDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    let inNodeOnlyBlock = false; // Track if we're inside a Node.js-only if block
    
    lines.forEach((line, idx) => {
        // Detect Node.js-only blocks
        if (/if\s*\(\s*typeof\s+require\s*!==\s*['"]undefined['"]\s*\)/.test(line)) {
            inNodeOnlyBlock = true;
            return;
        }
        
        // Exit Node.js-only block (look for closing brace at same indent level)
        if (inNodeOnlyBlock && /^}/.test(line)) {
            inNodeOnlyBlock = false;
            return;
        }
        
        // Skip lines inside Node.js-only blocks - these don't execute in GAS
        if (inNodeOnlyBlock) return;
        
        // Only match top-level declarations (no indentation or minimal indentation from comments)
        // Skip lines inside functions/blocks (indented)
        if (/^\s{4,}/.test(line)) return; // Skip lines with 4+ spaces indent
        if (/^\t/.test(line)) return; // Skip tab-indented lines
        
        // Match var/const/let declarations and class declarations at top level
        const varMatch = line.match(/^(var|const|let)\s+(\w+)\s*=/);
        const classMatch = line.match(/^class\s+(\w+)\s*(?:{|extends)/);
        
        if (varMatch) {
            const [, declType, identifier] = varMatch;
            if (!globalDeclarations.has(identifier)) {
                globalDeclarations.set(identifier, []);
            }
            globalDeclarations.get(identifier).push({
                file: `src/${file}`,
                line: idx + 1,
                type: declType
            });
        }
        
        if (classMatch) {
            const identifier = classMatch[1];
            if (!globalDeclarations.has(identifier)) {
                globalDeclarations.set(identifier, []);
            }
            globalDeclarations.get(identifier).push({
                file: `src/${file}`,
                line: idx + 1,
                type: 'class'
            });
        }
    });
});

// Check for duplicate declarations
globalDeclarations.forEach((declarations, identifier) => {
    if (declarations.length > 1) {
        errors.push(`  ❌ ${identifier} - declared ${declarations.length} times:\n` +
            declarations.map(d => `     ${d.file}:${d.line} (${d.type})`).join('\n'));
    }
});

// For each module, check if a corresponding file exists that defines it
modules.forEach(moduleName => {
    // Check common file naming patterns
    const possibleFiles = [
        `src/${moduleName}.js`,
        `src/${moduleName.toLowerCase()}.js`,
        `src/${moduleName.replace(/([A-Z])/g, '-$1').toLowerCase().slice(1)}.js`
    ];
    
    let found = false;
    for (const filePath of possibleFiles) {
        const fullPath = path.join(__dirname, '..', filePath);
        if (fs.existsSync(fullPath)) {
            const content = fs.readFileSync(fullPath, 'utf8');
            
            // Check if the file defines the module as a var/const or class
            const varPattern = new RegExp(`(var|const|let)\\s+${moduleName}\\s*=`, 'm');
            const classPattern = new RegExp(`class\\s+${moduleName}\\s*(?:{|extends)`, 'm');
            if (varPattern.test(content) || classPattern.test(content)) {
                console.log(`  ✅ ${moduleName} - defined in ${filePath}`);
                found = true;
                break;
            }
        }
    }
    
    if (!found) {
        errors.push(`  ❌ ${moduleName} - no corresponding file found or module not defined`);
    }
});

// Check for modules used in code but not in Exports
const jsFiles = allJsFiles.filter(f => f !== 'Exports.js');

const modulesInExports = new Set(modules);
const potentialModules = new Set();

jsFiles.forEach(file => {
    const content = fs.readFileSync(path.join(srcDir, file), 'utf8');
    
    // Look for var/const declarations that look like modules (objects or IIFEs)
    const modulePattern = /(var|const)\s+(\w+)\s*=\s*(\{|[\(\)])/g;
    let m;
    while ((m = modulePattern.exec(content)) !== null) {
        const name = m[2];
        // Filter out common non-module variables
        if (name !== 'Exports' && 
            !name.startsWith('_') && 
            name[0] === name[0].toUpperCase()) {
            potentialModules.add(name);
        }
    }
});

potentialModules.forEach(mod => {
    if (!modulesInExports.has(mod)) {
        warnings.push(`  ⚠️  ${mod} - defined in code but not exported in Exports.js`);
    }
});

// Print results
console.log();
if (errors.length > 0) {
    console.log('🚫 ERRORS:\n');
    errors.forEach(e => console.log(e));
    console.log();
}

if (warnings.length > 0) {
    console.log('⚠️  WARNINGS (may be intentional):\n');
    warnings.forEach(w => console.log(w));
    console.log();
}

if (errors.length === 0 && warnings.length === 0) {
    console.log('✨ All exports validated successfully!\n');
}

// Exit with error if there are errors
if (errors.length > 0) {
    console.log('❌ Validation failed. Fix the errors above before deploying.\n');
    process.exit(1);
}

console.log('✅ Validation passed.\n');
process.exit(0);
