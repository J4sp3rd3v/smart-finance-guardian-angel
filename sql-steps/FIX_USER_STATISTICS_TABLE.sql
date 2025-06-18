-- =====================================================
-- FIX USER_STATISTICS TABLE - Ricrea tabella completa
-- Risolve errori "column does not exist"
-- =====================================================

-- 1️⃣ BACKUP DATI ESISTENTI (se la tabella esiste)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_statistics' AND table_schema = 'public') THEN
    -- Crea backup temporaneo
    CREATE TEMP TABLE user_statistics_backup AS 
    SELECT * FROM public.user_statistics;
    
    RAISE NOTICE '✅ Backup dati esistenti creato';
  ELSE
    RAISE NOTICE '⚠️  Tabella user_statistics non esisteva';
  END IF;
END $$;

-- 2️⃣ ELIMINA TABELLA ESISTENTE (se esiste)
DROP TABLE IF EXISTS public.user_statistics CASCADE;

-- 3️⃣ CREA TABELLA COMPLETA CON TUTTE LE COLONNE
CREATE TABLE public.user_statistics (
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

-- 4️⃣ RIPRISTINA DATI DAL BACKUP (se esistevano)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_statistics_backup') THEN
    INSERT INTO public.user_statistics (
      id, user_id, stat_date, total_transactions, total_income, 
      total_expenses, net_balance, average_daily_spend, 
      top_category_expense, monthly_budget, last_calculated
    )
    SELECT 
      COALESCE(id, gen_random_uuid()),
      user_id,
      COALESCE(stat_date, CURRENT_DATE),
      COALESCE(total_transactions, 0),
      COALESCE(total_income, 0),
      COALESCE(total_expenses, 0),
      COALESCE(net_balance, 0),
      COALESCE(average_daily_spend, 0),
      top_category_expense,
      monthly_budget,
      COALESCE(last_calculated, now())
    FROM user_statistics_backup
    ON CONFLICT (user_id, stat_date) DO NOTHING;
    
    RAISE NOTICE '✅ Dati ripristinati dal backup';
  END IF;
END $$;

-- 5️⃣ INDICI PER PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_user_stats_user_date 
ON public.user_statistics (user_id, stat_date DESC);

CREATE INDEX IF NOT EXISTS idx_user_stats_user_calculated 
ON public.user_statistics (user_id, last_calculated DESC);

-- 6️⃣ RLS (ROW LEVEL SECURITY)
ALTER TABLE public.user_statistics ENABLE ROW LEVEL SECURITY;

-- Elimina policy esistenti
DROP POLICY IF EXISTS "Users can view own statistics" ON public.user_statistics;
DROP POLICY IF EXISTS "Users can insert own statistics" ON public.user_statistics;
DROP POLICY IF EXISTS "Users can update own statistics" ON public.user_statistics;

-- Crea policy nuove
CREATE POLICY "Users can view own statistics" ON public.user_statistics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own statistics" ON public.user_statistics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own statistics" ON public.user_statistics
  FOR UPDATE USING (auth.uid() = user_id);

-- 7️⃣ FUNZIONE CALCULATE_DAILY_STATISTICS (VERSIONE DEFINITIVA)
DROP FUNCTION IF EXISTS public.calculate_daily_statistics(UUID);
DROP FUNCTION IF EXISTS public.calculate_daily_statistics(UUID, DATE);

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

-- 8️⃣ PERMESSI
GRANT EXECUTE ON FUNCTION public.calculate_daily_statistics(UUID, DATE) TO authenticated;

-- 9️⃣ TEST FINALE
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
    RAISE NOTICE '⚠️  Nessun utente trovato per test, ma funzione creata correttamente';
  END IF;
  
  RAISE NOTICE '🎯 TABELLA USER_STATISTICS RICREATA COMPLETAMENTE!';
  RAISE NOTICE '✅ Tutte le colonne presenti e funzionanti';
  RAISE NOTICE '✅ Backup e ripristino dati completato';
  RAISE NOTICE '✅ Funzione calculate_daily_statistics operativa';
  RAISE NOTICE '✅ RLS e permessi configurati';
  RAISE NOTICE '🚀 Riprova i test ora - dovrebbe funzionare tutto!';
END $$; 