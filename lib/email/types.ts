export type EmailType =
  | "welcome_candidate"
  | "welcome_company"
  | "profile_started"
  | "profile_completed"
  | "public_profile_enabled"
  | "application_received_candidate"
  | "new_application_company"
  | "job_expiring"
  | "job_deactivated_summary"
  | "company_daily_job_digest"
  | "candidate_weekly_profile_views"
  | "team_invite";

export type EmailStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "opened"
  | "clicked"
  | "bounced"
  | "complained"
  | "failed"
  | "suppressed";

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};
