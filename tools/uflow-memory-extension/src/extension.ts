/**
 * UFlow Memory Extension
 *
 * VS Code extension that registers memory tools for GitHub Copilot agents.
 * Uses local SQLite with WAL mode for multi-window safe storage.
 *
 * @see Plan 032 — DIY Agent Memory System
 */
import * as vscode from 'vscode';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { MemoryStore } from './store';
import type { StoreMemoryInput, RetrieveMemoryInput } from './types';

let memoryStore: MemoryStore | null = null;
let outputChannel: vscode.OutputChannel;

/**
 * Resolve the best workspace path for memory storage.
 *
 * Strategy (first match wins):
 * 1. Workspace folder that already has .uflow-memory/ (resuming existing store)
 * 2. Workspace folder that has .git/ (likely project root)
 * 3. First workspace folder (any is better than none)
 * 4. Parent directory of .code-workspace file (multi-root fallback)
 * 5. Extension global storage path (absolute last resort)
 */
function resolveWorkspacePath(
  context: vscode.ExtensionContext
): string | null {
  const folders = vscode.workspace.workspaceFolders;

  outputChannel.appendLine(
    `[resolve] workspaceFolders count: ${folders?.length ?? 'null'}`
  );

  if (folders && folders.length > 0) {
    // Log all folders for debugging
    for (const f of folders) {
      outputChannel.appendLine(`[resolve]   folder: ${f.uri.fsPath}`);
    }

    // 1. Prefer folder with existing .uflow-memory/
    for (const folder of folders) {
      const memDir = join(folder.uri.fsPath, '.uflow-memory');
      if (existsSync(memDir)) {
        outputChannel.appendLine(
          `[resolve] Picked folder with existing .uflow-memory: ${folder.uri.fsPath}`
        );
        return folder.uri.fsPath;
      }
    }

    // 2. Prefer folder with .git/
    for (const folder of folders) {
      const gitDir = join(folder.uri.fsPath, '.git');
      if (existsSync(gitDir)) {
        outputChannel.appendLine(
          `[resolve] Picked folder with .git: ${folder.uri.fsPath}`
        );
        return folder.uri.fsPath;
      }
    }

    // 3. Fall back to first folder
    outputChannel.appendLine(
      `[resolve] Using first workspace folder: ${folders[0].uri.fsPath}`
    );
    return folders[0].uri.fsPath;
  }

  // 4. Multi-root workspace file parent directory
  const wsFile = vscode.workspace.workspaceFile;
  if (wsFile && wsFile.scheme === 'file') {
    const wsDir = join(wsFile.fsPath, '..');
    outputChannel.appendLine(
      `[resolve] Using workspace file parent: ${wsDir}`
    );
    return wsDir;
  }

  // 5. Extension global storage as last resort
  const globalPath = context.globalStorageUri.fsPath;
  outputChannel.appendLine(
    `[resolve] Using global storage fallback: ${globalPath}`
  );
  return globalPath;
}

let extensionContext: vscode.ExtensionContext;

/**
 * Initialize memory store for the current workspace.
 */
async function getMemoryStore(): Promise<MemoryStore | null> {
  if (memoryStore) {
    return memoryStore;
  }

  const workspacePath = resolveWorkspacePath(extensionContext);
  if (!workspacePath) {
    outputChannel.appendLine('[init] No workspace path resolved — store unavailable');
    return null;
  }

  try {
    outputChannel.appendLine(`[init] Opening store at: ${workspacePath}`);
    const store = new MemoryStore({
      workspacePath,
      debug: false,
    });
    await store.initialize();
    memoryStore = store; // Only cache AFTER successful init
    outputChannel.appendLine('[init] Store initialized successfully');
    return memoryStore;
  } catch (error) {
    outputChannel.appendLine(`[init] Failed to initialize store: ${error}`);
    outputChannel.appendLine(
      `[init] This may be a native module issue. Ensure better-sqlite3 is rebuilt for VS Code's Electron.`
    );
    outputChannel.show(); // Make the error visible
    console.error('[UFlow Memory] Failed to initialize store:', error);
    return null;
  }
}

