export interface WaitlistSubmission {
  email: string;
  isProvider: boolean | null;
}

export interface WaitlistResponse {
  data: { success: boolean } | null;
  error: { message: string } | null;
}

export interface WaitlistEntry {
  id: string;
  email: string;
  is_provider: boolean | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  confirmed_at: string | null;
}







