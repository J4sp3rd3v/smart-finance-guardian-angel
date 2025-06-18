-- =====================================================
-- STEP 1: INDICI PERFORMANCE (VERSIONE SICURA)
-- Copia e incolla questo nell'SQL Editor di Supabase
-- =====================================================

-- Indice principale: user + data (CRITICO per performance)
-- Solo se la tabella transactions esiste
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transactions') THEN
    CREATE INDEX IF NOT EXISTS idx_transactions_user_date 
    ON public.transactions (user_id, date DESC);
    RAISE NOTICE 'Indice transactions_user_date creato';
  ELSE
    RAISE NOTICE 'Tabella transactions non trovata, saltando indice';
  END IF;
END $$;

-- Indice per filtri per tipo
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transactions') THEN
    CREATE INDEX IF NOT EXISTS idx_transactions_user_type_date 
    ON public.transactions (user_id, type, date DESC);
    RAISE NOTICE 'Indice transactions_user_type_date creato';
  END IF;
END $$;

-- Indice per categorie  
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transactions') THEN
    CREATE INDEX IF NOT EXISTS idx_transactions_user_category_date 
    ON public.transactions (user_id, category_id, date DESC);
    RAISE NOTICE 'Indice transactions_user_category_date creato';
  END IF;
END $$;

-- Indice per transazioni ricorrenti (SOLO se la tabella esiste)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recurring_transactions') THEN
    CREATE INDEX IF NOT EXISTS idx_recurring_user_active_next 
    ON public.recurring_transactions (user_id, is_active, next_date);
    RAISE NOTICE 'Indice recurring_transactions creato';
  ELSE
    RAISE NOTICE 'Tabella recurring_transactions non trovata, saltando indice';
  END IF;
END $$;

-- Indice per profili
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_email 
    ON public.profiles (email);
    RAISE NOTICE 'Indice profiles_email creato';
  ELSE
    RAISE NOTICE 'Tabella profiles non trovata, saltando indice';
  END IF;
END $$;

-- Verifica finale delle tabelle esistenti
DO $$
BEGIN
  RAISE NOTICE 'STEP 1 COMPLETATO! Verifica tabelle esistenti:';
  RAISE NOTICE 'transactions: %', CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transactions') THEN 'EXISTS' ELSE 'MISSING' END;
  RAISE NOTICE 'recurring_transactions: %', CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recurring_transactions') THEN 'EXISTS' ELSE 'MISSING' END;
  RAISE NOTICE 'profiles: %', CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN 'EXISTS' ELSE 'MISSING' END;
  RAISE NOTICE 'categories: %', CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'categories') THEN 'EXISTS' ELSE 'MISSING' END;
END $$; 