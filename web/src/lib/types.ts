export type Paginated<T> = { count: number; next: string | null; previous: string | null; results: T[] };

export type Partner = { id: number; name: string };

export type ProgramInstance = {
  id: number;
  code: string;
  label: string;
  partner: number;
  year: number;
  is_active: boolean;
};

export type GradeEnrollment = { id: number; school: number; grade: number; total_sections: number; total_students: number };

export type SchoolTeacher = { id: number; school: number; name: string; phone: string; grades_taught: string };

export type SessionScheduleDay = "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

export type SessionSchedule = { id: number; school: number; grade: number; day_of_week: SessionScheduleDay; time: string };

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
  iif_poc: string;
  observations: string;
  next_steps: string;
  visited_by: string;
  visit_date: string | null;
  form1_submitted: boolean;
  form1_submitted_at: string | null;
  form2_submitted: boolean;
  form2_submitted_at: string | null;
  grade_enrollments: GradeEnrollment[];
  teachers: SchoolTeacher[];
  session_schedules: SessionSchedule[];
};

export type KitDelivery = {
  id: number;
  school: number;
  delivered_by: string;
  received_by: string;
  date_of_delivery: string;
  grade_6_kit: boolean;
  grade_7_kit: boolean;
  grade_8_kit: boolean;
  grade_9_kit: boolean;
  delivery_proof_photo: number | null;
  acknowledgement_letter: number | null;
};

export type StudentHeadcount = {
  id: number;
  school: number;
  grade: number;
  section: string;
  total_sl: number;
  total_clusters: number;
  total_teams: number;
  total_students: number;
  teams_info_photo: number | null;
  student_database_file: number | null;
  extraction_status: "ok" | "extraction_error" | "needs_validation";
  count_validation: "ok" | "mismatch" | "needs_validation";
};

export type SLSelectionStatus = "selected" | "not_selected" | "pending";

export type SLSelection = {
  id: number;
  school: number;
  grade: number;
  section: string;
  teacher: string;
  sl_name: string;
  interested_in_role: boolean;
  attendance_above_90: boolean;
  sl_status: SLSelectionStatus;
  speaks_clearly: boolean;
  speaks_loudly: boolean;
  understands_english: boolean;
  teacher_acknowledged: boolean;
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

export type FormStatus = "not_started" | "in_progress" | "complete";

export type MismatchFlag = { grade: number; section: string; total_sl: number; sl_selection_count: number };

export type SchoolProgress = {
  school: number;
  school_code: string;
  school_name: string;
  form1_status: FormStatus;
  form2_status: FormStatus;
  form3_pct: number;
  form4_pct: number;
  kit_status: FormStatus;
  mismatch_flags: MismatchFlag[];
  updated_at: string;
};

export type ReportsKpis = {
  schools_enrolled: number;
  forms_completed_pct: number;
  kits_delivered: number;
  active_student_leaders: number;
};

export type ReportsSummary = { kpis: ReportsKpis | null; schools: SchoolProgress[] };

export type Cluster = {
  id: number;
  school: number;
  grade: number;
  section: string;
  cluster_number: number;
  teams: Team[];
};
