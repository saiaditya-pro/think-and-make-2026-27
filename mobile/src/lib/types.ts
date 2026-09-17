export type Paginated<T> = { count: number; next: string | null; previous: string | null; results: T[] };

export type Partner = { id: number; name: string };

export type GradeEnrollment = { id: number; school: number; grade: number; total_sections: number; total_students: number };

export type School = {
  id: number;
  instance: number;
  school_code: string;
  name: string;
  district: string;
  location: string;
  distance_to_iif_km: string | null;
  gender_type: "boys" | "girls" | "co-ed" | "";
  school_type: "government" | "private" | "aided" | "";
  medium: "telugu" | "english" | "urdu" | "";
  grades_offered: string;
  total_sections: number | null;
  principal_name: string;
  principal_phone: string;
  principal_email: string;
  principal_acknowledged: boolean;
  lab_room: boolean | null;
  internet: boolean | null;
  smart_board: "yes" | "no" | "yes_not_working" | "";
  kit_storage: boolean | null;
  maps_link: string;
  school_photo: number | null;
  observations: string;
  next_steps: string;
  visited_by: string;
  visit_date: string | null;
  form1_submitted: boolean;
  form1_submitted_at: string | null;
  grade_enrollments: GradeEnrollment[];
};

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
