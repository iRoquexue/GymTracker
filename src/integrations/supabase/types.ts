export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      cardio_sessions: {
        Row: {
          completed: boolean
          created_at: string
          duration_min: number
          id: string
          intensity: string
          name: string
          position: number
          updated_at: string
          user_id: string
          workout_day_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          duration_min?: number
          id?: string
          intensity?: string
          name: string
          position?: number
          updated_at?: string
          user_id: string
          workout_day_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          duration_min?: number
          id?: string
          intensity?: string
          name?: string
          position?: number
          updated_at?: string
          user_id?: string
          workout_day_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cardio_sessions_workout_day_id_fkey"
            columns: ["workout_day_id"]
            isOneToOne: false
            referencedRelation: "workout_days"
            referencedColumns: ["id"]
          },
        ]
      }
      meals: {
        Row: {
          carbs_g: number | null
          created_at: string
          fat_g: number | null
          id: string
          items: string | null
          kcal: number | null
          name: string
          position: number
          protein_g: number | null
          time: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          id?: string
          items?: string | null
          kcal?: number | null
          name: string
          position?: number
          protein_g?: number | null
          time?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          id?: string
          items?: string | null
          kcal?: number | null
          name?: string
          position?: number
          protein_g?: number | null
          time?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          daily_kcal_goal: number | null
          daily_water_goal_ml: number | null
          display_name: string | null
          focus: string | null
          goal_weight_kg: number | null
          height_cm: number | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          daily_kcal_goal?: number | null
          daily_water_goal_ml?: number | null
          display_name?: string | null
          focus?: string | null
          goal_weight_kg?: number | null
          height_cm?: number | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          daily_kcal_goal?: number | null
          daily_water_goal_ml?: number | null
          display_name?: string | null
          focus?: string | null
          goal_weight_kg?: number | null
          height_cm?: number | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      progress_photos: {
        Row: {
          created_at: string
          id: string
          note: string | null
          photo_url: string
          taken_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          photo_url: string
          taken_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          photo_url?: string
          taken_at?: string
          user_id?: string
        }
        Relationships: []
      }
      strength_exercises: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          name: string
          notes: string | null
          position: number
          reps: string
          rest_sec: number
          sets: number
          updated_at: string
          user_id: string
          weight_kg: number
          workout_day_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          position?: number
          reps?: string
          rest_sec?: number
          sets?: number
          updated_at?: string
          user_id: string
          weight_kg?: number
          workout_day_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          position?: number
          reps?: string
          rest_sec?: number
          sets?: number
          updated_at?: string
          user_id?: string
          weight_kg?: number
          workout_day_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "strength_exercises_workout_day_id_fkey"
            columns: ["workout_day_id"]
            isOneToOne: false
            referencedRelation: "workout_days"
            referencedColumns: ["id"]
          },
        ]
      }
      weight_logs: {
        Row: {
          created_at: string
          id: string
          logged_at: string
          note: string | null
          user_id: string
          weight_kg: number
        }
        Insert: {
          created_at?: string
          id?: string
          logged_at?: string
          note?: string | null
          user_id: string
          weight_kg: number
        }
        Update: {
          created_at?: string
          id?: string
          logged_at?: string
          note?: string | null
          user_id?: string
          weight_kg?: number
        }
        Relationships: []
      }
      workout_days: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          duration_actual_sec: number
          id: string
          muscle_group: string | null
          name: string
          notes: string | null
          planned_duration_min: number
          position: number
          scheduled_date: string | null
          started_at: string | null
          status: string
          type: string
          updated_at: string
          user_id: string
          weekday: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          duration_actual_sec?: number
          id?: string
          muscle_group?: string | null
          name: string
          notes?: string | null
          planned_duration_min?: number
          position?: number
          scheduled_date?: string | null
          started_at?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id: string
          weekday?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          duration_actual_sec?: number
          id?: string
          muscle_group?: string | null
          name?: string
          notes?: string | null
          planned_duration_min?: number
          position?: number
          scheduled_date?: string | null
          started_at?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
          weekday?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
