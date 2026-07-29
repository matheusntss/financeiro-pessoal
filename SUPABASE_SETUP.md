# Configurar Supabase

Use este passo a passo quando quiser ativar login e sincronizacao entre iPhone e computador.

## 1. Criar projeto

1. Acesse https://supabase.com.
2. Crie uma conta ou entre.
3. Clique em New project.
4. Escolha uma organizacao.
5. Defina nome, senha do banco e regiao.
6. Aguarde o projeto terminar de provisionar.

## 2. Criar tabela segura

1. No painel do Supabase, abra SQL Editor.
2. Crie uma nova query.
3. Cole o conteudo do arquivo `supabase.sql`.
4. Execute.

Esse SQL cria a tabela `finance_data` com Row Level Security. Cada usuario autenticado so consegue ler e alterar a propria linha.

## 3. Pegar URL e chave do projeto

No Supabase:

1. Abra Project Settings.
2. Va em API Keys.
3. Na aba `Publishable and secret API keys`, copie a chave da linha `Publishable key > default`.
4. Nao copie `Secret keys`. Ela nao deve ir para o app.
5. Para copiar a URL do projeto, va em Integrations > Data API e copie o `Project URL` / `API URL`.

Na tela nova do Supabase, a chave publica comeca com:

```text
sb_publishable_...
```

Essa e a chave certa para o frontend. Ela substitui a antiga `anon public`.

## 4. Criar arquivo local de ambiente

Na raiz do projeto, crie um arquivo `.env.local` com:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-sb_publishable
```

Depois reinicie o servidor:

```bash
npm run dev -- --host 0.0.0.0
```

## 5. Testar login

1. Abra o app.
2. Crie uma conta com e-mail e senha.
3. Se o Supabase pedir confirmacao, confirme pelo e-mail.
4. Entre no app.
5. Cadastre um lancamento.
6. Abra o app em outro aparelho com o mesmo login.

## 6. Publicar depois

Quando formos publicar na Vercel, essas mesmas variaveis entram em:

Project Settings > Environment Variables

Use exatamente os nomes:

```env
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

## Observacoes de seguranca

- A chave `anon public` pode ficar no frontend.
- Nunca use `service_role` no frontend.
- Nao cadastre senha bancaria, numero completo de cartao, CPF ou tokens.
- Use apelidos para contas e cartoes.
