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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      clientes: {
        Row: {
          atualizado_em: string
          criado_em: string
          email: string | null
          endereco: string | null
          id: string
          nome: string
          telefone: string | null
          user_id: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          telefone?: string | null
          user_id: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      eventos_cakto: {
        Row: {
          cabecalhos: Json | null
          criado_em: string
          id: string
          nota: string | null
          offer_type: string | null
          parent_order: string | null
          payload: Json
          pedido_id: string | null
          processado: boolean
          segredo_valido: boolean
          tipo: string | null
        }
        Insert: {
          cabecalhos?: Json | null
          criado_em?: string
          id?: string
          nota?: string | null
          offer_type?: string | null
          parent_order?: string | null
          payload: Json
          pedido_id?: string | null
          processado?: boolean
          segredo_valido?: boolean
          tipo?: string | null
        }
        Update: {
          cabecalhos?: Json | null
          criado_em?: string
          id?: string
          nota?: string | null
          offer_type?: string | null
          parent_order?: string | null
          payload?: Json
          pedido_id?: string | null
          processado?: boolean
          segredo_valido?: boolean
          tipo?: string | null
        }
        Relationships: []
      }
      eventos_orcamento: {
        Row: {
          criado_em: string
          id: string
          ip: string | null
          motivo: string | null
          motivo_texto: string | null
          nome_aceite: string | null
          orcamento_id: string
          tipo: string
          user_agent: string | null
        }
        Insert: {
          criado_em?: string
          id?: string
          ip?: string | null
          motivo?: string | null
          motivo_texto?: string | null
          nome_aceite?: string | null
          orcamento_id: string
          tipo: string
          user_agent?: string | null
        }
        Update: {
          criado_em?: string
          id?: string
          ip?: string | null
          motivo?: string | null
          motivo_texto?: string | null
          nome_aceite?: string | null
          orcamento_id?: string
          tipo?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eventos_orcamento_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_biblioteca: {
        Row: {
          atualizado_em: string
          criado_em: string
          descricao: string
          id: string
          tipo: string
          unidade: string
          user_id: string
          valor_unitario: number
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          descricao: string
          id?: string
          tipo?: string
          unidade?: string
          user_id: string
          valor_unitario?: number
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          descricao?: string
          id?: string
          tipo?: string
          unidade?: string
          user_id?: string
          valor_unitario?: number
        }
        Relationships: []
      }
      liberacoes: {
        Row: {
          atualizado_em: string
          criado_em: string
          email: string
          id: string
          liberada_em: string
          motivo_revogacao: string | null
          pedido_id: string | null
          revogada_em: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          email: string
          id?: string
          liberada_em?: string
          motivo_revogacao?: string | null
          pedido_id?: string | null
          revogada_em?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          email?: string
          id?: string
          liberada_em?: string
          motivo_revogacao?: string | null
          pedido_id?: string | null
          revogada_em?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      orcamento_itens: {
        Row: {
          criado_em: string
          descricao: string
          id: string
          orcamento_id: string
          ordem: number
          pacote: string
          quantidade: number
          tipo: string
          unidade: string
          valor_unitario: number
        }
        Insert: {
          criado_em?: string
          descricao: string
          id?: string
          orcamento_id: string
          ordem?: number
          pacote?: string
          quantidade?: number
          tipo?: string
          unidade?: string
          valor_unitario?: number
        }
        Update: {
          criado_em?: string
          descricao?: string
          id?: string
          orcamento_id?: string
          ordem?: number
          pacote?: string
          quantidade?: number
          tipo?: string
          unidade?: string
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_itens_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_pacotes: {
        Row: {
          atualizado_em: string
          criado_em: string
          descricao: string
          destaque: boolean
          id: string
          nivel: string
          orcamento_id: string
          rotulo: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          descricao?: string
          destaque?: boolean
          id?: string
          nivel: string
          orcamento_id: string
          rotulo?: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          descricao?: string
          destaque?: boolean
          id?: string
          nivel?: string
          orcamento_id?: string
          rotulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_pacotes_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamentos: {
        Row: {
          atualizado_em: string
          cliente_id: string | null
          criado_em: string
          data_validade: string | null
          enviado_em: string | null
          id: string
          local_servico: string | null
          numero: number
          observacoes: string | null
          prazo_execucao: string | null
          respondido_em: string | null
          snapshot_aceite: Json | null
          status: string
          texto_condicoes_pagamento: string | null
          texto_escopo: string | null
          texto_exclusoes: string | null
          texto_garantia: string | null
          tipo_servico: string | null
          titulo: string
          token_publico: string
          tratado_em: string | null
          user_id: string
          validade_dias: number
        }
        Insert: {
          atualizado_em?: string
          cliente_id?: string | null
          criado_em?: string
          data_validade?: string | null
          enviado_em?: string | null
          id?: string
          local_servico?: string | null
          numero: number
          observacoes?: string | null
          prazo_execucao?: string | null
          respondido_em?: string | null
          snapshot_aceite?: Json | null
          status?: string
          texto_condicoes_pagamento?: string | null
          texto_escopo?: string | null
          texto_exclusoes?: string | null
          texto_garantia?: string | null
          tipo_servico?: string | null
          titulo?: string
          token_publico?: string
          tratado_em?: string | null
          user_id: string
          validade_dias?: number
        }
        Update: {
          atualizado_em?: string
          cliente_id?: string | null
          criado_em?: string
          data_validade?: string | null
          enviado_em?: string | null
          id?: string
          local_servico?: string | null
          numero?: number
          observacoes?: string | null
          prazo_execucao?: string | null
          respondido_em?: string | null
          snapshot_aceite?: Json | null
          status?: string
          texto_condicoes_pagamento?: string | null
          texto_escopo?: string | null
          texto_exclusoes?: string | null
          texto_garantia?: string | null
          tipo_servico?: string | null
          titulo?: string
          token_publico?: string
          tratado_em?: string | null
          user_id?: string
          validade_dias?: number
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis: {
        Row: {
          atualizado_em: string
          cnpj_cpf: string | null
          cor_primaria: string
          criado_em: string
          email: string | null
          endereco: string | null
          id: string
          logo_url: string | null
          nicho: string
          nome_empresa: string
          proximo_numero: number
          responsavel: string | null
          telefone: string | null
          user_id: string
        }
        Insert: {
          atualizado_em?: string
          cnpj_cpf?: string | null
          cor_primaria?: string
          criado_em?: string
          email?: string | null
          endereco?: string | null
          id?: string
          logo_url?: string | null
          nicho?: string
          nome_empresa?: string
          proximo_numero?: number
          responsavel?: string | null
          telefone?: string | null
          user_id: string
        }
        Update: {
          atualizado_em?: string
          cnpj_cpf?: string | null
          cor_primaria?: string
          criado_em?: string
          email?: string | null
          endereco?: string | null
          id?: string
          logo_url?: string | null
          nicho?: string
          nome_empresa?: string
          proximo_numero?: number
          responsavel?: string | null
          telefone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      recursos_liberados: {
        Row: {
          atualizado_em: string
          criado_em: string
          email: string
          id: string
          liberada_em: string
          motivo_revogacao: string | null
          pedido_id: string | null
          recurso: string
          revogada_em: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          email: string
          id?: string
          liberada_em?: string
          motivo_revogacao?: string | null
          pedido_id?: string | null
          recurso: string
          revogada_em?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          email?: string
          id?: string
          liberada_em?: string
          motivo_revogacao?: string | null
          pedido_id?: string | null
          recurso?: string
          revogada_em?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      textos_padrao: {
        Row: {
          conteudo: string
          criado_em: string
          id: string
          nicho: string
          tipo_servico: string
          tipo_texto: string
        }
        Insert: {
          conteudo: string
          criado_em?: string
          id?: string
          nicho?: string
          tipo_servico: string
          tipo_texto: string
        }
        Update: {
          conteudo?: string
          criado_em?: string
          id?: string
          nicho?: string
          tipo_servico?: string
          tipo_texto?: string
        }
        Relationships: []
      }
      uso_ia: {
        Row: {
          criado_em: string
          duracao_ms: number | null
          id: string
          modelo: string | null
          motivo_falha: string | null
          recurso: string
          sucesso: boolean
          tokens_entrada: number | null
          tokens_saida: number | null
          user_id: string
        }
        Insert: {
          criado_em?: string
          duracao_ms?: number | null
          id?: string
          modelo?: string | null
          motivo_falha?: string | null
          recurso: string
          sucesso: boolean
          tokens_entrada?: number | null
          tokens_saida?: number | null
          user_id: string
        }
        Update: {
          criado_em?: string
          duracao_ms?: number | null
          id?: string
          modelo?: string | null
          motivo_falha?: string | null
          recurso?: string
          sucesso?: boolean
          tokens_entrada?: number | null
          tokens_saida?: number | null
          user_id?: string
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
