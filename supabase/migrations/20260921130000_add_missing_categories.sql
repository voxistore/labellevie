-- Adicionar categorias que existiam no site mas não estavam no banco de dados
INSERT INTO public.categories (name, slug, description, status, sort_order) VALUES
  ('Acessórios', 'acessorios', 'Bolsas, cintos, lenços e outros acessórios para completar seu look', 'published', 5),
  ('Sale', 'sale', 'Peças com desconto especial por tempo limitado', 'published', 6),
  ('Novidades', 'novidades', 'Lançamentos mais recentes da coleção', 'published', 1)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  updated_at = now();