import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useDescriptionSuggestions = () => {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const getSuggestions = async (categoryId: string, partialText: string) => {
    if (!user || !categoryId || partialText.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      // Cerca nelle transazioni esistenti dell'utente per questa categoria
      const { data, error } = await supabase
        .from('transactions')
        .select('description')
        .eq('user_id', user.id)
        .eq('category_id', categoryId)
        .ilike('description', `${partialText}%`)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      // Rimuovi duplicati e filtra solo le descrizioni univoche
      const uniqueDescriptions = Array.from(
        new Set(data?.map(item => item.description) || [])
      );

      setSuggestions(uniqueDescriptions);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    }
  };

  const clearSuggestions = () => {
    setSuggestions([]);
  };

  return {
    suggestions,
    getSuggestions,
    clearSuggestions
  };
}; 