export type SubjectType = "basic" | "advanced" | "elective";
export type AssignmentCategory = "practice" | "midterm" | "final" | "competency";
export type AttendanceStatus =
  | "present"
  | "late"
  | "absent"
  | "truant"
  | "leave" // เดิม เก็บไว้เพื่อความเข้ากันได้กับ Sheets sync ที่ยังอาจส่งค่านี้ — ไม่เสนอในตัวเลือกหน้าเว็บใหม่แล้ว
  | "sick_leave"
  | "personal_leave"
  | "field_trip" // ทัศนศึกษาทั้งห้อง — ตั้งผ่านปุ่มทั้งห้องเท่านั้น ไม่ใช่ตัวเลือกรายคน
  | "school_holiday" // หยุดพิเศษทั้งห้อง — เช่นเดียวกัน
  | "excused_activity"; // ขอเวลาเรียน (เป็นพิธีกร/ไป open house/สอบคัดค่ายฯ ที่ได้รับอนุญาต) — นับเป็นมาเรียน
export type AttendanceMethod = "teacher" | "qr";

export type Database = {
  public: {
    Tables: {
      schools: {
        Row: {
          id: string;
          name: string;
          school_code: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["schools"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["schools"]["Insert"]>;
      };
      billing_payments: {
        Row: {
          id: string;
          school_id: string;
          submitted_by: string;
          payment_ref: string | null;
          slip_url: string | null;
          status: "pending" | "approved" | "rejected";
          resulting_paid_until: string | null;
          submitted_at: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["billing_payments"]["Row"], "id" | "submitted_at"> & {
          status?: "pending" | "approved" | "rejected";
        };
        Update: Partial<Database["public"]["Tables"]["billing_payments"]["Insert"]>;
      };
      subjects: {
        Row: {
          id: string;
          name: string;
          code: string;
          type: SubjectType;
          teacher_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["subjects"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["subjects"]["Insert"]>;
      };
      sections: {
        Row: {
          id: string;
          name: string;
          subject_id: string;
          academic_year: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["sections"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["sections"]["Insert"]>;
      };
      students: {
        Row: {
          id: string;
          student_code: string;
          full_name: string;
          class_level: string;
          student_number: number | null;
          school_id: string | null;
          created_at: string;
        };
        Insert: { id: string; student_code: string; full_name: string; class_level?: string; student_number?: number | null; school_id?: string | null };
        Update: Partial<Database["public"]["Tables"]["students"]["Insert"]>;
      };
      student_sections: {
        Row: {
          id: string;
          student_id: string;
          section_id: string;
          enrolled_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["student_sections"]["Row"], "id" | "enrolled_at">;
        Update: Partial<Database["public"]["Tables"]["student_sections"]["Insert"]>;
      };
      assignments: {
        Row: {
          id: string;
          subject_id: string;
          title: string;
          display_name: string | null;
          description: string | null;
          due_date: string | null;
          max_score: number;
          category: AssignmentCategory;
          term: 1 | 2;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["assignments"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["assignments"]["Insert"]>;
      };
      score_cache: {
        Row: {
          id: string;
          student_code: string;
          assignment_id: string;
          score: number | null;
          updated_at: string;
        };
        Insert: Omit<{ id: string; student_code: string; assignment_id: string; score?: number | null; updated_at?: string }, "id" | "updated_at">;
        Update: Partial<{ student_code: string; assignment_id: string; score: number | null }>;
      };
      teachers: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          school_id: string | null;
          is_admin: boolean;
          is_super_admin: boolean;
          is_suspended: boolean;
          sync_secret: string | null;
          paid_until: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["teachers"]["Row"], "created_at" | "school_id" | "is_admin" | "is_super_admin" | "is_suspended" | "sync_secret" | "paid_until"> & {
          school_id?: string | null;
          is_admin?: boolean;
          is_super_admin?: boolean;
          is_suspended?: boolean;
          sync_secret?: string | null;
          paid_until?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["teachers"]["Insert"]>;
      };
      school_requests: {
        Row: {
          id: string;
          requester_name: string;
          requester_email: string;
          school_name: string;
          status: "pending" | "approved" | "rejected";
          created_at: string;
          reviewed_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["school_requests"]["Row"], "id" | "created_at" | "status" | "reviewed_at"> & {
          status?: "pending" | "approved" | "rejected";
        };
        Update: Partial<Database["public"]["Tables"]["school_requests"]["Insert"]>;
      };
      resources: {
        Row: {
          id: string;
          subject_id: string;
          section_id: string | null;
          title: string;
          file_url: string;
          category: string | null;
          term: number | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["resources"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["resources"]["Insert"]>;
      };
      learning_media: {
        Row: {
          id: string;
          subject_id: string;
          section_id: string | null;
          title: string;
          description: string | null;
          category: string | null;
          media_type: "link" | "file";
          url: string | null;
          file_url: string | null;
          file_name: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["learning_media"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["learning_media"]["Insert"]>;
      };
      lesson_chapters: {
        Row: {
          id: string;
          subject_id: string;
          section_id: string | null;
          title: string;
          order_index: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["lesson_chapters"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["lesson_chapters"]["Insert"]>;
      };
      lessons: {
        Row: {
          id: string;
          chapter_id: string;
          subject_id: string;
          title: string;
          content: string | null;
          media_type: "link" | "file" | null;
          media_url: string | null;
          file_url: string | null;
          file_name: string | null;
          order_index: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["lessons"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["lessons"]["Insert"]>;
      };
      interactive_topics: {
        Row: {
          id: string;
          subject_id: string;
          section_id: string | null;
          topic_slug: string;
          order_index: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["interactive_topics"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["interactive_topics"]["Insert"]>;
      };
      interactive_progress: {
        Row: {
          id: string;
          student_id: string;
          topic_slug: string;
          seen: number;
          asked: number;
          correct: number;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["interactive_progress"]["Row"], "id" | "updated_at"> & {
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["interactive_progress"]["Insert"]>;
      };
      quiz_sets: {
        Row: {
          id: string;
          subject_id: string;
          section_id: string | null;
          title: string;
          difficulty: "medium" | "hard" | "very_hard";
          order_index: number;
          is_published: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["quiz_sets"]["Row"], "id" | "created_at" | "is_published"> & {
          is_published?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["quiz_sets"]["Insert"]>;
      };
      quiz_questions: {
        Row: {
          id: string;
          quiz_set_id: string;
          question_type: "multiple_choice" | "fill_blank";
          prompt: string;
          choices: string[] | null;
          correct_answer: string;
          accepted_answers: string[] | null;
          solution: string | null;
          order_index: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["quiz_questions"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["quiz_questions"]["Insert"]>;
      };
      quiz_attempts: {
        Row: {
          id: string;
          quiz_set_id: string;
          student_id: string;
          answers: Record<string, string>;
          score: number;
          max_score: number;
          submitted_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["quiz_attempts"]["Row"], "id" | "submitted_at"> & {
          submitted_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["quiz_attempts"]["Insert"]>;
      };
      attendance: {
        Row: {
          id: string;
          student_code: string;
          section_id: string;
          date: string;
          status: AttendanceStatus;
          method: AttendanceMethod;
          note: string | null;
          recorded_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["attendance"]["Row"], "id" | "recorded_at" | "method" | "note"> & {
          method?: AttendanceMethod;
          note?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["attendance"]["Insert"]>;
      };
      qr_sessions: {
        Row: {
          token: string;
          section_id: string;
          date: string;
          expires_at: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["qr_sessions"]["Row"], "token" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["qr_sessions"]["Insert"]>;
      };
      announcements: {
        Row: {
          id: string;
          subject_id: string;
          section_id: string | null;
          message: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["announcements"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["announcements"]["Insert"]>;
      };
      tasks: {
        Row: {
          id: string;
          subject_id: string;
          section_id: string | null;
          title: string;
          description: string | null;
          due_date: string | null;
          assignment_id: string | null;
          max_score: number | null;
          reduced_max_score: number | null;
          allow_late_submission: boolean;
          file_url: string | null;
          file_name: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["tasks"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["tasks"]["Insert"]>;
      };
      task_submissions: {
        Row: {
          id: string;
          task_id: string;
          student_id: string;
          content: string | null;
          file_url: string | null;
          file_name: string | null;
          content_hash: string | null;
          image_hash: string | null;
          grade: number | null;
          feedback: string | null;
          graded_at: string | null;
          submission_count: number;
          submitted_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["task_submissions"]["Row"], "id" | "submitted_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["task_submissions"]["Insert"]>;
      };
      submissions: {
        Row: {
          id: string;
          assignment_id: string;
          student_id: string;
          content: string | null;
          file_url: string | null;
          score: number | null;
          submitted_at: string;
          graded_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["submissions"]["Row"], "id" | "submitted_at">;
        Update: Partial<Database["public"]["Tables"]["submissions"]["Insert"]>;
      };
    };
    Views: {};
    Functions: {};
    Enums: {
      subject_type: SubjectType;
    };
  };
};
