/**
 * KMainCMS Work Continuation Script
 * 
 * This script reads the latest session log and generates a prompt
 * to continue work based on pending tasks and recommendations.
 * 
 * Usage: node continue-work.js
 */

const fs = require('fs');
const path = require('path');

// Get the directory where this script is located
const SCRIPT_DIR = __dirname;
const LOGS_DIR = path.join(SCRIPT_DIR, 'docs', 'logs');

/**
 * Find the most recent session log file
 */
function findLatestSessionLog() {
  const files = fs.readdirSync(LOGS_DIR)
    .filter(file => file.endsWith('.md') && file.toLowerCase().includes('session'))
    .map(file => ({
      name: file,
      path: path.join(LOGS_DIR, file),
      time: fs.statSync(path.join(LOGS_DIR, file)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);

  return files.length > 0 ? files[0] : null;
}

/**
 * Parse session log to extract pending work
 */
function parseSessionLog(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  const result = {
    date: '',
    focus: '',
    completedPhases: [],
    remainingPhases: [],
    recommendations: [],
    pendingTasks: []
  };

  let currentSection = null;
  let currentPhase = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Extract date
    if (line.startsWith('**Date:**')) {
      result.date = line.replace('**Date:**', '').trim();
    }

    // Extract focus
    if (line.startsWith('**Focus:**')) {
      result.focus = line.replace('**Focus:**', '').trim();
    }

    // Detect sections
    if (line.startsWith('### Phase')) {
      currentPhase = line.replace('###', '').trim();
      currentSection = 'phase';
    } else if (line.startsWith('**Status:**')) {
      const status = line.replace('**Status:**', '').trim();
      if (status.includes('COMPLETED')) {
        result.completedPhases.push(currentPhase);
      } else if (status.includes('PENDING') || status.includes('IN PROGRESS')) {
        result.remainingPhases.push(currentPhase);
      }
    } else if (line.startsWith('## Remaining Phases:')) {
      currentSection = 'remaining';
    } else if (line.startsWith('## Recommendations')) {
      currentSection = 'recommendations';
    } else if (line.startsWith('## Next Steps')) {
      currentSection = 'nextSteps';
    }

    // Extract remaining phases
    if (currentSection === 'remaining' && line.startsWith('-')) {
      const phase = line.replace(/^-/, '').trim();
      if (phase && !phase.startsWith('Phase')) {
        result.remainingPhases.push(phase);
      }
    }

    // Extract recommendations
    if (currentSection === 'recommendations' && line.match(/^\d+\./)) {
      result.recommendations.push(line.replace(/^\d+\./, '').trim());
    }

    // Extract next steps
    if (currentSection === 'nextSteps' && line.match(/^\d+\./)) {
      result.pendingTasks.push(line.replace(/^\d+\./, '').trim());
    }
  }

  return result;
}

/**
 * Generate continuation prompt
 */
function generateContinuationPrompt(data) {
  let prompt = `📋 KMainCMS Work Continuation Prompt\n`;
  prompt += `================================\n\n`;
  prompt += `📅 Last Session: ${data.date}\n`;
  prompt += `🎯 Focus: ${data.focus}\n\n`;

  if (data.completedPhases.length > 0) {
    prompt += `✅ Recently Completed:\n`;
    data.completedPhases.slice(-3).forEach(phase => {
      prompt += `   - ${phase}\n`;
    });
    prompt += `\n`;
  }

  if (data.remainingPhases.length > 0) {
    prompt += `⏳ Remaining Phases:\n`;
    data.remainingPhases.forEach(phase => {
      prompt += `   - ${phase}\n`;
    });
    prompt += `\n`;
  }

  if (data.recommendations.length > 0) {
    prompt += `💡 Recommendations:\n`;
    data.recommendations.slice(0, 3).forEach((rec, i) => {
      prompt += `   ${i + 1}. ${rec}\n`;
    });
    prompt += `\n`;
  }

  if (data.pendingTasks.length > 0) {
    prompt += `🔧 Next Steps:\n`;
    data.pendingTasks.forEach((task, i) => {
      prompt += `   ${i + 1}. ${task}\n`;
    });
    prompt += `\n`;
  }

  prompt += `📝 Suggested Prompt for Devin:\n`;
  prompt += `--------------------------------\n`;
  
  if (data.remainingPhases.length > 0) {
    const nextPhase = data.remainingPhases[0];
    prompt += `"Continue with ${nextPhase}. Implement all components following the established patterns in the codebase. Update the session log when complete."\n\n`;
  } else if (data.recommendations.length > 0) {
    prompt += `"Continue with the next recommendation: ${data.recommendations[0]}"\n\n`;
  } else if (data.pendingTasks.length > 0) {
    prompt += `"Continue with the next task: ${data.pendingTasks[0]}"\n\n`;
  } else {
    prompt += `"Review the current state of the codebase and suggest the next phase of work based on the project objectives."\n\n`;
  }

  return prompt;
}

/**
 * Main execution
 */
function main() {
  try {
    console.log('🔍 Scanning session logs...\n');

    // Check if logs directory exists
    if (!fs.existsSync(LOGS_DIR)) {
      console.log('❌ Logs directory not found:', LOGS_DIR);
      process.exit(1);
    }

    const latestLog = findLatestSessionLog();

    if (!latestLog) {
      console.log('❌ No session logs found in docs/logs/');
      process.exit(1);
    }

    console.log(`📄 Found latest log: ${latestLog.name}\n`);

    const data = parseSessionLog(latestLog.path);
    const prompt = generateContinuationPrompt(data);

    console.log(prompt);

    // Save prompt to file for easy copying
    const promptFile = path.join(SCRIPT_DIR, 'CONTINUE_WORK_PROMPT.md');
    fs.writeFileSync(promptFile, prompt);
    console.log(`✅ Prompt saved to: ${promptFile}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
