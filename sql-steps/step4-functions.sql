-- =====================================================
-- STEP 4: FUNZIONI ESSENZIALI
-- Copia e incolla questo nell'SQL Editor di Supabase
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

  -- Log risultato
  RAISE NOTICE 'Statistiche aggiornate per utente %: Income %, Expenses %, Balance %', 
    target_user_id, income_total, expense_total, (income_total - expense_total);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log completamento
DO $$
BEGIN
  RAISE NOTICE 'STEP 4 COMPLETATO: Funzione calculate_daily_statistics creata!';
END $$; 