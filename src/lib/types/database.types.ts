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
    PostgrestVersion: '13.0.5'
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_profiles: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          last_login: string | null
          username: string
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean | null
          last_login?: string | null
          username: string
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          username?: string
        }
        Relationships: []
      }
      geocode_cache: {
        Row: {
          address: string
          address_hash: string
          created_at: string | null
          formatted_address: string | null
          id: string
          latitude: number
          longitude: number
          raw: Json | null
          use_count: number | null
        }
        Insert: {
          address: string
          address_hash: string
          created_at?: string | null
          formatted_address?: string | null
          id?: string
          latitude: number
          longitude: number
          raw?: Json | null
          use_count?: number | null
        }
        Update: {
          address?: string
          address_hash?: string
          created_at?: string | null
          formatted_address?: string | null
          id?: string
          latitude?: number
          longitude?: number
          raw?: Json | null
          use_count?: number | null
        }
        Relationships: []
      }
      public_access: {
        Row: {
          id: string
          password_hash: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          password_hash: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          password_hash?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'public_access_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'admin_profiles'
            referencedColumns: ['id']
          },
        ]
      }
      public_login_logs: {
        Row: {
          id: string
          ip_address: unknown
          login_time: string | null
          success: boolean
          user_agent: string | null
        }
        Insert: {
          id?: string
          ip_address: unknown
          login_time?: string | null
          success: boolean
          user_agent?: string | null
        }
        Update: {
          id?: string
          ip_address?: unknown
          login_time?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      routes: {
        Row: {
          created_at: string | null
          file_checksum: string
          file_name: string
          friday: boolean | null
          id: string
          is_active: boolean | null
          monday: boolean | null
          route_name: string
          saturday: boolean | null
          sunday: boolean | null
          thursday: boolean | null
          total_waypoints: number
          tuesday: boolean | null
          uploaded_by: string | null
          vehicle_id: string
          wednesday: boolean | null
        }
        Insert: {
          created_at?: string | null
          file_checksum: string
          file_name: string
          friday?: boolean | null
          id?: string
          is_active?: boolean | null
          monday?: boolean | null
          route_name: string
          saturday?: boolean | null
          sunday?: boolean | null
          thursday?: boolean | null
          total_waypoints?: number
          tuesday?: boolean | null
          uploaded_by?: string | null
          vehicle_id: string
          wednesday?: boolean | null
        }
        Update: {
          created_at?: string | null
          file_checksum?: string
          file_name?: string
          friday?: boolean | null
          id?: string
          is_active?: boolean | null
          monday?: boolean | null
          route_name?: string
          saturday?: boolean | null
          sunday?: boolean | null
          thursday?: boolean | null
          total_waypoints?: number
          tuesday?: boolean | null
          uploaded_by?: string | null
          vehicle_id?: string
          wednesday?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: 'routes_uploaded_by_fkey'
            columns: ['uploaded_by']
            isOneToOne: false
            referencedRelation: 'admin_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'routes_vehicle_id_fkey'
            columns: ['vehicle_id']
            isOneToOne: false
            referencedRelation: 'vehicles'
            referencedColumns: ['id']
          },
        ]
      }
      system_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_value: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'system_settings_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'admin_profiles'
            referencedColumns: ['id']
          },
        ]
      }
      vehicle_simulation_state: {
        Row: {
          active_route_id: string | null
          current_bearing: number | null
          current_latitude: number | null
          current_longitude: number | null
          current_speed: number | null
          is_parked: boolean | null
          last_movement_time: string | null
          last_waypoint_id: string | null
          next_waypoint_id: string | null
          parked_since: string | null
          simulation_active: boolean | null
          updated_at: string | null
          vehicle_id: string
        }
        Insert: {
          active_route_id?: string | null
          current_bearing?: number | null
          current_latitude?: number | null
          current_longitude?: number | null
          current_speed?: number | null
          is_parked?: boolean | null
          last_movement_time?: string | null
          last_waypoint_id?: string | null
          next_waypoint_id?: string | null
          parked_since?: string | null
          simulation_active?: boolean | null
          updated_at?: string | null
          vehicle_id: string
        }
        Update: {
          active_route_id?: string | null
          current_bearing?: number | null
          current_latitude?: number | null
          current_longitude?: number | null
          current_speed?: number | null
          is_parked?: boolean | null
          last_movement_time?: string | null
          last_waypoint_id?: string | null
          next_waypoint_id?: string | null
          parked_since?: string | null
          simulation_active?: boolean | null
          updated_at?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'vehicle_simulation_state_active_route_id_fkey'
            columns: ['active_route_id']
            isOneToOne: false
            referencedRelation: 'routes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'vehicle_simulation_state_last_waypoint_id_fkey'
            columns: ['last_waypoint_id']
            isOneToOne: false
            referencedRelation: 'waypoints'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'vehicle_simulation_state_next_waypoint_id_fkey'
            columns: ['next_waypoint_id']
            isOneToOne: false
            referencedRelation: 'waypoints'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'vehicle_simulation_state_vehicle_id_fkey'
            columns: ['vehicle_id']
            isOneToOne: true
            referencedRelation: 'vehicles'
            referencedColumns: ['id']
          },
        ]
      }
      vehicles: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          vehicle_number: string | null
          vehicle_type: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          vehicle_number?: string | null
          vehicle_type?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          vehicle_number?: string | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'vehicles_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'admin_profiles'
            referencedColumns: ['id']
          },
        ]
      }
      waypoints: {
        Row: {
          day_of_week: number
          id: string
          latitude: number
          longitude: number
          original_address: string | null
          route_id: string
          sequence_number: number
          timestamp: string
        }
        Insert: {
          day_of_week: number
          id?: string
          latitude: number
          longitude: number
          original_address?: string | null
          route_id: string
          sequence_number: number
          timestamp: string
        }
        Update: {
          day_of_week?: number
          id?: string
          latitude?: number
          longitude?: number
          original_address?: string | null
          route_id?: string
          sequence_number?: number
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: 'waypoints_route_id_fkey'
            columns: ['route_id']
            isOneToOne: false
            referencedRelation: 'routes'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      detect_parking_waypoints: {
        Args: { p_route_id: string }
        Returns: {
          latitude: number
          longitude: number
          park_end: string
          park_start: string
          parking_duration_minutes: number
          sequence_number: number
        }[]
      }
      get_active_route_for_day: {
        Args: { p_day_of_week: number; p_vehicle_id: string }
        Returns: {
          route_id: string
          route_name: string
          total_waypoints: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
