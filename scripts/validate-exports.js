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

// Extract getter property names and their returned values
// Pattern: get PropertyName() { return ActualModuleName; }
const getterPattern = /get\s+(\w+)\s*\(\)\s*{\s*return\s+(\w+);?\s*}/g;
const modules = []; // Array of {property, module} objects
let match;

while ((match = getterPattern.exec(exportsContent)) !== null) {
    modules.push({
        property: match[1],  // Property name in Exports
        module: match[2]     // Actual module name returned
    });
}

console.log(`\n📦 Validating ${modules.length} modules in Exports.js...\n`);

let errors = [];
let warnings = [];

// Track all global declarations across all files to detect duplicates
const globalDeclarations = new Map(); // identifier -> [{file, line, type}]

// Scan all JS files for global declarations
const srcDir = path.join(__dirname, '../src');

// Recursive function to get all .js files
function getAllJsFiles(dir, baseDir = dir) {
    const files = fs.readdirSync(dir);
    let allFiles = [];
    
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            // Recursively scan subdirectories
            allFiles = allFiles.concat(getAllJsFiles(fullPath, baseDir));
        } else if (file.endsWith('.js')) {
            // Store relative path from baseDir
            allFiles.push({
                absolutePath: fullPath,
                relativePath: path.relative(baseDir, fullPath)
            });
        }
    });
    
    return allFiles;
}

const allJsFiles = getAllJsFiles(srcDir);

allJsFiles.forEach(({ absolutePath, relativePath }) => {
    const content = fs.readFileSync(absolutePath, 'utf8');
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
        
        // Match var/const/let declarations at top level (no deep indentation)
        const varMatch = line.match(/^(var|const|let)\s+(\w+)\s*=/);
        
        // Match class declarations - allow some indentation since JSDoc can indent code
        const classMatch = line.match(/^\s{0,8}class\s+(\w+)\s*(?:{|extends)/);
        
        if (varMatch) {
            const [, declType, identifier] = varMatch;
            if (!globalDeclarations.has(identifier)) {
                globalDeclarations.set(identifier, []);
            }
            globalDeclarations.get(identifier).push({
                file: `src/${relativePath}`,
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
                file: `src/${relativePath}`,
                line: idx + 1,
                type: 'class'
            });
        }
    });
});

// Check for duplicate declarations (ignore IIFE pattern: var X = (function() { class X ... return X; })())
globalDeclarations.forEach((declarations, identifier) => {
    if (declarations.length > 1) {
        // Check if all declarations are in the same file
        const uniqueFiles = new Set(declarations.map(d => d.file));
        if (uniqueFiles.size === 1) {
            const file = declarations[0].file;
            const absolutePath = path.join(__dirname, '..', file);
            const content = fs.readFileSync(absolutePath, 'utf8');
            
            // Check for IIFE pattern: var X = (function() { ... class X ... return X; })()
            // This is the correct GAS-compatible class pattern per copilot-instructions.md
            const iifePattern = new RegExp(
                `var\\s+${identifier}\\s*=\\s*\\(function\\s*\\(\\)\\s*\\{[\\s\\S]*?class\\s+${identifier}\\s*(?:\\{|extends)[\\s\\S]*?return\\s+${identifier};?\\s*\\}\\)\\(\\)`,
                'm'
            );
            if (iifePattern.test(content)) {
                // This is the correct IIFE pattern - var X = (function() { class X { } return X; })()
                return;
            }
            
            // Also check for consecutive lines (simpler pattern like const X = X;)
            const lines = declarations.map(d => d.line).sort((a, b) => a - b);
            const isConsecutive = lines.every((line, i) => i === 0 || line - lines[i-1] <= 5);
            if (isConsecutive) {
                return;
            }
        }
        errors.push(`  ❌ ${identifier} - declared ${declarations.length} times:\n` +
            declarations.map(d => `     ${d.file}:${d.line} (${d.type})`).join('\n'));
    }
});

// For each module, check if a corresponding file exists that defines it
modules.forEach(({property, module: moduleName}) => {
    // Check if module is in globalDeclarations (found during scan)
    if (globalDeclarations.has(moduleName)) {
        const declarations = globalDeclarations.get(moduleName);
        const firstDecl = declarations[0];
        console.log(`  ✅ ${property}${property !== moduleName ? ` (returns ${moduleName})` : ''} - defined in ${firstDecl.file}`);
    } else {
        errors.push(`  ❌ ${property}${property !== moduleName ? ` (returns ${moduleName})` : ''} - no corresponding file found or module not defined`);
    }
});

// Check for modules used in code but not in Exports
const jsFiles = allJsFiles.filter(f => !f.relativePath.endsWith('Exports.js'));

// Create a Set of module names (the actual variables returned by getters)
const moduleNamesInExports = new Set(modules.map(m => m.module));

const potentialModules = new Set();

jsFiles.forEach(({ absolutePath, relativePath }) => {
    const content = fs.readFileSync(absolutePath, 'utf8');
    
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
    if (!moduleNamesInExports.has(mod)) {
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
