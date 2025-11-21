/**
 * Git branch management helpers
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Get the workspace root directory
 */
function getWorkspaceRoot(): string {
  // Try to get from process.cwd() (Next.js API routes run from project root)
  // If that doesn't work, try to find .git directory
  const cwd = process.cwd();
  return cwd;
}

/**
 * Sanitize a sprint name to a valid git branch name
 * - Convert to lowercase
 * - Replace spaces and special characters with hyphens
 * - Remove invalid characters
 * - Limit length
 */
export function sanitizeBranchName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Replace spaces and common separators with hyphens
    .replace(/[\s_]+/g, '-')
    // Remove invalid characters (keep alphanumeric, hyphens, and dots)
    .replace(/[^a-z0-9.-]/g, '')
    // Remove consecutive hyphens
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens and dots
    .replace(/^[-.]+|[-.]+$/g, '')
    // Limit length to 100 characters (git branch name limit is typically 255, but we'll be conservative)
    .substring(0, 100);
}

/**
 * Create a git branch from the current branch
 * If branch already exists, checks it out instead
 */
export async function createBranch(branchName: string): Promise<{ success: boolean; branchName: string; created: boolean; error?: string }> {
  try {
    // Sanitize branch name
    const sanitized = sanitizeBranchName(branchName);
    
    if (!sanitized) {
      return {
        success: false,
        branchName: sanitized,
        created: false,
        error: 'Branch name is empty after sanitization',
      };
    }

    const workspaceRoot = getWorkspaceRoot();
    
    // Check if branch already exists locally
    let branchExists = false;
    try {
      await execAsync(`git show-ref --verify --quiet refs/heads/${sanitized}`, {
        cwd: workspaceRoot,
      });
      branchExists = true;
    } catch {
      // Branch doesn't exist locally, check remote
      try {
        await execAsync(`git show-ref --verify --quiet refs/remotes/origin/${sanitized}`, {
          cwd: workspaceRoot,
        });
        branchExists = true;
      } catch {
        // Branch doesn't exist
      }
    }

    if (branchExists) {
      // Branch exists, checkout instead of create
      await execAsync(`git checkout ${sanitized}`, {
        cwd: workspaceRoot,
      });
      return {
        success: true,
        branchName: sanitized,
        created: false,
      };
    }

    // Create and checkout new branch
    await execAsync(`git checkout -b ${sanitized}`, {
      cwd: workspaceRoot,
    });

    return {
      success: true,
      branchName: sanitized,
      created: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      branchName: sanitizeBranchName(branchName),
      created: false,
      error: `Failed to create branch: ${errorMessage}`,
    };
  }
}

/**
 * Get current git branch name
 */
export async function getCurrentBranch(): Promise<string> {
  try {
    const workspaceRoot = getWorkspaceRoot();
    const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', {
      cwd: workspaceRoot,
    });
    return stdout.trim();
  } catch (error) {
    throw new Error(`Failed to get current branch: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

