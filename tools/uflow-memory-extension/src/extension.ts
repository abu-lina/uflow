/**
 * UFlow Memory Extension
 *
 * VS Code extension that registers memory tools for GitHub Copilot agents.
 * Uses local SQLite with WAL mode for multi-window safe storage.
 *
 * @see Plan 032 — DIY Agent Memory System
 */
import * as vscode from 'vscode';
import { MemoryStore } from './store';
import type { StoreMemoryInput, RetrieveMemoryInput } from './types';

let memoryStore: MemoryStore | null = null;

/**
 * Initialize memory store for the current workspace.
 */
async function getMemoryStore(): Promise<MemoryStore | null> {
  if (memoryStore) {
    return memoryStore;
  }

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return null;
  }

  // Use the first workspace folder
  const workspacePath = workspaceFolders[0].uri.fsPath;

  try {
    memoryStore = new MemoryStore({
      workspacePath,
      debug: false,
    });
    await memoryStore.initialize();
    return memoryStore;
  } catch (error) {
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
  console.log('[UFlow Memory] Activating extension');

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
        vscode.window.showWarningMessage(
          'UFlow Memory: No workspace folder open.'
        );
        return;
      }

      const journalMode = store.getJournalMode();
      vscode.window.showInformationMessage(
        `UFlow Memory: Active (SQLite ${journalMode.toUpperCase()} mode)`
      );
    })
  );

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
  console.log('[UFlow Memory] Extension deactivated');
}
