# 🛡️ Verifica Configurazione Supabase

Questo documento ti guida per verificare che Supabase sia configurato correttamente per l'applicazione Smart Finance Guardian Angel.

## 📋 Checklist Rapida

### ✅ 1. Configurazione Base
- [ ] URL Supabase configurato: `https://rbecyujvzfaxldmijbgp.supabase.co`
- [ ] Chiave pubblica configurata
- [ ] Client Supabase inizializzato correttamente
- [ ] TypeScript types generati

### ✅ 2. Database Schema
- [ ] Tabella `profiles` creata
- [ ] Tabella `transactions` creata
- [ ] Tabella `categories` creata
- [ ] Tabella `recurring_transactions` creata
- [ ] Tabella `audit_log` creata
- [ ] Tabella `user_statistics` creata
- [ ] Tabella `user_backup_metadata` creata

### ✅ 3. Funzioni Database
- [ ] Funzione `calculate_daily_statistics` implementata
- [ ] Funzione `process_recurring_transactions` implementata
- [ ] Funzione `export_user_data` implementata
- [ ] Funzione `delete_user_data` implementata
- [ ] Funzione `cleanup_old_data` implementata

### ✅ 4. Sicurezza (RLS)
- [ ] Row Level Security abilitato
- [ ] Policy per `transactions` configurate
- [ ] Policy per `profiles` configurate
- [ ] Policy per `categories` configurate
- [ ] Policy per `recurring_transactions` configurate

## 🧪 Test Automatici

### Metodo 1: DatabaseTest Component
1. **Accedi all'app** e fai login
2. **Vai al Dashboard** 
3. **Clicca "Test DB"** in alto a destra
4. **Clicca "Esegui Test Completo"**

I test verificheranno:
- ✅ Connessione database
- ✅ Tabelle esistenti
- ✅ Inserimento dati
- ✅ Audit trail
- ✅ Calcolo statistiche
- ✅ Performance query
- ✅ Funzioni backup/export

### Metodo 2: Test Manuale

#### Test 1: Connessione Base
```javascript
// Apri la console del browser (F12) e esegui:
import { supabase } from '@/integrations/supabase/client';

// Test connessione
const { data, error } = await supabase.from('profiles').select('id').limit(1);
console.log('Connessione:', error ? 'ERRORE' : 'OK', error || data);
```

#### Test 2: Autenticazione
```javascript
// Verifica utente corrente
const { data: { user } } = await supabase.auth.getUser();
console.log('Utente autenticato:', user ? 'SÌ' : 'NO', user?.email);
```

#### Test 3: Operazioni CRUD
```javascript
// Test inserimento transazione
const { data, error } = await supabase
  .from('transactions')
  .insert({
    amount: 10.99,
    description: 'Test transazione',
    type: 'expense',
    category_id: 'categoria-id-qui', // Sostituisci con ID reale
    user_id: user.id
  })
  .select();
  
console.log('Inserimento:', error ? 'ERRORE' : 'OK', error || data);
```

## 🔧 Configurazione Manuale

Se alcuni test falliscono, ecco come configurare manualmente:

### 1. Creazione Tabelle

```sql
-- Tabella profiles (estende auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabella categories
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabella transactions
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Indici per Performance

```sql
-- Indici critici per performance
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_categories_type ON categories(type);
```

### 3. Row Level Security

```sql
-- Abilita RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Policy per profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Policy per transactions
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transactions" ON transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own transactions" ON transactions FOR DELETE USING (auth.uid() = user_id);

-- Policy per categories (lettura pubblica)
CREATE POLICY "Categories are viewable by everyone" ON categories FOR SELECT USING (true);
```

### 4. Trigger per Timestamps

```sql
-- Funzione per aggiornare updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger per transactions
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
-- Trigger per profiles
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## 🚨 Troubleshooting Comuni

### Errore: "relation does not exist"
**Causa:** Tabella non creata  
**Soluzione:** Esegui le SQL di creazione tabelle sopra

### Errore: "RLS policy violation"
**Causa:** Row Level Security non configurato  
**Soluzione:** Esegui le policy SQL sopra

### Errore: "function does not exist"
**Causa:** Funzioni custom non implementate  
**Soluzione:** Implementa le funzioni nel file `sql-steps/step4-functions.sql`

### Performance lente
**Causa:** Indici mancanti  
**Soluzione:** Esegui le SQL degli indici sopra

### Errore di autenticazione
**Causa:** Configurazione auth non completa  
**Soluzione:** Verifica le variabili SUPABASE_URL e SUPABASE_ANON_KEY

## 📊 Monitoraggio

### Dashboard Supabase
1. Vai su [supabase.com](https://supabase.com)
2. Accedi al progetto `rbecyujvzfaxldmijbgp`
3. Controlla:
   - **Database**: Tabelle e dati
   - **Auth**: Utenti registrati
   - **API**: Logs delle richieste
   - **Logs**: Errori e performance

### Metriche da Monitorare
- **Numero di utenti attivi**
- **Numero di transazioni al giorno**
- **Tempo di risposta delle query**
- **Errori di autenticazione**
- **Utilizzo storage**

## ✅ Stato Attuale

Basato sulla configurazione attuale:

**✅ CONFIGURATO:**
- Client Supabase
- TypeScript types
- Schema database avanzato
- Funzioni custom

**⚠️ DA VERIFICARE:**
- Test di connessione
- Popolamento categorie iniziali
- Performance query
- Backup automatici

**🔧 RACCOMANDAZIONI:**
1. Esegui il DatabaseTest per verifica completa
2. Popola le categorie iniziali se vuote
3. Configura backup automatici
4. Monitora performance in produzione

---

### 🚀 Prossimi Passi

1. **Clicca "Test DB"** nel dashboard per verifica automatica
2. **Popola categorie** se il database è vuoto
3. **Crea la prima transazione** per testare tutto il flusso
4. **Monitora errori** nella console Supabase

Per supporto aggiuntivo, controlla i logs in Supabase Dashboard → Logs. 