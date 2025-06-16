-- Create profiles table for users
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES public.categories ON DELETE RESTRICT,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add a table for recurring transactions
CREATE TABLE public.recurring_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES public.categories ON DELETE RESTRICT,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE,
  next_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Enable RLS for recurring transactions
ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for categories (public read, authenticated users can view all)
CREATE POLICY "Anyone can view categories" ON public.categories
  FOR SELECT USING (true);

-- RLS Policies for transactions
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions" ON public.transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions" ON public.transactions
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for recurring transactions
CREATE POLICY "Users can view own recurring transactions" ON public.recurring_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recurring transactions" ON public.recurring_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recurring transactions" ON public.recurring_transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recurring transactions" ON public.recurring_transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Function to calculate next occurrence date (fixed parameter name)
CREATE OR REPLACE FUNCTION calculate_next_date(input_date DATE, frequency TEXT)
RETURNS DATE AS $$
BEGIN
  CASE frequency
    WHEN 'daily' THEN
      RETURN input_date + INTERVAL '1 day';
    WHEN 'weekly' THEN
      RETURN input_date + INTERVAL '1 week';
    WHEN 'monthly' THEN
      RETURN input_date + INTERVAL '1 month';
    WHEN 'yearly' THEN
      RETURN input_date + INTERVAL '1 year';
    ELSE
      RETURN input_date;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to create transactions from recurring ones
CREATE OR REPLACE FUNCTION process_recurring_transactions()
RETURNS void AS $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN 
    SELECT * FROM public.recurring_transactions 
    WHERE is_active = true 
    AND next_date <= CURRENT_DATE
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  LOOP
    -- Insert the transaction
    INSERT INTO public.transactions (
      user_id, amount, description, category_id, type, date
    ) VALUES (
      rec.user_id, rec.amount, rec.description, rec.category_id, rec.type, rec.next_date
    );
    
    -- Update next_date
    UPDATE public.recurring_transactions 
    SET 
      next_date = calculate_next_date(rec.next_date, rec.frequency),
      updated_at = now()
    WHERE id = rec.id;
    
    -- Deactivate if past end_date
    IF rec.end_date IS NOT NULL AND calculate_next_date(rec.next_date, rec.frequency) > rec.end_date THEN
      UPDATE public.recurring_transactions 
      SET is_active = false, updated_at = now()
      WHERE id = rec.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Insert default categories
INSERT INTO public.categories (name, type, icon, color) VALUES
-- Income categories
('Stipendio', 'income', 'Banknote', 'text-green-600 bg-green-100'),
('Freelance', 'income', 'Laptop', 'text-blue-600 bg-blue-100'),
('Investimenti', 'income', 'TrendingUp', 'text-purple-600 bg-purple-100'),
('Regalo', 'income', 'Gift', 'text-pink-600 bg-pink-100'),
('Altro Reddito', 'income', 'PlusCircle', 'text-emerald-600 bg-emerald-100'),

-- Expense categories
('Alimentari', 'expense', 'ShoppingCart', 'text-orange-600 bg-orange-100'),
('Trasporti', 'expense', 'Car', 'text-blue-600 bg-blue-100'),
('Casa', 'expense', 'Home', 'text-indigo-600 bg-indigo-100'),
('Ristorazione', 'expense', 'UtensilsCrossed', 'text-red-600 bg-red-100'),
('Intrattenimento', 'expense', 'Film', 'text-purple-600 bg-purple-100'),
('Salute', 'expense', 'Heart', 'text-rose-600 bg-rose-100'),
('Shopping', 'expense', 'ShoppingBag', 'text-cyan-600 bg-cyan-100'),
('Bollette', 'expense', 'Zap', 'text-yellow-600 bg-yellow-100'),
('Educazione', 'expense', 'BookOpen', 'text-teal-600 bg-teal-100'),
('Altri Costi', 'expense', 'MinusCircle', 'text-gray-600 bg-gray-100');

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
