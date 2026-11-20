export const accountService = {
  /**
   * Permanently delete the signed-in user's account and all associated data.
   * The server route takes the user id from the session.
   */
  deleteAccount: async () => {
    const res = await fetch('/api/user/delete-account', { method: 'DELETE' });
    if (!res.ok) {
      const { error } = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(`Failed to delete account: ${error ?? res.statusText}`);
    }
    return { success: true };
  },
};
