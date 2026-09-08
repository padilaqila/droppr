export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ProjectStatus =
  | "not_started"
  | "in_progress"
  | "waiting"
  | "ready_to_claim"
  | "completed"
  | "archived";

export type TaskType = "one_time" | "daily" | "weekly" | "custom";

export type TaskStatus = "pending" | "done" | "skipped";

export interface Database {
  public: {
    Tables: {
      folders: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "folders_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          folder_id: string | null;
          name: string;
          chain: string | null;
          status: ProjectStatus;
          logo_url: string | null;
          social_links: Json;
          guide_content: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          folder_id?: string | null;
          name: string;
          chain?: string | null;
          status?: ProjectStatus;
          logo_url?: string | null;
          social_links?: Json;
          guide_content?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          folder_id?: string | null;
          name?: string;
          chain?: string | null;
          status?: ProjectStatus;
          logo_url?: string | null;
          social_links?: Json;
          guide_content?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_folder_id_fkey";
            columns: ["folder_id"];
            isOneToOne: false;
            referencedRelation: "folders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projects_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      tasks: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          type: TaskType;
          due_date: string | null;
          recurrence_rule: string | null;
          status: TaskStatus;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          type?: TaskType;
          due_date?: string | null;
          recurrence_rule?: string | null;
          status?: TaskStatus;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          title?: string;
          type?: TaskType;
          due_date?: string | null;
          recurrence_rule?: string | null;
          status?: TaskStatus;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          }
        ];
      };
      wallets: {
        Row: {
          id: string;
          user_id: string;
          address: string;
          chain: string | null;
          label: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          address: string;
          chain?: string | null;
          label?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          address?: string;
          chain?: string | null;
          label?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      project_wallets: {
        Row: {
          project_id: string;
          wallet_id: string;
          created_at: string;
        };
        Insert: {
          project_id: string;
          wallet_id: string;
          created_at?: string;
        };
        Update: {
          project_id?: string;
          wallet_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_wallets_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_wallets_wallet_id_fkey";
            columns: ["wallet_id"];
            isOneToOne: false;
            referencedRelation: "wallets";
            referencedColumns: ["id"];
          }
        ];
      };
      accounts: {
        Row: {
          id: string;
          project_id: string;
          label: string;
          username_email: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          label: string;
          username_email: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          label?: string;
          username_email?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "accounts_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          }
        ];
      };
      reminders: {
        Row: {
          id: string;
          user_id: string;
          project_id: string | null;
          task_id: string | null;
          frequency: string;
          channel: string[];
          next_trigger_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_id?: string | null;
          task_id?: string | null;
          frequency: string;
          channel?: string[];
          next_trigger_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_id?: string | null;
          task_id?: string | null;
          frequency?: string;
          channel?: string[];
          next_trigger_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reminders_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reminders_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reminders_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      claims: {
        Row: {
          id: string;
          project_id: string;
          token_amount: number | null;
          token_symbol: string | null;
          claim_date: string;
          estimated_value: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          token_amount?: number | null;
          token_symbol?: string | null;
          claim_date?: string;
          estimated_value?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          token_amount?: number | null;
          token_symbol?: string | null;
          claim_date?: string;
          estimated_value?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "claims_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          }
        ];
      };
      notification_log: {
        Row: {
          id: string;
          user_id: string;
          reminder_id: string | null;
          channel: string;
          sent_at: string;
          status: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          reminder_id?: string | null;
          channel: string;
          sent_at?: string;
          status?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          reminder_id?: string | null;
          channel?: string;
          sent_at?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_log_reminder_id_fkey";
            columns: ["reminder_id"];
            isOneToOne: false;
            referencedRelation: "reminders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notification_log_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      project_status: ProjectStatus;
      task_type: TaskType;
      task_status: TaskStatus;
    };
  };
}