/**
 * Store memory tool implementation.
 */
class StoreMemoryTool implements vscode.LanguageModelTool<StoreMemoryInput> {
  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<StoreMemoryInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const store = await getMemoryStore();
    if (!store) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          JSON.stringify({
            success: false,
            error: 'No workspace folder open. Memory requires a workspace.',
          })
        ),
      ]);
    }

    const result = await store.store(options.input);

    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(JSON.stringify(result)),
    ]);
  }
}

/**
 * Retrieve memory tool implementation.
 */
class RetrieveMemoryTool
  implements vscode.LanguageModelTool<RetrieveMemoryInput>
{
  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<RetrieveMemoryInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const store = await getMemoryStore();
    if (!store) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          JSON.stringify({
            memories: [],
            count: 0,
            duration_ms: 0,
            error: 'No workspace folder open. Memory requires a workspace.',
          })
        ),
      ]);
    }

    const result = await store.retrieve(options.input);

    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(JSON.stringify(result)),
    ]);
  }
}

/**
 * Extension activation.
 */
export function activate(context: vscode.ExtensionContext): void {
  // Create visible Output channel for diagnostics
  outputChannel = vscode.window.createOutputChannel('UFlow Memory');
  context.subscriptions.push(outputChannel);

  // Store context for later use in resolveWorkspacePath
  extensionContext = context;

  outputChannel.appendLine('Activating UFlow Memory extension...');
  outputChannel.appendLine(`VS Code version: ${vscode.version}`);
  outputChannel.appendLine(
    `Workspace folders: ${vscode.workspace.workspaceFolders?.map((f) => f.uri.fsPath).join(', ') ?? 'none'}`
  );
  outputChannel.appendLine(
    `Workspace file: ${vscode.workspace.workspaceFile?.fsPath ?? 'none'}`
  );

  // Register memory tools
  context.subscriptions.push(
    vscode.lm.registerTool('flowbaby_storeMemory', new StoreMemoryTool())
  );

  context.subscriptions.push(
    vscode.lm.registerTool('flowbaby_retrieveMemory', new RetrieveMemoryTool())
  );

  // Register status command
  context.subscriptions.push(
    vscode.commands.registerCommand('uflowMemory.showStatus', async () => {
      const store = await getMemoryStore();
      if (!store) {
        const resolved = resolveWorkspacePath(context);
        vscode.window.showWarningMessage(
          `UFlow Memory: Could not open store. Resolved path: ${resolved ?? 'none'}. Check Output → UFlow Memory for details.`
        );
        outputChannel.show();
        return;
      }

      const journalMode = store.getJournalMode();
      const dbPath = join(
        resolveWorkspacePath(context) ?? 'unknown',
        '.uflow-memory',
        'memories.db'
      );
      vscode.window.showInformationMessage(
        `UFlow Memory: Active (SQLite ${journalMode.toUpperCase()} mode) — ${dbPath}`
      );
    })
  );

  // Eagerly try to initialize store (non-blocking) so tools are ready on first call
  getMemoryStore().then((store) => {
    if (store) {
      outputChannel.appendLine('Store ready — tools are available.');
    } else {
      outputChannel.appendLine(
        'WARNING: Store could not be initialized during activation. Tools will retry on first call.'
      );
    }
  });

  outputChannel.appendLine('Extension activated — tools registered.');
  console.log('[UFlow Memory] Extension activated');
}

/**
 * Extension deactivation.
 */
export async function deactivate(): Promise<void> {
  if (memoryStore) {
    await memoryStore.close();
    memoryStore = null;
  }
  outputChannel?.appendLine('Extension deactivated');
  console.log('[UFlow Memory] Extension deactivated');
}
