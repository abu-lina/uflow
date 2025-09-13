import { supabase } from '@/lib/supabase/client';

export const accountService = {
  /**
   * Permanently delete user account and all associated data
   * This performs a hard deletion from the database
   */
  deleteAccount: async (userId: string) => {
    try {
      // Delete user-related data from all tables
      const deletionPromises = [
        // Delete user's providers (providers table uses provider_owner_id)
        supabase.from('providers').delete().eq('provider_owner_id', userId),
        
        // Delete user's bookmarks
        supabase.from('bookmarks').delete().eq('user_id', userId),
        
        // Delete user's profile data from users table
        supabase.from('users').delete().eq('user_id', userId),
      ];

      // Execute all deletions
      const deletionResults = await Promise.allSettled(deletionPromises);
      
      // Check if any deletions failed
      const failedDeletions = deletionResults.filter(result => result.status === 'rejected');
      if (failedDeletions.length > 0) {
        console.error('Some data deletions failed:', failedDeletions);
        // Continue with user deletion even if some data deletions failed
      }

      // Finally, delete the user from auth
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      
      if (authError) {
        // If admin deletion fails, try to delete via RPC function
        const { error: rpcError } = await supabase.rpc('delete_user_account', {
          user_id: userId
        });
        
        if (rpcError) {
          throw new Error(`Failed to delete user account: ${rpcError.message}`);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Account deletion error:', error);
      throw new Error(`Failed to delete account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Alternative method using RPC function for account deletion
   * This assumes you have a database function set up
   */
  deleteAccountViaRPC: async (userId: string) => {
    try {
      const { error } = await supabase.rpc('delete_user_account', {
        user_id: userId
      });

      if (error) {
        throw new Error(`Failed to delete account: ${error.message}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Account deletion error:', error);
      throw error;
    }
  }
};
