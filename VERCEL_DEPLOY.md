# Publicar na Vercel

Este app e um projeto Vite/React. A Vercel detecta esse tipo de projeto automaticamente.

## Antes de publicar

Confirme que o arquivo `.env.local` existe localmente, mas nao sera enviado ao GitHub. O `.gitignore` ja ignora `*.local`.

As variaveis que devem ser copiadas para a Vercel sao:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Nunca coloque `sb_secret_...` na Vercel para este frontend.

## Opcao recomendada: GitHub + Vercel

1. Crie um repositorio no GitHub.
2. Suba esta pasta `financeiro-pessoal` para o repositorio.
3. Entre em https://vercel.com.
4. Clique em `Add New...` > `Project`.
5. Escolha o repositorio do GitHub.
6. Framework Preset: `Vite`.
7. Build Command: `npm run build`.
8. Output Directory: `dist`.
9. Em `Environment Variables`, adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
10. Clique em `Deploy`.

## Depois do deploy

Quando a Vercel gerar uma URL, algo como:

```text
https://financeiro-pessoal.vercel.app
```

va no Supabase:

1. `Authentication`
2. `URL Configuration`
3. `Site URL`: coloque a URL da Vercel
4. `Redirect URLs`: adicione tambem a URL da Vercel

Se quiser manter o desenvolvimento local funcionando, deixe tambem:

```text
http://127.0.0.1:5173
http://localhost:5173
```

## Teste final

1. Abra a URL da Vercel.
2. Entre com seu login.
3. Cadastre um lancamento pequeno.
4. Veja se aparece `Salvo HH:MM` na faixa azul.
5. Abra no celular com a mesma conta.
6. Confirme se o lancamento apareceu.

## Instalar no iPhone

No Safari:

1. Abra a URL da Vercel.
2. Toque em Compartilhar.
3. Toque em `Adicionar a Tela de Inicio`.
4. Salve como `Financas`.
