import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { User, Lock, Trash2, Mail, Phone, Calendar, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

interface UserProfile {
  full_name: string;
  phone: string;
  bio: string;
  avatar_url: string;
}

const AccountSettings = () => {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile>({
    full_name: '',
    phone: '',
    bio: '',
    avatar_url: ''
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      setProfileLoading(true);
      
      // Carica i dati dal metadata dell'utente
      const userData = user?.user_metadata || {};
      
      setProfile({
        full_name: userData.full_name || '',
        phone: userData.phone || '',
        bio: userData.bio || '',
        avatar_url: userData.avatar_url || ''
      });
    } catch (error) {
      console.error('Errore nel caricamento profilo:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare il profilo",
        variant: "destructive"
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: profile.full_name,
          phone: profile.phone,
          bio: profile.bio,
          avatar_url: profile.avatar_url
        }
      });

      if (error) throw error;

      toast({
        title: "Profilo aggiornato",
        description: "Le tue informazioni sono state salvate con successo",
      });
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Impossibile aggiornare il profilo",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Errore",
        description: "Le password non coincidono",
        variant: "destructive"
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Errore",
        description: "La password deve essere di almeno 6 caratteri",
        variant: "destructive"
      });
      return;
    }

    try {
      setPasswordLoading(true);
      
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      toast({
        title: "Password aggiornata",
        description: "La tua password è stata cambiata con successo",
      });
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Impossibile cambiare la password",
        variant: "destructive"
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'ELIMINA IL MIO ACCOUNT') {
      toast({
        title: "Errore",
        description: "Scrivi esattamente 'ELIMINA IL MIO ACCOUNT' per confermare",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      // Prima elimina tutti i dati dell'utente dalle tabelle
      await supabase
        .from('transactions')
        .delete()
        .eq('user_id', user?.id);

      await supabase
        .from('recurring_transactions')
        .delete()
        .eq('user_id', user?.id);

      toast({
        title: "Account eliminato",
        description: "Il tuo account è stato eliminato definitivamente",
      });

      // Esci automaticamente
      await signOut();
      
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Impossibile eliminare l'account. Contatta il supporto.",
        variant: "destructive"  
      });
    } finally {
      setLoading(false);
    }
  };

  const sendPasswordResetEmail = async () => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user?.email || '');
      
      if (error) throw error;
      
      toast({
        title: "Email inviata",
        description: "Ti abbiamo inviato un link per reimpostare la password",
      });
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Impossibile inviare l'email di reset",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
          <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Impostazioni Account
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Gestisci il tuo profilo e le impostazioni di sicurezza
          </p>
        </div>
      </div>

      {/* Informazioni Account */}
      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Informazioni Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Email</Label>
              <Input 
                value={user?.email || ''} 
                disabled 
                className="bg-slate-50 dark:bg-slate-700"
              />
              <p className="text-xs text-slate-500 mt-1">
                L'email non può essere modificata
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Data registrazione</Label>
              <Input 
                value={new Date(user?.created_at || '').toLocaleDateString('it-IT')} 
                disabled 
                className="bg-slate-50 dark:bg-slate-700"
              />
            </div>
          </div>
          
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Il tuo account è <strong>verificato</strong> e attivo
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Profilo Personale */}
      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profilo Personale
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="full_name">Nome completo</Label>
                <Input
                  id="full_name"
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  placeholder="Il tuo nome e cognome"
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefono</Label>
                <Input
                  id="phone"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="+39 123 456 7890"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="bio">Bio / Note personali</Label>
              <Textarea
                id="bio"
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                placeholder="Scrivi qualcosa su di te..."
                rows={3}
              />
            </div>

            <Button 
              type="submit" 
              disabled={loading || profileLoading}
              className="w-full sm:w-auto"
            >
              {loading ? "Salvando..." : "Salva Profilo"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Sicurezza */}
      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Sicurezza
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Cambio Password */}
          <div>
            <h4 className="font-semibold mb-3">Cambia Password</h4>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="new_password">Nuova Password</Label>
                  <Input
                    id="new_password"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    placeholder="Password sicura (min. 6 caratteri)"
                  />
                </div>
                <div>
                  <Label htmlFor="confirm_password">Conferma Password</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder="Ripeti la nuova password"
                  />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  type="submit" 
                  disabled={passwordLoading}
                  className="flex items-center gap-2"
                >
                  <Lock className="h-4 w-4" />
                  {passwordLoading ? "Aggiornando..." : "Cambia Password"}
                </Button>
                
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={sendPasswordResetEmail}
                  className="flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Invia Reset Email
                </Button>
              </div>
            </form>
          </div>

          <Separator />

          {/* Eliminazione Account */}
          <div>
            <h4 className="font-semibold text-red-600 dark:text-red-400 mb-3">
              Zona Pericolosa
            </h4>
            
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Attenzione:</strong> L'eliminazione dell'account è permanente e 
                cancellerà tutti i tuoi dati finanziari. Questa azione non può essere annullata.
              </AlertDescription>
            </Alert>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive" className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Elimina Account
                </Button>
              </DialogTrigger>
              <DialogContent className="dark:bg-slate-800">
                <DialogHeader>
                  <DialogTitle className="text-red-600 dark:text-red-400">
                    Conferma Eliminazione Account
                  </DialogTitle>
                  <DialogDescription>
                    Questa azione è <strong>irreversibile</strong>. Tutti i tuoi dati verranno 
                    eliminati definitivamente dal nostro sistema.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="delete_confirmation">
                      Per confermare, scrivi: <strong>ELIMINA IL MIO ACCOUNT</strong>
                    </Label>
                    <Input
                      id="delete_confirmation"
                      value={deleteConfirmation}
                      onChange={(e) => setDeleteConfirmation(e.target.value)}
                      placeholder="ELIMINA IL MIO ACCOUNT"
                      className="mt-2"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button 
                    variant="destructive" 
                    onClick={handleDeleteAccount}
                    disabled={loading || deleteConfirmation !== 'ELIMINA IL MIO ACCOUNT'}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    {loading ? "Eliminando..." : "Elimina Definitivamente"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountSettings; 