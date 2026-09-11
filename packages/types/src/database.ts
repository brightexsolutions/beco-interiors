export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      analytics_events: {
        Row: {
          created_at: string
          event_type: string
          id: number
          metadata: Json
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: number
          metadata?: Json
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: number
          metadata?: Json
        }
        Relationships: []
      }
      announcements: {
        Row: {
          body: string | null
          created_at: string
          created_by: string | null
          cta_label: string | null
          cta_url: string | null
          ends_at: string
          id: string
          is_active: boolean
          priority: number
          starts_at: string
          title: string
          type: Database["public"]["Enums"]["announcement_type"]
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_url?: string | null
          ends_at: string
          id?: string
          is_active?: boolean
          priority?: number
          starts_at: string
          title: string
          type?: Database["public"]["Enums"]["announcement_type"]
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_url?: string | null
          ends_at?: string
          id?: string
          is_active?: boolean
          priority?: number
          starts_at?: string
          title?: string
          type?: Database["public"]["Enums"]["announcement_type"]
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          after: Json | null
          before: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip: unknown
          user_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip?: unknown
          user_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip?: unknown
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author: string
          body: string
          category: string | null
          cover_image: Json | null
          cover_image_alt: string | null
          created_at: string
          excerpt: string | null
          generated_by_model: string | null
          generation_prompt: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          reading_time: number | null
          slug: string
          status: Database["public"]["Enums"]["post_status"]
          tags: Json
          target_term: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author: string
          body: string
          category?: string | null
          cover_image?: Json | null
          cover_image_alt?: string | null
          created_at?: string
          excerpt?: string | null
          generated_by_model?: string | null
          generation_prompt?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          reading_time?: number | null
          slug: string
          status?: Database["public"]["Enums"]["post_status"]
          tags?: Json
          target_term?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author?: string
          body?: string
          category?: string | null
          cover_image?: Json | null
          cover_image_alt?: string | null
          created_at?: string
          excerpt?: string | null
          generated_by_model?: string | null
          generation_prompt?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          reading_time?: number | null
          slug?: string
          status?: Database["public"]["Enums"]["post_status"]
          tags?: Json
          target_term?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          hero_image: Json | null
          id: string
          is_published: boolean
          meta_description: string | null
          meta_title: string | null
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
          source_path: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          hero_image?: Json | null
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
          source_path?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          hero_image?: Json | null
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
          source_path?: string | null
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
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "category_product_counts"
            referencedColumns: ["category_id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          has_permission: boolean
          id: string
          is_published: boolean
          logo: Json | null
          name: string
          project: string | null
          sector: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          has_permission?: boolean
          id?: string
          is_published?: boolean
          logo?: Json | null
          name: string
          project?: string | null
          sector?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          has_permission?: boolean
          id?: string
          is_published?: boolean
          logo?: Json | null
          name?: string
          project?: string | null
          sector?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          generated_by: string | null
          id: string
          order_id: string | null
          quote_id: string | null
          reference_number: string
          sent_at: string | null
          sent_channel: string | null
          sent_to: string | null
          storage_path: string
          type: Database["public"]["Enums"]["document_type"]
        }
        Insert: {
          created_at?: string
          generated_by?: string | null
          id?: string
          order_id?: string | null
          quote_id?: string | null
          reference_number: string
          sent_at?: string | null
          sent_channel?: string | null
          sent_to?: string | null
          storage_path: string
          type: Database["public"]["Enums"]["document_type"]
        }
        Update: {
          created_at?: string
          generated_by?: string | null
          id?: string
          order_id?: string | null
          quote_id?: string | null
          reference_number?: string
          sent_at?: string | null
          sent_channel?: string | null
          sent_to?: string | null
          storage_path?: string
          type?: Database["public"]["Enums"]["document_type"]
        }
        Relationships: [
          {
            foreignKeyName: "documents_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      import_files: {
        Row: {
          drive_file_id: string
          drive_modified_time: string | null
          first_seen_at: string
          imported_at: string | null
          last_seen_at: string
          md5_checksum: string | null
          path: string
          product_id: string | null
          role: Database["public"]["Enums"]["image_role"] | null
          size_bytes: number | null
          status: Database["public"]["Enums"]["import_outcome"]
        }
        Insert: {
          drive_file_id: string
          drive_modified_time?: string | null
          first_seen_at?: string
          imported_at?: string | null
          last_seen_at?: string
          md5_checksum?: string | null
          path: string
          product_id?: string | null
          role?: Database["public"]["Enums"]["image_role"] | null
          size_bytes?: number | null
          status?: Database["public"]["Enums"]["import_outcome"]
        }
        Update: {
          drive_file_id?: string
          drive_modified_time?: string | null
          first_seen_at?: string
          imported_at?: string | null
          last_seen_at?: string
          md5_checksum?: string | null
          path?: string
          product_id?: string | null
          role?: Database["public"]["Enums"]["image_role"] | null
          size_bytes?: number | null
          status?: Database["public"]["Enums"]["import_outcome"]
        }
        Relationships: [
          {
            foreignKeyName: "import_files_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      import_issues: {
        Row: {
          created_at: string
          detail: Json | null
          id: string
          path: string
          reason: string
          run_id: string
        }
        Insert: {
          created_at?: string
          detail?: Json | null
          id?: string
          path: string
          reason: string
          run_id: string
        }
        Update: {
          created_at?: string
          detail?: Json | null
          id?: string
          path?: string
          reason?: string
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_issues_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "import_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      import_runs: {
        Row: {
          finished_at: string | null
          id: string
          mode: string
          started_at: string
          summary: Json
        }
        Insert: {
          finished_at?: string | null
          id?: string
          mode: string
          started_at?: string
          summary?: Json
        }
        Update: {
          finished_at?: string | null
          id?: string
          mode?: string
          started_at?: string
          summary?: Json
        }
        Relationships: []
      }
      import_state: {
        Row: {
          drive_page_token: string | null
          id: boolean
          last_full_reconcile_at: string | null
        }
        Insert: {
          drive_page_token?: string | null
          id?: boolean
          last_full_reconcile_at?: string | null
        }
        Update: {
          drive_page_token?: string | null
          id?: boolean
          last_full_reconcile_at?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          description: string
          id: string
          line_total: number | null
          list_price: number | null
          order_id: string
          product_id: string | null
          quantity: number
          sort_order: number
          unit_price: number
        }
        Insert: {
          description: string
          id?: string
          line_total?: number | null
          list_price?: number | null
          order_id: string
          product_id?: string | null
          quantity: number
          sort_order?: number
          unit_price?: number
        }
        Update: {
          description?: string
          id?: string
          line_total?: number | null
          list_price?: number | null
          order_id?: string
          product_id?: string | null
          quantity?: number
          sort_order?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          created_by: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string
          deleted_at: string | null
          delivery_address: string | null
          fulfilment: Database["public"]["Enums"]["fulfilment"] | null
          id: string
          notes: string | null
          paid_at: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          quote_id: string | null
          reference_number: string
          salesperson_id: string | null
          source: Database["public"]["Enums"]["quote_source"]
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total_amount: number
          updated_at: string
          vat_amount: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          deleted_at?: string | null
          delivery_address?: string | null
          fulfilment?: Database["public"]["Enums"]["fulfilment"] | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          quote_id?: string | null
          reference_number?: string
          salesperson_id?: string | null
          source?: Database["public"]["Enums"]["quote_source"]
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total_amount?: number
          updated_at?: string
          vat_amount?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          deleted_at?: string | null
          delivery_address?: string | null
          fulfilment?: Database["public"]["Enums"]["fulfilment"] | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          quote_id?: string | null
          reference_number?: string
          salesperson_id?: string | null
          source?: Database["public"]["Enums"]["quote_source"]
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total_amount?: number
          updated_at?: string
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_salesperson_id_fkey"
            columns: ["salesperson_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      product_slugs: {
        Row: {
          created_at: string
          product_id: string
          slug: string
        }
        Insert: {
          created_at?: string
          product_id: string
          slug: string
        }
        Update: {
          created_at?: string
          product_id?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_slugs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          availability: Database["public"]["Enums"]["availability"]
          badge: Database["public"]["Enums"]["product_badge"] | null
          category_id: string | null
          compare_at_price: number | null
          created_at: string
          deleted_at: string | null
          description: string | null
          face_type: Database["public"]["Enums"]["face_type"] | null
          id: string
          images: Json
          is_published: boolean
          meta_description: string | null
          meta_title: string | null
          name: string
          price: number | null
          price_display_mode: Database["public"]["Enums"]["price_display_mode"]
          short_description: string | null
          sku: string | null
          slug: string
          sort_order: number
          source_path: string | null
          specs: Json
          unit: string | null
          updated_at: string
        }
        Insert: {
          availability?: Database["public"]["Enums"]["availability"]
          badge?: Database["public"]["Enums"]["product_badge"] | null
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          face_type?: Database["public"]["Enums"]["face_type"] | null
          id?: string
          images?: Json
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          name: string
          price?: number | null
          price_display_mode?: Database["public"]["Enums"]["price_display_mode"]
          short_description?: string | null
          sku?: string | null
          slug: string
          sort_order?: number
          source_path?: string | null
          specs?: Json
          unit?: string | null
          updated_at?: string
        }
        Update: {
          availability?: Database["public"]["Enums"]["availability"]
          badge?: Database["public"]["Enums"]["product_badge"] | null
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          face_type?: Database["public"]["Enums"]["face_type"] | null
          id?: string
          images?: Json
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          price?: number | null
          price_display_mode?: Database["public"]["Enums"]["price_display_mode"]
          short_description?: string | null
          sku?: string | null
          slug?: string
          sort_order?: number
          source_path?: string | null
          specs?: Json
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category_product_counts"
            referencedColumns: ["category_id"]
          },
        ]
      }
      quote_items: {
        Row: {
          description: string
          id: string
          line_total: number | null
          list_price: number | null
          notes: string | null
          product_id: string | null
          quantity: number
          quote_id: string
          sort_order: number
          unit_price: number
        }
        Insert: {
          description: string
          id?: string
          line_total?: number | null
          list_price?: number | null
          notes?: string | null
          product_id?: string | null
          quantity: number
          quote_id: string
          sort_order?: number
          unit_price?: number
        }
        Update: {
          description?: string
          id?: string
          line_total?: number | null
          list_price?: number | null
          notes?: string | null
          product_id?: string | null
          quantity?: number
          quote_id?: string
          sort_order?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          assigned_to: string | null
          budget_note: string | null
          company: string | null
          converted_order_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          deleted_at: string | null
          delivery_address: string | null
          finalized_at: string | null
          fulfilment: Database["public"]["Enums"]["fulfilment"] | null
          id: string
          lost_reason: string | null
          project_details: string | null
          project_type: string | null
          reference_number: string
          source: Database["public"]["Enums"]["quote_source"]
          status: Database["public"]["Enums"]["quote_status"]
          subtotal: number
          timeline: string | null
          total_amount: number
          updated_at: string
          valid_until: string | null
          vat_amount: number
          wants_installation: boolean
          wants_samples: boolean
        }
        Insert: {
          assigned_to?: string | null
          budget_note?: string | null
          company?: string | null
          converted_order_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          deleted_at?: string | null
          delivery_address?: string | null
          finalized_at?: string | null
          fulfilment?: Database["public"]["Enums"]["fulfilment"] | null
          id?: string
          lost_reason?: string | null
          project_details?: string | null
          project_type?: string | null
          reference_number?: string
          source?: Database["public"]["Enums"]["quote_source"]
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          timeline?: string | null
          total_amount?: number
          updated_at?: string
          valid_until?: string | null
          vat_amount?: number
          wants_installation?: boolean
          wants_samples?: boolean
        }
        Update: {
          assigned_to?: string | null
          budget_note?: string | null
          company?: string | null
          converted_order_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          deleted_at?: string | null
          delivery_address?: string | null
          finalized_at?: string | null
          fulfilment?: Database["public"]["Enums"]["fulfilment"] | null
          id?: string
          lost_reason?: string | null
          project_details?: string | null
          project_type?: string | null
          reference_number?: string
          source?: Database["public"]["Enums"]["quote_source"]
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          timeline?: string | null
          total_amount?: number
          updated_at?: string
          valid_until?: string | null
          vat_amount?: number
          wants_installation?: boolean
          wants_samples?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "quotes_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_converted_order_fk"
            columns: ["converted_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          client_name: string
          created_at: string
          id: string
          image: Json | null
          is_published: boolean
          project: string | null
          quote_text: string
          sort_order: number
        }
        Insert: {
          client_name: string
          created_at?: string
          id?: string
          image?: Json | null
          is_published?: boolean
          project?: string | null
          quote_text: string
          sort_order?: number
        }
        Update: {
          client_name?: string
          created_at?: string
          id?: string
          image?: Json | null
          is_published?: boolean
          project?: string | null
          quote_text?: string
          sort_order?: number
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean
          is_public: boolean
          last_login_at: string | null
          must_change_password: boolean
          public_phone: string | null
          public_photo: Json | null
          public_title: string | null
          role: Database["public"]["Enums"]["user_role"]
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          full_name: string
          id: string
          is_active?: boolean
          is_public?: boolean
          last_login_at?: string | null
          must_change_password?: boolean
          public_phone?: string | null
          public_photo?: Json | null
          public_title?: string | null
          role: Database["public"]["Enums"]["user_role"]
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          is_public?: boolean
          last_login_at?: string | null
          must_change_password?: boolean
          public_phone?: string | null
          public_photo?: Json | null
          public_title?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      category_product_counts: {
        Row: {
          category_id: string | null
          published_product_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      complete_first_login: { Args: never; Returns: undefined }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_admin: { Args: never; Returns: boolean }
      is_brightex_user: { Args: never; Returns: boolean }
      next_order_reference: { Args: never; Returns: string }
      next_quote_reference: { Args: never; Returns: string }
      record_sign_in: { Args: never; Returns: undefined }
      slugify: { Args: { input: string }; Returns: string }
      submit_quote: {
        Args: {
          p_budget_note?: string
          p_company?: string
          p_customer_email?: string
          p_customer_name: string
          p_customer_phone: string
          p_delivery_address?: string
          p_fulfilment?: Database["public"]["Enums"]["fulfilment"]
          p_items: Json
          p_project_details?: string
          p_project_type?: string
          p_timeline?: string
          p_wants_installation?: boolean
          p_wants_samples?: boolean
        }
        Returns: string
      }
    }
    Enums: {
      announcement_type: "sale" | "clearance" | "notice" | "event"
      audit_action:
        | "create"
        | "update"
        | "delete"
        | "login"
        | "send"
        | "export"
        | "assign"
      availability: "in_stock" | "pre_order" | "poa"
      document_type: "quote" | "receipt"
      face_type: "book_match" | "one_face"
      fulfilment: "pickup" | "delivery"
      image_role: "slab" | "on_stand" | "bookmatch" | "application" | "unknown"
      import_outcome: "new" | "changed" | "moved" | "unchanged" | "missing"
      order_status: "pending" | "confirmed" | "fulfilled" | "cancelled"
      payment_status: "unpaid" | "paid"
      post_status: "draft" | "published"
      price_display_mode: "fixed" | "poa"
      product_badge: "hot" | "new" | "sale" | "clearance"
      quote_source: "web" | "walk_in" | "phone" | "whatsapp"
      quote_status: "new" | "reviewing" | "quoted" | "won" | "lost"
      user_role:
        | "beco_admin"
        | "beco_sales"
        | "beco_product_manager"
        | "beco_editor"
        | "brightex_admin"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      announcement_type: ["sale", "clearance", "notice", "event"],
      audit_action: [
        "create",
        "update",
        "delete",
        "login",
        "send",
        "export",
        "assign",
      ],
      availability: ["in_stock", "pre_order", "poa"],
      document_type: ["quote", "receipt"],
      face_type: ["book_match", "one_face"],
      fulfilment: ["pickup", "delivery"],
      image_role: ["slab", "on_stand", "bookmatch", "application", "unknown"],
      import_outcome: ["new", "changed", "moved", "unchanged", "missing"],
      order_status: ["pending", "confirmed", "fulfilled", "cancelled"],
      payment_status: ["unpaid", "paid"],
      post_status: ["draft", "published"],
      price_display_mode: ["fixed", "poa"],
      product_badge: ["hot", "new", "sale", "clearance"],
      quote_source: ["web", "walk_in", "phone", "whatsapp"],
      quote_status: ["new", "reviewing", "quoted", "won", "lost"],
      user_role: [
        "beco_admin",
        "beco_sales",
        "beco_product_manager",
        "beco_editor",
        "brightex_admin",
      ],
    },
  },
} as const

