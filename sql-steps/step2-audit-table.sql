-- =====================================================
-- STEP 2: TABELLA AUDIT TRAIL
-- Copia e incolla questo nell'SQL Editor di Supabase
-- =====================================================

-- Crea tabella audit log
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indici per audit log
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_table_record 
ON public.audit_log (table_name, record_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_user_date 
ON public.audit_log (user_id, created_at DESC);

-- RLS per audit log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Policy per vedere solo i propri audit log
CREATE POLICY "Users can view own audit logs" ON public.audit_log
  FOR SELECT USING (auth.uid() = user_id);

-- Log completamento
DO $$
BEGIN
  RAISE NOTICE 'STEP 2 COMPLETATO: Tabella audit_log creata con RLS';
END $$; 