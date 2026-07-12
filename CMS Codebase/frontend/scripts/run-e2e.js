/**
 * E2E Test Runner and Report Generator
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, '../screenshots');
const REPORT_FILE = path.join(__dirname, '../../docs/reports/E2E_TEST_REPORT.md');

async function runTests() {
  console.log('🚀 Starting KMainCMS E2E Test Suite...');

  try {
    // 1. Run Playwright Tests
    console.log('Running Playwright tests...');
    execSync('npx playwright test e2e/comprehensive-test.spec.js', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    });

    console.log('✅ Playwright tests completed.');

    // 2. Generate Report
    console.log('Generating report...');
    const screenshots = fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png'));

    let reportContent = `# KMainCMS E2E Functional Test Report\n\n`;
    reportContent += `**Date:** ${new Date().toLocaleString()}\n`;
    reportContent += `**Status:** ✅ SUCCESS\n\n`;
    reportContent += `## Visual Verification (Screenshots)\n\n`;

    screenshots.sort().forEach(screenshot => {
      const name = screenshot.replace('.png', '').replace(/-/g, ' ').toUpperCase();
      reportContent += `### ${name}\n`;
      reportContent += `![${name}](../../frontend/screenshots/${screenshot})\n\n`;
    });

    fs.writeFileSync(REPORT_FILE, reportContent);
    console.log(`✅ Report generated at: ${REPORT_FILE}`);

  } catch (error) {
    console.error('❌ E2E tests failed:', error.message);

    let reportContent = `# KMainCMS E2E Functional Test Report\n\n`;
    reportContent += `**Date:** ${new Date().toLocaleString()}\n`;
    reportContent += `**Status:** ❌ FAILED\n\n`;
    reportContent += `### Error Details:\n\`\`\`\n${error.message}\n\`\`\`\n`;

    fs.writeFileSync(REPORT_FILE, reportContent);
  }
}

runTests();
