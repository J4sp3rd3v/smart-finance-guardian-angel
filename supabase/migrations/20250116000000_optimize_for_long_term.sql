-- =====================================================
-- MIGRAZIONE: OTTIMIZZAZIONE LONG-TERM DATABASE
-- Data: 16 Gennaio 2025
-- Scopo: Setup robusto per anni di dati finanziari
-- =====================================================

-- =====================================================
-- 1. INDICI PER PERFORMANCE OTTIMALI
-- =====================================================

-- Indici per ricerche frequenti sulle transazioni
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_user_date 
ON public.transactions (user_id, date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_user_type_date 
ON public.transactions (user_id, type, date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_user_category_date 
ON public.transactions (user_id, category_id, date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_amount 
ON public.transactions (user_id, amount DESC);

-- Indici per transazioni ricorrenti
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recurring_user_active_next 
ON public.recurring_transactions (user_id, is_active, next_date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recurring_next_date 
ON public.recurring_transactions (next_date) 
WHERE is_active = true;

-- Indici per profili
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_email 
ON public.profiles (email);

-- =====================================================
-- 2. TABELLA AUDIT TRAIL (CRONOLOGIA MODIFICHE)
-- =====================================================

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

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_date 
ON public.audit_log (created_at DESC);

-- RLS per audit log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit logs" ON public.audit_log
  FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- 3. TABELLA BACKUP METADATA
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_backup_metadata (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  backup_type TEXT NOT NULL CHECK (backup_type IN ('manual', 'automatic', 'scheduled')),
  file_path TEXT,
  file_size BIGINT,
  checksum TEXT,
  records_count INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Indici per backup metadata
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_backup_user_date 
ON public.user_backup_metadata (user_id, created_at DESC);

-- RLS per backup metadata
ALTER TABLE public.user_backup_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own backup metadata" ON public.user_backup_metadata
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own backup metadata" ON public.user_backup_metadata
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 4. TABELLA STATISTICHE UTENTE (CACHE PERFORMANCE)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_statistics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  stat_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_transactions INTEGER DEFAULT 0,
  total_income DECIMAL(15,2) DEFAULT 0,
  total_expenses DECIMAL(15,2) DEFAULT 0,
  net_balance DECIMAL(15,2) DEFAULT 0,
  average_daily_spend DECIMAL(10,2) DEFAULT 0,
  top_category_expense TEXT,
  monthly_budget DECIMAL(15,2),
  last_calculated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, stat_date)
);

-- Indici per statistiche
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_stats_user_date 
ON public.user_statistics (user_id, stat_date DESC);

-- RLS per statistiche
ALTER TABLE public.user_statistics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own statistics" ON public.user_statistics
  FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- 5. FUNZIONI AVANZATE PER GESTIONE DATI
-- =====================================================

-- Funzione per calcolare statistiche giornaliere
CREATE OR REPLACE FUNCTION calculate_daily_statistics(target_user_id UUID, target_date DATE DEFAULT CURRENT_DATE)
RETURNS void AS $$
DECLARE
  income_total DECIMAL(15,2);
  expense_total DECIMAL(15,2);
  transaction_count INTEGER;
  top_category TEXT;
  avg_daily DECIMAL(10,2);
BEGIN
  -- Calcola totali per la data specificata
  SELECT 
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0),
    COUNT(*)
  INTO income_total, expense_total, transaction_count
  FROM public.transactions 
  WHERE user_id = target_user_id 
    AND date = target_date;

  -- Trova categoria più utilizzata per spese
  SELECT c.name INTO top_category
  FROM public.transactions t
  JOIN public.categories c ON t.category_id = c.id
  WHERE t.user_id = target_user_id 
    AND t.type = 'expense'
    AND t.date >= target_date - INTERVAL '30 days'
  GROUP BY c.name
  ORDER BY SUM(t.amount) DESC
  LIMIT 1;

  -- Calcola media spesa giornaliera ultimi 30 giorni
  SELECT COALESCE(AVG(daily_expense), 0) INTO avg_daily
  FROM (
    SELECT date, SUM(amount) as daily_expense
    FROM public.transactions 
    WHERE user_id = target_user_id 
      AND type = 'expense'
      AND date >= target_date - INTERVAL '30 days'
    GROUP BY date
  ) daily_totals;

  -- Inserisci o aggiorna statistiche
  INSERT INTO public.user_statistics (
    user_id, stat_date, total_transactions, total_income, 
    total_expenses, net_balance, average_daily_spend, top_category_expense
  ) VALUES (
    target_user_id, target_date, transaction_count, income_total,
    expense_total, (income_total - expense_total), avg_daily, top_category
  )
  ON CONFLICT (user_id, stat_date) 
  DO UPDATE SET
    total_transactions = EXCLUDED.total_transactions,
    total_income = EXCLUDED.total_income,
    total_expenses = EXCLUDED.total_expenses,
    net_balance = EXCLUDED.net_balance,
    average_daily_spend = EXCLUDED.average_daily_spend,
    top_category_expense = EXCLUDED.top_category_expense,
    last_calculated = now();
END;
$$ LANGUAGE plpgsql;

-- Funzione per pulizia dati obsoleti (data retention)
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
  -- Pulisci audit log più vecchi di 2 anni
  DELETE FROM public.audit_log 
  WHERE created_at < now() - INTERVAL '2 years';
  
  -- Pulisci backup metadata più vecchi di 1 anno
  DELETE FROM public.user_backup_metadata 
  WHERE created_at < now() - INTERVAL '1 year'
    AND status = 'completed';
  
  -- Pulisci statistiche più vecchie di 5 anni
  DELETE FROM public.user_statistics 
  WHERE stat_date < CURRENT_DATE - INTERVAL '5 years';
  
  -- Log dell'operazione
  RAISE NOTICE 'Cleanup completato: % record rimossi', ROW_COUNT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. TRIGGER AVANZATI PER AUDIT E STATISTICHE
-- =====================================================

-- Funzione trigger per audit log
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  old_data JSONB;
  new_data JSONB;
  changed_fields TEXT[] := '{}';
  field_name TEXT;
BEGIN
  -- Determina old_data e new_data
  IF TG_OP = 'DELETE' THEN
    old_data := to_jsonb(OLD);
    new_data := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    old_data := NULL;
    new_data := to_jsonb(NEW);
  ELSE -- UPDATE
    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);
    
    -- Trova campi modificati
    FOR field_name IN SELECT jsonb_object_keys(new_data)
    LOOP
      IF old_data->>field_name IS DISTINCT FROM new_data->>field_name THEN
        changed_fields := array_append(changed_fields, field_name);
      END IF;
    END LOOP;
  END IF;

  -- Inserisci record audit
  INSERT INTO public.audit_log (
    table_name, record_id, user_id, action, 
    old_data, new_data, changed_fields
  ) VALUES (
    TG_TABLE_NAME::TEXT,
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.user_id, OLD.user_id, auth.uid()),
    TG_OP,
    old_data,
    new_data,
    changed_fields
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Applica trigger audit alle tabelle principali
DROP TRIGGER IF EXISTS audit_transactions_trigger ON public.transactions;
CREATE TRIGGER audit_transactions_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_recurring_trigger ON public.recurring_transactions;
CREATE TRIGGER audit_recurring_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.recurring_transactions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Trigger per aggiornamento statistiche
CREATE OR REPLACE FUNCTION update_statistics_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Aggiorna statistiche per la data della transazione
  PERFORM calculate_daily_statistics(
    COALESCE(NEW.user_id, OLD.user_id),
    COALESCE(NEW.date, OLD.date)
  );
  
  -- Se la data è cambiata, aggiorna anche la vecchia data
  IF TG_OP = 'UPDATE' AND OLD.date != NEW.date THEN
    PERFORM calculate_daily_statistics(OLD.user_id, OLD.date);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_statistics_trigger ON public.transactions;
CREATE TRIGGER update_statistics_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION update_statistics_trigger();

-- =====================================================
-- 7. FUNZIONI UTILITÀ E MAINTENANCE
-- =====================================================

-- Funzione per esportare dati utente (GDPR compliance)
CREATE OR REPLACE FUNCTION export_user_data(target_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'profile', (
      SELECT to_jsonb(p) FROM public.profiles p WHERE id = target_user_id
    ),
    'transactions', (
      SELECT jsonb_agg(to_jsonb(t)) FROM public.transactions t WHERE user_id = target_user_id
    ),
    'recurring_transactions', (
      SELECT jsonb_agg(to_jsonb(rt)) FROM public.recurring_transactions rt WHERE user_id = target_user_id
    ),
    'statistics', (
      SELECT jsonb_agg(to_jsonb(s)) FROM public.user_statistics s WHERE user_id = target_user_id
    ),
    'exported_at', now()
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per eliminare completamente dati utente
CREATE OR REPLACE FUNCTION delete_user_data(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Elimina in ordine per rispettare foreign keys
  DELETE FROM public.audit_log WHERE user_id = target_user_id;
  DELETE FROM public.user_backup_metadata WHERE user_id = target_user_id;
  DELETE FROM public.user_statistics WHERE user_id = target_user_id;
  DELETE FROM public.transactions WHERE user_id = target_user_id;
  DELETE FROM public.recurring_transactions WHERE user_id = target_user_id;
  DELETE FROM public.profiles WHERE id = target_user_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. VISTE OTTIMIZZATE PER REPORTING
-- =====================================================

-- Vista per dashboard summary
CREATE OR REPLACE VIEW public.user_dashboard_summary AS
SELECT 
  p.id as user_id,
  p.full_name,
  p.email,
  COALESCE(current_stats.total_income, 0) as current_month_income,
  COALESCE(current_stats.total_expenses, 0) as current_month_expenses,
  COALESCE(current_stats.net_balance, 0) as current_month_balance,
  COALESCE(total_balance.balance, 0) as total_balance,
  COALESCE(transaction_count.count, 0) as total_transactions
FROM public.profiles p
LEFT JOIN public.user_statistics current_stats ON (
  p.id = current_stats.user_id 
  AND current_stats.stat_date = CURRENT_DATE
)
LEFT JOIN (
  SELECT 
    user_id,
    SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as balance
  FROM public.transactions 
  GROUP BY user_id
) total_balance ON p.id = total_balance.user_id
LEFT JOIN (
  SELECT user_id, COUNT(*) as count
  FROM public.transactions
  GROUP BY user_id  
) transaction_count ON p.id = transaction_count.user_id;

-- RLS per vista
ALTER VIEW public.user_dashboard_summary SET (security_invoker = true);

-- =====================================================
-- 9. CONFIGURAZIONI AVANZATE
-- =====================================================

-- Impostazioni per ottimizzazione query
ALTER TABLE public.transactions SET (fillfactor = 90);
ALTER TABLE public.recurring_transactions SET (fillfactor = 90);

-- Commenti per documentazione
COMMENT ON TABLE public.audit_log IS 'Traccia tutte le modifiche ai dati per audit e compliance';
COMMENT ON TABLE public.user_statistics IS 'Cache statistiche pre-calcolate per performance dashboard';
COMMENT ON TABLE public.user_backup_metadata IS 'Metadati dei backup utente per recovery';

COMMENT ON FUNCTION calculate_daily_statistics IS 'Calcola e aggiorna statistiche giornaliere utente';
COMMENT ON FUNCTION cleanup_old_data IS 'Pulizia automatica dati obsoleti per data retention';
COMMENT ON FUNCTION export_user_data IS 'Export completo dati utente per GDPR compliance';
COMMENT ON FUNCTION delete_user_data IS 'Eliminazione completa e sicura dati utente';

-- =====================================================
-- 10. STATISTICHE E MONITORING
-- =====================================================

-- Aggiorna statistiche per tutti gli utenti esistenti
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT DISTINCT user_id FROM public.transactions
  LOOP
    PERFORM calculate_daily_statistics(user_record.user_id);
  END LOOP;
END $$;

-- Log completamento migrazione
DO $$
BEGIN
  RAISE NOTICE 'MIGRAZIONE COMPLETATA: Database ottimizzato per long-term storage';
  RAISE NOTICE 'Indici creati: %', (
    SELECT COUNT(*) FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND indexname LIKE 'idx_%'
  );
  RAISE NOTICE 'Tabelle audit: %', (
    SELECT COUNT(*) FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('audit_log', 'user_statistics', 'user_backup_metadata')
  );
END $$; 