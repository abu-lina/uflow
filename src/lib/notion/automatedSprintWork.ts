/**
 * Automated sprint work - implements sprint items using expert rules
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import type { SprintItem } from './sprintWorkEngine';
import { buildImplementationContext, formatContextAsPrompt } from './implementationContext';
import { readExpertRules } from './epicExpertAnalysis';

const execAsync = promisify(exec);

export interface ImplementationResult {
  success: boolean;
  filesModified: string[];
  errors: string[];
  warnings: string[];
  implementationSummary: string;
}

export interface ValidationResult {
  passed: boolean;
  expertValidations: Array<{
    expert: string;
    passed: boolean;
    issues: string[];
  }>;
  overallIssues: string[];
}

export interface TestResult {
  passed: boolean;
  testOutput: string;
  errors: string[];
  warnings: string[];
}

export interface AutomatedWorkResult {
  implementation: ImplementationResult;
  validation: ValidationResult;
  tests: TestResult;
  linting: TestResult;
  readyToComplete: boolean;
}

/**
 * Implement a sprint item using expert rules
 * 
 * Note: This function provides the context and instructions for implementation.
 * The actual implementation is done by the AI (Cursor) based on the context.
 */
export async function implementSprintItem(
  item: SprintItem,
  _expertRules: Map<string, string>
): Promise<ImplementationResult> {
  // Build implementation context
  const context = await buildImplementationContext(item);
  
  // Format as prompt for AI
  const prompt = formatContextAsPrompt(context);

  // The actual implementation happens through Cursor AI based on this context
  // This function returns a result structure that will be populated
  // by the actual implementation process
  
  return {
    success: true,
    filesModified: [],
    errors: [],
    warnings: [],
    implementationSummary: `Implementation context prepared for: ${item.name}\n\n${prompt}`,
  };
}

/**
 * Validate implementation against expert rules
 */
export async function validateAgainstExpertRules(
  implementation: ImplementationResult,
  expertRules: Map<string, string>,
  item: SprintItem
): Promise<ValidationResult> {
  const expertValidations: ValidationResult['expertValidations'] = [];
  const overallIssues: string[] = [];

  // Get required experts
  const requiredExperts = item.refinement || [];

  for (const expert of requiredExperts) {
    const rule = expertRules.get(expert);
    if (!rule) {
      expertValidations.push({
        expert,
        passed: false,
        issues: [`Expert rule not found for ${expert}`],
      });
      continue;
    }

    const issues: string[] = [];

    // Extract review criteria from rule
    const reviewMatch = rule.match(/## Review Criteria\s*\n\n([\s\S]*?)(?=##|$)/);
    if (reviewMatch) {
      const criteria = reviewMatch[1];
      // Basic validation - check if implementation summary mentions key criteria
      // This is a simplified validation - in practice, this would analyze the actual code
      const criteriaLines = criteria.split('\n').filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'));
      
      for (const criterion of criteriaLines.slice(0, 3)) {
        // Check if criterion is addressed (simplified check)
        const criterionKey = criterion.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
        if (criterionKey && !implementation.implementationSummary.toLowerCase().includes(criterionKey.substring(0, 20))) {
          issues.push(`May not address: ${criterion.trim()}`);
        }
      }
    }

    expertValidations.push({
      expert,
      passed: issues.length === 0,
      issues,
    });

    overallIssues.push(...issues);
  }

  return {
    passed: overallIssues.length === 0,
    expertValidations,
    overallIssues,
  };
}

/**
 * Run automated tests
 */
export async function runTestsAndLinting(): Promise<TestResult> {
  try {
    // Run tests
    const { stdout: testOutput, stderr: testErrors } = await execAsync('npm test -- --run', {
      cwd: process.cwd(),
      timeout: 120000, // 2 minutes timeout
    });

    const errors: string[] = [];
    const warnings: string[] = [];

    // Parse test output
    if (testErrors && testErrors.length > 0) {
      errors.push(testErrors);
    }

    // Check if tests passed (simplified - in practice would parse vitest output)
    const passed = !testOutput.includes('FAIL') && !testOutput.includes('Error');

    return {
      passed,
      testOutput,
      errors,
      warnings,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      passed: false,
      testOutput: '',
      errors: [errorMessage],
      warnings: [],
    };
  }
}

/**
 * Run linting and type checking
 */
export async function runLinting(): Promise<TestResult> {
  try {
    // Run type check
    const { stdout: typeCheckOutput, stderr: typeCheckErrors } = await execAsync('npm run type-check', {
      cwd: process.cwd(),
      timeout: 60000, // 1 minute timeout
    });

    // Run linting
    const { stdout: lintOutput, stderr: lintErrors } = await execAsync('npm run lint', {
      cwd: process.cwd(),
      timeout: 60000, // 1 minute timeout
    });

    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeCheckErrors && typeCheckErrors.length > 0) {
      errors.push(`Type check errors: ${typeCheckErrors}`);
    }

    if (lintErrors && lintErrors.length > 0) {
      errors.push(`Lint errors: ${lintErrors}`);
    }

    // Check if linting passed
    const passed = errors.length === 0;

    return {
      passed,
      testOutput: `${typeCheckOutput}\n\n${lintOutput}`,
      errors,
      warnings,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      passed: false,
      testOutput: '',
      errors: [errorMessage],
      warnings: [],
    };
  }
}

/**
 * Perform automated work on a sprint item
 */
export async function performAutomatedWork(item: SprintItem): Promise<AutomatedWorkResult> {
  // Load expert rules
  const allExpertRules = readExpertRules();
  const requiredExperts = item.refinement || [];
  const expertRules = new Map<string, string>();
  
  for (const expert of requiredExperts) {
    const rule = allExpertRules.get(expert);
    if (rule) {
      expertRules.set(expert, rule);
    }
  }

  // Step 1: Implement (context is prepared, actual implementation happens via AI)
  const implementation = await implementSprintItem(item, expertRules);

  // Step 2: Validate
  const validation = await validateAgainstExpertRules(implementation, expertRules, item);

  // Step 3: Run tests
  const tests = await runTestsAndLinting();

  // Step 4: Run linting
  const linting = await runLinting();

  // Determine if ready to complete
  const readyToComplete = 
    implementation.success &&
    validation.passed &&
    tests.passed &&
    linting.passed;

  return {
    implementation,
    validation,
    tests,
    linting,
    readyToComplete,
  };
}

