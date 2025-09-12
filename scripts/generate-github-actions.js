#!/usr/bin/env node

/**
 * GitHub Actions Workflow Generator
 * 
 * This script reads the schedule configuration from lib/schedule.ts and generates
 * precise GitHub Actions workflows for content generation and auto-posting.
 * 
 * It converts IST times to UTC and creates cron expressions that match the exact
 * schedule defined in the TypeScript configuration.
 */

const fs = require('fs');
const path = require('path');

/**
 * Convert IST hour to UTC cron expression
 * IST is UTC+5:30, so we subtract 5 hours and 30 minutes
 */
function istToUtcCron(istHour) {
  let utcHour = istHour - 5;
  let utcMinute = 30;
  
  // Handle day rollover for negative hours
  if (utcHour < 0) {
    utcHour += 24;
  }
  
  return { hour: utcHour, minute: utcMinute };
}

/**
 * Parse the schedule configuration from lib/schedule.ts
 * This is a simplified parser that extracts the schedule patterns
 */
function parseScheduleConfig() {
  const schedulePath = path.join(__dirname, '../lib/schedule.ts');
  const scheduleContent = fs.readFileSync(schedulePath, 'utf8');
  
  // Extract Gibbi patterns
  const gibbiGenerationMatch = scheduleContent.match(/const gibbiGenerationPattern: HourlySchedule = \{([^}]+)\}/s);
  const gibbiPostingMatch = scheduleContent.match(/const gibbiPostingPattern: HourlySchedule = \{([^}]+)\}/s);
  
  // Extract Prince patterns
  const princeGenerationMatch = scheduleContent.match(/const princeGenerationPattern: HourlySchedule = \{([^}]+)\}/s);
  const princePostingMatch = scheduleContent.match(/const princePostingPattern: HourlySchedule = \{([^}]+)\}/s);
  
  function parsePattern(patternText) {
    const hours = [];
    const lines = patternText.split('\n');
    for (const line of lines) {
      const hourMatch = line.match(/(\d+):\s*\[/);
      if (hourMatch) {
        hours.push(parseInt(hourMatch[1]));
      }
    }
    return hours;
  }
  
  return {
    gibbi: {
      generation: gibbiGenerationMatch ? parsePattern(gibbiGenerationMatch[1]) : [],
      posting: gibbiPostingMatch ? parsePattern(gibbiPostingMatch[1]) : []
    },
    prince: {
      generation: princeGenerationMatch ? parsePattern(princeGenerationMatch[1]) : [],
      posting: princePostingMatch ? parsePattern(princePostingMatch[1]) : []
    }
  };
}

/**
 * Generate cron expressions for a set of IST hours
 */
function generateCronExpressions(istHours, skipWednesday = false) {
  const crons = [];
  
  for (const istHour of istHours) {
    const { hour, minute } = istToUtcCron(istHour);
    const dayOfWeek = skipWednesday ? '0,1,2,4,5,6' : '*';
    crons.push(`${minute} ${hour} * * ${dayOfWeek}`);
  }
  
  return crons;
}

/**
 * Generate matrix-based workflows - cleaner approach with fewer files
 * Uses existing schedule functions to determine if work should be done
 */
function generateMatrixWorkflows() {
  const workflows = [];
  
  // Content Generation Workflow - uses matrix for both accounts
  const generateWorkflow = `name: Content Generation

on:
  schedule:
    - cron: '0 * * * *'  # Every hour

jobs:
  generate:
    name: Generate Content
    runs-on: ubuntu-latest
    strategy:
      matrix:
        account: ['@gibbi_ai', '@princediwakar25']
    steps:
      - name: Generate content for \${{ matrix.account }}
        run: |
          curl -X GET "\${{ secrets.VERCEL_URL }}/api/generate?twitter_handle=\${{ matrix.account }}&source=github-actions" \\
            -H "Authorization: Bearer \${{ secrets.CRON_SECRET }}"
`;

  // Auto Post Workflow - single job for all accounts
  const postWorkflow = `name: Auto Post

on:
  schedule:
    - cron: '0 * * * *'  # Every hour

jobs:
  post:
    name: Post Content for All Accounts
    runs-on: ubuntu-latest
    steps:
      - name: Post content for all scheduled accounts
        run: |
          curl -X GET "\${{ secrets.VERCEL_URL }}/api/auto-post?source=github-actions" \\
            -H "Authorization: Bearer \${{ secrets.CRON_SECRET }}"
`;

  workflows.push(
    { fileName: 'content-generation.yml', content: generateWorkflow },
    { fileName: 'auto-post.yml', content: postWorkflow }
  );
  
  return workflows;
}

/**
 * Ensure .github/workflows directory exists
 */
function ensureWorkflowsDirectory() {
  const workflowsDir = path.join(__dirname, '../.github/workflows');
  if (!fs.existsSync(workflowsDir)) {
    fs.mkdirSync(workflowsDir, { recursive: true });
  }
  return workflowsDir;
}

/**
 * Main function to generate all workflows
 */
function main() {
  console.log('🚀 Generating GitHub Actions workflows from schedule configuration...');
  
  try {
    console.log('📅 Using existing schedule functions in lib/schedule.ts for timing logic');
    
    // Ensure workflows directory exists
    const workflowsDir = ensureWorkflowsDirectory();
    
    // Clean existing workflow files first
    const existingFiles = fs.readdirSync(workflowsDir).filter(file => 
      file.endsWith('.yml') || file.endsWith('.yaml')
    );
    existingFiles.forEach(file => {
      fs.unlinkSync(path.join(workflowsDir, file));
    });
    console.log(`🧹 Cleaned ${existingFiles.length} existing workflow files`);
    
    // Generate matrix-based workflows
    const allWorkflows = generateMatrixWorkflows();
    
    allWorkflows.forEach(({ fileName, content }) => {
      fs.writeFileSync(path.join(workflowsDir, fileName), content);
    });
    
    console.log('✅ Successfully generated GitHub Actions workflows:');
    allWorkflows.forEach(({ fileName }) => {
      console.log(`  - .github/workflows/${fileName}`);
    });
    
    console.log(`\n📊 Summary:`);
    console.log(`  - 2 clean workflows created using matrix strategy`);
    console.log(`  - content-generation.yml: Matrix job for both @gibbi_ai and @princediwakar25`);
    console.log(`  - auto-post.yml: Single job for all accounts`);
    console.log(`  - All use GET methods and existing schedule logic`);
    console.log(`  - Matrix approach: cleaner than separate files per account`);
    console.log(`  - APIs will check isGenerationScheduled() and isPostingScheduled()`);
    
  } catch (error) {
    console.error('❌ Error generating workflows:', error.message);
    process.exit(1);
  }
}

// Run the main function
main();