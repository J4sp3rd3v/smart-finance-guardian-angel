-- =====================================================
-- STEP 2: CREA TABELLE MANCANTI (VERSIONE SICURA)
-- Copia e incolla questo nell'SQL Editor di Supabase
-- =====================================================

-- Tabella transazioni (FONDAMENTALE)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    description TEXT NOT NULL,
    category_id UUID REFERENCES public.categories(id),
    type VARCHAR(10) CHECK (type IN ('income', 'expense')) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella transazioni ricorrenti
CREATE TABLE IF NOT EXISTS public.recurring_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    description TEXT NOT NULL,
    category_id UUID REFERENCES public.categories(id),
    type VARCHAR(10) CHECK (type IN ('income', 'expense')) NOT NULL,
    frequency VARCHAR(20) CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')) NOT NULL,
    next_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella statistiche utente (cache performance)
CREATE TABLE IF NOT EXISTS public.user_statistics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    total_income DECIMAL(12,2) DEFAULT 0,
    total_expenses DECIMAL(12,2) DEFAULT 0,
    transaction_count INTEGER DEFAULT 0,
    last_transaction_date DATE,
    monthly_avg_income DECIMAL(12,2) DEFAULT 0,
    monthly_avg_expenses DECIMAL(12,2) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella log audit (tracking modifiche)
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(10) CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Abilita RLS (Row Level Security) se non già abilitato
DO $$
BEGIN
  -- Abilita RLS per tutte le tabelle
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'transactions' AND relrowsecurity = true) THEN
    ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS abilitato per transactions';
  ELSE
    RAISE NOTICE 'RLS già abilitato per transactions';
  END IF;
  
  ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.user_statistics ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
END $$;

-- Policy per transactions (con controllo esistenza)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'transactions' AND policyname = 'Users can manage their own transactions') THEN
    EXECUTE 'CREATE POLICY "Users can manage their own transactions" ON public.transactions FOR ALL USING (auth.uid() = user_id)';
    RAISE NOTICE 'Policy transactions creata';
  ELSE
    RAISE NOTICE 'Policy transactions già esistente';
  END IF;
END $$;

-- Policy per recurring_transactions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'recurring_transactions' AND policyname = 'Users can manage their own recurring transactions') THEN
    EXECUTE 'CREATE POLICY "Users can manage their own recurring transactions" ON public.recurring_transactions FOR ALL USING (auth.uid() = user_id)';
    RAISE NOTICE 'Policy recurring_transactions creata';
  ELSE
    RAISE NOTICE 'Policy recurring_transactions già esistente';
  END IF;
END $$;

-- Policy per user_statistics
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_statistics' AND policyname = 'Users can view their own statistics') THEN
    EXECUTE 'CREATE POLICY "Users can view their own statistics" ON public.user_statistics FOR ALL USING (auth.uid() = user_id)';
    RAISE NOTICE 'Policy user_statistics creata';
  ELSE
    RAISE NOTICE 'Policy user_statistics già esistente';
  END IF;
END $$;

-- Policy per audit_log
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'audit_log' AND policyname = 'Users can view their own audit log') THEN
    EXECUTE 'CREATE POLICY "Users can view their own audit log" ON public.audit_log FOR SELECT USING (auth.uid() = user_id)';
    RAISE NOTICE 'Policy audit_log creata';
  ELSE
    RAISE NOTICE 'Policy audit_log già esistente';
  END IF;
END $$;

-- Indici performance CRITICI
CREATE INDEX IF NOT EXISTS idx_transactions_user_date 
ON public.transactions (user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_user_type_date 
ON public.transactions (user_id, type, date DESC);

CREATE INDEX IF NOT EXISTS idx_recurring_user_active_next 
ON public.recurring_transactions (user_id, is_active, next_date);

CREATE INDEX IF NOT EXISTS idx_audit_user_table_date 
ON public.audit_log (user_id, table_name, created_at DESC);

-- Trigger per aggiornamento timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crea trigger solo se non esistono
DROP TRIGGER IF EXISTS update_transactions_updated_at ON public.transactions;
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_recurring_transactions_updated_at ON public.recurring_transactions;
CREATE TRIGGER update_recurring_transactions_updated_at BEFORE UPDATE ON public.recurring_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_statistics_updated_at ON public.user_statistics;
CREATE TRIGGER update_user_statistics_updated_at BEFORE UPDATE ON public.user_statistics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verifica finale
DO $$
BEGIN
  RAISE NOTICE 'STEP 2 COMPLETATO! Verifica tabelle:';
  RAISE NOTICE '✅ transactions: %', CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transactions') THEN 'OK' ELSE 'ERRORE' END;
  RAISE NOTICE '✅ recurring_transactions: %', CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recurring_transactions') THEN 'OK' ELSE 'ERRORE' END;
  RAISE NOTICE '✅ user_statistics: %', CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_statistics') THEN 'OK' ELSE 'ERRORE' END;
  RAISE NOTICE '✅ audit_log: %', CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_log') THEN 'OK' ELSE 'ERRORE' END;
  
  RAISE NOTICE 'Indici creati: %', (SELECT count(*) FROM pg_indexes WHERE schemaname = 'public' AND tablename IN ('transactions', 'recurring_transactions', 'audit_log'));
END $$; 