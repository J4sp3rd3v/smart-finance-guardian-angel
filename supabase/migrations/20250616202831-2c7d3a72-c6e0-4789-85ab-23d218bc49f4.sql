
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

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

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
