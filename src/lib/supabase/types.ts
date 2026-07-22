export type SubjectType = "basic" | "advanced" | "elective";
export type AssignmentCategory = "practice" | "midterm" | "final" | "competency";
export type AttendanceStatus = "present" | "late" | "absent" | "leave" | "truant";
export type AttendanceMethod = "teacher" | "qr";

export type Database = {
  public: {
    Tables: {
      schools: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["schools"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["schools"]["Insert"]>;
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
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["teachers"]["Row"], "created_at" | "school_id" | "is_admin"> & {
          school_id?: string | null;
          is_admin?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["teachers"]["Insert"]>;
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
      attendance: {
        Row: {
          id: string;
          student_code: string;
          section_id: string;
          date: string;
          status: AttendanceStatus;
          method: AttendanceMethod;
          recorded_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["attendance"]["Row"], "id" | "recorded_at" | "method"> & { method?: AttendanceMethod };
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
