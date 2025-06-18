# 🔄 Configurazione Pagamenti Ricorrenti

## Problema
Se vedi l'errore "Failed to load resource: the server responded with a status of 400" nella pagina **Gestione Pagamenti Ricorrenti**, significa che la tabella `recurring_transactions` non è ancora configurata nel database Supabase.

## Soluzione Rapida

### 1. Accedi al Dashboard Supabase
1. Vai su [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Seleziona il tuo progetto: `rbecyujvzfaxldmijbgp`
3. Clicca su **SQL Editor** nella sidebar sinistra

### 2. Esegui lo Script SQL
1. Copia tutto il contenuto del file: `sql-steps/CREATE_RECURRING_TRANSACTIONS_TABLE.sql`
2. Incollalo nell'editor SQL di Supabase
3. Clicca su **RUN** per eseguire lo script

### 3. Verifica la Creazione
Dopo l'esecuzione dello script, verifica che sia tutto ok:

```sql
-- Verifica che la tabella esista
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'recurring_transactions';

-- Verifica le colonne
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'recurring_transactions';
```

## Cosa Fa lo Script

### ✅ Crea la Tabella
- **recurring_transactions** con tutte le colonne necessarie
- Vincoli di integrità (CHECK constraints)
- Relazioni con tabelle esistenti (users, categories)

### ✅ Configura la Sicurezza
- **Row Level Security (RLS)** abilitato
- Policy per permettere agli utenti di gestire solo i propri pagamenti
- Sicurezza completa lato database

### ✅ Ottimizza le Performance
- **Indici** sui campi più utilizzati (user_id, next_date, is_active)
- Trigger per aggiornamento automatico di `updated_at`

### ✅ Funzioni Avanzate
- **calculate_next_payment_date()** - Calcola automaticamente la prossima scadenza
- **process_recurring_payments()** - Processa pagamenti scaduti automaticamente

## Funzionalità Supportate

### 💰 Tipi di Pagamento
- **Entrate ricorrenti**: Stipendi, pensioni, affitti attivi
- **Uscite ricorrenti**: Mutui, bollette, abbonamenti, rate auto

### 📅 Frequenze Supportate
- **Giornaliero**: Per pagamenti quotidiani
- **Settimanale**: Per pagamenti settimanali
- **Mensile**: Per mutui, bollette, stipendi
- **Annuale**: Per assicurazioni, tasse, abbonamenti annuali

### ⏰ Durata Personalizzabile
- **Data di inizio**: Quando inizia il pagamento ricorrente
- **Data di fine**: Opzionale, per mutui/finanziamenti a termine
- **Durata in anni/mesi**: Calcolo automatico per mutui (es: 30 anni)

### 🎯 Esempi d'Uso
- **Mutuo casa**: €1.200/mese per 30 anni
- **Stipendio**: €2.500/mese senza data di fine
- **Bolletta luce**: €80/mese
- **Assicurazione auto**: €600/anno
- **Abbonamento Netflix**: €15/mese

## Risoluzione Problemi

### Errore: "relation does not exist"
- La tabella non è stata creata correttamente
- Riesegui lo script SQL completo

### Errore: "permission denied"
- Le policy RLS non sono configurate
- Verifica che l'utente sia autenticato

### Errore: "foreign key violation"
- Assicurati che esistano delle categorie nel database
- Crea almeno una categoria di tipo 'income' e una di tipo 'expense'

## Test della Configurazione

Dopo aver eseguito lo script, testa la funzionalità:

1. Vai alla pagina **Gestione Pagamenti Ricorrenti**
2. Non dovresti più vedere l'avviso di "Configurazione Richiesta"
3. Prova ad aggiungere un pagamento ricorrente di test
4. Verifica che appaia nella lista dei pagamenti attivi

## Automazione Futura

Lo script include la funzione `process_recurring_payments()` che può essere utilizzata per:
- Creare automaticamente transazioni quando scadono i pagamenti ricorrenti
- Aggiornare le date dei prossimi pagamenti
- Disattivare pagamenti scaduti

Questa funzione può essere chiamata tramite:
- **Supabase Edge Functions** (serverless)
- **GitHub Actions** (scheduled)
- **Cron job** sul server

## Supporto

Se hai problemi con la configurazione:
1. Controlla i log di Supabase per errori specifici
2. Verifica che tutte le tabelle dipendenti esistano (users, categories)
3. Assicurati di essere autenticato correttamente

---
**📝 Nota**: Questo setup è necessario solo una volta per progetto. Una volta configurato, tutti gli utenti potranno utilizzare i pagamenti ricorrenti senza problemi. 