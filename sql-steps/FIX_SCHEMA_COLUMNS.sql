-- =====================================================
-- FIX SCHEMA COLUMNS - Risolve colonne mancanti
-- Esegui questo se vedi errori "column does not exist"
-- =====================================================

-- 1️⃣ VERIFICA E AGGIORNA TABELLA USER_STATISTICS
DO $$
BEGIN
  -- Aggiungi colonna stat_date se non esiste
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_statistics' 
    AND column_name = 'stat_date'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.user_statistics 
    ADD COLUMN stat_date DATE NOT NULL DEFAULT CURRENT_DATE;
    RAISE NOTICE '✅ Colonna stat_date aggiunta a user_statistics';
  ELSE
    RAISE NOTICE '✅ Colonna stat_date già presente';
  END IF;

  -- Aggiungi colonna average_daily_spend se non esiste
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_statistics' 
    AND column_name = 'average_daily_spend'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.user_statistics 
    ADD COLUMN average_daily_spend DECIMAL(10,2) DEFAULT 0;
    RAISE NOTICE '✅ Colonna average_daily_spend aggiunta';
  ELSE
    RAISE NOTICE '✅ Colonna average_daily_spend già presente';
  END IF;

  -- Aggiungi colonna top_category_expense se non esiste
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_statistics' 
    AND column_name = 'top_category_expense'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.user_statistics 
    ADD COLUMN top_category_expense TEXT;
    RAISE NOTICE '✅ Colonna top_category_expense aggiunta';
  ELSE
    RAISE NOTICE '✅ Colonna top_category_expense già presente';
  END IF;

  -- Aggiungi colonna last_calculated se non esiste
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_statistics' 
    AND column_name = 'last_calculated'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.user_statistics 
    ADD COLUMN last_calculated TIMESTAMP WITH TIME ZONE DEFAULT now();
    RAISE NOTICE '✅ Colonna last_calculated aggiunta';
  ELSE
    RAISE NOTICE '✅ Colonna last_calculated già presente';
  END IF;
END $$;

-- 2️⃣ CREA INDICE UNIQUE SE NON ESISTE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'user_statistics_user_stat_date_key'
    AND tablename = 'user_statistics'
  ) THEN
    CREATE UNIQUE INDEX user_statistics_user_stat_date_key 
    ON public.user_statistics (user_id, stat_date);
    RAISE NOTICE '✅ Indice unique (user_id, stat_date) creato';
  ELSE
    RAISE NOTICE '✅ Indice unique già presente';
  END IF;
END $$;

-- 3️⃣ FUNZIONE CALCOLO STATISTICHE (VERSIONE SICURA)
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

-- 4️⃣ PERMESSI
GRANT EXECUTE ON FUNCTION public.calculate_daily_statistics(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_daily_statistics(UUID) TO authenticated;

-- 5️⃣ TEST FINALE
DO $$
BEGIN
  RAISE NOTICE '🎯 SCHEMA FIX COMPLETATO!';
  RAISE NOTICE '✅ Tutte le colonne verificate/create';
  RAISE NOTICE '✅ Funzione calculate_daily_statistics aggiornata';
  RAISE NOTICE '✅ Indici creati';
  RAISE NOTICE '🚀 Riprova i test ora!';
END $$; 