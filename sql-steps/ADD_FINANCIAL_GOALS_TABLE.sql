-- AGGIUNTA TABELLA FINANCIAL GOALS - Per obiettivi finanziari intelligenti

-- 1. CREA TABELLA FINANCIAL_GOALS
CREATE TABLE IF NOT EXISTS public.financial_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  target_amount DECIMAL(15,2) NOT NULL CHECK (target_amount > 0),
  current_amount DECIMAL(15,2) DEFAULT 0 CHECK (current_amount >= 0),
  category VARCHAR(50) NOT NULL DEFAULT 'risparmio',
  priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  deadline DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Vincoli
  CONSTRAINT check_current_not_exceed_target CHECK (current_amount <= target_amount)
);

-- 2. CREA TABELLA SMART_SUGGESTIONS (CONSIGLI INTELLIGENTI)
CREATE TABLE IF NOT EXISTS public.smart_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('warning', 'tip', 'goal', 'achievement', 'budget')),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  action_text VARCHAR(100),
  priority INTEGER DEFAULT 1,
  is_read BOOLEAN DEFAULT FALSE,
  is_dismissed BOOLEAN DEFAULT FALSE,
  metadata JSONB, -- Per dati aggiuntivi come soglie, calcoli, etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE -- Alcuni consigli possono scadere
);

-- 3. CREA TABELLA SPENDING_INSIGHTS (ANALISI SPESE)
CREATE TABLE IF NOT EXISTS public.spending_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories ON DELETE SET NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL,
  transaction_count INTEGER NOT NULL DEFAULT 0,
  average_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  trend VARCHAR(10) NOT NULL CHECK (trend IN ('up', 'down', 'stable')),
  percentage_change DECIMAL(5,2) DEFAULT 0,
  recommendation TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Indice unico per evitare duplicati
  UNIQUE(user_id, category_id, period_start, period_end)
);

-- 4. INDICI PER PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_financial_goals_user_status 
ON public.financial_goals (user_id, status);

CREATE INDEX IF NOT EXISTS idx_financial_goals_user_deadline 
ON public.financial_goals (user_id, deadline);

