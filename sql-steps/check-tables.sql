-- =====================================================
-- CONTROLLO RAPIDO TABELLE ESISTENTI
-- Copia e incolla questo nell'SQL Editor di Supabase
-- =====================================================

SELECT table_name, 
       CASE WHEN table_name = 'transactions' THEN '✅ TRANSAZIONI'
            WHEN table_name = 'profiles' THEN '✅ PROFILI UTENTE'  
            WHEN table_name = 'categories' THEN '✅ CATEGORIE'
            WHEN table_name = 'recurring_transactions' THEN '✅ TRANSAZIONI RICORRENTI'
            WHEN table_name = 'user_statistics' THEN '✅ STATISTICHE UTENTE'
            WHEN table_name = 'audit_log' THEN '✅ LOG AUDIT'
            ELSE '📄 ' || table_name
       END as descrizione
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name; 