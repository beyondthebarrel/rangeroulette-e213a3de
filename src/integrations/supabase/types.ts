export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          display_name: string | null;
          age: number | null;
          shooting_level: string | null;
          primary_pistol: string | null;
          avatar_path: string | null;
          onboarded: boolean;
          analytics_cleared_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          display_name?: string | null;
          age?: number | null;
          shooting_level?: string | null;
          primary_pistol?: string | null;
          avatar_path?: string | null;
          onboarded?: boolean;
          analytics_cleared_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          display_name?: string | null;
          age?: number | null;
          shooting_level?: string | null;
          primary_pistol?: string | null;
          avatar_path?: string | null;
          onboarded?: boolean;
          analytics_cleared_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      pistols: {
        Row: {
          id: string;
          user_id: string;
          make: string;
          model: string;
          caliber: string | null;
          optic: string | null;
          light: string | null;
          holster: string | null;
          accessories: string | null;
          photo_path: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          make: string;
          model: string;
          caliber?: string | null;
          optic?: string | null;
          light?: string | null;
          holster?: string | null;
          accessories?: string | null;
          photo_path?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          make?: string;
          model?: string;
          caliber?: string | null;
          optic?: string | null;
          light?: string | null;
          holster?: string | null;
          accessories?: string | null;
          photo_path?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      match_results: {
        Row: {
          id: string;
          match_id: string;
          player_name: string;
          player_name_normalized: string;
          won: boolean;
          recorded_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          player_name: string;
          player_name_normalized: string;
          won: boolean;
          recorded_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          player_name?: string;
          player_name_normalized?: string;
          won?: boolean;
          recorded_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      training_sessions: {
        Row: {
          id: string;
          recorded_by: string;
          trainee: string;
          trainee_normalized: string;
          logged_at: string;
          drill: unknown;
          raw_seconds: number;
          zone_misses: number;
          complete_misses: number;
          final_seconds: number;
          saved_drill_name: string | null;
          photo_path: string | null;
          video_path: string | null;
          pistol_id: string | null;
          archived_at: string | null;
          notes: string | null;
          dry_fire: boolean;
        };
        Insert: {
          id?: string;
          recorded_by: string;
          trainee: string;
          trainee_normalized: string;
          logged_at?: string;
          drill: unknown;
          raw_seconds: number;
          zone_misses: number;
          complete_misses: number;
          final_seconds: number;
          saved_drill_name?: string | null;
          photo_path?: string | null;
          video_path?: string | null;
          pistol_id?: string | null;
          archived_at?: string | null;
          notes?: string | null;
          dry_fire?: boolean;
        };
        Update: {
          id?: string;
          recorded_by?: string;
          trainee?: string;
          trainee_normalized?: string;
          logged_at?: string;
          drill?: unknown;
          raw_seconds?: number;
          zone_misses?: number;
          complete_misses?: number;
          final_seconds?: number;
          saved_drill_name?: string | null;
          photo_path?: string | null;
          video_path?: string | null;
          pistol_id?: string | null;
          archived_at?: string | null;
          notes?: string | null;
          dry_fire?: boolean;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          user_id: string;
          email: string;
          square_customer_id: string | null;
          square_subscription_id: string | null;
          status: string;
          trial_ends_at: string | null;
          current_period_end: string | null;
          last_payment_id: string | null;
          last_payment_amount_cents: number | null;
          refunded_at: string | null;
          free_access_until: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          email: string;
          square_customer_id?: string | null;
          square_subscription_id?: string | null;
          status?: string;
          trial_ends_at?: string | null;
          current_period_end?: string | null;
          last_payment_id?: string | null;
          last_payment_amount_cents?: number | null;
          refunded_at?: string | null;
          free_access_until?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          email?: string;
          square_customer_id?: string | null;
          square_subscription_id?: string | null;
          status?: string;
          trial_ends_at?: string | null;
          current_period_end?: string | null;
          last_payment_id?: string | null;
          last_payment_amount_cents?: number | null;
          refunded_at?: string | null;
          free_access_until?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      maintenance_logs: {
        Row: {
          id: string;
          user_id: string;
          pistol_id: string | null;
          entry_type: string;
          description: string;
          logged_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          pistol_id?: string | null;
          entry_type: string;
          description: string;
          logged_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          pistol_id?: string | null;
          entry_type?: string;
          description?: string;
          logged_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
