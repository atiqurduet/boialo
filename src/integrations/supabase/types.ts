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
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      coupons: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          end_date: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          min_order_amount: number | null
          start_date: string | null
          updated_at: string
          used_count: number | null
        }
        Insert: {
          code: string
          created_at?: string
          discount_type: string
          discount_value: number
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order_amount?: number | null
          start_date?: string | null
          updated_at?: string
          used_count?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order_amount?: number | null
          start_date?: string | null
          updated_at?: string
          used_count?: number | null
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
      orders: {
        Row: {
          address: string
          courier_provider: string | null
          courier_status: string | null
          created_at: string
          delivered_at: string | null
          delivery_area: string
          delivery_charge: number
          email: string | null
          full_name: string
          id: string
          notes: string | null
          order_number: string
          payment_method: string
          phone: string
          phone_verified: boolean | null
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
          address: string
          courier_provider?: string | null
          courier_status?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_area: string
          delivery_charge: number
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          order_number: string
          payment_method: string
          phone: string
          phone_verified?: boolean | null
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
          address?: string
          courier_provider?: string | null
          courier_status?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_area?: string
          delivery_charge?: number
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          order_number?: string
          payment_method?: string
          phone?: string
          phone_verified?: boolean | null
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
      payment_methods: {
        Row: {
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
      products: {
        Row: {
          author: string | null
          brand_id: string | null
          category_id: string | null
          created_at: string
          description_bn: string | null
          description_en: string | null
          discount_percent: number | null
          id: string
          images: Json | null
          is_active: boolean | null
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
          discount_percent?: number | null
          id?: string
          images?: Json | null
          is_active?: boolean | null
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
          discount_percent?: number | null
          id?: string
          images?: Json | null
          is_active?: boolean | null
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
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
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
          is_verified_purchase?: boolean | null
          product_id?: string
          rating?: number
          title?: string | null
          updated_at?: string
          user_id?: string
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
          product_type: Database["public"]["Enums"]["product_type"]
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
          product_type: Database["public"]["Enums"]["product_type"]
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
          product_type?: Database["public"]["Enums"]["product_type"]
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
      universal_products: {
        Row: {
          brand: string | null
          canonical_url: string | null
          category_id: string | null
          created_at: string
          delivery_time: string | null
          dimensions: string | null
          discount_percent: number | null
          id: string
          images: Json | null
          ingredients: string | null
          is_active: boolean | null
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
          product_type: Database["public"]["Enums"]["product_type"]
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
          dimensions?: string | null
          discount_percent?: number | null
          id?: string
          images?: Json | null
          ingredients?: string | null
          is_active?: boolean | null
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
          product_type: Database["public"]["Enums"]["product_type"]
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
          dimensions?: string | null
          discount_percent?: number | null
          id?: string
          images?: Json | null
          ingredients?: string | null
          is_active?: boolean | null
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
          product_type?: Database["public"]["Enums"]["product_type"]
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
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
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
      calculate_risk_score: { Args: { p_user_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "manager" | "support"
      product_type: "lifestyle" | "stationery" | "food"
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
      product_type: ["lifestyle", "stationery", "food"],
    },
  },
} as const
