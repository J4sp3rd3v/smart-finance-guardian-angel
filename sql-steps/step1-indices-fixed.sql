-- =====================================================
-- STEP 1: INDICI PERFORMANCE (VERSIONE CORRETTA)
-- Copia e incolla questo nell'SQL Editor di Supabase
-- =====================================================

-- Indice principale: user + data (CRITICO per performance)
CREATE INDEX IF NOT EXISTS idx_transactions_user_date 
ON public.transactions (user_id, date DESC);

-- Indice per filtri per tipo
CREATE INDEX IF NOT EXISTS idx_transactions_user_type_date 
ON public.transactions (user_id, type, date DESC);

-- Indice per categorie  
CREATE INDEX IF NOT EXISTS idx_transactions_user_category_date 
ON public.transactions (user_id, category_id, date DESC);

-- Indice per transazioni ricorrenti attive
CREATE INDEX IF NOT EXISTS idx_recurring_user_active_next 
ON public.recurring_transactions (user_id, is_active, next_date);

-- Indice per profili
CREATE INDEX IF NOT EXISTS idx_profiles_email 
ON public.profiles (email);

-- Log completamento
DO $$
BEGIN
  RAISE NOTICE 'STEP 1 COMPLETATO: Indici performance creati con successo!';
END $$; 