// Database types for Supabase tables
// Matches the actual table schema used in the codebase

type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      portfolio_positions: {
        Row: {
          id: string
          user_id: string
          symbol: string
          asset_type: string
          direction: 'long' | 'short'
          quantity: number | null
          avg_cost: number | null
          notes: string | null
          lots: unknown
          purchase_date: string | null
          added_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          symbol: string
          asset_type: string
          direction?: 'long' | 'short'
          quantity?: number | null
          avg_cost?: number | null
          notes?: string | null
          lots?: unknown
          purchase_date?: string | null
          added_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          symbol?: string
          asset_type?: string
          direction?: 'long' | 'short'
          quantity?: number | null
          avg_cost?: number | null
          notes?: string | null
          lots?: unknown
          purchase_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      watchlists: {
        Row: {
          id: string
          user_id: string
          symbol: string
          asset_type: string
          added_at: string
        }
        Insert: {
          id?: string
          user_id: string
          symbol: string
          asset_type: string
          added_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          symbol?: string
          asset_type?: string
        }
        Relationships: []
      }
      portfolio_snapshots: {
        Row: {
          id: string
          user_id: string
          date: string
          total_value: number
          total_cost: number
          positions: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          total_value: number
          total_cost: number
          positions?: number
          created_at?: string
        }
        Update: {
          total_value?: number
          total_cost?: number
          positions?: number
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
