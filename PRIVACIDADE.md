# Privacidade e seguranca do app financeiro

Este app lida com informacoes sensiveis: renda, gastos, bancos, cartoes, rotina e padroes de consumo. A regra principal e simples: coletar pouco, proteger bem e deixar claro onde cada dado fica.

## Estado atual

Sem Supabase configurado, os lancamentos ficam apenas no navegador, usando `localStorage`.

Isso significa:

- Nenhum lancamento e enviado para servidor.
- Nao existe login, backend ou banco online ainda.
- O computador e o iPhone nao sincronizam automaticamente.
- Quem tiver acesso ao navegador/dispositivo pode ver os dados se o aparelho estiver desbloqueado.
- Limpar dados do navegador pode apagar os lancamentos.

Para uso pessoal inicial, isso e bom para testar a rotina sem expor dados na nuvem. Mas nao e bom como armazenamento definitivo.

Com Supabase configurado, o app passa a pedir login e salva os dados na tabela `finance_data`, em um documento JSON por usuario. Essa tabela deve ficar com Row Level Security ativado, usando o SQL de `supabase.sql`.

## Cuidados para uso na rotina

- Use nomes de contas menos sensiveis, como "Conta principal" em vez de banco + agencia.
- Nao cadastre numero de cartao, CPF, senha, token, agencia ou conta completa.
- Registre valores, categorias e descricoes necessarias, mas evite detalhes excessivos.
- Use o modo discreto quando abrir em publico.
- Exporte backup periodicamente se ainda estiver usando armazenamento local.
- Use bloqueio de tela no PC e no iPhone.

## Arquitetura recomendada para sincronizar PC e iPhone

Quando for usar nuvem, a melhor opcao para este projeto e:

- Vercel para hospedar o app.
- Supabase para login e banco de dados.
- Row Level Security no Supabase para cada usuario ver apenas os proprios dados.
- HTTPS obrigatorio.
- Backups automaticos.
- Sem armazenar credenciais bancarias.

O app salva somente dados que voce digitou manualmente:

- lancamentos
- categorias
- contas apelidadas
- saldos manuais
- configuracoes

Ele nao precisaria acessar sua conta bancaria real.

## Modelo de dados com menos risco

Prefira guardar:

- nome amigavel da conta: "Banco principal", "Cartao credito", "Carteira"
- tipo da conta: banco, cartao, dinheiro, investimento
- saldo informado manualmente
- valor da transacao
- data
- categoria
- descricao curta

Evite guardar:

- numero de conta
- numero de cartao
- documentos pessoais
- senhas
- comprovantes com dados completos
- endereco completo
- qualquer token de banco

## Opcao mais segura no futuro

Se voce quiser mais protecao, podemos adicionar criptografia no proprio navegador antes de salvar na nuvem.

Nesse modelo:

- voce cria uma senha mestra
- os dados sao criptografados no aparelho
- o Supabase guarda apenas dados embaralhados
- sem a senha mestra, nem o banco consegue ler os lancamentos

Pontos de atencao:

- se perder a senha mestra, perde acesso aos dados
- busca, filtros e relatorios ficam mais complexos
- precisa cuidar bem da experiencia para nao ficar chato de usar

Para seu uso pessoal, eu recomendo evoluir em duas etapas:

1. Supabase com login, RLS e dados manuais, sem dados bancarios reais.
2. Criptografia local se voce decidir que os dados sao sensiveis demais para ficarem legiveis no banco.

## Checklist antes de publicar

- Ativar autenticao.
- Ativar RLS em todas as tabelas.
- Criar politicas por `user_id`.
- Separar variaveis publicas e privadas.
- Nao colocar chaves secretas no frontend.
- Criar backup/exportacao.
- Criar exclusao de conta e dados.
- Escrever politica de privacidade simples.
- Testar em iPhone e desktop.
