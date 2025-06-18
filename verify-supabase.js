// 🛡️ Script di Verifica Rapida Supabase
// Copia e incolla questo script nella console del browser (F12) dopo aver fatto login nell'app

console.log('🚀 Iniziando verifica Supabase...');

async function verificaSupabase() {
  try {
    // Import dinamico del client Supabase
    const { supabase } = await import('./src/integrations/supabase/client.ts');
    
    const results = {
      connessione: '❌',
      autenticazione: '❌',
      tabelle: '❌',
      inserimento: '❌',
      performance: '❌'
    };

    console.log('\n1️⃣ Test Connessione Base...');
    try {
      const { data, error } = await supabase.from('profiles').select('id').limit(1);
      if (!error) {
        results.connessione = '✅';
        console.log('✅ Connessione database: OK');
      } else {
        console.log('❌ Errore connessione:', error.message);
      }
    } catch (err) {
      console.log('❌ Errore connessione:', err.message);
    }

    console.log('\n2️⃣ Test Autenticazione...');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        results.autenticazione = '✅';
        console.log('✅ Utente autenticato:', user.email);
        console.log('📧 User ID:', user.id);
      } else {
        console.log('❌ Nessun utente autenticato');
        return results;
      }
    } catch (err) {
      console.log('❌ Errore autenticazione:', err.message);
      return results;
    }

    console.log('\n3️⃣ Test Esistenza Tabelle...');
    const tabelle = [
      'profiles', 
      'transactions', 
      'categories', 
      'recurring_transactions',
      'audit_log',
      'user_statistics'
    ];
    
    let tabelleOK = 0;
    for (const tabella of tabelle) {
      try {
        const { error } = await supabase.from(tabella).select('id').limit(1);
        if (!error) {
          console.log(`✅ Tabella ${tabella}: OK`);
          tabelleOK++;
        } else {
          console.log(`❌ Tabella ${tabella}: ${error.message}`);
        }
      } catch (err) {
        console.log(`❌ Tabella ${tabella}: ${err.message}`);
      }
    }
    
    if (tabelleOK >= 4) {
      results.tabelle = '✅';
      console.log(`✅ Tabelle: ${tabelleOK}/${tabelle.length} funzionanti`);
    } else {
      console.log(`❌ Tabelle: Solo ${tabelleOK}/${tabelle.length} funzionanti`);
    }

    console.log('\n4️⃣ Test Inserimento Dati...');
    try {
      // Prima ottieni una categoria esistente
      const { data: categories } = await supabase
        .from('categories')
        .select('id')
        .limit(1);
      
      if (categories && categories.length > 0) {
        const { data, error } = await supabase
          .from('transactions')
          .insert({
            amount: 1.00,
            description: 'Test verifica Supabase',
            type: 'expense',
            category_id: categories[0].id
          })
          .select();
          
        if (!error && data) {
          results.inserimento = '✅';
          console.log('✅ Inserimento transazione: OK');
          console.log('📝 ID transazione test:', data[0].id);
          
          // Cleanup - rimuovi la transazione test
          await supabase.from('transactions').delete().eq('id', data[0].id);
          console.log('🧹 Transazione test rimossa');
        } else {
          console.log('❌ Errore inserimento:', error?.message);
        }
      } else {
        console.log('⚠️  Nessuna categoria trovata - popola le categorie prima');
      }
    } catch (err) {
      console.log('❌ Errore inserimento:', err.message);
    }

    console.log('\n5️⃣ Test Performance Query...');
    try {
      const start = Date.now();
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          categories(name, icon)
        `)
        .limit(10);
        
      const timing = Date.now() - start;
      
      if (!error) {
        results.performance = timing < 200 ? '✅' : '⚠️';
        console.log(`${results.performance} Query performance: ${timing}ms`);
        console.log(`📊 Transazioni trovate: ${data?.length || 0}`);
      } else {
        console.log('❌ Errore query:', error.message);
      }
    } catch (err) {
      console.log('❌ Errore performance:', err.message);
    }

    console.log('\n📋 RIEPILOGO VERIFICA:');
    console.log('================================');
    Object.entries(results).forEach(([test, result]) => {
      console.log(`${result} ${test.charAt(0).toUpperCase() + test.slice(1)}`);
    });
    console.log('================================');

    const totalOK = Object.values(results).filter(r => r === '✅').length;
    const score = (totalOK / Object.keys(results).length) * 100;
    
    if (score === 100) {
      console.log('🎉 SUPABASE COMPLETAMENTE CONFIGURATO! ');
    } else if (score >= 80) {
      console.log('✅ Supabase configurato correttamente (alcune funzioni avanzate mancanti)');
    } else if (score >= 60) {
      console.log('⚠️ Supabase parzialmente configurato - controlla errori sopra');
    } else {
      console.log('❌ Supabase NON configurato correttamente - verifica configurazione');
    }

    console.log(`📊 Score: ${score.toFixed(0)}%`);
    
    return results;

  } catch (error) {
    console.log('💥 Errore critico durante verifica:', error);
    console.log('🔧 Verifica che hai fatto login e che l\'app sia caricata correttamente');
    return null;
  }
}

// Esegui la verifica
verificaSupabase().then(results => {
  if (results) {
    console.log('\n🚀 Verifica completata! Controlla i risultati sopra.');
    console.log('📖 Per troubleshooting dettagliato, consulta SUPABASE_VERIFICATION.md');
  }
}).catch(err => {
  console.error('💥 Errore durante esecuzione:', err);
});

// Esponi la funzione globalmente per riutilizzo
window.verificaSupabase = verificaSupabase; 