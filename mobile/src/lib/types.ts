export type Paginated<T> = { count: number; next: string | null; previous: string | null; results: T[] };

export type Cluster = {
  id: number;
  school: number;
  grade: number;
  section: string;
  cluster_number: number;
  teams: Team[];
};

export type Team = {
  id: number;
  cluster: number;
  team_code: string;
  sl_name: string;
  students: { id: number; name: string }[];
};

export type SubmissionFile = { id: number; kind: "photo" | "audio"; file: number; created_at: string };
export type AIFeedbackQuestion = { id: number; order: number; question_en: string; question_te: string };
export type FeedbackReport = { id: number; type: "individual" | "all_teams"; file: number; created_at: string };

export type InquibuddySubmission = {
  id: number;
  team: number;
  team_code: string;
  sl_name: string;
  status: "pending" | "processing" | "evaluated";
  evaluation_count: number;
  submission_files: SubmissionFile[];
  ai_feedback_questions: AIFeedbackQuestion[];
  feedback_reports: FeedbackReport[];
};
