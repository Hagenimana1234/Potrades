#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get TypeScript errors
let buildOutput;
try {
  buildOutput = execSync('npm run build 2>&1', { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
} catch (error) {
  // Build failed - get output from error
  buildOutput = error.stdout + error.stderr;
}
const errors = buildOutput.split('\n');

// Parse unused parameter errors
const unusedParams = [];
errors.forEach(line => {
  const match = line.match(/^(.*?)\((\d+),(\d+)\): error TS6133: '(\w+)' is declared but its value is never read\.$/);
  if (match) {
    const [, filePath, lineNum, col, paramName] = match;
    unusedParams.push({ filePath, lineNum: parseInt(lineNum), col: parseInt(col), paramName });
  }
});

console.log(`Found ${unusedParams.length} unused parameters`);

// Group by file
const byFile = {};
unusedParams.forEach(({ filePath, lineNum, col, paramName }) => {
  if (!byFile[filePath]) {
    byFile[filePath] = [];
  }
  byFile[filePath].push({ lineNum, col, paramName });
});

// Fix each file
let totalFixed = 0;
Object.entries(byFile).forEach(([filePath, params]) => {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  // Sort by line number descending to avoid offset issues
  params.sort((a, b) => b.lineNum - a.lineNum);

  params.forEach(({ lineNum, col, paramName }) => {
    const lineIndex = lineNum - 1;
    if (lineIndex < 0 || lineIndex >= lines.length) {
      console.log(`Invalid line number ${lineNum} in ${filePath}`);
      return;
    }

    const line = lines[lineIndex];

    // Find the parameter name and prefix with underscore
    // Match patterns like: (req, res, next) or (req: Request, res: Response, next: NextFunction)
    const regex = new RegExp(`\\b${paramName}\\b(?=\\s*[,:)])`, 'g');
    const newLine = line.replace(regex, `_${paramName}`);

    if (newLine !== line) {
      lines[lineIndex] = newLine;
      totalFixed++;
    }
  });

  // Write back
  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
  console.log(`Fixed ${params.length} unused parameters in ${filePath}`);
});

console.log(`\nTotal fixed: ${totalFixed} unused parameters`);
