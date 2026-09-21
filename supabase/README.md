# Supabase — La Belle Vie

## Aplicar o banco de dados

1. Abra o projeto no painel do Supabase e acesse **SQL Editor**.
2. Crie uma nova consulta.
3. Copie todo o conteúdo de `migrations/20260921120000_belle_vie_catalog.sql` e execute uma única vez.

O script cria as tabelas do catálogo, o bucket `product-media`, gatilhos e políticas RLS.

## Criar o primeiro administrador

1. Em **Authentication > Users**, use **Add user** para criar o e-mail e senha da administradora.
2. No SQL Editor, execute, trocando o e-mail:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'seu-email@exemplo.com');
```

3. Acesse `/admin/login` com essas credenciais.

Não use nem exponha a `service_role key` no navegador. A aplicação utiliza apenas a chave pública em `.env.local`; a segurança de acesso é aplicada no banco pelas políticas RLS.