CREATE INDEX IF NOT EXISTS idx_smart_suggestions_user_priority 
ON public.smart_suggestions (user_id, priority DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_smart_suggestions_user_unread 
ON public.smart_suggestions (user_id, is_read, is_dismissed);

CREATE INDEX IF NOT EXISTS idx_spending_insights_user_period 
ON public.spending_insights (user_id, period_start DESC, period_end DESC);

-- 5. RLS (ROW LEVEL SECURITY)
ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spending_insights ENABLE ROW LEVEL SECURITY;

-- Policy per financial_goals
CREATE POLICY "Users can manage their own financial goals" ON public.financial_goals
  FOR ALL USING (auth.uid() = user_id);

-- Policy per smart_suggestions
CREATE POLICY "Users can view their own suggestions" ON public.smart_suggestions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own suggestions" ON public.smart_suggestions
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy per spending_insights
CREATE POLICY "Users can view their own insights" ON public.spending_insights
  FOR SELECT USING (auth.uid() = user_id);

-- 6. TRIGGER PER AGGIORNAMENTO AUTOMATICO
CREATE OR REPLACE FUNCTION update_financial_goal_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Se l'obiettivo è completato, aggiorna lo status e la data
  IF NEW.current_amount >= NEW.target_amount AND OLD.status != 'completed' THEN
    NEW.status := 'completed';
    NEW.completed_at := now();
    
    -- Crea un suggerimento di congratulazioni
    INSERT INTO public.smart_suggestions (
      user_id, type, title, description, priority
    ) VALUES (
      NEW.user_id,
      'achievement',
      'Obiettivo Raggiunto! 🎉',
      'Complimenti! Hai completato l''obiettivo "' || NEW.title || '" raggiungendo €' || NEW.target_amount || '!',
      1
    );
  END IF;
  
  -- Aggiorna sempre updated_at
  NEW.updated_at := now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger per financial_goals
DROP TRIGGER IF EXISTS financial_goals_progress_trigger ON public.financial_goals;
CREATE TRIGGER financial_goals_progress_trigger
  BEFORE UPDATE ON public.financial_goals
  FOR EACH ROW EXECUTE FUNCTION update_financial_goal_progress();

-- 7. FUNZIONE PER GENERARE INSIGHTS AUTOMATICI
CREATE OR REPLACE FUNCTION generate_spending_insights(target_user_id UUID)
RETURNS void AS $$
DECLARE
  current_month_start DATE := date_trunc('month', CURRENT_DATE);
  last_month_start DATE := date_trunc('month', CURRENT_DATE - INTERVAL '1 month');
  last_month_end DATE := current_month_start - INTERVAL '1 day';
  category_record RECORD;
BEGIN
  -- Analizza spese per categoria nell'ultimo mese
  FOR category_record IN
    SELECT 
      c.id as category_id,
      c.name as category_name,
      COALESCE(SUM(t.amount), 0) as total_amount,
      COUNT(t.id) as transaction_count
    FROM public.categories c
    LEFT JOIN public.transactions t ON (
      c.id = t.category_id 
      AND t.user_id = target_user_id 
      AND t.type = 'expense'
      AND t.date >= last_month_start 
      AND t.date <= last_month_end
    )
    GROUP BY c.id, c.name
    HAVING COALESCE(SUM(t.amount), 0) > 0
  LOOP
    -- Calcola trend confrontando con mese precedente
    DECLARE
      prev_month_amount DECIMAL(15,2);
      percentage_change DECIMAL(5,2);
      trend_direction VARCHAR(10);
      recommendation TEXT;
    BEGIN
      -- Ottieni spesa mese precedente
      SELECT COALESCE(SUM(amount), 0) INTO prev_month_amount
      FROM public.transactions
      WHERE user_id = target_user_id
        AND category_id = category_record.category_id
        AND type = 'expense'
        AND date >= (last_month_start - INTERVAL '1 month')
        AND date < last_month_start;
      
      -- Calcola percentuale di cambiamento
      IF prev_month_amount > 0 THEN
        percentage_change := ((category_record.total_amount - prev_month_amount) / prev_month_amount) * 100;
      ELSE
        percentage_change := 100; -- Nuova spesa
      END IF;
      
      -- Determina trend
      IF percentage_change > 10 THEN
        trend_direction := 'up';
        recommendation := 'Spese in aumento per ' || category_record.category_name || '. Considera di impostare un budget mensile.';
      ELSIF percentage_change < -10 THEN
        trend_direction := 'down';
        recommendation := 'Ottimo! Stai riducendo le spese per ' || category_record.category_name || '.';
      ELSE
        trend_direction := 'stable';
        recommendation := 'Spese stabili per ' || category_record.category_name || '.';
      END IF;
      
      -- Inserisci o aggiorna insight
      INSERT INTO public.spending_insights (
        user_id, category_id, period_start, period_end,
        total_amount, transaction_count, 
        average_amount, trend, percentage_change, recommendation
      ) VALUES (
        target_user_id, category_record.category_id, 
        last_month_start, last_month_end,
        category_record.total_amount, category_record.transaction_count,
        CASE WHEN category_record.transaction_count > 0 
             THEN category_record.total_amount / category_record.transaction_count 
             ELSE 0 END,
        trend_direction, percentage_change, recommendation
      )
      ON CONFLICT (user_id, category_id, period_start, period_end)
      DO UPDATE SET
        total_amount = EXCLUDED.total_amount,
        transaction_count = EXCLUDED.transaction_count,
        average_amount = EXCLUDED.average_amount,
        trend = EXCLUDED.trend,
        percentage_change = EXCLUDED.percentage_change,
        recommendation = EXCLUDED.recommendation,
        created_at = now();
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. PERMESSI
GRANT EXECUTE ON FUNCTION update_financial_goal_progress() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_spending_insights(UUID) TO authenticated;

-- 9. DATI DI ESEMPIO (OPZIONALE)
DO $$
DECLARE
  test_user_id UUID;
BEGIN
  -- Prendi il primo utente per test
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    -- Inserisci obiettivo di esempio
    INSERT INTO public.financial_goals (
      user_id, title, description, target_amount, current_amount,
      category, priority, deadline
    ) VALUES (
      test_user_id,
      'Fondo Emergenza',
      'Costruire un fondo di emergenza per coprire 6 mesi di spese',
      5000.00,
      1200.00,
      'emergenza',
      'high',
      CURRENT_DATE + INTERVAL '12 months'
    ) ON CONFLICT DO NOTHING;
    
    -- Genera insights per l'utente
    PERFORM generate_spending_insights(test_user_id);
    
    RAISE NOTICE 'Dati di esempio creati per utente %', test_user_id;
  END IF;
END $$;

-- 10. VERIFICA FINALE
DO $$
BEGIN
  RAISE NOTICE 'TABELLE FINANCIAL ASSISTANT CREATE CON SUCCESSO!';
  RAISE NOTICE 'Tabelle aggiunte:';
  RAISE NOTICE '- financial_goals: per obiettivi finanziari';
  RAISE NOTICE '- smart_suggestions: per consigli intelligenti';
  RAISE NOTICE '- spending_insights: per analisi spese';
  RAISE NOTICE 'Funzioni create:';
  RAISE NOTICE '- update_financial_goal_progress(): aggiornamento automatico obiettivi';
  RAISE NOTICE '- generate_spending_insights(): generazione insights automatici';
  RAISE NOTICE 'Il sistema di assistente finanziario è pronto!';
END $$; 