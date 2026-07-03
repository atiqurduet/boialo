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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ab_test_assignments: {
        Row: {
          conversion_value: number | null
          converted: boolean | null
          converted_at: string | null
          created_at: string | null
          fingerprint_id: string | null
          id: string
          metadata: Json | null
          session_id: string
          test_id: string | null
          user_id: string | null
          variant_name: string
        }
        Insert: {
          conversion_value?: number | null
          converted?: boolean | null
          converted_at?: string | null
          created_at?: string | null
          fingerprint_id?: string | null
          id?: string
          metadata?: Json | null
          session_id: string
          test_id?: string | null
          user_id?: string | null
          variant_name: string
        }
        Update: {
          conversion_value?: number | null
          converted?: boolean | null
          converted_at?: string | null
          created_at?: string | null
          fingerprint_id?: string | null
          id?: string
          metadata?: Json | null
          session_id?: string
          test_id?: string | null
          user_id?: string | null
          variant_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "ab_test_assignments_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "ab_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      ab_tests: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          name: string
          start_date: string | null
          target_metric: string | null
          target_page: string | null
          updated_at: string | null
          variants: Json
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          start_date?: string | null
          target_metric?: string | null
          target_page?: string | null
          updated_at?: string | null
          variants?: Json
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          start_date?: string | null
          target_metric?: string | null
          target_page?: string | null
          updated_at?: string | null
          variants?: Json
        }
        Relationships: []
      }
      abandoned_checkouts: {
        Row: {
          address: string | null
          cart_items: Json | null
          created_at: string | null
          delivery_area: string | null
          email: string | null
          full_name: string | null
          id: string
          last_activity_at: string | null
          payment_method: string | null
          phone: string | null
          recovered: boolean | null
          recovered_order_id: string | null
          session_id: string | null
          step: string | null
          subtotal: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          cart_items?: Json | null
          created_at?: string | null
          delivery_area?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          last_activity_at?: string | null
          payment_method?: string | null
          phone?: string | null
          recovered?: boolean | null
          recovered_order_id?: string | null
          session_id?: string | null
          step?: string | null
          subtotal?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          cart_items?: Json | null
          created_at?: string | null
          delivery_area?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          last_activity_at?: string | null
          payment_method?: string | null
          phone?: string | null
          recovered?: boolean | null
          recovered_order_id?: string | null
          session_id?: string | null
          step?: string | null
          subtotal?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      achievement_badges: {
        Row: {
          badge_type: string
          condition_type: string
          condition_value: number
          created_at: string
          description_bn: string | null
          icon: string
          id: string
          is_active: boolean
          name_bn: string
          points_reward: number
          sort_order: number
        }
        Insert: {
          badge_type?: string
          condition_type: string
          condition_value?: number
          created_at?: string
          description_bn?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          name_bn: string
          points_reward?: number
          sort_order?: number
        }
        Update: {
          badge_type?: string
          condition_type?: string
          condition_value?: number
          created_at?: string
          description_bn?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          name_bn?: string
          points_reward?: number
          sort_order?: number
        }
        Relationships: []
      }
      active_sessions: {
        Row: {
          id: string
          ip_address: string | null
          is_active: boolean
          last_activity_at: string
          logged_in_at: string
          logged_out_at: string | null
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_activity_at?: string
          logged_in_at?: string
          logged_out_at?: string | null
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_activity_at?: string
          logged_in_at?: string
          logged_out_at?: string | null
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ad_platform_credentials: {
        Row: {
          created_at: string | null
          credential_key: string
          credential_value: string
          id: string
          is_active: boolean | null
          platform: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          credential_key: string
          credential_value: string
          id?: string
          is_active?: boolean | null
          platform: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          credential_key?: string
          credential_value?: string
          id?: string
          is_active?: boolean | null
          platform?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ad_platform_events: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_data: Json | null
          event_name: string
          id: string
          platform: string
          response: Json | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_data?: Json | null
          event_name: string
          id?: string
          platform: string
          response?: Json | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_data?: Json | null
          event_name?: string
          id?: string
          platform?: string
          response?: Json | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      address_book: {
        Row: {
          address: string
          area: string | null
          city: string | null
          created_at: string | null
          division: string | null
          full_name: string
          id: string
          is_default: boolean | null
          is_verified: boolean | null
          label: string | null
          phone: string
          postal_code: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address: string
          area?: string | null
          city?: string | null
          created_at?: string | null
          division?: string | null
          full_name: string
          id?: string
          is_default?: boolean | null
          is_verified?: boolean | null
          label?: string | null
          phone: string
          postal_code?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string
          area?: string | null
          city?: string | null
          created_at?: string | null
          division?: string | null
          full_name?: string
          id?: string
          is_default?: boolean | null
          is_verified?: boolean | null
          label?: string | null
          phone?: string
          postal_code?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      audience_sync_jobs: {
        Row: {
          audience_name: string | null
          audience_type: string
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          error_message: string | null
          external_audience_id: string | null
          id: string
          platform: string
          started_at: string | null
          status: string | null
          synced_users: number | null
          total_users: number | null
        }
        Insert: {
          audience_name?: string | null
          audience_type: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          external_audience_id?: string | null
          id?: string
          platform: string
          started_at?: string | null
          status?: string | null
          synced_users?: number | null
          total_users?: number | null
        }
        Update: {
          audience_name?: string | null
          audience_type?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          external_audience_id?: string | null
          id?: string
          platform?: string
          started_at?: string | null
          status?: string | null
          synced_users?: number | null
          total_users?: number | null
        }
        Relationships: []
      }
      auto_logout_settings: {
        Row: {
          id: string
          is_enabled: boolean
          timeout_minutes: number
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          id?: string
          is_enabled?: boolean
          timeout_minutes?: number
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          id?: string
          is_enabled?: boolean
          timeout_minutes?: number
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      auto_post_settings: {
        Row: {
          id: string
          is_active: boolean | null
          setting_key: string
          setting_value: Json
          updated_at: string | null
        }
        Insert: {
          id?: string
          is_active?: boolean | null
          setting_key: string
          setting_value?: Json
          updated_at?: string | null
        }
        Update: {
          id?: string
          is_active?: boolean | null
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      automation_ab_results: {
        Row: {
          automation_id: string
          channel: string
          clicked_at: string | null
          converted_at: string | null
          created_at: string
          id: string
          opened_at: string | null
          revenue: number | null
          status: string
          user_id: string | null
          variant: string
        }
        Insert: {
          automation_id: string
          channel?: string
          clicked_at?: string | null
          converted_at?: string | null
          created_at?: string
          id?: string
          opened_at?: string | null
          revenue?: number | null
          status?: string
          user_id?: string | null
          variant?: string
        }
        Update: {
          automation_id?: string
          channel?: string
          clicked_at?: string | null
          converted_at?: string | null
          created_at?: string
          id?: string
          opened_at?: string | null
          revenue?: number | null
          status?: string
          user_id?: string | null
          variant?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_ab_results_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "marketing_automations"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_logs: {
        Row: {
          automation_id: string
          channel: string
          created_at: string
          error_message: string | null
          id: string
          metadata: Json | null
          recipient: string
          status: string
          user_id: string | null
        }
        Insert: {
          automation_id: string
          channel: string
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient: string
          status?: string
          user_id?: string | null
        }
        Update: {
          automation_id?: string
          channel?: string
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "marketing_automations"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_schedules: {
        Row: {
          automation_id: string
          created_at: string
          executed_at: string | null
          id: string
          recipients_count: number | null
          scheduled_for: string
          sent_count: number | null
          status: string
        }
        Insert: {
          automation_id: string
          created_at?: string
          executed_at?: string | null
          id?: string
          recipients_count?: number | null
          scheduled_for: string
          sent_count?: number | null
          status?: string
        }
        Update: {
          automation_id?: string
          created_at?: string
          executed_at?: string | null
          id?: string
          recipients_count?: number | null
          scheduled_for?: string
          sent_count?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_schedules_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "marketing_automations"
            referencedColumns: ["id"]
          },
        ]
      }
      back_in_stock_alerts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_notified: boolean | null
          notified_at: string | null
          phone: string | null
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_notified?: boolean | null
          notified_at?: string | null
          phone?: string | null
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_notified?: boolean | null
          notified_at?: string | null
          phone?: string | null
          product_id?: string
          user_id?: string
        }
        Relationships: []
      }
      backup_history: {
        Row: {
          backup_type: string
          created_at: string
          created_by: string | null
          file_name: string | null
          file_size: number | null
          id: string
          notes: string | null
          status: string | null
        }
        Insert: {
          backup_type: string
          created_at?: string
          created_by?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          notes?: string | null
          status?: string | null
        }
        Update: {
          backup_type?: string
          created_at?: string
          created_by?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          notes?: string | null
          status?: string | null
        }
        Relationships: []
      }
      banners: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          image_desktop: string
          image_mobile: string | null
          is_active: boolean | null
          link_url: string | null
          sort_order: number | null
          start_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          image_desktop: string
          image_mobile?: string | null
          is_active?: boolean | null
          link_url?: string | null
          sort_order?: number | null
          start_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          image_desktop?: string
          image_mobile?: string | null
          is_active?: boolean | null
          link_url?: string | null
          sort_order?: number | null
          start_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string | null
          category: string | null
          content_bn: string | null
          content_en: string | null
          created_at: string
          excerpt_bn: string | null
          excerpt_en: string | null
          featured_image: string | null
          id: string
          is_featured: boolean | null
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          slug: string
          status: string
          tags: string[] | null
          title_bn: string
          title_en: string | null
          updated_at: string
          view_count: number | null
        }
        Insert: {
          author_id?: string | null
          category?: string | null
          content_bn?: string | null
          content_en?: string | null
          created_at?: string
          excerpt_bn?: string | null
          excerpt_en?: string | null
          featured_image?: string | null
          id?: string
          is_featured?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug: string
          status?: string
          tags?: string[] | null
          title_bn: string
          title_en?: string | null
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          author_id?: string | null
          category?: string | null
          content_bn?: string | null
          content_en?: string | null
          created_at?: string
          excerpt_bn?: string | null
          excerpt_en?: string | null
          featured_image?: string | null
          id?: string
          is_featured?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug?: string
          status?: string
          tags?: string[] | null
          title_bn?: string
          title_en?: string | null
          updated_at?: string
          view_count?: number | null
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          description_bn: string | null
          description_en: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          meta_description: string | null
          meta_title: string | null
          name_bn: string
          name_en: string
          slug: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          description_bn?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name_bn: string
          name_en: string
          slug: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          description_bn?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name_bn?: string
          name_en?: string
          slug?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      bundle_items: {
        Row: {
          bundle_id: string
          id: string
          product_id: string
          quantity: number
          sort_order: number | null
        }
        Insert: {
          bundle_id: string
          id?: string
          product_id: string
          quantity?: number
          sort_order?: number | null
        }
        Update: {
          bundle_id?: string
          id?: string
          product_id?: string
          quantity?: number
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bundle_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "product_bundles"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          updated_at: string
          user_id: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string
          user_id: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
          user_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean | null
          meta_description: string | null
          meta_title: string | null
          name_bn: string
          name_en: string
          parent_id: string | null
          slug: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          name_bn: string
          name_en: string
          parent_id?: string | null
          slug: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          name_bn?: string
          name_en?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          assigned_to: string | null
          created_at: string
          id: string
          last_message_at: string | null
          status: string
          updated_at: string
          user_id: string | null
          visitor_email: string | null
          visitor_id: string
          visitor_name: string | null
          visitor_phone: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          visitor_email?: string | null
          visitor_id: string
          visitor_name?: string | null
          visitor_phone?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          visitor_email?: string | null
          visitor_id?: string
          visitor_name?: string | null
          visitor_phone?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          message_type: string
          sender_id: string | null
          sender_name: string | null
          sender_type: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          message_type?: string
          sender_id?: string | null
          sender_name?: string | null
          sender_type?: string
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          message_type?: string
          sender_id?: string | null
          sender_name?: string | null
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_form_fields: {
        Row: {
          created_at: string
          field_group: string | null
          field_label_bn: string
          field_name: string
          field_type: string
          id: string
          is_active: boolean | null
          is_required: boolean | null
          options: Json | null
          placeholder: string | null
          sort_order: number | null
          validation_regex: string | null
        }
        Insert: {
          created_at?: string
          field_group?: string | null
          field_label_bn: string
          field_name: string
          field_type?: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          options?: Json | null
          placeholder?: string | null
          sort_order?: number | null
          validation_regex?: string | null
        }
        Update: {
          created_at?: string
          field_group?: string | null
          field_label_bn?: string
          field_name?: string
          field_type?: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          options?: Json | null
          placeholder?: string | null
          sort_order?: number | null
          validation_regex?: string | null
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          admin_notes: string | null
          assigned_to: string | null
          created_at: string
          email: string
          id: string
          ip_address: string | null
          message: string
          name: string
          phone: string | null
          priority: string
          replied_at: string | null
          reply_message: string | null
          status: string
          subject: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          admin_notes?: string | null
          assigned_to?: string | null
          created_at?: string
          email: string
          id?: string
          ip_address?: string | null
          message: string
          name: string
          phone?: string | null
          priority?: string
          replied_at?: string | null
          reply_message?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          admin_notes?: string | null
          assigned_to?: string | null
          created_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          message?: string
          name?: string
          phone?: string | null
          priority?: string
          replied_at?: string | null
          reply_message?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      conversion_funnels: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          steps: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          steps?: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          steps?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      coupons: {
        Row: {
          applies_to: string | null
          category_ids: string[] | null
          code: string
          created_at: string
          description_bn: string | null
          discount_type: string
          discount_value: number
          end_date: string | null
          id: string
          is_active: boolean | null
          max_discount_amount: number | null
          max_uses: number | null
          min_order_amount: number | null
          product_ids: string[] | null
          start_date: string | null
          updated_at: string
          used_count: number | null
        }
        Insert: {
          applies_to?: string | null
          category_ids?: string[] | null
          code: string
          created_at?: string
          description_bn?: string | null
          discount_type: string
          discount_value: number
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          max_uses?: number | null
          min_order_amount?: number | null
          product_ids?: string[] | null
          start_date?: string | null
          updated_at?: string
          used_count?: number | null
        }
        Update: {
          applies_to?: string | null
          category_ids?: string[] | null
          code?: string
          created_at?: string
          description_bn?: string | null
          discount_type?: string
          discount_value?: number
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          max_uses?: number | null
          min_order_amount?: number | null
          product_ids?: string[] | null
          start_date?: string | null
          updated_at?: string
          used_count?: number | null
        }
        Relationships: []
      }
      courier_bookings: {
        Row: {
          actual_weight: number | null
          api_response: Json | null
          booking_status: string | null
          cod_amount: number | null
          consignment_id: string | null
          courier_provider: string
          created_at: string | null
          estimated_delivery: string | null
          id: string
          order_id: string
          pickup_scheduled_at: string | null
          tracking_code: string | null
          updated_at: string | null
        }
        Insert: {
          actual_weight?: number | null
          api_response?: Json | null
          booking_status?: string | null
          cod_amount?: number | null
          consignment_id?: string | null
          courier_provider: string
          created_at?: string | null
          estimated_delivery?: string | null
          id?: string
          order_id: string
          pickup_scheduled_at?: string | null
          tracking_code?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_weight?: number | null
          api_response?: Json | null
          booking_status?: string | null
          cod_amount?: number | null
          consignment_id?: string | null
          courier_provider?: string
          created_at?: string | null
          estimated_delivery?: string | null
          id?: string
          order_id?: string
          pickup_scheduled_at?: string | null
          tracking_code?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      courier_providers: {
        Row: {
          api_endpoint: string | null
          config: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name_bn: string
          name_en: string
          provider: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          api_endpoint?: string | null
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name_bn: string
          name_en: string
          provider: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          api_endpoint?: string | null
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name_bn?: string
          name_en?: string
          provider?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      customer_risk_profiles: {
        Row: {
          blacklist_reason: string | null
          cancelled_orders: number | null
          created_at: string | null
          fraud_flags: Json | null
          id: string
          is_blacklisted: boolean | null
          notes: string | null
          phone_verified: boolean | null
          phone_verified_at: string | null
          returned_orders: number | null
          risk_score: number | null
          successful_orders: number | null
          total_orders: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          blacklist_reason?: string | null
          cancelled_orders?: number | null
          created_at?: string | null
          fraud_flags?: Json | null
          id?: string
          is_blacklisted?: boolean | null
          notes?: string | null
          phone_verified?: boolean | null
          phone_verified_at?: string | null
          returned_orders?: number | null
          risk_score?: number | null
          successful_orders?: number | null
          total_orders?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          blacklist_reason?: string | null
          cancelled_orders?: number | null
          created_at?: string | null
          fraud_flags?: Json | null
          id?: string
          is_blacklisted?: boolean | null
          notes?: string | null
          phone_verified?: boolean | null
          phone_verified_at?: string | null
          returned_orders?: number | null
          risk_score?: number | null
          successful_orders?: number | null
          total_orders?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      daily_checkins: {
        Row: {
          checkin_date: string
          created_at: string
          id: string
          points_earned: number
          streak_count: number
          user_id: string
        }
        Insert: {
          checkin_date?: string
          created_at?: string
          id?: string
          points_earned?: number
          streak_count?: number
          user_id: string
        }
        Update: {
          checkin_date?: string
          created_at?: string
          id?: string
          points_earned?: number
          streak_count?: number
          user_id?: string
        }
        Relationships: []
      }
      delivery_zones: {
        Row: {
          created_at: string
          delivery_charge: number
          districts: Json | null
          division: string | null
          estimated_days_max: number | null
          estimated_days_min: number | null
          id: string
          is_active: boolean | null
          sort_order: number | null
          updated_at: string
          zone_name_bn: string
          zone_name_en: string | null
        }
        Insert: {
          created_at?: string
          delivery_charge?: number
          districts?: Json | null
          division?: string | null
          estimated_days_max?: number | null
          estimated_days_min?: number | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          updated_at?: string
          zone_name_bn: string
          zone_name_en?: string | null
        }
        Update: {
          created_at?: string
          delivery_charge?: number
          districts?: Json | null
          division?: string | null
          estimated_days_max?: number | null
          estimated_days_min?: number | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          updated_at?: string
          zone_name_bn?: string
          zone_name_en?: string | null
        }
        Relationships: []
      }
      digital_product_reviews: {
        Row: {
          created_at: string | null
          digital_product_id: string
          id: string
          is_approved: boolean | null
          is_verified_purchase: boolean | null
          rating: number
          review_text: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          digital_product_id: string
          id?: string
          is_approved?: boolean | null
          is_verified_purchase?: boolean | null
          rating?: number
          review_text?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          digital_product_id?: string
          id?: string
          is_approved?: boolean | null
          is_verified_purchase?: boolean | null
          rating?: number
          review_text?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_product_reviews_digital_product_id_fkey"
            columns: ["digital_product_id"]
            isOneToOne: false
            referencedRelation: "digital_products"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_product_versions: {
        Row: {
          changelog_bn: string | null
          changelog_en: string | null
          created_at: string | null
          digital_product_id: string
          file_size_mb: number | null
          file_url: string | null
          id: string
          is_current: boolean | null
          release_date: string | null
          version: string
        }
        Insert: {
          changelog_bn?: string | null
          changelog_en?: string | null
          created_at?: string | null
          digital_product_id: string
          file_size_mb?: number | null
          file_url?: string | null
          id?: string
          is_current?: boolean | null
          release_date?: string | null
          version: string
        }
        Update: {
          changelog_bn?: string | null
          changelog_en?: string | null
          created_at?: string | null
          digital_product_id?: string
          file_size_mb?: number | null
          file_url?: string | null
          id?: string
          is_current?: boolean | null
          release_date?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_product_versions_digital_product_id_fkey"
            columns: ["digital_product_id"]
            isOneToOne: false
            referencedRelation: "digital_products"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_products: {
        Row: {
          avg_rating: number | null
          category: string | null
          cover_image: string | null
          created_at: string | null
          description_bn: string | null
          description_en: string | null
          discount_percent: number | null
          download_expiry_days: number | null
          drm_enabled: boolean | null
          file_format: string | null
          file_name: string | null
          file_size_mb: number | null
          file_url: string | null
          gallery_images: Json | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          is_free: boolean | null
          max_downloads: number | null
          meta_description: string | null
          meta_title: string | null
          original_price: number | null
          preview_pages: number | null
          preview_url: string | null
          price: number
          product_type: string
          review_count: number | null
          slug: string
          subcategory: string | null
          tags: string[] | null
          title_bn: string
          title_en: string | null
          total_downloads: number | null
          total_sales: number | null
          updated_at: string | null
          watermark_enabled: boolean | null
        }
        Insert: {
          avg_rating?: number | null
          category?: string | null
          cover_image?: string | null
          created_at?: string | null
          description_bn?: string | null
          description_en?: string | null
          discount_percent?: number | null
          download_expiry_days?: number | null
          drm_enabled?: boolean | null
          file_format?: string | null
          file_name?: string | null
          file_size_mb?: number | null
          file_url?: string | null
          gallery_images?: Json | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          is_free?: boolean | null
          max_downloads?: number | null
          meta_description?: string | null
          meta_title?: string | null
          original_price?: number | null
          preview_pages?: number | null
          preview_url?: string | null
          price?: number
          product_type?: string
          review_count?: number | null
          slug: string
          subcategory?: string | null
          tags?: string[] | null
          title_bn: string
          title_en?: string | null
          total_downloads?: number | null
          total_sales?: number | null
          updated_at?: string | null
          watermark_enabled?: boolean | null
        }
        Update: {
          avg_rating?: number | null
          category?: string | null
          cover_image?: string | null
          created_at?: string | null
          description_bn?: string | null
          description_en?: string | null
          discount_percent?: number | null
          download_expiry_days?: number | null
          drm_enabled?: boolean | null
          file_format?: string | null
          file_name?: string | null
          file_size_mb?: number | null
          file_url?: string | null
          gallery_images?: Json | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          is_free?: boolean | null
          max_downloads?: number | null
          meta_description?: string | null
          meta_title?: string | null
          original_price?: number | null
          preview_pages?: number | null
          preview_url?: string | null
          price?: number
          product_type?: string
          review_count?: number | null
          slug?: string
          subcategory?: string | null
          tags?: string[] | null
          title_bn?: string
          title_en?: string | null
          total_downloads?: number | null
          total_sales?: number | null
          updated_at?: string | null
          watermark_enabled?: boolean | null
        }
        Relationships: []
      }
      digital_purchases: {
        Row: {
          created_at: string
          download_count: number | null
          expires_at: string | null
          id: string
          max_downloads: number | null
          order_id: string | null
          product_id: string
          product_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          download_count?: number | null
          expires_at?: string | null
          id?: string
          max_downloads?: number | null
          order_id?: string | null
          product_id: string
          product_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          download_count?: number | null
          expires_at?: string | null
          id?: string
          max_downloads?: number | null
          order_id?: string | null
          product_id?: string
          product_type?: string
          user_id?: string
        }
        Relationships: []
      }
      dynamic_pricing_rules: {
        Row: {
          condition_config: Json
          created_at: string
          discount_type: string
          discount_value: number
          ends_at: string | null
          id: string
          is_active: boolean | null
          name_bn: string
          priority: number | null
          rule_type: string
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          condition_config?: Json
          created_at?: string
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          name_bn: string
          priority?: number | null
          rule_type?: string
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          condition_config?: Json
          created_at?: string
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          name_bn?: string
          priority?: number | null
          rule_type?: string
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ebook_metadata: {
        Row: {
          audio_duration_minutes: number | null
          audio_url: string | null
          author: string | null
          author_id: string | null
          created_at: string | null
          digital_product_id: string
          edition: string | null
          format: string | null
          has_audio: boolean | null
          id: string
          isbn: string | null
          language: string | null
          page_count: number | null
          publish_year: number | null
          publisher: string | null
          publisher_id: string | null
          sample_chapter_url: string | null
          table_of_contents: Json | null
          translator: string | null
          translator_id: string | null
          updated_at: string | null
        }
        Insert: {
          audio_duration_minutes?: number | null
          audio_url?: string | null
          author?: string | null
          author_id?: string | null
          created_at?: string | null
          digital_product_id: string
          edition?: string | null
          format?: string | null
          has_audio?: boolean | null
          id?: string
          isbn?: string | null
          language?: string | null
          page_count?: number | null
          publish_year?: number | null
          publisher?: string | null
          publisher_id?: string | null
          sample_chapter_url?: string | null
          table_of_contents?: Json | null
          translator?: string | null
          translator_id?: string | null
          updated_at?: string | null
        }
        Update: {
          audio_duration_minutes?: number | null
          audio_url?: string | null
          author?: string | null
          author_id?: string | null
          created_at?: string | null
          digital_product_id?: string
          edition?: string | null
          format?: string | null
          has_audio?: boolean | null
          id?: string
          isbn?: string | null
          language?: string | null
          page_count?: number | null
          publish_year?: number | null
          publisher?: string | null
          publisher_id?: string | null
          sample_chapter_url?: string | null
          table_of_contents?: Json | null
          translator?: string | null
          translator_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ebook_metadata_digital_product_id_fkey"
            columns: ["digital_product_id"]
            isOneToOne: false
            referencedRelation: "digital_products"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          campaign_type: string
          click_count: number | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          open_count: number | null
          scheduled_at: string | null
          sent_at: string | null
          sent_count: number | null
          status: string
          subject: string
          total_recipients: number | null
          updated_at: string
        }
        Insert: {
          campaign_type: string
          click_count?: number | null
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          open_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          subject: string
          total_recipients?: number | null
          updated_at?: string
        }
        Update: {
          campaign_type?: string
          click_count?: number | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          open_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          subject?: string
          total_recipients?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          campaign_id: string | null
          clicked_at: string | null
          created_at: string
          email: string
          error_message: string | null
          id: string
          opened_at: string | null
          sent_at: string | null
          status: string
          subject: string
          subscriber_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          clicked_at?: string | null
          created_at?: string
          email: string
          error_message?: string | null
          id?: string
          opened_at?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          subscriber_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          clicked_at?: string | null
          created_at?: string
          email?: string
          error_message?: string | null
          id?: string
          opened_at?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          subscriber_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "email_subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      email_providers: {
        Row: {
          config: Json | null
          created_at: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          provider: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          provider: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          provider?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      email_subscribers: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          source: string | null
          status: string
          subscribed_at: string
          unsubscribed_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          phone?: string | null
          source?: string | null
          status?: string
          subscribed_at?: string
          unsubscribed_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          source?: string | null
          status?: string
          subscribed_at?: string
          unsubscribed_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          created_at: string
          html_content: string
          id: string
          is_active: boolean | null
          name: string
          subject: string
          template_type: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          created_at?: string
          html_content: string
          id?: string
          is_active?: boolean | null
          name: string
          subject: string
          template_type: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          created_at?: string
          html_content?: string
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string
          template_type?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: []
      }
      engagement_scores: {
        Row: {
          click_count: number | null
          core_web_vitals: Json | null
          created_at: string | null
          dead_clicks: number | null
          engagement_score: number | null
          fingerprint_id: string | null
          id: string
          interaction_count: number | null
          page_path: string
          rage_clicks: number | null
          scroll_depth: number | null
          session_id: string
          time_on_page: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          click_count?: number | null
          core_web_vitals?: Json | null
          created_at?: string | null
          dead_clicks?: number | null
          engagement_score?: number | null
          fingerprint_id?: string | null
          id?: string
          interaction_count?: number | null
          page_path: string
          rage_clicks?: number | null
          scroll_depth?: number | null
          session_id: string
          time_on_page?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          click_count?: number | null
          core_web_vitals?: Json | null
          created_at?: string | null
          dead_clicks?: number | null
          engagement_score?: number | null
          fingerprint_id?: string | null
          id?: string
          interaction_count?: number | null
          page_path?: string
          rage_clicks?: number | null
          scroll_depth?: number | null
          session_id?: string
          time_on_page?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      footer_links: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          section_id: string
          sort_order: number | null
          title_bn: string
          title_en: string | null
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          section_id: string
          sort_order?: number | null
          title_bn: string
          title_en?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          section_id?: string
          sort_order?: number | null
          title_bn?: string
          title_en?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "footer_links_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "footer_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      footer_sections: {
        Row: {
          content: Json | null
          created_at: string
          id: string
          is_active: boolean | null
          section_type: string
          sort_order: number | null
          title_bn: string
          title_en: string | null
          updated_at: string
        }
        Insert: {
          content?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          section_type?: string
          sort_order?: number | null
          title_bn: string
          title_en?: string | null
          updated_at?: string
        }
        Update: {
          content?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          section_type?: string
          sort_order?: number | null
          title_bn?: string
          title_en?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      funnel_events: {
        Row: {
          completed: boolean | null
          created_at: string | null
          fingerprint_id: string | null
          funnel_id: string | null
          id: string
          metadata: Json | null
          session_id: string
          step_index: number
          step_name: string
          user_id: string | null
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          fingerprint_id?: string | null
          funnel_id?: string | null
          id?: string
          metadata?: Json | null
          session_id: string
          step_index: number
          step_name: string
          user_id?: string | null
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          fingerprint_id?: string | null
          funnel_id?: string | null
          id?: string
          metadata?: Json | null
          session_id?: string
          step_index?: number
          step_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funnel_events_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "conversion_funnels"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_card_transactions: {
        Row: {
          amount: number
          created_at: string
          gift_card_id: string
          id: string
          order_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          gift_card_id: string
          id?: string
          order_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          gift_card_id?: string
          id?: string
          order_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_card_transactions_gift_card_id_fkey"
            columns: ["gift_card_id"]
            isOneToOne: false
            referencedRelation: "gift_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_cards: {
        Row: {
          amount: number
          balance: number
          code: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          message: string | null
          purchased_by: string | null
          recipient_email: string | null
          recipient_name: string | null
          redeemed_by: string | null
          sender_name: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          balance: number
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          message?: string | null
          purchased_by?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          redeemed_by?: string | null
          sender_name?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          balance?: number
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          message?: string | null
          purchased_by?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          redeemed_by?: string | null
          sender_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      homepage_sections: {
        Row: {
          content: Json | null
          created_at: string
          id: string
          is_active: boolean | null
          section_type: string
          settings: Json | null
          sort_order: number | null
          subtitle_bn: string | null
          subtitle_en: string | null
          title_bn: string
          title_en: string | null
          updated_at: string
        }
        Insert: {
          content?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          section_type: string
          settings?: Json | null
          sort_order?: number | null
          subtitle_bn?: string | null
          subtitle_en?: string | null
          title_bn: string
          title_en?: string | null
          updated_at?: string
        }
        Update: {
          content?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          section_type?: string
          settings?: Json | null
          sort_order?: number | null
          subtitle_bn?: string | null
          subtitle_en?: string | null
          title_bn?: string
          title_en?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      login_logs: {
        Row: {
          created_at: string
          email: string | null
          event_type: string
          failure_reason: string | null
          id: string
          ip_address: string | null
          success: boolean | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          event_type?: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          event_type?: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      loyalty_points: {
        Row: {
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          points: number
          reference_id: string | null
          source: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          points?: number
          reference_id?: string | null
          source: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          points?: number
          reference_id?: string | null
          source?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      loyalty_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      marketing_automations: {
        Row: {
          ab_split_percent: number | null
          ab_test_enabled: boolean | null
          ab_variant_a_converted: number | null
          ab_variant_a_sent: number | null
          ab_variant_b_content: string | null
          ab_variant_b_converted: number | null
          ab_variant_b_sent: number | null
          ab_variant_b_sms: string | null
          ab_variant_b_subject: string | null
          ab_winner: string | null
          action_type: string
          conditions: Json | null
          cooldown_hours: number | null
          created_at: string
          delay_minutes: number | null
          description_bn: string | null
          email_content: string | null
          email_subject: string | null
          email_template_id: string | null
          exclude_segments: string[] | null
          funnel_steps: Json | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          max_sends_per_user: number | null
          name_bn: string
          name_en: string | null
          priority: number | null
          schedule_days: string[] | null
          schedule_time_end: string | null
          schedule_time_start: string | null
          schedule_type: string | null
          send_limit_per_day: number | null
          sms_template: string | null
          tags: string[] | null
          target_segment: string | null
          total_clicked: number | null
          total_converted: number | null
          total_opened: number | null
          total_revenue: number | null
          total_sent: number | null
          total_unsubscribed: number | null
          trigger_config: Json | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          ab_split_percent?: number | null
          ab_test_enabled?: boolean | null
          ab_variant_a_converted?: number | null
          ab_variant_a_sent?: number | null
          ab_variant_b_content?: string | null
          ab_variant_b_converted?: number | null
          ab_variant_b_sent?: number | null
          ab_variant_b_sms?: string | null
          ab_variant_b_subject?: string | null
          ab_winner?: string | null
          action_type: string
          conditions?: Json | null
          cooldown_hours?: number | null
          created_at?: string
          delay_minutes?: number | null
          description_bn?: string | null
          email_content?: string | null
          email_subject?: string | null
          email_template_id?: string | null
          exclude_segments?: string[] | null
          funnel_steps?: Json | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          max_sends_per_user?: number | null
          name_bn: string
          name_en?: string | null
          priority?: number | null
          schedule_days?: string[] | null
          schedule_time_end?: string | null
          schedule_time_start?: string | null
          schedule_type?: string | null
          send_limit_per_day?: number | null
          sms_template?: string | null
          tags?: string[] | null
          target_segment?: string | null
          total_clicked?: number | null
          total_converted?: number | null
          total_opened?: number | null
          total_revenue?: number | null
          total_sent?: number | null
          total_unsubscribed?: number | null
          trigger_config?: Json | null
          trigger_type: string
          updated_at?: string
        }
        Update: {
          ab_split_percent?: number | null
          ab_test_enabled?: boolean | null
          ab_variant_a_converted?: number | null
          ab_variant_a_sent?: number | null
          ab_variant_b_content?: string | null
          ab_variant_b_converted?: number | null
          ab_variant_b_sent?: number | null
          ab_variant_b_sms?: string | null
          ab_variant_b_subject?: string | null
          ab_winner?: string | null
          action_type?: string
          conditions?: Json | null
          cooldown_hours?: number | null
          created_at?: string
          delay_minutes?: number | null
          description_bn?: string | null
          email_content?: string | null
          email_subject?: string | null
          email_template_id?: string | null
          exclude_segments?: string[] | null
          funnel_steps?: Json | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          max_sends_per_user?: number | null
          name_bn?: string
          name_en?: string | null
          priority?: number | null
          schedule_days?: string[] | null
          schedule_time_end?: string | null
          schedule_time_start?: string | null
          schedule_type?: string | null
          send_limit_per_day?: number | null
          sms_template?: string | null
          tags?: string[] | null
          target_segment?: string | null
          total_clicked?: number | null
          total_converted?: number | null
          total_opened?: number | null
          total_revenue?: number | null
          total_sent?: number | null
          total_unsubscribed?: number | null
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_automations_email_template_id_fkey"
            columns: ["email_template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean | null
          menu_id: string
          open_in_new_tab: boolean | null
          parent_id: string | null
          sort_order: number | null
          title_bn: string
          title_en: string | null
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          menu_id: string
          open_in_new_tab?: boolean | null
          parent_id?: string | null
          sort_order?: number | null
          title_bn: string
          title_en?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          menu_id?: string
          open_in_new_tab?: boolean | null
          parent_id?: string | null
          sort_order?: number | null
          title_bn?: string
          title_en?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "navigation_menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      navigation_menus: {
        Row: {
          created_at: string
          id: string
          location: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          location?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_enabled: boolean | null
          id: string
          order_updates: boolean | null
          promotions: boolean | null
          push_enabled: boolean | null
          sms_enabled: boolean | null
          updated_at: string
          user_id: string
          whatsapp_enabled: boolean | null
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean | null
          id?: string
          order_updates?: boolean | null
          promotions?: boolean | null
          push_enabled?: boolean | null
          sms_enabled?: boolean | null
          updated_at?: string
          user_id: string
          whatsapp_enabled?: boolean | null
        }
        Update: {
          created_at?: string
          email_enabled?: boolean | null
          id?: string
          order_updates?: boolean | null
          promotions?: boolean | null
          push_enabled?: boolean | null
          sms_enabled?: boolean | null
          updated_at?: string
          user_id?: string
          whatsapp_enabled?: boolean | null
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          created_at: string
          description: string | null
          email_enabled: boolean | null
          email_template_id: string | null
          event_name_bn: string
          event_name_en: string
          event_type: string
          id: string
          is_active: boolean | null
          sms_enabled: boolean | null
          sms_template: string | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          email_enabled?: boolean | null
          email_template_id?: string | null
          event_name_bn: string
          event_name_en: string
          event_type: string
          id?: string
          is_active?: boolean | null
          sms_enabled?: boolean | null
          sms_template?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          email_enabled?: boolean | null
          email_template_id?: string | null
          event_name_bn?: string
          event_name_en?: string
          event_type?: string
          id?: string
          is_active?: boolean | null
          sms_enabled?: boolean | null
          sms_template?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      offer_products: {
        Row: {
          created_at: string
          id: string
          offer_id: string
          product_id: string
          product_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          offer_id: string
          product_id: string
          product_type: string
        }
        Update: {
          created_at?: string
          id?: string
          offer_id?: string
          product_id?: string
          product_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_products_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_usage: {
        Row: {
          discount_amount: number
          id: string
          offer_id: string
          order_id: string | null
          used_at: string
          user_id: string
        }
        Insert: {
          discount_amount?: number
          id?: string
          offer_id: string
          order_id?: string | null
          used_at?: string
          user_id: string
        }
        Update: {
          discount_amount?: number
          id?: string
          offer_id?: string
          order_id?: string | null
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_usage_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          applies_to: string
          banner_image: string | null
          buy_quantity: number | null
          category_ids: string[] | null
          created_at: string
          description_bn: string | null
          description_en: string | null
          discount_value: number | null
          end_date: string | null
          get_quantity: number | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          max_discount_amount: number | null
          meta_description: string | null
          meta_title: string | null
          min_order_amount: number | null
          name_bn: string
          name_en: string | null
          new_customers_only: boolean | null
          offer_type: string
          product_ids: string[] | null
          slug: string
          start_date: string | null
          updated_at: string
          usage_limit: number | null
          usage_per_customer: number | null
          used_count: number | null
        }
        Insert: {
          applies_to: string
          banner_image?: string | null
          buy_quantity?: number | null
          category_ids?: string[] | null
          created_at?: string
          description_bn?: string | null
          description_en?: string | null
          discount_value?: number | null
          end_date?: string | null
          get_quantity?: number | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          max_discount_amount?: number | null
          meta_description?: string | null
          meta_title?: string | null
          min_order_amount?: number | null
          name_bn: string
          name_en?: string | null
          new_customers_only?: boolean | null
          offer_type: string
          product_ids?: string[] | null
          slug: string
          start_date?: string | null
          updated_at?: string
          usage_limit?: number | null
          usage_per_customer?: number | null
          used_count?: number | null
        }
        Update: {
          applies_to?: string
          banner_image?: string | null
          buy_quantity?: number | null
          category_ids?: string[] | null
          created_at?: string
          description_bn?: string | null
          description_en?: string | null
          discount_value?: number | null
          end_date?: string | null
          get_quantity?: number | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          max_discount_amount?: number | null
          meta_description?: string | null
          meta_title?: string | null
          min_order_amount?: number | null
          name_bn?: string
          name_en?: string | null
          new_customers_only?: boolean | null
          offer_type?: string
          product_ids?: string[] | null
          slug?: string
          start_date?: string | null
          updated_at?: string
          usage_limit?: number | null
          usage_per_customer?: number | null
          used_count?: number | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          price: number
          product_id: string
          product_image: string | null
          product_title: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          price: number
          product_id: string
          product_image?: string | null
          product_title: string
          quantity: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          price?: number
          product_id?: string
          product_image?: string | null
          product_title?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_reviews: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          order_id: string | null
          reason: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          reason?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          reason?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          notes: string | null
          order_id: string
          status: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          order_id: string
          status: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          order_id?: string
          status?: string
        }
        Relationships: []
      }
      order_tasks: {
        Row: {
          assigned_by: string | null
          assigned_to: string
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          notes: string | null
          order_id: string
          priority: string
          status: string
          task_type: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_to: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          order_id: string
          priority?: string
          status?: string
          task_type: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          assigned_to?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          priority?: string
          status?: string
          task_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_tasks_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          actual_weight: number | null
          address: string
          assigned_to: string | null
          courier_provider: string | null
          courier_status: string | null
          created_at: string
          delivered_at: string | null
          delivery_area: string
          delivery_charge: number
          delivery_notes: string | null
          email: string | null
          estimated_delivery: string | null
          full_name: string
          id: string
          notes: string | null
          order_number: string
          payment_method: string
          payment_status: string | null
          phone: string
          phone_verified: boolean | null
          priority: string | null
          requires_review: boolean | null
          review_status: string | null
          shipped_at: string | null
          status: string
          subtotal: number
          total: number
          tracking_number: string | null
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_weight?: number | null
          address: string
          assigned_to?: string | null
          courier_provider?: string | null
          courier_status?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_area: string
          delivery_charge: number
          delivery_notes?: string | null
          email?: string | null
          estimated_delivery?: string | null
          full_name: string
          id?: string
          notes?: string | null
          order_number: string
          payment_method: string
          payment_status?: string | null
          phone: string
          phone_verified?: boolean | null
          priority?: string | null
          requires_review?: boolean | null
          review_status?: string | null
          shipped_at?: string | null
          status?: string
          subtotal: number
          total: number
          tracking_number?: string | null
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_weight?: number | null
          address?: string
          assigned_to?: string | null
          courier_provider?: string | null
          courier_status?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_area?: string
          delivery_charge?: number
          delivery_notes?: string | null
          email?: string | null
          estimated_delivery?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          order_number?: string
          payment_method?: string
          payment_status?: string | null
          phone?: string
          phone_verified?: boolean | null
          priority?: string | null
          requires_review?: boolean | null
          review_status?: string | null
          shipped_at?: string | null
          status?: string
          subtotal?: number
          total?: number
          tracking_number?: string | null
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      page_analytics: {
        Row: {
          avg_engagement_score: number | null
          avg_scroll_depth: number | null
          avg_time_on_page: number | null
          bounce_rate: number | null
          created_at: string | null
          date: string
          dead_clicks: number | null
          errors: number | null
          exit_rate: number | null
          id: string
          page_path: string
          rage_clicks: number | null
          unique_visitors: number | null
          views: number | null
        }
        Insert: {
          avg_engagement_score?: number | null
          avg_scroll_depth?: number | null
          avg_time_on_page?: number | null
          bounce_rate?: number | null
          created_at?: string | null
          date?: string
          dead_clicks?: number | null
          errors?: number | null
          exit_rate?: number | null
          id?: string
          page_path: string
          rage_clicks?: number | null
          unique_visitors?: number | null
          views?: number | null
        }
        Update: {
          avg_engagement_score?: number | null
          avg_scroll_depth?: number | null
          avg_time_on_page?: number | null
          bounce_rate?: number | null
          created_at?: string | null
          date?: string
          dead_clicks?: number | null
          errors?: number | null
          exit_rate?: number | null
          id?: string
          page_path?: string
          rage_clicks?: number | null
          unique_visitors?: number | null
          views?: number | null
        }
        Relationships: []
      }
      page_sections: {
        Row: {
          content: Json | null
          created_at: string
          id: string
          is_active: boolean | null
          page_id: string
          section_type: string
          settings: Json | null
          sort_order: number | null
          subtitle_bn: string | null
          subtitle_en: string | null
          title_bn: string | null
          title_en: string | null
          updated_at: string
        }
        Insert: {
          content?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          page_id: string
          section_type: string
          settings?: Json | null
          sort_order?: number | null
          subtitle_bn?: string | null
          subtitle_en?: string | null
          title_bn?: string | null
          title_en?: string | null
          updated_at?: string
        }
        Update: {
          content?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          page_id?: string
          section_type?: string
          settings?: Json | null
          sort_order?: number | null
          subtitle_bn?: string | null
          subtitle_en?: string | null
          title_bn?: string | null
          title_en?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_sections_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      page_usage: {
        Row: {
          discount_applied: number | null
          id: string
          order_id: string | null
          page_id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          discount_applied?: number | null
          id?: string
          order_id?: string | null
          page_id: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          discount_applied?: number | null
          id?: string
          order_id?: string | null
          page_id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_usage_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          access_code: string | null
          created_at: string
          created_by: string | null
          description_bn: string | null
          description_en: string | null
          end_date: string | null
          featured_image: string | null
          id: string
          is_homepage: boolean | null
          is_private: boolean | null
          linked_coupon_id: string | null
          linked_offer_id: string | null
          max_usage: number | null
          meta_description: string | null
          meta_title: string | null
          page_type: string | null
          selected_category_ids: string[] | null
          selected_product_ids: string[] | null
          show_in_offers_page: boolean | null
          slug: string
          sort_order: number | null
          start_date: string | null
          status: string
          title_bn: string
          title_en: string | null
          updated_at: string
          usage_per_user: number | null
        }
        Insert: {
          access_code?: string | null
          created_at?: string
          created_by?: string | null
          description_bn?: string | null
          description_en?: string | null
          end_date?: string | null
          featured_image?: string | null
          id?: string
          is_homepage?: boolean | null
          is_private?: boolean | null
          linked_coupon_id?: string | null
          linked_offer_id?: string | null
          max_usage?: number | null
          meta_description?: string | null
          meta_title?: string | null
          page_type?: string | null
          selected_category_ids?: string[] | null
          selected_product_ids?: string[] | null
          show_in_offers_page?: boolean | null
          slug: string
          sort_order?: number | null
          start_date?: string | null
          status?: string
          title_bn: string
          title_en?: string | null
          updated_at?: string
          usage_per_user?: number | null
        }
        Update: {
          access_code?: string | null
          created_at?: string
          created_by?: string | null
          description_bn?: string | null
          description_en?: string | null
          end_date?: string | null
          featured_image?: string | null
          id?: string
          is_homepage?: boolean | null
          is_private?: boolean | null
          linked_coupon_id?: string | null
          linked_offer_id?: string | null
          max_usage?: number | null
          meta_description?: string | null
          meta_title?: string | null
          page_type?: string | null
          selected_category_ids?: string[] | null
          selected_product_ids?: string[] | null
          show_in_offers_page?: boolean | null
          slug?: string
          sort_order?: number | null
          start_date?: string | null
          status?: string
          title_bn?: string
          title_en?: string | null
          updated_at?: string
          usage_per_user?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pages_linked_coupon_id_fkey"
            columns: ["linked_coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pages_linked_offer_id_fkey"
            columns: ["linked_offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          config: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          manual_instructions: string | null
          manual_number: string | null
          manual_type: string | null
          name_bn: string
          name_en: string
          payment_mode: string | null
          provider: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          manual_instructions?: string | null
          manual_number?: string | null
          manual_type?: string | null
          name_bn: string
          name_en: string
          payment_mode?: string | null
          provider: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          manual_instructions?: string | null
          manual_number?: string | null
          manual_type?: string | null
          name_bn?: string
          name_en?: string
          payment_mode?: string | null
          provider?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      permissions: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
          module: string
          name_bn: string
          name_en: string
          sort_order: number | null
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          module: string
          name_bn: string
          name_en: string
          sort_order?: number | null
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          module?: string
          name_bn?: string
          name_en?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      phone_verifications: {
        Row: {
          attempts: number | null
          created_at: string | null
          expires_at: string
          id: string
          otp_code: string
          phone: string
          verified: boolean | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          expires_at: string
          id?: string
          otp_code: string
          phone: string
          verified?: boolean | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          expires_at?: string
          id?: string
          otp_code?: string
          phone?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      popup_banners: {
        Row: {
          animation: string | null
          auto_close_seconds: number | null
          background_color: string | null
          badge_text: string | null
          border_radius: number | null
          button_link: string | null
          button_text: string | null
          close_on_overlay_click: boolean | null
          created_at: string
          description: string | null
          device_target: string | null
          end_date: string | null
          exclude_pages: string[] | null
          height: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          overlay_color: string | null
          padding: number | null
          popup_type: string
          position: string | null
          show_close_button: boolean | null
          show_frequency: string | null
          show_on_pages: string[] | null
          show_to_guests: boolean | null
          show_to_logged_in: boolean | null
          sort_order: number | null
          start_date: string | null
          text_align: string | null
          text_color: string | null
          title: string
          title_size: string | null
          trigger_delay: number | null
          trigger_scroll_percent: number | null
          trigger_type: string | null
          updated_at: string
          width: number | null
        }
        Insert: {
          animation?: string | null
          auto_close_seconds?: number | null
          background_color?: string | null
          badge_text?: string | null
          border_radius?: number | null
          button_link?: string | null
          button_text?: string | null
          close_on_overlay_click?: boolean | null
          created_at?: string
          description?: string | null
          device_target?: string | null
          end_date?: string | null
          exclude_pages?: string[] | null
          height?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          overlay_color?: string | null
          padding?: number | null
          popup_type?: string
          position?: string | null
          show_close_button?: boolean | null
          show_frequency?: string | null
          show_on_pages?: string[] | null
          show_to_guests?: boolean | null
          show_to_logged_in?: boolean | null
          sort_order?: number | null
          start_date?: string | null
          text_align?: string | null
          text_color?: string | null
          title?: string
          title_size?: string | null
          trigger_delay?: number | null
          trigger_scroll_percent?: number | null
          trigger_type?: string | null
          updated_at?: string
          width?: number | null
        }
        Update: {
          animation?: string | null
          auto_close_seconds?: number | null
          background_color?: string | null
          badge_text?: string | null
          border_radius?: number | null
          button_link?: string | null
          button_text?: string | null
          close_on_overlay_click?: boolean | null
          created_at?: string
          description?: string | null
          device_target?: string | null
          end_date?: string | null
          exclude_pages?: string[] | null
          height?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          overlay_color?: string | null
          padding?: number | null
          popup_type?: string
          position?: string | null
          show_close_button?: boolean | null
          show_frequency?: string | null
          show_on_pages?: string[] | null
          show_to_guests?: boolean | null
          show_to_logged_in?: boolean | null
          sort_order?: number | null
          start_date?: string | null
          text_align?: string | null
          text_color?: string | null
          title?: string
          title_size?: string | null
          trigger_delay?: number | null
          trigger_scroll_percent?: number | null
          trigger_type?: string | null
          updated_at?: string
          width?: number | null
        }
        Relationships: []
      }
      predictive_scores: {
        Row: {
          churn_risk: number | null
          created_at: string | null
          id: string
          ltv_tier: string | null
          next_action: string | null
          purchase_probability: number | null
          recommended_action: string | null
          segment: string | null
          session_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          churn_risk?: number | null
          created_at?: string | null
          id?: string
          ltv_tier?: string | null
          next_action?: string | null
          purchase_probability?: number | null
          recommended_action?: string | null
          segment?: string | null
          session_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          churn_risk?: number | null
          created_at?: string | null
          id?: string
          ltv_tier?: string | null
          next_action?: string | null
          purchase_probability?: number | null
          recommended_action?: string | null
          segment?: string | null
          session_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      price_drop_alerts: {
        Row: {
          created_at: string
          id: string
          is_notified: boolean | null
          notified_at: string | null
          original_price: number
          product_id: string
          target_price: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_notified?: boolean | null
          notified_at?: string | null
          original_price: number
          product_id: string
          target_price?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_notified?: boolean | null
          notified_at?: string | null
          original_price?: number
          product_id?: string
          target_price?: number | null
          user_id?: string
        }
        Relationships: []
      }
      product_bundles: {
        Row: {
          bundle_price: number
          created_at: string
          description_bn: string | null
          description_en: string | null
          discount_percent: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          name_bn: string
          name_en: string | null
          original_total: number
          slug: string
          updated_at: string
        }
        Insert: {
          bundle_price: number
          created_at?: string
          description_bn?: string | null
          description_en?: string | null
          discount_percent?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          name_bn: string
          name_en?: string | null
          original_total?: number
          slug: string
          updated_at?: string
        }
        Update: {
          bundle_price?: number
          created_at?: string
          description_bn?: string | null
          description_en?: string | null
          discount_percent?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          name_bn?: string
          name_en?: string | null
          original_total?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_licenses: {
        Row: {
          activated_at: string | null
          activation_count: number | null
          created_at: string | null
          digital_product_id: string
          expires_at: string | null
          id: string
          license_key: string
          max_activations: number | null
          metadata: Json | null
          order_id: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          activated_at?: string | null
          activation_count?: number | null
          created_at?: string | null
          digital_product_id: string
          expires_at?: string | null
          id?: string
          license_key: string
          max_activations?: number | null
          metadata?: Json | null
          order_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          activated_at?: string | null
          activation_count?: number | null
          created_at?: string | null
          digital_product_id?: string
          expires_at?: string | null
          id?: string
          license_key?: string
          max_activations?: number | null
          metadata?: Json | null
          order_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_licenses_digital_product_id_fkey"
            columns: ["digital_product_id"]
            isOneToOne: false
            referencedRelation: "digital_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_questions: {
        Row: {
          answer: string | null
          answered_at: string | null
          answered_by: string | null
          created_at: string
          helpful_count: number | null
          id: string
          is_published: boolean | null
          product_id: string
          question: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          created_at?: string
          helpful_count?: number | null
          id?: string
          is_published?: boolean | null
          product_id: string
          question: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          created_at?: string
          helpful_count?: number | null
          id?: string
          is_published?: boolean | null
          product_id?: string
          question?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_type_attribute_templates: {
        Row: {
          attribute_name_bn: string
          attribute_name_en: string | null
          created_at: string
          id: string
          is_required: boolean | null
          sort_order: number | null
          type_key: string
        }
        Insert: {
          attribute_name_bn: string
          attribute_name_en?: string | null
          created_at?: string
          id?: string
          is_required?: boolean | null
          sort_order?: number | null
          type_key: string
        }
        Update: {
          attribute_name_bn?: string
          attribute_name_en?: string | null
          created_at?: string
          id?: string
          is_required?: boolean | null
          sort_order?: number | null
          type_key?: string
        }
        Relationships: []
      }
      product_types: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean | null
          name_bn: string
          name_en: string
          sort_order: number | null
          type_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name_bn: string
          name_en: string
          sort_order?: number | null
          type_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name_bn?: string
          name_en?: string
          sort_order?: number | null
          type_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          created_at: string
          id: string
          images: Json | null
          is_active: boolean | null
          original_price: number | null
          price: number
          product_id: string
          sku: string | null
          sort_order: number | null
          stock_quantity: number
          updated_at: string
          variant_name: string
          variant_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          images?: Json | null
          is_active?: boolean | null
          original_price?: number | null
          price: number
          product_id: string
          sku?: string | null
          sort_order?: number | null
          stock_quantity?: number
          updated_at?: string
          variant_name: string
          variant_type?: string
        }
        Update: {
          created_at?: string
          id?: string
          images?: Json | null
          is_active?: boolean | null
          original_price?: number | null
          price?: number
          product_id?: string
          sku?: string | null
          sort_order?: number | null
          stock_quantity?: number
          updated_at?: string
          variant_name?: string
          variant_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          author: string | null
          brand_id: string | null
          category_id: string | null
          created_at: string
          description_bn: string | null
          description_en: string | null
          digital_file_name: string | null
          digital_file_url: string | null
          discount_percent: number | null
          id: string
          images: Json | null
          is_active: boolean | null
          is_digital: boolean | null
          is_featured: boolean | null
          is_preorder: boolean | null
          isbn: string | null
          meta_description: string | null
          meta_title: string | null
          original_price: number | null
          preview_url: string | null
          price: number
          publisher: string | null
          publisher_id: string | null
          release_date: string | null
          slug: string
          stock_quantity: number | null
          tags: string[] | null
          title_bn: string
          title_en: string
          updated_at: string
          writer_id: string | null
        }
        Insert: {
          author?: string | null
          brand_id?: string | null
          category_id?: string | null
          created_at?: string
          description_bn?: string | null
          description_en?: string | null
          digital_file_name?: string | null
          digital_file_url?: string | null
          discount_percent?: number | null
          id?: string
          images?: Json | null
          is_active?: boolean | null
          is_digital?: boolean | null
          is_featured?: boolean | null
          is_preorder?: boolean | null
          isbn?: string | null
          meta_description?: string | null
          meta_title?: string | null
          original_price?: number | null
          preview_url?: string | null
          price: number
          publisher?: string | null
          publisher_id?: string | null
          release_date?: string | null
          slug: string
          stock_quantity?: number | null
          tags?: string[] | null
          title_bn: string
          title_en: string
          updated_at?: string
          writer_id?: string | null
        }
        Update: {
          author?: string | null
          brand_id?: string | null
          category_id?: string | null
          created_at?: string
          description_bn?: string | null
          description_en?: string | null
          digital_file_name?: string | null
          digital_file_url?: string | null
          discount_percent?: number | null
          id?: string
          images?: Json | null
          is_active?: boolean | null
          is_digital?: boolean | null
          is_featured?: boolean | null
          is_preorder?: boolean | null
          isbn?: string | null
          meta_description?: string | null
          meta_title?: string | null
          original_price?: number | null
          preview_url?: string | null
          price?: number
          publisher?: string | null
          publisher_id?: string | null
          release_date?: string | null
          slug?: string
          stock_quantity?: number | null
          tags?: string[] | null
          title_bn?: string
          title_en?: string
          updated_at?: string
          writer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_publisher_id_fkey"
            columns: ["publisher_id"]
            isOneToOne: false
            referencedRelation: "publishers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_writer_id_fkey"
            columns: ["writer_id"]
            isOneToOne: false
            referencedRelation: "writers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          city: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          division: string | null
          email: string | null
          full_name: string | null
          gender: string | null
          id: string
          phone: string | null
          postal_code: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          division?: string | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id: string
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          division?: string | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      publishers: {
        Row: {
          created_at: string
          description_bn: string | null
          description_en: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          meta_description: string | null
          meta_title: string | null
          name_bn: string
          name_en: string
          slug: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          description_bn?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name_bn: string
          name_en: string
          slug: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          description_bn?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name_bn?: string
          name_en?: string
          slug?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          is_active: boolean | null
          p256dh: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          is_active?: boolean | null
          p256dh: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          is_active?: boolean | null
          p256dh?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      realtime_presence: {
        Row: {
          cart_value: number | null
          city: string | null
          country: string | null
          created_at: string | null
          device_type: string | null
          fingerprint_id: string | null
          id: string
          is_online: boolean | null
          last_seen_at: string | null
          page_path: string | null
          session_id: string
          user_id: string | null
        }
        Insert: {
          cart_value?: number | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          fingerprint_id?: string | null
          id?: string
          is_online?: boolean | null
          last_seen_at?: string | null
          page_path?: string | null
          session_id: string
          user_id?: string | null
        }
        Update: {
          cart_value?: number | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          fingerprint_id?: string | null
          id?: string
          is_online?: boolean | null
          last_seen_at?: string | null
          page_path?: string | null
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean | null
          total_earned: number | null
          total_referrals: number | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          total_earned?: number | null
          total_referrals?: number | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          total_earned?: number | null
          total_referrals?: number | null
          user_id?: string
        }
        Relationships: []
      }
      referral_rewards: {
        Row: {
          created_at: string
          id: string
          order_id: string | null
          referral_code_id: string
          referred_id: string
          referred_reward: number | null
          referrer_id: string
          referrer_reward: number | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id?: string | null
          referral_code_id: string
          referred_id: string
          referred_reward?: number | null
          referrer_id: string
          referrer_reward?: number | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string | null
          referral_code_id?: string
          referred_id?: string
          referred_reward?: number | null
          referrer_id?: string
          referrer_reward?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_rewards_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      refund_policies: {
        Row: {
          content_bn: string
          content_en: string | null
          created_at: string
          id: string
          is_active: boolean | null
          sort_order: number | null
          title_bn: string
          title_en: string | null
          updated_at: string
        }
        Insert: {
          content_bn: string
          content_en?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title_bn: string
          title_en?: string | null
          updated_at?: string
        }
        Update: {
          content_bn?: string
          content_en?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title_bn?: string
          title_en?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      refund_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          description: string | null
          id: string
          order_id: string
          processed_at: string | null
          processed_by: string | null
          reason: string
          refund_amount: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          description?: string | null
          id?: string
          order_id: string
          processed_at?: string | null
          processed_by?: string | null
          reason: string
          refund_amount?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string
          refund_amount?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      retention_cohorts: {
        Row: {
          cohort_date: string
          cohort_type: string | null
          created_at: string | null
          days_since_first_visit: number | null
          fingerprint_id: string | null
          first_visit_at: string
          id: string
          is_retained: boolean | null
          last_visit_at: string
          total_conversions: number | null
          total_page_views: number | null
          total_revenue: number | null
          total_sessions: number | null
          updated_at: string | null
          user_id: string | null
          visit_count: number | null
        }
        Insert: {
          cohort_date: string
          cohort_type?: string | null
          created_at?: string | null
          days_since_first_visit?: number | null
          fingerprint_id?: string | null
          first_visit_at: string
          id?: string
          is_retained?: boolean | null
          last_visit_at: string
          total_conversions?: number | null
          total_page_views?: number | null
          total_revenue?: number | null
          total_sessions?: number | null
          updated_at?: string | null
          user_id?: string | null
          visit_count?: number | null
        }
        Update: {
          cohort_date?: string
          cohort_type?: string | null
          created_at?: string | null
          days_since_first_visit?: number | null
          fingerprint_id?: string | null
          first_visit_at?: string
          id?: string
          is_retained?: boolean | null
          last_visit_at?: string
          total_conversions?: number | null
          total_page_views?: number | null
          total_revenue?: number | null
          total_sessions?: number | null
          updated_at?: string | null
          user_id?: string | null
          visit_count?: number | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          images: string[] | null
          is_verified_purchase: boolean | null
          product_id: string
          rating: number
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          images?: string[] | null
          is_verified_purchase?: boolean | null
          product_id: string
          rating: number
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          images?: string[] | null
          is_verified_purchase?: boolean | null
          product_id?: string
          rating?: number
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_id: string
          role: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission_id: string
          role: string
        }
        Update: {
          created_at?: string
          id?: string
          permission_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      roles_config: {
        Row: {
          created_at: string | null
          description_bn: string | null
          description_en: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          label_bn: string
          label_en: string
          role_key: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description_bn?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          label_bn: string
          label_en?: string
          role_key: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description_bn?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          label_bn?: string
          label_en?: string
          role_key?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      saved_cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_hashtag_groups: {
        Row: {
          created_at: string
          hashtags: string[]
          id: string
          is_default: boolean | null
          name: string
          updated_at: string
          use_count: number | null
        }
        Insert: {
          created_at?: string
          hashtags?: string[]
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string
          use_count?: number | null
        }
        Update: {
          created_at?: string
          hashtags?: string[]
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string
          use_count?: number | null
        }
        Relationships: []
      }
      search_analytics: {
        Row: {
          created_at: string | null
          id: string
          query: string
          results_count: number | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          query: string
          results_count?: number | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          query?: string
          results_count?: number | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      seo_redirects: {
        Row: {
          created_at: string
          destination_url: string
          hit_count: number | null
          id: string
          is_active: boolean | null
          last_hit_at: string | null
          notes: string | null
          redirect_type: number
          source_path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          destination_url: string
          hit_count?: number | null
          id?: string
          is_active?: boolean | null
          last_hit_at?: string | null
          notes?: string | null
          redirect_type?: number
          source_path: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          destination_url?: string
          hit_count?: number | null
          id?: string
          is_active?: boolean | null
          last_hit_at?: string | null
          notes?: string | null
          redirect_type?: number
          source_path?: string
          updated_at?: string
        }
        Relationships: []
      }
      server_side_events: {
        Row: {
          attribution_campaign: string | null
          attribution_medium: string | null
          attribution_source: string | null
          attribution_type: string | null
          browser: string | null
          city: string | null
          click_element: string | null
          click_x: number | null
          click_y: number | null
          connection_type: string | null
          core_web_vitals: Json | null
          country: string | null
          created_at: string
          dead_click: boolean | null
          dedup_key: string | null
          device_type: string | null
          engagement_score: number | null
          event_data: Json | null
          event_name: string
          exit_intent: boolean | null
          fingerprint_id: string | null
          id: string
          interaction_count: number | null
          ip_address: string | null
          is_bot: boolean | null
          language: string | null
          os: string | null
          page_load_time: number | null
          page_path: string | null
          page_title: string | null
          rage_click: boolean | null
          referrer: string | null
          screen_resolution: string | null
          scroll_depth: number | null
          session_id: string | null
          time_on_page: number | null
          user_agent: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          viewport_height: number | null
          viewport_width: number | null
        }
        Insert: {
          attribution_campaign?: string | null
          attribution_medium?: string | null
          attribution_source?: string | null
          attribution_type?: string | null
          browser?: string | null
          city?: string | null
          click_element?: string | null
          click_x?: number | null
          click_y?: number | null
          connection_type?: string | null
          core_web_vitals?: Json | null
          country?: string | null
          created_at?: string
          dead_click?: boolean | null
          dedup_key?: string | null
          device_type?: string | null
          engagement_score?: number | null
          event_data?: Json | null
          event_name: string
          exit_intent?: boolean | null
          fingerprint_id?: string | null
          id?: string
          interaction_count?: number | null
          ip_address?: string | null
          is_bot?: boolean | null
          language?: string | null
          os?: string | null
          page_load_time?: number | null
          page_path?: string | null
          page_title?: string | null
          rage_click?: boolean | null
          referrer?: string | null
          screen_resolution?: string | null
          scroll_depth?: number | null
          session_id?: string | null
          time_on_page?: number | null
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
        }
        Update: {
          attribution_campaign?: string | null
          attribution_medium?: string | null
          attribution_source?: string | null
          attribution_type?: string | null
          browser?: string | null
          city?: string | null
          click_element?: string | null
          click_x?: number | null
          click_y?: number | null
          connection_type?: string | null
          core_web_vitals?: Json | null
          country?: string | null
          created_at?: string
          dead_click?: boolean | null
          dedup_key?: string | null
          device_type?: string | null
          engagement_score?: number | null
          event_data?: Json | null
          event_name?: string
          exit_intent?: boolean | null
          fingerprint_id?: string | null
          id?: string
          interaction_count?: number | null
          ip_address?: string | null
          is_bot?: boolean | null
          language?: string | null
          os?: string | null
          page_load_time?: number | null
          page_path?: string | null
          page_title?: string | null
          rage_click?: boolean | null
          referrer?: string | null
          screen_resolution?: string | null
          scroll_depth?: number | null
          session_id?: string | null
          time_on_page?: number | null
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
        }
        Relationships: []
      }
      session_recordings: {
        Row: {
          browser: string | null
          created_at: string | null
          device_type: string | null
          duration_seconds: number | null
          engagement_score: number | null
          events_count: number | null
          fingerprint_id: string | null
          has_dead_clicks: boolean | null
          has_errors: boolean | null
          has_rage_clicks: boolean | null
          id: string
          os: string | null
          page_path: string
          recording_data: Json | null
          screen_resolution: string | null
          session_id: string
          user_id: string | null
        }
        Insert: {
          browser?: string | null
          created_at?: string | null
          device_type?: string | null
          duration_seconds?: number | null
          engagement_score?: number | null
          events_count?: number | null
          fingerprint_id?: string | null
          has_dead_clicks?: boolean | null
          has_errors?: boolean | null
          has_rage_clicks?: boolean | null
          id?: string
          os?: string | null
          page_path: string
          recording_data?: Json | null
          screen_resolution?: string | null
          session_id: string
          user_id?: string | null
        }
        Update: {
          browser?: string | null
          created_at?: string | null
          device_type?: string | null
          duration_seconds?: number | null
          engagement_score?: number | null
          events_count?: number | null
          fingerprint_id?: string | null
          has_dead_clicks?: boolean | null
          has_errors?: boolean | null
          has_rage_clicks?: boolean | null
          id?: string
          os?: string | null
          page_path?: string
          recording_data?: Json | null
          screen_resolution?: string | null
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      shared_wishlists: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          share_code: string
          title: string | null
          updated_at: string
          user_id: string
          view_count: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          share_code: string
          title?: string | null
          updated_at?: string
          user_id: string
          view_count?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          share_code?: string
          title?: string | null
          updated_at?: string
          user_id?: string
          view_count?: number | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_type: string
          setting_value: Json | null
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_type?: string
          setting_value?: Json | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_type?: string
          setting_value?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      sms_providers: {
        Row: {
          config: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          provider: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          provider: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          provider?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      social_automation_log: {
        Row: {
          created_at: string
          error_message: string | null
          execution_time_ms: number | null
          id: string
          metadata: Json | null
          platforms_posted: string[] | null
          post_id: string | null
          product_id: string | null
          product_name: string | null
          rule_id: string | null
          status: string
          template_id: string | null
          trigger_type: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          metadata?: Json | null
          platforms_posted?: string[] | null
          post_id?: string | null
          product_id?: string | null
          product_name?: string | null
          rule_id?: string | null
          status?: string
          template_id?: string | null
          trigger_type: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          metadata?: Json | null
          platforms_posted?: string[] | null
          post_id?: string | null
          product_id?: string | null
          product_name?: string | null
          rule_id?: string | null
          status?: string
          template_id?: string | null
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_automation_log_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "social_automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      social_automation_rules: {
        Row: {
          conditions: Json | null
          created_at: string
          delay_minutes: number | null
          fail_count: number | null
          hashtag_group_id: string | null
          id: string
          is_active: boolean | null
          last_executed_at: string | null
          last_triggered_at: string | null
          max_executions_per_day: number | null
          name: string
          platforms: string[] | null
          priority: number | null
          schedule_days: string[] | null
          schedule_time_end: string | null
          schedule_time_start: string | null
          send_email: boolean | null
          send_sms: boolean | null
          success_count: number | null
          template_id: string | null
          trigger_count: number | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          conditions?: Json | null
          created_at?: string
          delay_minutes?: number | null
          fail_count?: number | null
          hashtag_group_id?: string | null
          id?: string
          is_active?: boolean | null
          last_executed_at?: string | null
          last_triggered_at?: string | null
          max_executions_per_day?: number | null
          name: string
          platforms?: string[] | null
          priority?: number | null
          schedule_days?: string[] | null
          schedule_time_end?: string | null
          schedule_time_start?: string | null
          send_email?: boolean | null
          send_sms?: boolean | null
          success_count?: number | null
          template_id?: string | null
          trigger_count?: number | null
          trigger_type: string
          updated_at?: string
        }
        Update: {
          conditions?: Json | null
          created_at?: string
          delay_minutes?: number | null
          fail_count?: number | null
          hashtag_group_id?: string | null
          id?: string
          is_active?: boolean | null
          last_executed_at?: string | null
          last_triggered_at?: string | null
          max_executions_per_day?: number | null
          name?: string
          platforms?: string[] | null
          priority?: number | null
          schedule_days?: string[] | null
          schedule_time_end?: string | null
          schedule_time_start?: string | null
          send_email?: boolean | null
          send_sms?: boolean | null
          success_count?: number | null
          template_id?: string | null
          trigger_count?: number | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_automation_rules_hashtag_group_id_fkey"
            columns: ["hashtag_group_id"]
            isOneToOne: false
            referencedRelation: "saved_hashtag_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_automation_rules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "social_post_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      social_media_accounts: {
        Row: {
          access_token: string | null
          account_id: string | null
          account_name: string
          channel_id: string | null
          config: Json | null
          connected_by: string | null
          created_at: string
          id: string
          is_active: boolean | null
          page_id: string | null
          platform: string
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          account_id?: string | null
          account_name: string
          channel_id?: string | null
          config?: Json | null
          connected_by?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          page_id?: string | null
          platform: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          account_id?: string | null
          account_name?: string
          channel_id?: string | null
          config?: Json | null
          connected_by?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          page_id?: string | null
          platform?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      social_media_comments: {
        Row: {
          author_avatar_url: string | null
          author_name: string | null
          author_profile_url: string | null
          content: string
          created_at: string
          external_comment_id: string | null
          external_created_at: string | null
          id: string
          is_from_admin: boolean | null
          is_reply: boolean | null
          likes_count: number | null
          parent_comment_id: string | null
          platform: string
          post_id: string | null
          post_result_id: string | null
          updated_at: string
        }
        Insert: {
          author_avatar_url?: string | null
          author_name?: string | null
          author_profile_url?: string | null
          content: string
          created_at?: string
          external_comment_id?: string | null
          external_created_at?: string | null
          id?: string
          is_from_admin?: boolean | null
          is_reply?: boolean | null
          likes_count?: number | null
          parent_comment_id?: string | null
          platform: string
          post_id?: string | null
          post_result_id?: string | null
          updated_at?: string
        }
        Update: {
          author_avatar_url?: string | null
          author_name?: string | null
          author_profile_url?: string | null
          content?: string
          created_at?: string
          external_comment_id?: string | null
          external_created_at?: string | null
          id?: string
          is_from_admin?: boolean | null
          is_reply?: boolean | null
          likes_count?: number | null
          parent_comment_id?: string | null
          platform?: string
          post_id?: string | null
          post_result_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_media_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "social_media_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_media_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_comments_post_result_id_fkey"
            columns: ["post_result_id"]
            isOneToOne: false
            referencedRelation: "social_media_post_results"
            referencedColumns: ["id"]
          },
        ]
      }
      social_media_post_results: {
        Row: {
          account_id: string | null
          comments_count: number | null
          created_at: string
          error_message: string | null
          external_post_id: string | null
          external_url: string | null
          id: string
          last_synced_at: string | null
          likes_count: number | null
          platform: string
          post_id: string
          posted_at: string | null
          reach_count: number | null
          shares_count: number | null
          status: string
          updated_at: string
          views_count: number | null
        }
        Insert: {
          account_id?: string | null
          comments_count?: number | null
          created_at?: string
          error_message?: string | null
          external_post_id?: string | null
          external_url?: string | null
          id?: string
          last_synced_at?: string | null
          likes_count?: number | null
          platform: string
          post_id: string
          posted_at?: string | null
          reach_count?: number | null
          shares_count?: number | null
          status?: string
          updated_at?: string
          views_count?: number | null
        }
        Update: {
          account_id?: string | null
          comments_count?: number | null
          created_at?: string
          error_message?: string | null
          external_post_id?: string | null
          external_url?: string | null
          id?: string
          last_synced_at?: string | null
          likes_count?: number | null
          platform?: string
          post_id?: string
          posted_at?: string | null
          reach_count?: number | null
          shares_count?: number | null
          status?: string
          updated_at?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "social_media_post_results_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "social_media_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_post_results_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_media_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_media_posts: {
        Row: {
          content: string
          content_bn: string | null
          created_at: string
          created_by: string | null
          hashtags: string[] | null
          id: string
          link_url: string | null
          media_urls: string[] | null
          platforms: string[]
          post_type: string | null
          product_id: string | null
          publish_count: number
          published_at: string | null
          scheduled_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          content: string
          content_bn?: string | null
          created_at?: string
          created_by?: string | null
          hashtags?: string[] | null
          id?: string
          link_url?: string | null
          media_urls?: string[] | null
          platforms?: string[]
          post_type?: string | null
          product_id?: string | null
          publish_count?: number
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          content?: string
          content_bn?: string | null
          created_at?: string
          created_by?: string | null
          hashtags?: string[] | null
          id?: string
          link_url?: string | null
          media_urls?: string[] | null
          platforms?: string[]
          post_type?: string | null
          product_id?: string | null
          publish_count?: number
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      social_media_publish_history: {
        Row: {
          created_at: string
          id: string
          platforms: string[]
          post_id: string
          published_at: string
          results: Json | null
          trigger_type: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          platforms?: string[]
          post_id: string
          published_at?: string
          results?: Json | null
          trigger_type?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          platforms?: string[]
          post_id?: string
          published_at?: string
          results?: Json | null
          trigger_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_media_publish_history_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_media_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_media_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      social_post_templates: {
        Row: {
          category: string | null
          content_bn: string | null
          content_en: string | null
          created_at: string
          description: string | null
          hashtag_group_id: string | null
          id: string
          include_image: boolean | null
          include_link: boolean | null
          include_price: boolean | null
          is_active: boolean | null
          last_used_at: string | null
          name: string
          platforms: string[] | null
          template_type: string
          updated_at: string
          use_count: number | null
          variables: string[] | null
        }
        Insert: {
          category?: string | null
          content_bn?: string | null
          content_en?: string | null
          created_at?: string
          description?: string | null
          hashtag_group_id?: string | null
          id?: string
          include_image?: boolean | null
          include_link?: boolean | null
          include_price?: boolean | null
          is_active?: boolean | null
          last_used_at?: string | null
          name: string
          platforms?: string[] | null
          template_type?: string
          updated_at?: string
          use_count?: number | null
          variables?: string[] | null
        }
        Update: {
          category?: string | null
          content_bn?: string | null
          content_en?: string | null
          created_at?: string
          description?: string | null
          hashtag_group_id?: string | null
          id?: string
          include_image?: boolean | null
          include_link?: boolean | null
          include_price?: boolean | null
          is_active?: boolean | null
          last_used_at?: string | null
          name?: string
          platforms?: string[] | null
          template_type?: string
          updated_at?: string
          use_count?: number | null
          variables?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "social_post_templates_hashtag_group_id_fkey"
            columns: ["hashtag_group_id"]
            isOneToOne: false
            referencedRelation: "saved_hashtag_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      spin_wheel_history: {
        Row: {
          id: string
          prize_id: string | null
          prize_label: string
          prize_type: string
          prize_value: number
          spun_at: string
          user_id: string
        }
        Insert: {
          id?: string
          prize_id?: string | null
          prize_label: string
          prize_type: string
          prize_value?: number
          spun_at?: string
          user_id: string
        }
        Update: {
          id?: string
          prize_id?: string | null
          prize_label?: string
          prize_type?: string
          prize_value?: number
          spun_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spin_wheel_history_prize_id_fkey"
            columns: ["prize_id"]
            isOneToOne: false
            referencedRelation: "spin_wheel_prizes"
            referencedColumns: ["id"]
          },
        ]
      }
      spin_wheel_prizes: {
        Row: {
          color: string
          id: string
          is_active: boolean
          label_bn: string
          prize_type: string
          prize_value: number
          probability: number
          sort_order: number
        }
        Insert: {
          color?: string
          id?: string
          is_active?: boolean
          label_bn: string
          prize_type?: string
          prize_value?: number
          probability?: number
          sort_order?: number
        }
        Update: {
          color?: string
          id?: string
          is_active?: boolean
          label_bn?: string
          prize_type?: string
          prize_value?: number
          probability?: number
          sort_order?: number
        }
        Relationships: []
      }
      staff_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
        }
        Relationships: []
      }
      staff_messages: {
        Row: {
          created_at: string
          id: string
          is_pinned: boolean
          is_read: boolean
          message: string
          priority: string
          read_at: string | null
          recipient_id: string
          sender_id: string
          subject: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_pinned?: boolean
          is_read?: boolean
          message: string
          priority?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
          subject: string
        }
        Update: {
          created_at?: string
          id?: string
          is_pinned?: boolean
          is_read?: boolean
          message?: string
          priority?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
          subject?: string
        }
        Relationships: []
      }
      task_auto_assign_rules: {
        Row: {
          assigned_role: Database["public"]["Enums"]["app_role"]
          assignment_strategy: string
          auto_create_on_order: boolean
          created_at: string
          default_priority: string
          id: string
          is_active: boolean | null
          max_tasks_per_staff: number | null
          task_type: string
          updated_at: string
        }
        Insert: {
          assigned_role?: Database["public"]["Enums"]["app_role"]
          assignment_strategy?: string
          auto_create_on_order?: boolean
          created_at?: string
          default_priority?: string
          id?: string
          is_active?: boolean | null
          max_tasks_per_staff?: number | null
          task_type: string
          updated_at?: string
        }
        Update: {
          assigned_role?: Database["public"]["Enums"]["app_role"]
          assignment_strategy?: string
          auto_create_on_order?: boolean
          created_at?: string
          default_priority?: string
          id?: string
          is_active?: boolean | null
          max_tasks_per_staff?: number | null
          task_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      universal_categories: {
        Row: {
          created_at: string
          description_bn: string | null
          description_en: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          meta_description: string | null
          meta_title: string | null
          name_bn: string
          name_en: string
          parent_id: string | null
          product_type: string
          slug: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description_bn?: string | null
          description_en?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          name_bn: string
          name_en: string
          parent_id?: string | null
          product_type: string
          slug: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description_bn?: string | null
          description_en?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          name_bn?: string
          name_en?: string
          parent_id?: string | null
          product_type?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "universal_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "universal_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      universal_product_attributes: {
        Row: {
          attribute_name_bn: string
          attribute_name_en: string | null
          attribute_value_bn: string
          attribute_value_en: string | null
          created_at: string
          id: string
          product_id: string
          sort_order: number | null
        }
        Insert: {
          attribute_name_bn: string
          attribute_name_en?: string | null
          attribute_value_bn: string
          attribute_value_en?: string | null
          created_at?: string
          id?: string
          product_id: string
          sort_order?: number | null
        }
        Update: {
          attribute_name_bn?: string
          attribute_name_en?: string | null
          attribute_value_bn?: string
          attribute_value_en?: string | null
          created_at?: string
          id?: string
          product_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "universal_product_attributes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "universal_products"
            referencedColumns: ["id"]
          },
        ]
      }
      universal_product_variants: {
        Row: {
          created_at: string
          id: string
          images: Json | null
          is_active: boolean | null
          original_price: number | null
          price: number
          product_id: string
          sku: string | null
          sort_order: number | null
          stock_quantity: number
          updated_at: string
          variant_name_bn: string
          variant_name_en: string | null
          variant_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          images?: Json | null
          is_active?: boolean | null
          original_price?: number | null
          price: number
          product_id: string
          sku?: string | null
          sort_order?: number | null
          stock_quantity?: number
          updated_at?: string
          variant_name_bn: string
          variant_name_en?: string | null
          variant_type?: string
        }
        Update: {
          created_at?: string
          id?: string
          images?: Json | null
          is_active?: boolean | null
          original_price?: number | null
          price?: number
          product_id?: string
          sku?: string | null
          sort_order?: number | null
          stock_quantity?: number
          updated_at?: string
          variant_name_bn?: string
          variant_name_en?: string | null
          variant_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "universal_product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "universal_products"
            referencedColumns: ["id"]
          },
        ]
      }
      universal_products: {
        Row: {
          brand: string | null
          canonical_url: string | null
          category_id: string | null
          created_at: string
          delivery_time: string | null
          digital_file_name: string | null
          digital_file_url: string | null
          dimensions: string | null
          discount_percent: number | null
          id: string
          images: Json | null
          ingredients: string | null
          is_active: boolean | null
          is_digital: boolean | null
          is_featured: boolean | null
          json_ld: Json | null
          long_description_bn: string | null
          long_description_en: string | null
          manufacturer: string | null
          meta_description: string | null
          meta_keywords: string[] | null
          meta_title: string | null
          name_bn: string
          name_en: string
          og_description: string | null
          og_image: string | null
          og_title: string | null
          original_price: number | null
          price: number
          product_type: string
          return_policy: string | null
          short_description_bn: string | null
          short_description_en: string | null
          sku: string | null
          slug: string
          stock_quantity: number | null
          updated_at: string
          video_url: string | null
          warranty: string | null
          weight: string | null
        }
        Insert: {
          brand?: string | null
          canonical_url?: string | null
          category_id?: string | null
          created_at?: string
          delivery_time?: string | null
          digital_file_name?: string | null
          digital_file_url?: string | null
          dimensions?: string | null
          discount_percent?: number | null
          id?: string
          images?: Json | null
          ingredients?: string | null
          is_active?: boolean | null
          is_digital?: boolean | null
          is_featured?: boolean | null
          json_ld?: Json | null
          long_description_bn?: string | null
          long_description_en?: string | null
          manufacturer?: string | null
          meta_description?: string | null
          meta_keywords?: string[] | null
          meta_title?: string | null
          name_bn: string
          name_en: string
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          original_price?: number | null
          price: number
          product_type: string
          return_policy?: string | null
          short_description_bn?: string | null
          short_description_en?: string | null
          sku?: string | null
          slug: string
          stock_quantity?: number | null
          updated_at?: string
          video_url?: string | null
          warranty?: string | null
          weight?: string | null
        }
        Update: {
          brand?: string | null
          canonical_url?: string | null
          category_id?: string | null
          created_at?: string
          delivery_time?: string | null
          digital_file_name?: string | null
          digital_file_url?: string | null
          dimensions?: string | null
          discount_percent?: number | null
          id?: string
          images?: Json | null
          ingredients?: string | null
          is_active?: boolean | null
          is_digital?: boolean | null
          is_featured?: boolean | null
          json_ld?: Json | null
          long_description_bn?: string | null
          long_description_en?: string | null
          manufacturer?: string | null
          meta_description?: string | null
          meta_keywords?: string[] | null
          meta_title?: string | null
          name_bn?: string
          name_en?: string
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          original_price?: number | null
          price?: number
          product_type?: string
          return_policy?: string | null
          short_description_bn?: string | null
          short_description_en?: string | null
          sku?: string | null
          slug?: string
          stock_quantity?: number | null
          updated_at?: string
          video_url?: string | null
          warranty?: string | null
          weight?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "universal_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "universal_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_attributions: {
        Row: {
          created_at: string | null
          fingerprint_id: string | null
          first_touch_at: string | null
          first_touch_campaign: string | null
          first_touch_medium: string | null
          first_touch_source: string | null
          id: string
          last_touch_at: string | null
          last_touch_campaign: string | null
          last_touch_medium: string | null
          last_touch_source: string | null
          session_id: string
          total_conversions: number | null
          total_revenue: number | null
          total_visits: number | null
          touchpoints: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          fingerprint_id?: string | null
          first_touch_at?: string | null
          first_touch_campaign?: string | null
          first_touch_medium?: string | null
          first_touch_source?: string | null
          id?: string
          last_touch_at?: string | null
          last_touch_campaign?: string | null
          last_touch_medium?: string | null
          last_touch_source?: string | null
          session_id: string
          total_conversions?: number | null
          total_revenue?: number | null
          total_visits?: number | null
          touchpoints?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          fingerprint_id?: string | null
          first_touch_at?: string | null
          first_touch_campaign?: string | null
          first_touch_medium?: string | null
          first_touch_source?: string | null
          id?: string
          last_touch_at?: string | null
          last_touch_campaign?: string | null
          last_touch_medium?: string | null
          last_touch_source?: string | null
          session_id?: string
          total_conversions?: number | null
          total_revenue?: number | null
          total_visits?: number | null
          touchpoints?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "achievement_badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_journeys: {
        Row: {
          conversion_type: string | null
          conversion_value: number | null
          created_at: string | null
          device_type: string | null
          entry_page: string | null
          exit_page: string | null
          id: string
          journey_data: Json | null
          patterns: string[] | null
          session_id: string
          total_duration_ms: number | null
          total_steps: number | null
          unique_pages: number | null
          user_id: string | null
        }
        Insert: {
          conversion_type?: string | null
          conversion_value?: number | null
          created_at?: string | null
          device_type?: string | null
          entry_page?: string | null
          exit_page?: string | null
          id?: string
          journey_data?: Json | null
          patterns?: string[] | null
          session_id: string
          total_duration_ms?: number | null
          total_steps?: number | null
          unique_pages?: number | null
          user_id?: string | null
        }
        Update: {
          conversion_type?: string | null
          conversion_value?: number | null
          created_at?: string | null
          device_type?: string | null
          entry_page?: string | null
          exit_page?: string | null
          id?: string
          journey_data?: Json | null
          patterns?: string[] | null
          session_id?: string
          total_duration_ms?: number | null
          total_steps?: number | null
          unique_pages?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          metadata?: Json | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      visitor_analytics: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          created_at: string
          device_type: string | null
          duration_seconds: number | null
          id: string
          is_bounce: boolean | null
          language: string | null
          os: string | null
          page_path: string
          page_title: string | null
          referrer: string | null
          screen_resolution: string | null
          search_query: string | null
          session_id: string
          user_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          duration_seconds?: number | null
          id?: string
          is_bounce?: boolean | null
          language?: string | null
          os?: string | null
          page_path: string
          page_title?: string | null
          referrer?: string | null
          screen_resolution?: string | null
          search_query?: string | null
          session_id: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          duration_seconds?: number | null
          id?: string
          is_bounce?: boolean | null
          language?: string | null
          os?: string | null
          page_path?: string
          page_title?: string | null
          referrer?: string | null
          screen_resolution?: string | null
          search_query?: string | null
          session_id?: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      wishlist_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: []
      }
      writers: {
        Row: {
          bio_bn: string | null
          bio_en: string | null
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean | null
          meta_description: string | null
          meta_title: string | null
          name_bn: string
          name_en: string
          slug: string
          updated_at: string
        }
        Insert: {
          bio_bn?: string | null
          bio_en?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          name_bn: string
          name_en: string
          slug: string
          updated_at?: string
        }
        Update: {
          bio_bn?: string | null
          bio_en?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          name_bn?: string
          name_en?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auto_assign_task: { Args: { _task_type: string }; Returns: string }
      calculate_risk_score: { Args: { p_user_id: string }; Returns: number }
      create_visitor_conversation: {
        Args: {
          p_user_id?: string
          p_visitor_id: string
          p_visitor_name: string
          p_visitor_phone: string
        }
        Returns: {
          assigned_to: string | null
          created_at: string
          id: string
          last_message_at: string | null
          status: string
          updated_at: string
          user_id: string | null
          visitor_email: string | null
          visitor_id: string
          visitor_name: string | null
          visitor_phone: string | null
        }
        SetofOptions: {
          from: "*"
          to: "chat_conversations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_least_loaded_staff:
        | {
            Args: { _role: Database["public"]["Enums"]["app_role"] }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.get_least_loaded_staff(_role => text), public.get_least_loaded_staff(_role => app_role). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { _role: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.get_least_loaded_staff(_role => text), public.get_least_loaded_staff(_role => app_role). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      get_order_tracking: { Args: { p_order_number: string }; Returns: Json }
      get_public_payment_methods: {
        Args: never
        Returns: {
          id: string
          is_active: boolean
          manual_instructions: string
          manual_number: string
          manual_type: string
          name_bn: string
          name_en: string
          payment_mode: string
          provider: string
          sort_order: number
        }[]
      }
      get_visitor_chat_messages: {
        Args: { p_conversation_id: string; p_visitor_id: string }
        Returns: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          message_type: string
          sender_id: string | null
          sender_name: string | null
          sender_type: string
        }[]
        SetofOptions: {
          from: "*"
          to: "chat_messages"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_visitor_conversations: {
        Args: { p_visitor_id: string }
        Returns: {
          assigned_to: string | null
          created_at: string
          id: string
          last_message_at: string | null
          status: string
          updated_at: string
          user_id: string | null
          visitor_email: string | null
          visitor_id: string
          visitor_name: string | null
          visitor_phone: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "chat_conversations"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_permission: {
        Args: { _action: string; _module: string; _user_id: string }
        Returns: boolean
      }
      has_role:
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
        | { Args: { _role: string; _user_id: string }; Returns: boolean }
      increment_attribution_conversions: {
        Args: { p_revenue: number; p_session_id: string }
        Returns: undefined
      }
      insert_visitor_chat_message: {
        Args: {
          p_attachment_name?: string
          p_attachment_type?: string
          p_attachment_url?: string
          p_conversation_id: string
          p_message: string
          p_sender_name: string
          p_sender_type: string
          p_visitor_id: string
        }
        Returns: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          message_type: string
          sender_id: string | null
          sender_name: string | null
          sender_type: string
        }
        SetofOptions: {
          from: "*"
          to: "chat_messages"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_support: { Args: { _user_id: string }; Returns: boolean }
      mark_presence_offline: {
        Args: { p_session_id: string }
        Returns: undefined
      }
      smart_auto_assign: {
        Args: { _order_id?: string; _task_type: string }
        Returns: string
      }
      subscribe_email: {
        Args: { p_email: string; p_source: string }
        Returns: Json
      }
      update_visitor_conversation_timestamp: {
        Args: { p_conversation_id: string; p_visitor_id: string }
        Returns: undefined
      }
      upsert_predictive_score: {
        Args: {
          p_churn_risk: number
          p_ltv_tier: string
          p_next_action: string
          p_purchase_probability: number
          p_recommended_action: string
          p_segment: string
          p_session_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      upsert_presence: {
        Args: {
          p_cart_value: number
          p_city: string
          p_country: string
          p_device_type: string
          p_page_path: string
          p_session_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      upsert_retention_visit: {
        Args: { p_cohort_id: string; p_user_id: string; p_visit_day: number }
        Returns: undefined
      }
      validate_gift_card: { Args: { p_code: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "manager" | "support"
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
    Enums: {
      app_role: ["admin", "manager", "support"],
    },
  },
} as const
