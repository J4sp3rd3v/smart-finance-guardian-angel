-- FIX AUDIT COMPLETO - Aggiunge colonne e crea trigger

-- 1. AGGIUNGI COLONNE MANCANTI ALLA TABELLA AUDIT_LOG
ALTER TABLE public.audit_log 
ADD COLUMN IF NOT EXISTS old_data JSONB,
ADD COLUMN IF NOT EXISTS new_data JSONB,
ADD COLUMN IF NOT EXISTS changed_fields TEXT[];

-- 2. ELIMINA TRIGGER E FUNZIONE ESISTENTI
DROP TRIGGER IF EXISTS transactions_audit_trigger ON public.transactions;
DROP FUNCTION IF EXISTS public.audit_trigger();

-- 3. CREA FUNZIONE AUDIT CORRETTA
CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
  old_record JSONB;
  new_record JSONB;
  changed_fields TEXT[] := '{}';
  user_id_value UUID;
BEGIN
  -- Determina user_id dalla riga
  IF NEW IS NOT NULL THEN
    user_id_value := NEW.user_id;
  ELSIF OLD IS NOT NULL THEN  
    user_id_value := OLD.user_id;
  ELSE
    user_id_value := NULL;
  END IF;

  -- Prepara i dati
  IF TG_OP = 'DELETE' THEN
    old_record := to_jsonb(OLD);
    new_record := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    old_record := NULL;
    new_record := to_jsonb(NEW);
  ELSE -- UPDATE
    old_record := to_jsonb(OLD);
    new_record := to_jsonb(NEW);
  END IF;

  -- Inserisci audit record
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
    old_record,
    new_record,
    changed_fields
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. CREA TRIGGER
CREATE TRIGGER transactions_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- 5. PERMESSI
GRANT EXECUTE ON FUNCTION public.audit_trigger() TO authenticated;

-- 6. TEST FINALE
DO $$
DECLARE
  test_user_id UUID;
  audit_count INTEGER;
BEGIN
  -- Test trigger audit
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    -- Inserisci transazione di test
    INSERT INTO public.transactions (user_id, category_id, amount, description, type, date)
    VALUES (
      test_user_id, 
      (SELECT id FROM public.categories LIMIT 1), 
      1.00, 
      'Test Audit Complete Fix', 
      'expense', 
      CURRENT_DATE
    );
    
    -- Verifica audit creato
    SELECT COUNT(*) INTO audit_count
    FROM public.audit_log
    WHERE table_name = 'transactions' 
    AND action = 'INSERT'
    AND created_at >= now() - INTERVAL '1 minute';
    
    RAISE NOTICE 'Test trigger audit: % record creati', audit_count;
  ELSE
    RAISE NOTICE 'Nessun utente trovato per test';
  END IF;
  
  RAISE NOTICE 'FIX AUDIT COMPLETO TERMINATO!';
  RAISE NOTICE 'Colonne aggiunte e trigger creato';
  RAISE NOTICE 'Audit trail dovrebbe funzionare ora';
END $$; 