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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          code: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          code: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          code?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      beacon_players: {
        Row: {
          beacon_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          beacon_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          beacon_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beacon_players_beacon_id_fkey"
            columns: ["beacon_id"]
            isOneToOne: false
            referencedRelation: "beacons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beacon_players_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      beacons: {
        Row: {
          court_side: string
          created_at: string
          created_by: string
          id: string
          match_type: string
          notes: string | null
          players_needed: number
          scheduled_at: string
          status: string
          target_tier: string
          venue: string
        }
        Insert: {
          court_side?: string
          created_at?: string
          created_by: string
          id?: string
          match_type?: string
          notes?: string | null
          players_needed: number
          scheduled_at: string
          status?: string
          target_tier?: string
          venue: string
        }
        Update: {
          court_side?: string
          created_at?: string
          created_by?: string
          id?: string
          match_type?: string
          notes?: string | null
          players_needed?: number
          scheduled_at?: string
          status?: string
          target_tier?: string
          venue?: string
        }
        Relationships: [
          {
            foreignKeyName: "beacons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          followee_id: string
          follower_id: string
        }
        Insert: {
          created_at?: string
          followee_id: string
          follower_id: string
        }
        Update: {
          created_at?: string
          followee_id?: string
          follower_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_followee_id_fkey"
            columns: ["followee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_players: {
        Row: {
          court_side: string | null
          created_at: string
          guest_name: string | null
          id: string
          match_id: string
          rating_before: number | null
          rating_delta: number
          streak_before: number | null
          team: number
          user_id: string | null
          xp_before: number | null
          xp_gained: number
        }
        Insert: {
          court_side?: string | null
          created_at?: string
          guest_name?: string | null
          id?: string
          match_id: string
          rating_before?: number | null
          rating_delta?: number
          streak_before?: number | null
          team: number
          user_id?: string | null
          xp_before?: number | null
          xp_gained?: number
        }
        Update: {
          court_side?: string | null
          created_at?: string
          guest_name?: string | null
          id?: string
          match_id?: string
          rating_before?: number | null
          rating_delta?: number
          streak_before?: number | null
          team?: number
          user_id?: string | null
          xp_before?: number | null
          xp_gained?: number
        }
        Relationships: [
          {
            foreignKeyName: "match_players_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_players_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          match_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji?: string
          id?: string
          match_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          match_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_reactions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string
          created_by: string
          id: string
          match_type: string
          notes: string | null
          sets: Json
          venue: string | null
          winner_team: number
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          match_type?: string
          notes?: string | null
          sets: Json
          venue?: string | null
          winner_team: number
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          match_type?: string
          notes?: string | null
          sets?: Json
          venue?: string | null
          winner_team?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar: string
          avatar_color: string
          best_streak: number
          court_side: string
          created_at: string
          current_streak: number
          display_name: string
          id: string
          losses: number
          rating: number
          show_achievements: boolean
          show_court_side: boolean
          show_history: boolean
          show_partners: boolean
          show_record: boolean
          show_rivalries: boolean
          username: string
          wins: number
          xp: number
        }
        Insert: {
          avatar?: string
          avatar_color?: string
          best_streak?: number
          court_side?: string
          created_at?: string
          current_streak?: number
          display_name: string
          id: string
          losses?: number
          rating?: number
          show_achievements?: boolean
          show_court_side?: boolean
          show_history?: boolean
          show_partners?: boolean
          show_record?: boolean
          show_rivalries?: boolean
          username: string
          wins?: number
          xp?: number
        }
        Update: {
          avatar?: string
          avatar_color?: string
          best_streak?: number
          court_side?: string
          created_at?: string
          current_streak?: number
          display_name?: string
          id?: string
          losses?: number
          rating?: number
          show_achievements?: boolean
          show_court_side?: boolean
          show_history?: boolean
          show_partners?: boolean
          show_record?: boolean
          show_rivalries?: boolean
          username?: string
          wins?: number
          xp?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      venue_checkins: {
        Row: {
          created_at: string
          id: string
          playing_at: string
          user_id: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          playing_at?: string
          user_id: string
          venue_id: string
        }
        Update: {
          created_at?: string
          id?: string
          playing_at?: string
          user_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_checkins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_checkins_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          booking_url: string | null
          city: string
          court_type: string
          courts_count: number
          created_at: string
          id: string
          name: string
          postcode: string | null
        }
        Insert: {
          booking_url?: string | null
          city: string
          court_type?: string
          courts_count?: number
          created_at?: string
          id?: string
          name: string
          postcode?: string | null
        }
        Update: {
          booking_url?: string | null
          city?: string
          court_type?: string
          courts_count?: number
          created_at?: string
          id?: string
          name?: string
          postcode?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_matches: {
        Args: { _limit?: number }
        Returns: {
          created_at: string
          created_by: string
          creator: string
          id: string
          match_type: string
          players: Json
          sets: Json
          venue: string
          winner_team: number
        }[]
      }
      admin_players: {
        Args: never
        Returns: {
          avatar: string
          avatar_color: string
          best_streak: number
          created_at: string
          current_streak: number
          display_name: string
          email: string
          id: string
          is_admin: boolean
          last_sign_in_at: string
          losses: number
          matches: number
          rating: number
          username: string
          wins: number
          xp: number
        }[]
      }
      admin_set_rating: {
        Args: { _rating: number; _user: string; _xp?: number }
        Returns: Json
      }
      admin_stats: { Args: never; Returns: Json }
      admin_void_match: { Args: { _match_id: string }; Returns: Json }
      cancel_beacon: { Args: { _beacon_id: string }; Returns: string }
      claim_boss: { Args: never; Returns: boolean }
      claim_guest_matches: { Args: { _alias: string }; Returns: Json }
      count_guest_matches: { Args: { _alias: string }; Returns: number }
      create_beacon: {
        Args: {
          _court_side?: string
          _match_type?: string
          _notes?: string
          _players_needed: number
          _scheduled_at: string
          _target_tier?: string
          _venue: string
        }
        Returns: string
      }
      get_court_sides: {
        Args: { _user: string }
        Returns: {
          court_side: string
          losses: number
          matches: number
          wins: number
        }[]
      }
      get_head_to_head: {
        Args: { _a: string; _b: string }
        Returns: {
          a_sets: number
          a_wins: number
          b_sets: number
          b_wins: number
          matches_against: number
          matches_together: number
          together_sets_lost: number
          together_sets_won: number
          together_wins: number
        }[]
      }
      get_partners: {
        Args: { _user: string }
        Returns: {
          avatar: string
          avatar_color: string
          display_name: string
          last_played: string
          losses: number
          matches: number
          partner_id: string
          rating: number
          username: string
          wins: number
        }[]
      }
      get_rivalries: {
        Args: { _user: string }
        Returns: {
          avatar: string
          avatar_color: string
          display_name: string
          last_played: string
          last_winner: string
          losses: number
          matches: number
          opponent_id: string
          rating: number
          sets_lost: number
          sets_won: number
          username: string
          wins: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      join_beacon: { Args: { _beacon_id: string }; Returns: string }
      leave_beacon: { Args: { _beacon_id: string }; Returns: string }
      record_match: {
        Args: {
          _match_type: string
          _notes?: string
          _players: Json
          _sets: Json
          _venue: string
        }
        Returns: Json
      }
      void_match: { Args: { _match_id: string }; Returns: Json }
      weekly_leaderboard: {
        Args: never
        Returns: {
          avatar: string
          avatar_color: string
          display_name: string
          matches: number
          rating: number
          rating_gain: number
          user_id: string
          username: string
          xp_gain: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
