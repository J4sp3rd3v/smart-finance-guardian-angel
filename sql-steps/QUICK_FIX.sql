-- =====================================================
-- QUICK FIX - Solo le funzioni essenziali per i test
-- Esegui questo se hai fretta (2 minuti)
-- =====================================================

-- Tabella audit log
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Funzione calcolo statistiche
CREATE OR REPLACE FUNCTION public.calculate_daily_statistics(
  target_user_id UUID, 
  target_date DATE DEFAULT CURRENT_DATE
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.user_statistics (
    user_id, stat_date, total_transactions, total_income, 
    total_expenses, net_balance
  ) 
  SELECT 
    target_user_id, 
    target_date,
    COUNT(*),
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0)
  FROM public.transactions 
  WHERE user_id = target_user_id AND date = target_date
  ON CONFLICT (user_id, stat_date) DO UPDATE SET
    total_transactions = EXCLUDED.total_transactions,
    total_income = EXCLUDED.total_income,
    total_expenses = EXCLUDED.total_expenses,
    net_balance = EXCLUDED.net_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vista dashboard
CREATE OR REPLACE VIEW public.user_dashboard_summary AS
SELECT 
  p.id as user_id,
  p.full_name,
  COUNT(t.id) as total_transactions,
  COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) as total_income,
  COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as total_expenses
FROM public.profiles p
LEFT JOIN public.transactions t ON p.id = t.user_id
GROUP BY p.id, p.full_name;

-- Permessi
GRANT EXECUTE ON FUNCTION public.calculate_daily_statistics(UUID, DATE) TO authenticated;
GRANT SELECT ON public.user_dashboard_summary TO authenticated;

-- Trigger audit semplice  
CREATE OR REPLACE FUNCTION public.simple_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_log (table_name, record_id, user_id, action, new_data)
  VALUES (TG_TABLE_NAME, NEW.id, NEW.user_id, TG_OP, to_jsonb(NEW));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS transactions_audit_trigger ON public.transactions;
CREATE TRIGGER transactions_audit_trigger
  AFTER INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.simple_audit_trigger();

SELECT '✅ QUICK FIX COMPLETATO! Testa ora.' as status; 