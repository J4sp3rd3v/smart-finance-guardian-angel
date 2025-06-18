-- =====================================================
-- FIX ERRORI RIMANENTI - Completa i test mancanti
-- Esegui questo per risolvere gli ultimi errori
-- =====================================================

-- 1️⃣ FUNZIONE CALCOLO STATISTICHE COMPLETA
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
    expense_total, (income_total - expense_total), avg_daily, COALESCE(top_category, 'N/A')
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

  -- Log risultato per debug
  RAISE NOTICE 'Statistiche aggiornate per %: Transazioni %, Income %, Expenses %', 
    target_user_id, transaction_count, income_total, expense_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2️⃣ AUDIT TRAIL CON TRIGGER COMPLETO
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

-- 3️⃣ AGGIORNA TABELLA AUDIT LOG (aggiungi campi mancanti)
ALTER TABLE public.audit_log 
ADD COLUMN IF NOT EXISTS record_id UUID,
ADD COLUMN IF NOT EXISTS old_data JSONB,
ADD COLUMN IF NOT EXISTS new_data JSONB,
ADD COLUMN IF NOT EXISTS changed_fields TEXT[];

-- 4️⃣ TRIGGER PER TRANSACTIONS (sintassi corretta)
DROP TRIGGER IF EXISTS transactions_audit_trigger ON public.transactions;
CREATE TRIGGER transactions_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- 5️⃣ INDICE UNIQUE PER USER_STATISTICS (evita conflitti)
DROP INDEX IF EXISTS idx_user_statistics_user_date;
CREATE UNIQUE INDEX idx_user_statistics_user_date 
ON public.user_statistics (user_id, stat_date);

-- 6️⃣ PERMESSI AGGIORNATI
GRANT EXECUTE ON FUNCTION public.calculate_daily_statistics(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_daily_statistics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.audit_trigger() TO authenticated;

-- 7️⃣ TEST FINALE
DO $$
DECLARE
  test_user_id UUID;
BEGIN
  -- Prendi un utente esistente per test
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    -- Testa la funzione
    PERFORM public.calculate_daily_statistics(test_user_id);
    RAISE NOTICE '✅ Funzione calculate_daily_statistics testata con successo';
  ELSE
    RAISE NOTICE '⚠️  Nessun utente trovato per test, ma funzione creata';
  END IF;
  
  RAISE NOTICE '✅ Audit trail configurato con trigger';
  RAISE NOTICE '✅ Tutti i fix applicati - riprova i test!';
END $$; 