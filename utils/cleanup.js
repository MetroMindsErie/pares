#!/usr/bin/env node
/**
 * Code cleanup script to detect:
 * - Unused files
 * - Duplicate components
 * - Dead imports
 * - Orphaned routes
 * 
 * Run with: node utils/cleanup.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const PROJECT_ROOT = path.resolve(__dirname, '..');
const IGNORED_DIRS = [
  'node_modules',
  '.next',
  'public',
  '.git',
];
const IGNORED_FILES = [
  '.DS_Store',
  'package.json',
  'package-lock.json',
  'next.config.js',
];

// Helper functions
const getAllFiles = (dir, fileList = []) => {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    const relativePath = path.relative(PROJECT_ROOT, filePath);
    
    // Skip ignored directories and files
    const isIgnoredDir = stat.isDirectory() && IGNORED_DIRS.includes(file);
    const isIgnoredFile = IGNORED_FILES.includes(file);
    
    if (isIgnoredDir || isIgnoredFile) {
      return;
    }
    
    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      fileList.push(relativePath);
    }
  });
  
  return fileList;
};

const getImports = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  const imports = [];
  
  // Match ES6 imports
  const es6Imports = content.match(/import\s+(?:(?:\{[^}]*\})|(?:[^{}\s,]+))?\s*from\s*['"]([^'"]+)['"]/g) || [];
  es6Imports.forEach(imp => {
    const match = imp.match(/from\s*['"]([^'"]+)['"]/);
    if (match && match[1]) imports.push(match[1]);
  });
  
  // Match require statements
  const requireStatements = content.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/g) || [];
  requireStatements.forEach(req => {
    const match = req.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
    if (match && match[1]) imports.push(match[1]);
  });
  
  return imports;
};

const resolveImportPath = (importPath, currentFile) => {
  // Handle node_modules imports
  if (importPath.startsWith('@') || !importPath.startsWith('.')) {
    return null;
  }
  
  const currentDir = path.dirname(currentFile);
  const absolutePath = path.resolve(currentDir, importPath);
  
  // Try to resolve with extensions
  const extensions = ['.js', '.jsx', '.ts', '.tsx'];
  
  // Direct file with extension
  if (fs.existsSync(absolutePath)) {
    const stat = fs.statSync(absolutePath);
    if (stat.isFile()) {
      return path.relative(PROJECT_ROOT, absolutePath);
    }
  }
  
  // Try adding extensions
  for (const ext of extensions) {
    const pathWithExt = absolutePath + ext;
    if (fs.existsSync(pathWithExt)) {
      return path.relative(PROJECT_ROOT, pathWithExt);
    }
  }
  
  // Try as directory with index file
  for (const ext of extensions) {
    const indexPath = path.join(absolutePath, `index${ext}`);
    if (fs.existsSync(indexPath)) {
      return path.relative(PROJECT_ROOT, indexPath);
    }
  }
  
  return null;
};

// Main functions
const findUnusedFiles = () => {

  
  const allFiles = getAllFiles(PROJECT_ROOT);
  const importMap = {};
  
  // Build dependency graph
  allFiles.forEach(file => {
    if (!['.js', '.jsx', '.ts', '.tsx'].some(ext => file.endsWith(ext))) {
      return;
    }
    
    const absPath = path.join(PROJECT_ROOT, file);
    const imports = getImports(absPath);
    
    imports.forEach(imp => {
      const resolvedPath = resolveImportPath(imp, absPath);
      if (resolvedPath) {
        if (!importMap[resolvedPath]) {
          importMap[resolvedPath] = [];
        }
        importMap[resolvedPath].push(file);
      }
    });
  });
  
  // Special handling for entry points and pages
  const entryPoints = [
    ...allFiles.filter(file => file.match(/pages\/.*\.[jt]sx?$/)),
    ...allFiles.filter(file => file.match(/app\/.*\/(page|layout|loading|error)\.[jt]sx?$/)),
    'pages/_app.js',
    'pages/_document.js',
    'pages/index.js',
    'app/layout.js',
    'app/page.js',
  ];
  
  // Mark all entry points as "imported"
  entryPoints.forEach(entry => {
    if (allFiles.includes(entry)) {
      if (!importMap[entry]) {
        importMap[entry] = ['[Entry Point]'];
      }
    }
  });
  
  // Find unused files
  const unusedFiles = allFiles.filter(file => {
    if (!['.js', '.jsx', '.ts', '.tsx'].some(ext => file.endsWith(ext))) {
      return false;
    }
    
    return !importMap[file];
  });
  
  if (unusedFiles.length === 0) {

  } else {

    unusedFiles.forEach(file => {

    });
  }
  
  return unusedFiles;
};

const findDuplicateComponents = () => {

  
  const componentsDir = path.join(PROJECT_ROOT, 'components');
  if (!fs.existsSync(componentsDir)) {

    return;
  }
  
  const componentFiles = getAllFiles(componentsDir);
  const components = {};
  
  // Group by filename (ignoring directory)
  componentFiles.forEach(file => {
    const fileName = path.basename(file);
    if (!components[fileName]) {
      components[fileName] = [];
    }
    components[fileName].push(file);
  });
  
  // Find duplicates
  let hasDuplicates = false;
  Object.keys(components).forEach(name => {
    if (components[name].length > 1) {
      hasDuplicates = true;

      components[name].forEach(path => {

      });
    }
  });
  
  if (!hasDuplicates) {

  }
};

const findOrphanedRoutes = () => {

  
  // Check which router system is in use
  const hasAppRouter = fs.existsSync(path.join(PROJECT_ROOT, 'app'));
  const hasPagesRouter = fs.existsSync(path.join(PROJECT_ROOT, 'pages'));
  
  if (!hasAppRouter && !hasPagesRouter) {

    return;
  }
  
  // Build navigation components list
  const navComponents = [
    'components/Navigation.js',
    'components/NavBar.js',
    'components/Header.js',
    'components/layout/Navigation.js',
    'components/layout/NavBar.js',
    'components/layout/Header.js',
  ].filter(file => fs.existsSync(path.join(PROJECT_ROOT, file)));
  
  // Get all routes from app/pages directories
  const routeFiles = [];
  
  if (hasPagesRouter) {
    const pageFiles = getAllFiles(path.join(PROJECT_ROOT, 'pages'));
    routeFiles.push(...pageFiles);
  }
  
  if (hasAppRouter) {
    const appFiles = getAllFiles(path.join(PROJECT_ROOT, 'app'));
    const appPageFiles = appFiles.filter(file => 
      file.endsWith('/page.js') || file.endsWith('/page.jsx') || file.endsWith('/page.tsx')
    );
    routeFiles.push(...appPageFiles);
  }
  
  // Convert files to routes
  const routes = routeFiles.map(file => {
    let route = file.replace(/^(pages|app)\//, '/');
    
    // Handle App Router conventions
    route = route.replace(/\/(page|index)\.[jt]sx?$/, '');
    
    // Handle dynamic routes
    route = route.replace(/\[([^\]]+)\]/g, ':$1');
    
    return {
      route,
      file
    };
  });
  
  // Find routes not referenced in nav components
  let hasOrphanedRoutes = false;
  
  if (navComponents.length === 0) {

    return;
  }
  
  const navContent = navComponents
    .map(file => fs.readFileSync(path.join(PROJECT_ROOT, file), 'utf-8'))
    .join('\n');
  
  routes.forEach(({ route, file }) => {
    // Skip special pages
    if (route.includes('_app') || route.includes('_document')) {
      return;
    }
    
    // Clean route for comparison
    const cleanRoute = route.replace(/\/index$/, '/');
    
    // Look for references to this route
    const routeRegex = new RegExp(`(href|path|to)=["'](${cleanRoute}|${route})["']`, 'i');
    if (!navContent.match(routeRegex)) {
      if (!hasOrphanedRoutes) {
        hasOrphanedRoutes = true;

      }

    }
  });
  
  if (!hasOrphanedRoutes) {

  }
};

// Run the cleanup functions


// Run the checks
findUnusedFiles();
findDuplicateComponents();
findOrphanedRoutes();



