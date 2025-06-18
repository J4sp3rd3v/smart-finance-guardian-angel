-- FIX AUDIT TABLE STRUCTURE - Aggiunge colonne mancanti

-- 1. VERIFICA STRUTTURA ATTUALE
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'audit_log'
ORDER BY ordinal_position;

-- 2. AGGIUNGI COLONNE MANCANTI (SE NON ESISTONO)
ALTER TABLE public.audit_log 
ADD COLUMN IF NOT EXISTS old_data JSONB,
ADD COLUMN IF NOT EXISTS new_data JSONB,
ADD COLUMN IF NOT EXISTS changed_fields TEXT[];

-- 3. VERIFICA COLONNE AGGIUNTE
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'audit_log' 
    AND column_name = 'old_data'
  ) THEN
    RAISE NOTICE 'Colonna old_data: PRESENTE';
  ELSE
    RAISE NOTICE 'Colonna old_data: MANCANTE';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'audit_log' 
    AND column_name = 'new_data'
  ) THEN
    RAISE NOTICE 'Colonna new_data: PRESENTE';
  ELSE
    RAISE NOTICE 'Colonna new_data: MANCANTE';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'audit_log' 
    AND column_name = 'changed_fields'
  ) THEN
    RAISE NOTICE 'Colonna changed_fields: PRESENTE';
  ELSE
    RAISE NOTICE 'Colonna changed_fields: MANCANTE';
  END IF;
END $$;

-- 4. MOSTRA STRUTTURA FINALE
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'audit_log'
ORDER BY ordinal_position; 