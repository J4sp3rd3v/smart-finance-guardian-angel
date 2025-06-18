-- =====================================================
-- FIX FUNCTION CONFLICT - Risolve funzioni duplicate
-- Risolve errore "function is not unique"
-- =====================================================

-- 1️⃣ ELIMINA TUTTE LE VERSIONI DELLA FUNZIONE
DROP FUNCTION IF EXISTS public.calculate_daily_statistics(UUID);
DROP FUNCTION IF EXISTS public.calculate_daily_statistics(UUID, DATE);

-- 2️⃣ CREA UNA SOLA VERSIONE DEFINITIVA
CREATE OR REPLACE FUNCTION public.calculate_daily_statistics(
  target_user_id UUID, 
  target_date DATE DEFAULT CURRENT_DATE
)
RETURNS void AS $$
DECLARE
  income_total DECIMAL(15,2) := 0;
  expense_total DECIMAL(15,2) := 0;
  transaction_count INTEGER := 0;
  top_category TEXT := 'N/A';
  avg_daily DECIMAL(10,2) := 0;
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
  BEGIN
    SELECT c.name INTO top_category
    FROM public.transactions t
    JOIN public.categories c ON t.category_id = c.id
    WHERE t.user_id = target_user_id 
      AND t.type = 'expense'
      AND t.date >= target_date - INTERVAL '30 days'
    GROUP BY c.name
    ORDER BY SUM(t.amount) DESC
    LIMIT 1;
  EXCEPTION
    WHEN OTHERS THEN
      top_category := 'N/A';
  END;

  -- Calcola media spesa giornaliera ultimi 30 giorni
  BEGIN
    SELECT COALESCE(AVG(daily_expense), 0) INTO avg_daily
    FROM (
      SELECT date, SUM(amount) as daily_expense
      FROM public.transactions 
      WHERE user_id = target_user_id 
        AND type = 'expense'
        AND date >= target_date - INTERVAL '30 days'
      GROUP BY date
    ) daily_totals;
  EXCEPTION
    WHEN OTHERS THEN
      avg_daily := 0;
  END;

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

  RAISE NOTICE 'Statistiche aggiornate per utente %: % transazioni, Income: %, Expenses: %', 
    target_user_id, transaction_count, income_total, expense_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3️⃣ PERMESSI PER LA FUNZIONE UNIFICATA
GRANT EXECUTE ON FUNCTION public.calculate_daily_statistics(UUID, DATE) TO authenticated;

-- 4️⃣ TEST DELLA FUNZIONE (SENZA CONFLITTI)
DO $$
DECLARE
  test_user_id UUID;
BEGIN
  -- Prendi un utente esistente per test
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    -- Testa la funzione con parametro esplicito
    PERFORM public.calculate_daily_statistics(test_user_id, CURRENT_DATE);
    RAISE NOTICE '✅ Funzione calculate_daily_statistics testata con successo (con data)';
    
    -- Testa la funzione con parametro di default
    PERFORM public.calculate_daily_statistics(test_user_id);
    RAISE NOTICE '✅ Funzione calculate_daily_statistics testata con successo (data default)';
  ELSE
    RAISE NOTICE '⚠️  Nessun utente trovato per test, ma funzione creata correttamente';
  END IF;
  
  RAISE NOTICE '🎯 CONFLITTO FUNZIONI RISOLTO!';
  RAISE NOTICE '✅ Una sola funzione calculate_daily_statistics definita';
  RAISE NOTICE '✅ Supporta sia chiamata con 1 parametro che con 2 parametri';
  RAISE NOTICE '🚀 Riprova i test ora!';
END $$; 