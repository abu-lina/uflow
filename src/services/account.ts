export const accountService = {
  /**
   * Permanently delete the signed-in user's account and all associated data.
   * The server route takes the user id from the session. Resolves 'signed-out'
   * when there is no session; throws on any other failure.
   */
  deleteAccount: async (): Promise<'deleted' | 'signed-out'> => {
    const res = await fetch('/api/user/delete-account', { method: 'DELETE' });
    if (res.status === 401) return 'signed-out';
    if (!res.ok) throw new Error(`Account deletion failed with status ${res.status}`);
    return 'deleted';
  },
};
