/**
 * Simple KMainCMS Work Continuation Script
 * 
 * This script reads the latest session log and shows what to work on next.
 * Usage: node continue-work-simple.js
 */

const fs = require('fs');
const path = require('path');

const SCRIPT_DIR = __dirname;
const LOGS_DIR = path.join(SCRIPT_DIR, 'docs', 'logs');

function findLatestSessionLog() {
  try {
    const files = fs.readdirSync(LOGS_DIR)
      .filter(file => file.endsWith('.md'))
      .map(file => ({
        name: file,
        path: path.join(LOGS_DIR, file),
        time: fs.statSync(path.join(LOGS_DIR, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    return files.length > 0 ? files[0] : null;
  } catch (error) {
    return null;
  }
}

function extractKeyInfo(content) {
  const lines = content.split('\n');
  const info = {
    date: '',
    focus: '',
    completed: [],
    remaining: [],
    recommendations: []
  };

  let inRemaining = false;
  let inRecommendations = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('**Date:**')) {
      info.date = trimmed.replace('**Date:**', '').trim();
    } else if (trimmed.startsWith('**Focus:**')) {
      info.focus = trimmed.replace('**Focus:**', '').trim();
    } else if (trimmed.includes('Remaining Phases') || trimmed.includes('REMAINING')) {
      inRemaining = true;
      inRecommendations = false;
    } else if (trimmed.includes('Recommendations') || trimmed.includes('RECOMMENDATIONS')) {
      inRecommendations = true;
      inRemaining = false;
    } else if (trimmed.startsWith('##') && !trimmed.includes('Remaining') && !trimmed.includes('Recommendations')) {
      inRemaining = false;
      inRecommendations = false;
    } else if (inRemaining && trimmed.startsWith('-')) {
      const item = trimmed.replace(/^-/, '').trim();
      if (item) info.remaining.push(item);
    } else if (inRecommendations && (trimmed.match(/^\d+\./) || trimmed.startsWith('-'))) {
      const item = trimmed.replace(/^\d+\./, '').replace(/^-/, '').trim();
      if (item) info.recommendations.push(item);
    }
  }

  return info;
}

function main() {
  try {
    console.log('🔍 Scanning session logs...\n');

    if (!fs.existsSync(LOGS_DIR)) {
      console.log('❌ Logs directory not found');
      return;
    }

    const latestLog = findLatestSessionLog();

    if (!latestLog) {
      console.log('❌ No session logs found');
      return;
    }

    console.log(`📄 Latest log: ${latestLog.name}\n`);

    const content = fs.readFileSync(latestLog.path, 'utf-8');
    const info = extractKeyInfo(content);

    console.log(`📅 Date: ${info.date}`);
    console.log(`🎯 Focus: ${info.focus}\n`);

    if (info.remaining.length > 0) {
      console.log('⏳ Remaining Work:');
      info.remaining.slice(0, 5).forEach((item, i) => {
        console.log(`   ${i + 1}. ${item}`);
      });
      console.log();
    }

    if (info.recommendations.length > 0) {
      console.log('💡 Recommendations:');
      info.recommendations.slice(0, 3).forEach((item, i) => {
        console.log(`   ${i + 1}. ${item}`);
      });
      console.log();
    }

    if (info.remaining.length > 0) {
      console.log('📝 Suggested prompt:');
      console.log(`"Continue with: ${info.remaining[0]}"`);
    } else if (info.recommendations.length > 0) {
      console.log('📝 Suggested prompt:');
      console.log(`"Continue with: ${info.recommendations[0]}"`);
    } else {
      console.log('📝 Suggested prompt:');
      console.log('"Review the codebase and suggest next improvements"');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
