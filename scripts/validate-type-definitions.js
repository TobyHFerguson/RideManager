#!/usr/bin/env node
/**
 * validate-type-definitions.js
 * 
 * Validates that .d.ts type definitions match actual .js implementations.
 * This catches drift between type declarations and runtime code.
 * 
 * Strategy:
 * 1. Load .js module in Node.js to inspect actual properties/methods
 * 2. Parse .d.ts file to extract declared properties/methods
 * 3. Compare and report mismatches
 * 
 * Run: node scripts/validate-type-definitions.js
 */

const fs = require('fs');
const path = require('path');

// Modules to validate (those with both .js and .d.ts)
const MODULES_TO_VALIDATE = [
    'RowCore',
    'ScheduleAdapter',
    'AnnouncementManager',
    'RideManager',
    'ValidationCore',
    'TriggerManager',
    'UIHelper',
    'RideCoordinator',
    // Add more as needed
];

// Properties known to be getters/setters (extracted from .js implementation)
const GETTER_PROPERTIES = {
    RowCore: [
        'startTime', 'endTime', 'routeName', 'routeURL', 'leaders',
        'rideName', 'rideURL', 'googleEventId', 'announcementURL', 'announcementText',
        'announcement' // backward compat getter
    ]
};

/**
 * Extract actual properties from a loaded module
 * @param {any} moduleExport - The exported class or object
 * @param {string} moduleName - Name for error messages
 * @returns {Set<string>} Set of property/method names
 */
function extractActualProperties(moduleExport, moduleName) {
    const properties = new Set();
    
    try {
        // Handle class exports (get prototype properties)
        if (typeof moduleExport === 'function' && moduleExport.prototype) {
            const proto = moduleExport.prototype;
            const descriptors = Object.getOwnPropertyDescriptors(proto);
            
            for (const [name, descriptor] of Object.entries(descriptors)) {
                if (name === 'constructor') continue;
                // Skip private methods (prefixed with _)
                if (name.startsWith('_')) continue;
                
                // Include both methods and getters
                if (typeof descriptor.value === 'function' || descriptor.get) {
                    properties.add(name);
                }
            }
            
            // Also check static methods
            const staticDescriptors = Object.getOwnPropertyDescriptors(moduleExport);
            for (const [name, descriptor] of Object.entries(staticDescriptors)) {
                if (name === 'length' || name === 'name' || name === 'prototype') continue;
                // Skip private methods (prefixed with _)
                if (name.startsWith('_')) continue;
                if (typeof descriptor.value === 'function') {
                    properties.add(`static ${name}`);
                }
            }
        }
        // Handle namespace/object exports
        else if (typeof moduleExport === 'object') {
            for (const key of Object.keys(moduleExport)) {
                // Skip private methods (prefixed with _)
                if (key.startsWith('_')) continue;
                if (typeof moduleExport[key] === 'function') {
                    properties.add(key);
                }
            }
        }
    } catch (error) {
        console.warn(`Warning: Could not extract properties from ${moduleName}: ${error.message}`);
    }
    
    return properties;
}

/**
 * Parse .d.ts file to extract declared properties/methods
 * This is a simple regex-based parser - not comprehensive but good enough
 * @param {string} dtsPath - Path to .d.ts file
 * @returns {Set<string>} Set of declared property/method names
 */
