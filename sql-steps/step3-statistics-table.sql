-- =====================================================
-- STEP 3: TABELLA STATISTICHE CACHE
-- Copia e incolla questo nell'SQL Editor di Supabase
-- =====================================================

-- Crea tabella statistiche utente per cache performance
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

-- Policy per vedere solo le proprie statistiche
CREATE POLICY "Users can view own statistics" ON public.user_statistics
  FOR SELECT USING (auth.uid() = user_id);

-- Policy per inserire proprie statistiche
CREATE POLICY "Users can insert own statistics" ON public.user_statistics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy per aggiornare proprie statistiche
CREATE POLICY "Users can update own statistics" ON public.user_statistics
  FOR UPDATE USING (auth.uid() = user_id);

-- Log completamento
DO $$
BEGIN
  RAISE NOTICE 'STEP 3 COMPLETATO: Tabella user_statistics creata con RLS';
END $$; 