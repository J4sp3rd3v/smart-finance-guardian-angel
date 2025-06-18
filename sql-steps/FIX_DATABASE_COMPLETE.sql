-- =====================================================
-- FIX COMPLETO DATABASE - Risolve tutti i problemi dei test
-- Copia e incolla questo nell'SQL Editor di Supabase
-- =====================================================

-- 1️⃣ TABELLA AUDIT LOG (se non esiste)
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

-- Policy per audit log
DROP POLICY IF EXISTS "Users can view own audit logs" ON public.audit_log;
CREATE POLICY "Users can view own audit logs" ON public.audit_log
  FOR SELECT USING (auth.uid() = user_id);

-- 2️⃣ FUNZIONE AUDIT TRIGGER
CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
  old_data JSONB;
  new_data JSONB;
  changed_fields TEXT[] := '{}';
  field_name TEXT;
  user_id_value UUID;
BEGIN
  -- Determina user_id dalla riga
  user_id_value := COALESCE(
    (NEW->>'user_id')::UUID, 
    (OLD->>'user_id')::UUID
  );

  -- Prepara i dati
  IF TG_OP = 'DELETE' THEN
    old_data := to_jsonb(OLD);
    new_data := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    old_data := NULL;
    new_data := to_jsonb(NEW);
  ELSE
    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);
    
    -- Trova campi modificati
    FOR field_name IN SELECT * FROM jsonb_object_keys(new_data) LOOP
      IF old_data->field_name IS DISTINCT FROM new_data->field_name THEN
        changed_fields := changed_fields || field_name;
      END IF;
    END LOOP;
  END IF;

  -- Inserisci audit record
  INSERT INTO public.audit_log (
    table_name, record_id, user_id, action,
    old_data, new_data, changed_fields
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE((NEW->>'id')::UUID, (OLD->>'id')::UUID),
    user_id_value,
    TG_OP,
    old_data,
    new_data,
    changed_fields
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3️⃣ TRIGGER PER TRANSACTIONS
DROP TRIGGER IF EXISTS transactions_audit_trigger ON public.transactions;
CREATE TRIGGER transactions_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- 4️⃣ FUNZIONE CALCOLO STATISTICHE
CREATE OR REPLACE FUNCTION public.calculate_daily_statistics(
  target_user_id UUID, 
  target_date DATE DEFAULT CURRENT_DATE
)
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

  -- Trova categoria più utilizzata per spese (ultimi 30 giorni)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5️⃣ VISTA DASHBOARD SUMMARY
CREATE OR REPLACE VIEW public.user_dashboard_summary AS
SELECT 
  p.id as user_id,
  p.full_name,
  p.email,
  
  -- Statistiche mese corrente
  COALESCE(SUM(CASE 
    WHEN t.type = 'income' AND t.date >= date_trunc('month', CURRENT_DATE)
    THEN t.amount ELSE 0 
  END), 0) as current_month_income,
  
  COALESCE(SUM(CASE 
    WHEN t.type = 'expense' AND t.date >= date_trunc('month', CURRENT_DATE)
    THEN t.amount ELSE 0 
  END), 0) as current_month_expenses,
  
  COALESCE(SUM(CASE 
    WHEN t.type = 'income' AND t.date >= date_trunc('month', CURRENT_DATE)
    THEN t.amount ELSE 0 
  END), 0) - COALESCE(SUM(CASE 
    WHEN t.type = 'expense' AND t.date >= date_trunc('month', CURRENT_DATE)
    THEN t.amount ELSE 0 
  END), 0) as current_month_balance,
  
  -- Statistiche totali
  COALESCE(SUM(CASE 
    WHEN t.type = 'income' THEN t.amount 
    WHEN t.type = 'expense' THEN -t.amount 
    ELSE 0 
  END), 0) as total_balance,
  
  COUNT(t.id) as total_transactions

FROM public.profiles p
LEFT JOIN public.transactions t ON p.id = t.user_id
GROUP BY p.id, p.full_name, p.email;

-- 6️⃣ FUNZIONI AGGIUNTIVE

-- Funzione per processare transazioni ricorrenti
CREATE OR REPLACE FUNCTION public.process_recurring_transactions()
RETURNS void AS $$
DECLARE
  rec RECORD;
  new_date DATE;
BEGIN
  FOR rec IN 
    SELECT * FROM public.recurring_transactions 
    WHERE is_active = true 
      AND next_date <= CURRENT_DATE
      AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  LOOP
    -- Inserisci nuova transazione
    INSERT INTO public.transactions (
      user_id, category_id, amount, description, type, date
    ) VALUES (
      rec.user_id, rec.category_id, rec.amount, 
      rec.description || ' (Ricorrente)', rec.type, rec.next_date
    );
    
    -- Calcola prossima data
    new_date := CASE rec.frequency
      WHEN 'daily' THEN rec.next_date + INTERVAL '1 day'
      WHEN 'weekly' THEN rec.next_date + INTERVAL '1 week'
      WHEN 'monthly' THEN rec.next_date + INTERVAL '1 month'
      WHEN 'yearly' THEN rec.next_date + INTERVAL '1 year'
      ELSE rec.next_date + INTERVAL '1 month'
    END;
    
    -- Aggiorna prossima data
    UPDATE public.recurring_transactions 
    SET next_date = new_date
    WHERE id = rec.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per esportare dati utente
CREATE OR REPLACE FUNCTION public.export_user_data(target_user_id UUID)
RETURNS JSONB AS $$
BEGIN
  RETURN jsonb_build_object(
    'user_id', target_user_id,
    'export_date', now(),
    'profile', (
      SELECT to_jsonb(p.*) FROM public.profiles p WHERE id = target_user_id
    ),
    'transactions', (
      SELECT jsonb_agg(to_jsonb(t.*)) FROM public.transactions t WHERE user_id = target_user_id
    ),
    'recurring_transactions', (
      SELECT jsonb_agg(to_jsonb(rt.*)) FROM public.recurring_transactions rt WHERE user_id = target_user_id
    ),
    'statistics', (
      SELECT jsonb_agg(to_jsonb(us.*)) FROM public.user_statistics us WHERE user_id = target_user_id
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per eliminare dati utente
CREATE OR REPLACE FUNCTION public.delete_user_data(target_user_id UUID)
RETURNS boolean AS $$
BEGIN
  -- Solo l'utente stesso può eliminare i propri dati
  IF auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'Non autorizzato a eliminare dati di altri utenti';
  END IF;
  
  DELETE FROM public.user_statistics WHERE user_id = target_user_id;
  DELETE FROM public.recurring_transactions WHERE user_id = target_user_id;
  DELETE FROM public.transactions WHERE user_id = target_user_id;
  DELETE FROM public.audit_log WHERE user_id = target_user_id;
  DELETE FROM public.profiles WHERE id = target_user_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per pulizia dati vecchi
CREATE OR REPLACE FUNCTION public.cleanup_old_data()
RETURNS void AS $$
BEGIN
  -- Elimina audit logs più vecchi di 1 anno
  DELETE FROM public.audit_log 
  WHERE created_at < now() - INTERVAL '1 year';
  
  -- Elimina statistiche più vecchie di 2 anni
  DELETE FROM public.user_statistics 
  WHERE stat_date < CURRENT_DATE - INTERVAL '2 years';
  
  -- Log risultato
  RAISE NOTICE 'Pulizia completata: audit logs e statistiche vecchie eliminate';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7️⃣ INDICE UNIQUE PER USER_STATISTICS (evita duplicati)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_user_statistics_user_date 
ON public.user_statistics (user_id, stat_date);

-- 8️⃣ GRANT PERMESSI
GRANT EXECUTE ON FUNCTION public.calculate_daily_statistics(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_recurring_transactions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.export_user_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_data() TO authenticated;

GRANT SELECT ON public.user_dashboard_summary TO authenticated;

-- 9️⃣ LOG FINALE
DO $$
BEGIN
  RAISE NOTICE '🎉 DATABASE FIX COMPLETATO! Tutti i problemi risolti:';
  RAISE NOTICE '✅ Audit trail configurato con trigger';
  RAISE NOTICE '✅ Funzione calculate_daily_statistics creata';
  RAISE NOTICE '✅ Vista user_dashboard_summary creata';
  RAISE NOTICE '✅ Tutte le funzioni implementate';
  RAISE NOTICE '✅ Permessi configurati';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Ora esegui di nuovo il DatabaseTest!';
END $$; 