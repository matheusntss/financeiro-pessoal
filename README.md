# Controle financeiro pessoal

Primeira versao do app financeiro pessoal, feita para uso no computador e no iPhone pelo navegador.

## O que ja tem

- Dashboard com saldo geral, receitas, despesas, media diaria e limite seguro por dia.
- Graficos de evolucao do mes e gastos por categoria.
- Navegacao por abas com barra inferior no celular.
- Cadastro e edicao de contas, cartoes, carteira e investimentos.
- Cadastro de categorias com orcamento mensal.
- Tela completa de lancamentos com busca, edicao e exclusao.
- Aba de lancamentos mostra todos os registros, nao apenas o mes atual.
- Marcacao de gasto recorrente/fixo e parcelas.
- Visao inicial de fatura estimada e limite de cartao.
- Insights automaticos com projecao de fechamento do mes.
- Cadastro rapido de gasto ou rendimento.
- Persistencia local no navegador.
- Modo discreto para ocultar valores em publico.
- Exportacao e importacao de backup em JSON.
- Botao para zerar dados e comecar a base real sem exemplos.
- Login e sincronizacao via Supabase quando `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` estiverem configuradas.

## Rodar no computador

```bash
npm install
npm run dev -- --host 0.0.0.0
```

Depois abra:

```text
http://127.0.0.1:5173
```

## Abrir no iPhone

Com o computador e o iPhone no mesmo Wi-Fi, abra no Safari o endereco de rede do computador:

```text
http://SEU-IP:5173
```

No ambiente atual, um IP detectado foi:

```text
http://192.168.0.4:5173
```

No Safari, use Compartilhar > Adicionar a Tela de Inicio para deixar com cara de app.

## Proximos passos

- Separar cartao de credito em fatura atual, futura, fechada e paga.
- Criar recorrentes automaticos que geram lancamentos todo mes.
- Criar importacao CSV de extratos.
- Criar projeto no Supabase usando [SUPABASE_SETUP.md](./SUPABASE_SETUP.md).
- Publicar na Vercel usando [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md).

## Privacidade

Leia [PRIVACIDADE.md](./PRIVACIDADE.md) antes de usar dados reais. Sem Supabase, a versao atual nao envia dados para servidor e salva no navegador do aparelho.

Quando Supabase estiver configurado, o app passa a pedir login e sincronizar os dados na tabela `finance_data`, protegida por Row Level Security.
