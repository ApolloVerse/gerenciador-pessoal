-- Create tables for Tax Manager (Gerenciador de IR)

-- 1. Brokers
CREATE TABLE IF NOT EXISTS public.brokers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cnpj TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.brokers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own brokers" ON public.brokers
  FOR ALL USING (auth.uid() = user_id);

-- 2. Assets
CREATE TABLE IF NOT EXISTS public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL REFERENCES public.brokers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('Ação', 'FII', 'BDR', 'CDB', 'Tesouro Direto', 'Crypto')),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  cnpj TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own assets" ON public.assets
  FOR ALL USING (auth.uid() = user_id);

-- 3. Transactions
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL REFERENCES public.brokers(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  quantity NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Compra', 'Venda')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own transactions" ON public.transactions
  FOR ALL USING (auth.uid() = user_id);

-- 4. Dividends
CREATE TABLE IF NOT EXISTS public.dividends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL REFERENCES public.brokers(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  dividend_value NUMERIC DEFAULT 0,
  jcp_value NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.dividends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own dividends" ON public.dividends
  FOR ALL USING (auth.uid() = user_id);

-- 5. IRPF Items
CREATE TABLE IF NOT EXISTS public.irpf_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL REFERENCES public.brokers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  ficha TEXT,
  "group" TEXT,
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  cnpj TEXT,
  value NUMERIC NOT NULL,
  previous_value NUMERIC,
  asset_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.irpf_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own irpf_items" ON public.irpf_items
  FOR ALL USING (auth.uid() = user_id);
