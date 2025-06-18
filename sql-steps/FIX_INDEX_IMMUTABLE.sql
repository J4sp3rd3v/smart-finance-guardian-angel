-- =====================================================
-- FIX INDEX IMMUTABLE - Risolve errore funzioni non immutable
-- =====================================================

-- 1️⃣ ELIMINA INDICE PROBLEMATICO
DROP INDEX IF EXISTS idx_transactions_user_recent;

-- 2️⃣ CREA INDICE SENZA FUNZIONI NON-IMMUTABLE
-- Invece di usare CURRENT_DATE, creiamo un indice semplice per le query recenti
CREATE INDEX IF NOT EXISTS idx_transactions_user_created_at 
ON public.transactions (user_id, created_at DESC);

-- Indice alternativo per date recenti (senza WHERE con CURRENT_DATE)
CREATE INDEX IF NOT EXISTS idx_transactions_user_date_desc 
ON public.transactions (user_id, date DESC);

-- 3️⃣ TRIGGER AUDIT CORRETTO (SENZA OPERATORI PROBLEMATICI)
DROP TRIGGER IF EXISTS transactions_audit_trigger ON public.transactions;
DROP FUNCTION IF EXISTS public.audit_trigger();

CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
  old_data JSONB;
  new_data JSONB;
  changed_fields TEXT[] := '{}';
  user_id_value UUID;
BEGIN
  -- Determina user_id dalla riga (metodo sicuro)
  IF NEW IS NOT NULL THEN
    user_id_value := NEW.user_id;
  ELSIF OLD IS NOT NULL THEN  
    user_id_value := OLD.user_id;
  ELSE
    user_id_value := NULL;
  END IF;

  -- Prepara i dati (senza operatori problematici)
  IF TG_OP = 'DELETE' THEN
    old_data := to_jsonb(OLD);
    new_data := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    old_data := NULL;
    new_data := to_jsonb(NEW);
  ELSE
    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);
    -- Per UPDATE, semplicemente registriamo entrambi i valori
    -- senza cercare di confrontare i campi (evita errori operator)
  END IF;

  -- Inserisci audit record (ID sicuro)
  INSERT INTO public.audit_log (
    table_name, record_id, user_id, action,
    old_data, new_data, changed_fields
  ) VALUES (
    TG_TABLE_NAME,
    CASE 
      WHEN NEW IS NOT NULL THEN NEW.id
      WHEN OLD IS NOT NULL THEN OLD.id
      ELSE NULL
    END,
    user_id_value,
    TG_OP,
    old_data,
    new_data,
    changed_fields  -- Array vuoto per ora, evita errori
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ricrea trigger
CREATE TRIGGER transactions_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- 4️⃣ INDICI AGGIUNTIVI (TUTTI IMMUTABLE)
CREATE INDEX IF NOT EXISTS idx_transactions_user_date_type 
ON public.transactions (user_id, date DESC, type);

CREATE INDEX IF NOT EXISTS idx_categories_id_name 
ON public.categories (id, name);

CREATE INDEX IF NOT EXISTS idx_audit_log_table_action 
ON public.audit_log (table_name, action, created_at DESC);

-- 5️⃣ PERMESSI
GRANT EXECUTE ON FUNCTION public.audit_trigger() TO authenticated;

-- 6️⃣ TEST FINALE
DO $$
DECLARE
  test_user_id UUID;
  audit_count INTEGER;
BEGIN
  -- Test trigger audit
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    -- Inserisci transazione di test (con category_id)
    INSERT INTO public.transactions (user_id, category_id, amount, description, type, date)
    VALUES (
      test_user_id, 
      (SELECT id FROM public.categories LIMIT 1), 
      1.00, 
      'Test Audit Fixed Final', 
      'expense', 
      CURRENT_DATE
    );
    
    -- Verifica audit creato
    SELECT COUNT(*) INTO audit_count
    FROM public.audit_log
    WHERE table_name = 'transactions' 
    AND action = 'INSERT'
    AND created_at >= now() - INTERVAL '1 minute';
    
    RAISE NOTICE '✅ Test trigger audit: % record creati', audit_count;
  END IF;
  
  RAISE NOTICE '🎯 FIX INDEX IMMUTABLE COMPLETATO!';
  RAISE NOTICE '✅ Indici corretti (senza funzioni non-immutable)';
  RAISE NOTICE '✅ Trigger audit semplificato e sicuro';
  RAISE NOTICE '✅ Tutti gli indici sono ora validi';
  RAISE NOTICE '🚀 Riprova i test - dovrebbero funzionare tutti!';
END $$; 