-- Creazione tabella recurring_transactions per gestire pagamenti ricorrenti
-- Mutui, stipendi, bollette, abbonamenti, ecc.

-- Elimina la tabella se esiste (per ricreazione pulita)
DROP TABLE IF EXISTS recurring_transactions CASCADE;

-- Crea la tabella recurring_transactions
CREATE TABLE recurring_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
    start_date DATE NOT NULL,
    end_date DATE NULL,
    next_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indici per performance
CREATE INDEX idx_recurring_transactions_user_id ON recurring_transactions(user_id);
CREATE INDEX idx_recurring_transactions_next_date ON recurring_transactions(next_date);
CREATE INDEX idx_recurring_transactions_is_active ON recurring_transactions(is_active);
CREATE INDEX idx_recurring_transactions_type ON recurring_transactions(type);
CREATE INDEX idx_recurring_transactions_frequency ON recurring_transactions(frequency);

-- Trigger per aggiornare updated_at
CREATE OR REPLACE FUNCTION update_recurring_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_recurring_transactions_updated_at
    BEFORE UPDATE ON recurring_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_recurring_transactions_updated_at();

-- RLS (Row Level Security) per la sicurezza
ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;

-- Policy per permettere agli utenti di vedere solo le proprie transazioni ricorrenti
CREATE POLICY "Users can view own recurring transactions" ON recurring_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- Policy per permettere agli utenti di inserire le proprie transazioni ricorrenti
CREATE POLICY "Users can insert own recurring transactions" ON recurring_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy per permettere agli utenti di aggiornare le proprie transazioni ricorrenti
CREATE POLICY "Users can update own recurring transactions" ON recurring_transactions
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy per permettere agli utenti di eliminare le proprie transazioni ricorrenti
CREATE POLICY "Users can delete own recurring transactions" ON recurring_transactions
    FOR DELETE USING (auth.uid() = user_id);

-- Funzione per calcolare la prossima data di pagamento
CREATE OR REPLACE FUNCTION calculate_next_payment_date(
    current_date DATE,
    frequency TEXT
) RETURNS DATE AS $$
BEGIN
    CASE frequency
        WHEN 'daily' THEN
            RETURN current_date + INTERVAL '1 day';
        WHEN 'weekly' THEN
            RETURN current_date + INTERVAL '1 week';
        WHEN 'monthly' THEN
            RETURN current_date + INTERVAL '1 month';
        WHEN 'yearly' THEN
            RETURN current_date + INTERVAL '1 year';
        ELSE
            RETURN current_date + INTERVAL '1 month'; -- Default mensile
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Funzione per processare i pagamenti ricorrenti scaduti
CREATE OR REPLACE FUNCTION process_recurring_payments()
RETURNS TABLE(processed_count INTEGER) AS $$
DECLARE
    rec RECORD;
    new_transaction_id UUID;
    count_processed INTEGER := 0;
BEGIN
    -- Trova tutte le transazioni ricorrenti attive che sono scadute
    FOR rec IN 
        SELECT * FROM recurring_transactions 
        WHERE is_active = true 
        AND next_date <= CURRENT_DATE
        AND (end_date IS NULL OR next_date <= end_date)
    LOOP
        -- Crea una nuova transazione normale
        INSERT INTO transactions (
            user_id, 
            amount, 
            description, 
            category_id, 
            type, 
            date,
            created_at
        ) VALUES (
            rec.user_id,
            rec.amount,
            rec.description || ' (Ricorrente)',
            rec.category_id,
            rec.type,
            rec.next_date,
            NOW()
        ) RETURNING id INTO new_transaction_id;
        
        -- Aggiorna la data del prossimo pagamento
        UPDATE recurring_transactions 
        SET 
            next_date = calculate_next_payment_date(next_date, frequency),
            updated_at = NOW()
        WHERE id = rec.id;
        
        -- Se abbiamo superato la data di fine, disattiva la transazione ricorrente
        IF rec.end_date IS NOT NULL AND calculate_next_payment_date(rec.next_date, rec.frequency) > rec.end_date THEN
            UPDATE recurring_transactions 
            SET 
                is_active = false,
                updated_at = NOW()
            WHERE id = rec.id;
        END IF;
        
        count_processed := count_processed + 1;
    END LOOP;
    
    RETURN QUERY SELECT count_processed;
END;
$$ LANGUAGE plpgsql;

-- Commenti per documentazione
COMMENT ON TABLE recurring_transactions IS 'Tabella per gestire pagamenti ricorrenti come mutui, stipendi, bollette';
COMMENT ON COLUMN recurring_transactions.frequency IS 'Frequenza: daily, weekly, monthly, yearly';
COMMENT ON COLUMN recurring_transactions.next_date IS 'Prossima data di esecuzione del pagamento';
COMMENT ON COLUMN recurring_transactions.end_date IS 'Data di fine (opzionale) - per mutui, finanziamenti a termine';
COMMENT ON FUNCTION process_recurring_payments() IS 'Funzione per processare automaticamente i pagamenti ricorrenti scaduti';

-- Dati di esempio per test (opzionale)
-- INSERT INTO recurring_transactions (user_id, amount, description, category_id, type, frequency, start_date, next_date)
-- SELECT 
--     auth.uid(),
--     1200.00,
--     'Mutuo casa',
--     (SELECT id FROM categories WHERE name = 'Casa' AND type = 'expense' LIMIT 1),
--     'expense',
--     'monthly',
--     CURRENT_DATE,
--     CURRENT_DATE + INTERVAL '1 month'
-- WHERE auth.uid() IS NOT NULL;

COMMIT; 