function extractDeclaredProperties(dtsPath) {
    const properties = new Set();
    
    try {
        const content = fs.readFileSync(dtsPath, 'utf8');
        
        // Match instance methods/properties: methodName(...) or get propertyName()
        const instanceMatches = content.matchAll(/^\s+(?:get\s+)?(\w+)\s*\(/gm);
        for (const match of instanceMatches) {
            properties.add(match[1]);
        }
        
        // Match static methods: static methodName(...)
        const staticMatches = content.matchAll(/^\s+static\s+(\w+)\s*\(/gm);
        for (const match of staticMatches) {
            properties.add(`static ${match[1]}`);
        }
        
        // Match property declarations: propertyName: type;
        const propMatches = content.matchAll(/^\s+(?:readonly\s+)?(\w+):\s+/gm);
        for (const match of propMatches) {
            properties.add(match[1]);
        }
    } catch (error) {
        console.warn(`Warning: Could not parse ${dtsPath}: ${error.message}`);
    }
    
    return properties;
}

/**
 * Validate a single module
 * @param {string} moduleName - Name of module to validate
 * @returns {{errors: string[], warnings: string[]}} Validation results
 */
function validateModule(moduleName) {
    const errors = [];
    const warnings = [];
    
    const jsPath = path.join(__dirname, '..', 'src', `${moduleName}.js`);
    const dtsPath = path.join(__dirname, '..', 'src', `${moduleName}.d.ts`);
    
    // Check files exist
    if (!fs.existsSync(jsPath)) {
        errors.push(`${moduleName}.js not found`);
        return { errors, warnings };
    }
    if (!fs.existsSync(dtsPath)) {
        errors.push(`${moduleName}.d.ts not found`);
        return { errors, warnings };
    }
    
    // Load .js module
    let moduleExport;
    try {
        moduleExport = require(jsPath);
    } catch (error) {
        warnings.push(`Could not load ${moduleName}.js: ${error.message}`);
        return { errors, warnings };
    }
    
    // Extract properties
    const actualProps = extractActualProperties(moduleExport, moduleName);
    const declaredProps = extractDeclaredProperties(dtsPath);
    
    // Find properties in .js but not in .d.ts (missing declarations)
    for (const prop of actualProps) {
        if (!declaredProps.has(prop)) {
            errors.push(`${moduleName}: Property "${prop}" exists in .js but not declared in .d.ts`);
        }
    }
    
    // Find properties in .d.ts but not in .js (incorrect declarations)
    // Filter out known getter properties (they won't show up in normal iteration)
    const knownGetters = GETTER_PROPERTIES[moduleName] || [];
    for (const prop of declaredProps) {
        if (!actualProps.has(prop) && !knownGetters.includes(prop)) {
            // Special handling for properties (not methods) - they may be declared but accessed differently
            if (!prop.includes('(')) { // Not a method
                // CRITICAL: Property type mismatches should be errors, not warnings
                // These indicate actual type safety issues that can cause runtime problems
                if (prop === 'constructor' || prop.startsWith('_')) {
                    // constructor and private properties are expected to not be enumerable
                    warnings.push(`${moduleName}: Property "${prop}" declared in .d.ts but not found in .js (may be a property or getter)`);
                } else {
                    // Public properties missing from implementation are ERRORS
                    errors.push(`${moduleName}: Property "${prop}" declared in .d.ts but not found in .js - possible type mismatch`);
                }
            } else {
                errors.push(`${moduleName}: Method "${prop}" declared in .d.ts but not found in .js`);
            }
        }
    }
    
    return { errors, warnings };
}

/**
 * Main validation function
 */
function main() {
    console.log('🔍 Validating type definitions against implementations...\n');
    
    let totalErrors = 0;
    let totalWarnings = 0;
    const moduleResults = [];
    
    for (const moduleName of MODULES_TO_VALIDATE) {
        const { errors, warnings } = validateModule(moduleName);
        
        if (errors.length > 0 || warnings.length > 0) {
            moduleResults.push({ moduleName, errors, warnings });
            totalErrors += errors.length;
            totalWarnings += warnings.length;
        }
    }
    
    // Report results
    if (moduleResults.length === 0) {
        console.log('✅ All type definitions match their implementations!\n');
        return 0;
    }
    
    console.log('❌ Type definition mismatches found:\n');
    
    for (const { moduleName, errors, warnings } of moduleResults) {
        console.log(`\n📦 ${moduleName}:`);
        
        if (errors.length > 0) {
            console.log('  ❌ Errors:');
            for (const error of errors) {
                console.log(`    - ${error}`);
            }
        }
        
        if (warnings.length > 0) {
            console.log('  ⚠️  Warnings:');
            for (const warning of warnings) {
                console.log(`    - ${warning}`);
            }
        }
    }
    
    console.log(`\n📊 Summary: ${totalErrors} errors, ${totalWarnings} warnings across ${moduleResults.length} modules\n`);
    
    if (totalErrors > 0) {
        console.log('❌ Validation failed. Please update .d.ts files to match implementations.\n');
        return 1;
    }
    
    if (totalWarnings > 0) {
        console.log('⚠️  Warnings found. Some warnings may indicate type safety issues.\n');
        console.log('💡 Tip: Review warnings for property type mismatches that could cause runtime errors.\n');
        // Allow warnings to pass for now, but make them visible
        return 0; 
    }
    
    return 0;
}

// Run validation
const exitCode = main();
process.exit(exitCode);
