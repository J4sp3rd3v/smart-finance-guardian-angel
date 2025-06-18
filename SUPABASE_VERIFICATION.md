# 🛡️ Verifica Configurazione Supabase

Questo documento ti guida per verificare che Supabase sia configurato correttamente per l'applicazione FinanceGuardian.

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

# 🔧 Guida Verifica Configurazione Supabase

## ✅ Test Automatico - Usa il Componente DatabaseTest

Nel dashboard della tua app, clicca sul bottone **"Test DB"** per verificare automaticamente:
- Connessione database
- Presenza tabelle
- Funzioni SQL
- Audit trail
- Performance
- Vista dashboard

---

## 🚨 **RISOLVI ERRORI TEST** 

### Errori Comuni e Soluzioni

**❌ Funzione `calculate_daily_statistics` non trovata**
**❌ Vista `user_dashboard_summary` non implementata** 
**❌ Audit Trail non configurato**

### 🔥 SOLUZIONE RAPIDA (2 minuti)

1. Vai su **Supabase Dashboard → SQL Editor**
2. Copia il contenuto di `sql-steps/QUICK_FIX.sql`
3. Incolla e clicca **"Run"**
4. Testa di nuovo l'app

### 🎯 SOLUZIONE COMPLETA (5 minuti)

1. Vai su **Supabase Dashboard → SQL Editor**
2. Copia il contenuto di `sql-steps/FIX_DATABASE_COMPLETE.sql`
3. Incolla e clicca **"Run"**
4. Vedrai messaggi di conferma nel log
5. Testa di nuovo l'app

---

## 📋 Checklist Configurazione Base

### 1️⃣ **Variabili d'Ambiente** (.env.local)
```bash
VITE_SUPABASE_URL=https://tuo-progetto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

### 2️⃣ **Client Supabase** (src/integrations/supabase/client.ts)
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### 3️⃣ **Autenticazione Configurata**
- [x] Email/Password abilitato
- [x] Conferma email disabilitata (per sviluppo)
- [x] RLS (Row Level Security) abilitato

### 4️⃣ **Tabelle Create**
- [x] profiles
- [x] categories  
- [x] transactions
- [x] recurring_transactions
- [x] user_statistics
- [x] audit_log (dopo fix)

---

## 🧪 Test Manuale SQL

### Connessione Base
```sql
SELECT current_user, current_database(), version();
```

### Verifica Tabelle
```sql
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

### Test Funzioni
```sql
-- Lista funzioni
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public';

-- Test calcolo statistiche
SELECT public.calculate_daily_statistics(auth.uid());
```

### Test Audit Trail
```sql
-- Controlla se la tabella esiste
SELECT * FROM public.audit_log LIMIT 1;

-- Inserisci transazione di test
INSERT INTO public.transactions (user_id, category_id, amount, description, type, date)
VALUES (auth.uid(), (SELECT id FROM categories LIMIT 1), 10.00, 'Test audit', 'expense', CURRENT_DATE);

-- Verifica audit creato
SELECT * FROM public.audit_log WHERE user_id = auth.uid() ORDER BY created_at DESC LIMIT 1;
```

---

## 🚀 Script Browser per Debug

Apri **Developer Tools → Console** e incolla:

```javascript
// Test connessione
const testConnection = async () => {
  const { data, error } = await window.supabase.auth.getUser()
  console.log('🔐 User:', data.user?.email || 'Non autenticato')
  
  if (error) {
    console.error('❌ Auth Error:', error)
    return
  }
}

// Test tabelle
const testTables = async () => {
  const tables = ['profiles', 'categories', 'transactions', 'user_statistics', 'audit_log']
  
  for (const table of tables) {
    const { data, error } = await window.supabase.from(table).select('*').limit(1)
    console.log(`📊 ${table}:`, error ? '❌ ' + error.message : '✅ OK')
  }
}

// Test funzioni
const testFunctions = async () => {
  const { data, error } = await window.supabase.rpc('calculate_daily_statistics', {
    target_user_id: (await window.supabase.auth.getUser()).data.user.id
  })
  console.log('🧮 calculate_daily_statistics:', error ? '❌ ' + error.message : '✅ OK')
}

// Esegui tutti i test
testConnection()
testTables()
testFunctions()
```

---

## 🔍 Troubleshooting

### Performance Lenta
```sql
-- Verifica indici
SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public';

-- Crea indici mancanti
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
```

### RLS (Row Level Security)
```sql
-- Verifica policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies WHERE schemaname = 'public';

-- Policy base per transactions
CREATE POLICY "Users can manage own transactions" ON transactions
  FOR ALL USING (auth.uid() = user_id);
```

### Reset Completo Database
```sql
-- ⚠️ ATTENZIONE: Cancella tutti i dati!
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS user_statistics CASCADE;
DROP TABLE IF EXISTS recurring_transactions CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Poi esegui di nuovo le migrazioni
```

---

## 📈 Monitoraggio 

### Logs Supabase
1. Dashboard → Logs → Postgres Logs
2. Filtra per "ERROR" o "NOTICE"
3. Monitora query lente (>100ms)

### Metrics Utili
- Connessioni attive
- Query/secondo  
- Storage utilizzato
- Bandwidth utilizzato

---

## 🎯 Prossimi Passi

Dopo aver risolto gli errori:

1. **Testa l'app completamente**
2. **Aggiungi dati di esempio**  
3. **Configura backup automatici**
4. **Imposta alerts di monitoraggio**
5. **Documenta il deploy in produzione**

---

**💡 Tip:** Tieni sempre questa checklist aggiornata e usala per nuovi ambienti! 