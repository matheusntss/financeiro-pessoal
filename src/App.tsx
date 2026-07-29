import { useEffect, useMemo, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  BarChart3,
  CalendarDays,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  Home,
  Layers3,
  ListChecks,
  Pencil,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Target,
  Trash2,
  Upload,
  Wallet,
  X,
} from 'lucide-react'
import { isSupabaseConfigured, supabase } from './supabaseClient'
import './App.css'

type Tab = 'home' | 'transactions' | 'accounts' | 'categories' | 'reports'
type TransactionType = 'income' | 'expense'
type AccountType = 'Banco' | 'Cartao' | 'Carteira' | 'Investimento'

type Transaction = {
  id: string
  type: TransactionType
  amount: number
  categoryId: string
  accountId: string
  description: string
  date: string
  installments?: number
  recurring?: boolean
}

type Account = {
  id: string
  name: string
  type: AccountType
  balance: number
  closingDay?: number
  dueDay?: number
  limit?: number
}

type Category = {
  id: string
  name: string
  budget: number
  color: string
  type: TransactionType | 'both'
}

type AppData = {
  version: number
  transactions: Transaction[]
  accounts: Account[]
  categories: Category[]
}

type CloudFinanceRow = {
  data: AppData
}

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const storageKey = 'financeiro-app-v2'
const legacyStorageKey = 'financeiro-transactions-v1'
const hideStorageKey = 'financeiro-hide-values'
const today = new Date()
const currentMonth = today.toISOString().slice(0, 7)
const currentMonthLabel = today.toLocaleDateString('pt-BR', {
  month: 'long',
  year: 'numeric',
})

const categoryColors = [
  '#2563eb',
  '#0f766e',
  '#d97706',
  '#db2777',
  '#7c3aed',
  '#16a34a',
  '#dc2626',
  '#0891b2',
  '#4f46e5',
]

const defaultAccounts: Account[] = [
  { id: 'acc-main', name: 'Conta principal', balance: 0, type: 'Banco' },
  { id: 'acc-card', name: 'Cartao principal', balance: 0, type: 'Cartao', closingDay: 20, dueDay: 27, limit: 0 },
  { id: 'acc-wallet', name: 'Carteira', balance: 0, type: 'Carteira' },
]

const defaultCategories: Category[] = [
  { id: 'cat-salario', name: 'Salario', budget: 0, color: '#16a34a', type: 'income' },
  { id: 'cat-freela', name: 'Freela', budget: 0, color: '#0f766e', type: 'income' },
  { id: 'cat-moradia', name: 'Moradia', budget: 1500, color: '#2563eb', type: 'expense' },
  { id: 'cat-mercado', name: 'Mercado', budget: 900, color: '#0f766e', type: 'expense' },
  { id: 'cat-alimentacao', name: 'Alimentacao', budget: 650, color: '#d97706', type: 'expense' },
  { id: 'cat-transporte', name: 'Transporte', budget: 400, color: '#0891b2', type: 'expense' },
  { id: 'cat-assinaturas', name: 'Assinaturas', budget: 250, color: '#7c3aed', type: 'expense' },
  { id: 'cat-lazer', name: 'Lazer', budget: 550, color: '#db2777', type: 'expense' },
  { id: 'cat-saude', name: 'Saude', budget: 350, color: '#dc2626', type: 'expense' },
]

const defaultData: AppData = {
  version: 2,
  accounts: defaultAccounts,
  categories: defaultCategories,
  transactions: [],
}

function normalizeAppData(value: Partial<AppData> | null | undefined): AppData {
  return {
    version: 2,
    accounts: value?.accounts?.length ? value.accounts : defaultAccounts,
    categories: value?.categories?.length ? value.categories : defaultCategories,
    transactions: value?.transactions ?? [],
  }
}

const emptyTransaction = {
  id: '',
  type: 'expense' as TransactionType,
  amount: '',
  categoryId: 'cat-alimentacao',
  accountId: 'acc-card',
  description: '',
  date: toInputDate(today),
  installments: '1',
  recurring: false,
}

function toInputDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function parseAmount(value: string) {
  return Number(value.replace(/\./g, '').replace(',', '.'))
}

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`
}

function categoryIdFromName(name: string) {
  const normalized = normalizeText(name)
  return defaultCategories.find((category) => normalizeText(category.name) === normalized)?.id ?? 'cat-alimentacao'
}

function accountIdFromName(name: string) {
  const normalized = normalizeText(name)
  return defaultAccounts.find((account) => normalizeText(account.name) === normalized)?.id ?? 'acc-main'
}

function loadInitialData(): AppData {
  const stored = localStorage.getItem(storageKey)
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as AppData
      return normalizeAppData(parsed)
    } catch {
      return defaultData
    }
  }

  const legacy = localStorage.getItem(legacyStorageKey)
  if (!legacy) {
    return defaultData
  }

  try {
    const legacyTransactions = JSON.parse(legacy) as Array<{
      id: string
      type: TransactionType
      amount: number
      category: string
      account: string
      description: string
      date: string
    }>

    return {
      version: 2,
      accounts: defaultAccounts,
      categories: defaultCategories,
      transactions: legacyTransactions.map((item) => ({
        id: item.id,
        type: item.type,
        amount: item.amount,
        categoryId: categoryIdFromName(item.category),
        accountId: accountIdFromName(item.account),
        description: item.description,
        date: item.date,
      })),
    }
  } catch {
    return defaultData
  }
}

function App() {
  const [data, setData] = useState<AppData>(loadInitialData)
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [hideValues, setHideValues] = useState(() => localStorage.getItem(hideStorageKey) === 'true')
  const [user, setUser] = useState<User | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(isSupabaseConfigured)
  const [isCloudReady, setIsCloudReady] = useState(!isSupabaseConfigured)
  const [syncMessage, setSyncMessage] = useState(isSupabaseConfigured ? 'Conectando...' : 'Modo local')
  const [authForm, setAuthForm] = useState({ email: '', password: '' })
  const [authMessage, setAuthMessage] = useState('')
  const [transactionForm, setTransactionForm] = useState(emptyTransaction)
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null)
  const [isTransactionOpen, setIsTransactionOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [accountForm, setAccountForm] = useState({ name: '', type: 'Banco' as AccountType, balance: '', limit: '', closingDay: '', dueDay: '' })
  const [categoryForm, setCategoryForm] = useState({ name: '', budget: '', type: 'expense' as TransactionType | 'both', color: categoryColors[0] })
  const importInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!supabase) {
      return
    }

    supabase.auth.getUser().then(({ data: authData }) => {
      setUser(authData.user)
      setIsAuthLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setIsCloudReady(!session?.user)
      setSyncMessage(session?.user ? 'Carregando dados...' : 'Aguardando login')
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!supabase || !user) {
      return
    }
    const client = supabase

    async function loadCloudData() {
      setIsCloudReady(false)
      setSyncMessage('Carregando dados...')
      const { data: row, error } = await client
        .from('finance_data')
        .select('data')
        .eq('user_id', user!.id)
        .maybeSingle<CloudFinanceRow>()

      if (error) {
        setAuthMessage(`Nao consegui carregar os dados: ${error.message}`)
        setSyncMessage(`Erro ao carregar: ${error.message}`)
        setIsCloudReady(true)
        return
      }

      if (row?.data) {
        setData(normalizeAppData(row.data))
      } else {
        const seed = loadInitialData()
        setData(seed)
        const { error: upsertError } = await client.from('finance_data').upsert({
          user_id: user!.id,
          data: seed,
          updated_at: new Date().toISOString(),
        })
        if (upsertError) {
          setSyncMessage(`Erro ao criar dados: ${upsertError.message}`)
          setIsCloudReady(true)
          return
        }
      }

      setSyncMessage('Dados carregados')
      setIsCloudReady(true)
    }

    loadCloudData()
  }, [user])

  useEffect(() => {
    if (supabase && user) {
      if (!isCloudReady) return
      const client = supabase

      const timeout = window.setTimeout(() => {
        setSyncMessage('Salvando...')
        client
          .from('finance_data')
          .upsert({
            user_id: user.id,
            data,
            updated_at: new Date().toISOString(),
          })
          .then(({ error }) => {
            setSyncMessage(error ? `Erro ao salvar: ${error.message}` : `Salvo ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`)
          })
      }, 450)

      return () => window.clearTimeout(timeout)
    }

    localStorage.setItem(storageKey, JSON.stringify(data))
    setSyncMessage('Salvo localmente')
  }, [data, isCloudReady, user])

  useEffect(() => {
    localStorage.setItem(hideStorageKey, String(hideValues))
  }, [hideValues])

  const accountById = useMemo(() => new Map(data.accounts.map((account) => [account.id, account])), [data.accounts])
  const categoryById = useMemo(() => new Map(data.categories.map((category) => [category.id, category])), [data.categories])
  const accountBalances = useMemo(() => {
    const balances = new Map(data.accounts.map((account) => [account.id, account.balance]))

    data.transactions.forEach((transaction) => {
      const current = balances.get(transaction.accountId) ?? 0
      const next = transaction.type === 'income' ? current + transaction.amount : current - transaction.amount
      balances.set(transaction.accountId, next)
    })

    return balances
  }, [data.accounts, data.transactions])
  const monthTransactions = useMemo(() => data.transactions.filter((item) => item.date.startsWith(currentMonth)), [data.transactions])
  const filteredTransactions = useMemo(() => {
    const query = normalizeText(search)
    return data.transactions
      .filter((item) => {
        if (!query) return true
        const category = categoryById.get(item.categoryId)?.name ?? ''
        const account = accountById.get(item.accountId)?.name ?? ''
        return normalizeText(`${item.description} ${category} ${account}`).includes(query)
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [accountById, categoryById, data.transactions, search])

  const summary = useMemo(() => {
    const income = monthTransactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0)
    const expense = monthTransactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0)
    const fixedExpense = monthTransactions.filter((item) => item.type === 'expense' && item.recurring).reduce((sum, item) => sum + item.amount, 0)
    const totalBalance = data.accounts.reduce((sum, account) => sum + (accountBalances.get(account.id) ?? account.balance), 0)
    const dailyAverage = expense / Math.max(today.getDate(), 1)
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
    const projectedExpense = dailyAverage * daysInMonth
    const safePerDay = Math.max((income - expense) / Math.max(daysInMonth - today.getDate(), 1), 0)

    return { income, expense, result: income - expense, totalBalance, dailyAverage, projectedExpense, safePerDay, fixedExpense }
  }, [accountBalances, data.accounts, monthTransactions])

  const categoryData = useMemo(() => {
    const grouped = new Map<string, number>()
    monthTransactions
      .filter((item) => item.type === 'expense')
      .forEach((item) => grouped.set(item.categoryId, (grouped.get(item.categoryId) ?? 0) + item.amount))

    return [...grouped.entries()]
      .map(([categoryId, value]) => {
        const category = categoryById.get(categoryId)
        return {
          id: categoryId,
          name: category?.name ?? 'Sem categoria',
          value,
          budget: category?.budget ?? 0,
          color: category?.color ?? '#2563eb',
        }
      })
      .sort((a, b) => b.value - a.value)
  }, [categoryById, monthTransactions])

  const budgetData = useMemo(() => {
    return data.categories
      .filter((category) => category.type !== 'income' && category.budget > 0)
      .map((category) => {
        const spent = categoryData.find((item) => item.id === category.id)?.value ?? 0
        return {
          ...category,
          spent,
          percent: Math.min((spent / category.budget) * 100, 140),
        }
      })
      .sort((a, b) => b.percent - a.percent)
  }, [categoryData, data.categories])

  const dailyData = useMemo(() => {
    const days = new Map<string, { day: string; receitas: number; despesas: number }>()
    monthTransactions.forEach((item) => {
      const day = item.date.slice(-2)
      const current = days.get(day) ?? { day, receitas: 0, despesas: 0 }
      if (item.type === 'income') current.receitas += item.amount
      if (item.type === 'expense') current.despesas += item.amount
      days.set(day, current)
    })
    return [...days.values()].sort((a, b) => Number(a.day) - Number(b.day))
  }, [monthTransactions])

  const cardAccounts = data.accounts.filter((account) => account.type === 'Cartao')
  const spentPercent = summary.income ? Math.min((summary.expense / summary.income) * 100, 100) : 0
  const topCategory = categoryData[0]
  const highestBudgetRisk = budgetData[0]
  const recurringCount = monthTransactions.filter((item) => item.recurring).length
  const money = (value: number) => (hideValues ? 'R$ •••••' : currency.format(value))

  function openNewTransaction(type: TransactionType = 'expense') {
    const firstCategory = data.categories.find((category) => category.type === type || category.type === 'both')?.id ?? data.categories[0]?.id ?? ''
    const firstAccount = data.accounts[0]?.id ?? ''
    setTransactionForm({ ...emptyTransaction, type, categoryId: firstCategory, accountId: firstAccount, date: toInputDate(new Date()) })
    setEditingTransactionId(null)
    setIsTransactionOpen(true)
  }

  function openEditTransaction(transaction: Transaction) {
    setTransactionForm({
      id: transaction.id,
      type: transaction.type,
      amount: String(transaction.amount).replace('.', ','),
      categoryId: transaction.categoryId,
      accountId: transaction.accountId,
      description: transaction.description,
      date: transaction.date,
      installments: String(transaction.installments ?? 1),
      recurring: Boolean(transaction.recurring),
    })
    setEditingTransactionId(transaction.id)
    setIsTransactionOpen(true)
  }

  function saveTransaction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const amount = parseAmount(transactionForm.amount)
    if (!amount || amount <= 0) return

    const nextTransaction: Transaction = {
      id: editingTransactionId ?? createId('txn'),
      type: transactionForm.type,
      amount,
      categoryId: transactionForm.categoryId,
      accountId: transactionForm.accountId,
      description: transactionForm.description || categoryById.get(transactionForm.categoryId)?.name || 'Lancamento',
      date: transactionForm.date,
      installments: Number(transactionForm.installments) > 1 ? Number(transactionForm.installments) : undefined,
      recurring: transactionForm.recurring,
    }

    setData((current) => ({
      ...current,
      transactions: editingTransactionId
        ? current.transactions.map((item) => (item.id === editingTransactionId ? nextTransaction : item))
        : [nextTransaction, ...current.transactions],
    }))
    setSearch('')
    setIsTransactionOpen(false)
    setEditingTransactionId(null)
  }

  function deleteTransaction(id: string) {
    if (!window.confirm('Excluir este lancamento?')) return
    setData((current) => ({ ...current, transactions: current.transactions.filter((item) => item.id !== id) }))
  }

  function addAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accountForm.name.trim()) return
    setData((current) => ({
      ...current,
      accounts: [
        ...current.accounts,
        {
          id: createId('acc'),
          name: accountForm.name.trim(),
          type: accountForm.type,
          balance: parseAmount(accountForm.balance) || 0,
          limit: accountForm.limit ? parseAmount(accountForm.limit) : undefined,
          closingDay: accountForm.closingDay ? Number(accountForm.closingDay) : undefined,
          dueDay: accountForm.dueDay ? Number(accountForm.dueDay) : undefined,
        },
      ],
    }))
    setAccountForm({ name: '', type: 'Banco', balance: '', limit: '', closingDay: '', dueDay: '' })
  }

  function updateAccountBalance(id: string, balance: string) {
    setData((current) => ({
      ...current,
      accounts: current.accounts.map((account) => (account.id === id ? { ...account, balance: parseAmount(balance) || 0 } : account)),
    }))
  }

  function deleteAccount(id: string) {
    if (data.transactions.some((transaction) => transaction.accountId === id)) {
      window.alert('Esta conta tem lancamentos. Remova ou edite os lancamentos antes de excluir.')
      return
    }
    setData((current) => ({ ...current, accounts: current.accounts.filter((account) => account.id !== id) }))
  }

  function addCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!categoryForm.name.trim()) return
    setData((current) => ({
      ...current,
      categories: [
        ...current.categories,
        {
          id: createId('cat'),
          name: categoryForm.name.trim(),
          budget: parseAmount(categoryForm.budget) || 0,
          color: categoryForm.color,
          type: categoryForm.type,
        },
      ],
    }))
    setCategoryForm({ name: '', budget: '', type: 'expense', color: categoryColors[data.categories.length % categoryColors.length] })
  }

  function updateCategoryBudget(id: string, budget: string) {
    setData((current) => ({
      ...current,
      categories: current.categories.map((category) => (category.id === id ? { ...category, budget: parseAmount(budget) || 0 } : category)),
    }))
  }

  function deleteCategory(id: string) {
    if (data.transactions.some((transaction) => transaction.categoryId === id)) {
      window.alert('Esta categoria tem lancamentos. Remova ou edite os lancamentos antes de excluir.')
      return
    }
    setData((current) => ({ ...current, categories: current.categories.filter((category) => category.id !== id) }))
  }

  function exportData() {
    const payload = { exportedAt: new Date().toISOString(), ...data }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `controle-financeiro-${toInputDate(new Date())}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  function importData(file: File | undefined) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as AppData
        if (!parsed.transactions || !parsed.accounts || !parsed.categories) {
          window.alert('Arquivo invalido.')
          return
        }
        setData({ version: 2, transactions: parsed.transactions, accounts: parsed.accounts, categories: parsed.categories })
      } catch {
        window.alert('Nao consegui importar esse arquivo.')
      }
    }
    reader.readAsText(file)
  }

  function clearLocalData() {
    if (!window.confirm('Zerar todos os dados deste usuario? Isso apaga lancamentos e saldos, mantendo apenas categorias e contas iniciais.')) return
    localStorage.removeItem(storageKey)
    setData(defaultData)
    setSearch('')
  }

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return

    setAuthMessage('Entrando...')
    const { error } = await supabase.auth.signInWithPassword({
      email: authForm.email,
      password: authForm.password,
    })

    setAuthMessage(error ? error.message : '')
  }

  async function signUp() {
    if (!supabase) return

    setAuthMessage('Criando conta...')
    const { error } = await supabase.auth.signUp({
      email: authForm.email,
      password: authForm.password,
    })

    setAuthMessage(error ? error.message : 'Conta criada. Se o Supabase pedir confirmacao, confira seu e-mail antes de entrar.')
  }

  async function signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    setUser(null)
    setIsCloudReady(false)
  }

  function renderHome() {
    return (
      <>
        <section className="hero-panel">
          <div>
            <span className="label">Saldo geral</span>
            <strong>{money(summary.totalBalance)}</strong>
            <p>{summary.result >= 0 && !hideValues ? '+' : ''}{money(summary.result)} no mes</p>
          </div>
          <div className="month-gauge">
            <span>Gasto do mes</span>
            <strong>{money(summary.expense)}</strong>
            <div className="progress-track">
              <div style={{ width: `${spentPercent}%` }} />
            </div>
            <small>{spentPercent.toFixed(0)}% da renda mensal registrada</small>
          </div>
        </section>

        <section className="metric-grid">
          <Metric icon={<ArrowUpRight size={20} />} label="Receitas" value={money(summary.income)} tone="income" />
          <Metric icon={<ArrowDownRight size={20} />} label="Despesas" value={money(summary.expense)} tone="expense" />
          <Metric icon={<CalendarDays size={20} />} label="Media diaria" value={money(summary.dailyAverage)} />
          <Metric icon={<Target size={20} />} label="Pode gastar/dia" value={money(summary.safePerDay)} />
        </section>

        <section className="content-grid">
          <Panel eyebrow="Fluxo" title="Evolucao do mes" wide>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="despesas" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#dc2626" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#dc2626" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={(value) => (hideValues ? '' : String(value))} />
                <Tooltip formatter={(value) => money(Number(value))} />
                <Area dataKey="despesas" stroke="#dc2626" fill="url(#despesas)" strokeWidth={3} />
                <Area dataKey="receitas" stroke="#16a34a" fill="transparent" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>

          <Panel eyebrow="Categorias" title="O que mais pesa">
            <div className="category-layout">
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={3}>
                    {categoryData.map((entry) => <Cell key={entry.id} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(value) => money(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
              <div className="category-list">
                {categoryData.slice(0, 5).map((item) => (
                  <div key={item.id}>
                    <span style={{ background: item.color }} />
                    <p>{item.name}</p>
                    <strong>{money(item.value)}</strong>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <Panel eyebrow="Insights" title="Leitura rapida">
            <div className="insight-list">
              <p>Se continuar nesse ritmo, voce deve fechar o mes com {money(summary.projectedExpense)} em despesas.</p>
              <p>{topCategory ? `${topCategory.name} e a categoria que mais te fez gastar ate agora.` : 'Cadastre despesas para gerar insights por categoria.'}</p>
              <p>{highestBudgetRisk ? `${highestBudgetRisk.name} ja consumiu ${highestBudgetRisk.percent.toFixed(0)}% do orcamento.` : 'Defina orcamentos para receber alertas melhores.'}</p>
              <p>{recurringCount} lancamentos recorrentes aparecem neste mes.</p>
            </div>
          </Panel>

          <Panel eyebrow="Orcamentos" title="Limites por categoria">
            <div className="budget-list compact">
              {budgetData.slice(0, 5).map((item) => <BudgetRow key={item.id} item={item} money={money} />)}
            </div>
          </Panel>
        </section>
      </>
    )
  }

  function renderTransactions() {
    return (
      <section className="stack">
        <div className="mobile-command">
          <button className="primary-button inline" type="button" onClick={() => openNewTransaction('expense')}>
            <Plus size={18} />
            Novo gasto
          </button>
          <button className="secondary-button inline" type="button" onClick={() => openNewTransaction('income')}>
            <ArrowUpRight size={18} />
            Rendimento
          </button>
        </div>

        <Panel eyebrow="Lancamentos" title="Todas as movimentacoes" action={<SearchBox value={search} onChange={setSearch} />}>
          <div className="transaction-list">
            {filteredTransactions.map((item) => {
              const category = categoryById.get(item.categoryId)
              const account = accountById.get(item.accountId)
              return (
                <div key={item.id} className="transaction-row">
                  <div className={item.type === 'income' ? 'movement-icon income' : 'movement-icon expense'}>
                    {item.type === 'income' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                  </div>
                  <div>
                    <strong>{item.description}</strong>
                    <span>{category?.name ?? 'Sem categoria'} - {account?.name ?? 'Sem conta'} - {item.date.slice(8, 10)}/{item.date.slice(5, 7)}</span>
                    {(item.recurring || item.installments) && <small>{item.recurring ? 'Recorrente' : ''}{item.recurring && item.installments ? ' - ' : ''}{item.installments ? `${item.installments}x` : ''}</small>}
                  </div>
                  <p className={item.type === 'expense' ? 'negative' : ''}>
                    {hideValues ? money(item.amount) : `${item.type === 'expense' ? '-' : '+'}${currency.format(item.amount)}`}
                  </p>
                  <div className="row-actions">
                    <button type="button" onClick={() => openEditTransaction(item)} aria-label="Editar lancamento"><Pencil size={16} /></button>
                    <button type="button" onClick={() => deleteTransaction(item.id)} aria-label="Excluir lancamento"><Trash2 size={16} /></button>
                  </div>
                </div>
              )
            })}
            {!filteredTransactions.length && (
              <div className="empty-state">
                <strong>{search ? 'Nenhum lancamento encontrado' : 'Nenhum lancamento ainda'}</strong>
                <p>{search ? 'Limpe a busca para ver todos os registros.' : 'Use o botao + para cadastrar o primeiro gasto ou rendimento.'}</p>
              </div>
            )}
          </div>
        </Panel>
      </section>
    )
  }

  function renderAccounts() {
    return (
      <section className="content-grid">
        <Panel eyebrow="Contas" title="Bancos, cartoes e carteira">
          <div className="account-list">
            {data.accounts.map((account) => (
              <div key={account.id} className="account-row">
                {account.type === 'Cartao' ? <CreditCard size={19} /> : <Banknote size={19} />}
                <div>
                  <strong>{account.name}</strong>
                  <span>{account.type}{account.dueDay ? ` - vence dia ${account.dueDay}` : ''}</span>
                  <small>Saldo atual: {money(accountBalances.get(account.id) ?? account.balance)}</small>
                </div>
                <input
                  className="money-input"
                  value={String(account.balance).replace('.', ',')}
                  onChange={(event) => updateAccountBalance(account.id, event.target.value)}
                  aria-label={`Saldo inicial de ${account.name}`}
                  title="Saldo inicial ou ajuste manual"
                />
                <button className="danger-icon" type="button" onClick={() => deleteAccount(account.id)} aria-label="Excluir conta"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        </Panel>

        <Panel eyebrow="Nova conta" title="Adicionar conta">
          <form className="mini-form" onSubmit={addAccount}>
            <label>Nome<input value={accountForm.name} onChange={(event) => setAccountForm({ ...accountForm, name: event.target.value })} placeholder="Ex: Conta principal" /></label>
            <label>Tipo<select value={accountForm.type} onChange={(event) => setAccountForm({ ...accountForm, type: event.target.value as AccountType })}>
              <option>Banco</option><option>Cartao</option><option>Carteira</option><option>Investimento</option>
            </select></label>
            <label>Saldo inicial<input inputMode="decimal" value={accountForm.balance} onChange={(event) => setAccountForm({ ...accountForm, balance: event.target.value })} placeholder="0,00" /></label>
            {accountForm.type === 'Cartao' && (
              <div className="form-grid">
                <label>Limite<input inputMode="decimal" value={accountForm.limit} onChange={(event) => setAccountForm({ ...accountForm, limit: event.target.value })} placeholder="0,00" /></label>
                <label>Fecha dia<input inputMode="numeric" value={accountForm.closingDay} onChange={(event) => setAccountForm({ ...accountForm, closingDay: event.target.value })} placeholder="20" /></label>
                <label>Vence dia<input inputMode="numeric" value={accountForm.dueDay} onChange={(event) => setAccountForm({ ...accountForm, dueDay: event.target.value })} placeholder="27" /></label>
              </div>
            )}
            <button className="primary-button" type="submit">Salvar conta</button>
          </form>
        </Panel>

        <Panel eyebrow="Cartoes" title="Faturas e limites" wide>
          <div className="card-grid">
            {cardAccounts.map((account) => {
              const spent = monthTransactions.filter((item) => item.accountId === account.id && item.type === 'expense').reduce((sum, item) => sum + item.amount, 0)
              const limitPercent = account.limit ? Math.min((spent / account.limit) * 100, 100) : 0
              return (
                <article key={account.id} className="card-summary">
                  <strong>{account.name}</strong>
                  <span>Fatura estimada</span>
                  <p>{money(spent)}</p>
                  <div className="progress-track"><div style={{ width: `${limitPercent}%` }} /></div>
                  <small>{account.limit ? `${limitPercent.toFixed(0)}% do limite` : 'Sem limite definido'}</small>
                </article>
              )
            })}
          </div>
        </Panel>
      </section>
    )
  }

  function renderCategories() {
    return (
      <section className="content-grid">
        <Panel eyebrow="Categorias" title="Orcamentos mensais">
          <div className="budget-list">
            {budgetData.map((item) => (
              <div key={item.id} className="budget-edit-row">
                <BudgetRow item={item} money={money} />
                <input value={String(item.budget).replace('.', ',')} onChange={(event) => updateCategoryBudget(item.id, event.target.value)} aria-label={`Orcamento de ${item.name}`} />
                <button className="danger-icon" type="button" onClick={() => deleteCategory(item.id)} aria-label="Excluir categoria"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        </Panel>

        <Panel eyebrow="Nova categoria" title="Adicionar categoria">
          <form className="mini-form" onSubmit={addCategory}>
            <label>Nome<input value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} placeholder="Ex: Viagens" /></label>
            <label>Tipo<select value={categoryForm.type} onChange={(event) => setCategoryForm({ ...categoryForm, type: event.target.value as TransactionType | 'both' })}>
              <option value="expense">Gasto</option><option value="income">Rendimento</option><option value="both">Ambos</option>
            </select></label>
            <label>Orcamento mensal<input inputMode="decimal" value={categoryForm.budget} onChange={(event) => setCategoryForm({ ...categoryForm, budget: event.target.value })} placeholder="0,00" /></label>
            <label>Cor<input type="color" value={categoryForm.color} onChange={(event) => setCategoryForm({ ...categoryForm, color: event.target.value })} /></label>
            <button className="primary-button" type="submit">Salvar categoria</button>
          </form>
        </Panel>
      </section>
    )
  }

  function renderReports() {
    return (
      <section className="content-grid">
        <Panel eyebrow="Analise" title="Gastos por categoria" wide>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={categoryData}>
              <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={(value) => (hideValues ? '' : String(value))} />
              <Tooltip formatter={(value) => money(Number(value))} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {categoryData.map((entry) => <Cell key={entry.id} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel eyebrow="Resumo" title="Saude do mes">
          <div className="report-list">
            <ReportLine label="Resultado" value={money(summary.result)} good={summary.result >= 0} />
            <ReportLine label="Gasto fixo identificado" value={money(summary.fixedExpense)} />
            <ReportLine label="Despesa projetada" value={money(summary.projectedExpense)} good={summary.projectedExpense <= summary.income} />
            <ReportLine label="Maior categoria" value={topCategory?.name ?? 'Sem dados'} />
          </div>
        </Panel>

        <Panel eyebrow="Dados" title="Backup e seguranca">
          <div className="backup-actions">
            <button className="secondary-button" type="button" onClick={exportData}><Download size={18} />Exportar JSON</button>
            <button className="secondary-button" type="button" onClick={() => importInputRef.current?.click()}><Upload size={18} />Importar JSON</button>
            <button className="danger-button" type="button" onClick={clearLocalData}><Trash2 size={18} />Zerar dados</button>
            <input ref={importInputRef} hidden type="file" accept="application/json" onChange={(event) => importData(event.target.files?.[0])} />
          </div>
        </Panel>
      </section>
    )
  }

  const visibleCategories = data.categories.filter((category) => category.type === transactionForm.type || category.type === 'both')

  if (isSupabaseConfigured && isAuthLoading) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <span className="eyebrow">Sincronizacao segura</span>
          <h1>Carregando seu acesso</h1>
          <p>Verificando se ja existe uma sessao salva neste aparelho.</p>
        </section>
      </main>
    )
  }

  if (isSupabaseConfigured && !user) {
    return (
      <main className="auth-shell">
        <form className="auth-card" onSubmit={signIn}>
          <span className="eyebrow">Controle financeiro</span>
          <h1>Entrar para sincronizar</h1>
          <p>Use o mesmo login no iPhone e no computador para ver e editar os mesmos dados.</p>

          <label>
            E-mail
            <input type="email" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} placeholder="voce@email.com" required />
          </label>

          <label>
            Senha
            <input type="password" value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} placeholder="Minimo 6 caracteres" required />
          </label>

          {authMessage && <p className="auth-message">{authMessage}</p>}

          <button className="primary-button" type="submit">Entrar</button>
          <button className="secondary-button" type="button" onClick={signUp}>Criar conta</button>
        </form>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">{currentMonthLabel}</span>
          <h1>Controle financeiro</h1>
        </div>
        <div className="top-actions">
          <button className="soft-button" type="button" onClick={() => setHideValues((current) => !current)}>
            {hideValues ? <Eye size={18} /> : <EyeOff size={18} />}
            <span>{hideValues ? 'Mostrar' : 'Ocultar'}</span>
          </button>
          {isSupabaseConfigured && (
            <button className="soft-button" type="button" onClick={signOut}>
              <span>Sair</span>
            </button>
          )}
          <button className="icon-button" type="button" onClick={() => openNewTransaction('expense')} aria-label="Novo lancamento">
            <Plus size={22} />
          </button>
        </div>
      </header>

      <section className="privacy-strip">
        <ShieldCheck size={18} />
        <p>
          {isSupabaseConfigured
            ? `Modo nuvem: dados sincronizados via Supabase para ${user?.email ?? 'sua conta'}.`
            : 'Modo local: seus dados ficam neste navegador. Configure Supabase para sincronizar PC e iPhone.'}
          {' '}
          <strong>{syncMessage}</strong>
        </p>
      </section>

      <nav className="desktop-tabs" aria-label="Navegacao principal">
        <TabButton active={activeTab === 'home'} icon={<Home size={18} />} label="Inicio" onClick={() => setActiveTab('home')} />
        <TabButton active={activeTab === 'transactions'} icon={<ListChecks size={18} />} label="Lancamentos" onClick={() => setActiveTab('transactions')} />
        <TabButton active={activeTab === 'accounts'} icon={<Wallet size={18} />} label="Contas" onClick={() => setActiveTab('accounts')} />
        <TabButton active={activeTab === 'categories'} icon={<Layers3 size={18} />} label="Categorias" onClick={() => setActiveTab('categories')} />
        <TabButton active={activeTab === 'reports'} icon={<BarChart3 size={18} />} label="Relatorios" onClick={() => setActiveTab('reports')} />
      </nav>

      {activeTab === 'home' && renderHome()}
      {activeTab === 'transactions' && renderTransactions()}
      {activeTab === 'accounts' && renderAccounts()}
      {activeTab === 'categories' && renderCategories()}
      {activeTab === 'reports' && renderReports()}

      <button className="floating-action" type="button" onClick={() => openNewTransaction('expense')} aria-label="Novo lancamento">
        <Plus size={24} />
      </button>

      <nav className="bottom-nav" aria-label="Navegacao mobile">
        <TabButton active={activeTab === 'home'} icon={<Home size={19} />} label="Inicio" onClick={() => setActiveTab('home')} />
        <TabButton active={activeTab === 'transactions'} icon={<ListChecks size={19} />} label="Lanc." onClick={() => setActiveTab('transactions')} />
        <TabButton active={activeTab === 'accounts'} icon={<Wallet size={19} />} label="Contas" onClick={() => setActiveTab('accounts')} />
        <TabButton active={activeTab === 'categories'} icon={<Layers3 size={19} />} label="Cat." onClick={() => setActiveTab('categories')} />
        <TabButton active={activeTab === 'reports'} icon={<Settings2 size={19} />} label="Mais" onClick={() => setActiveTab('reports')} />
      </nav>

      {isTransactionOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="new-transaction-title">
          <form className="transaction-form" onSubmit={saveTransaction}>
            <div className="form-header">
              <div>
                <span className="eyebrow">Registro rapido</span>
                <h2 id="new-transaction-title">{editingTransactionId ? 'Editar lancamento' : 'Novo lancamento'}</h2>
              </div>
              <button type="button" className="ghost-button" onClick={() => setIsTransactionOpen(false)} aria-label="Fechar">
                <X size={20} />
              </button>
            </div>

            <div className="segmented">
              <button type="button" className={transactionForm.type === 'expense' ? 'active' : ''} onClick={() => setTransactionForm({ ...transactionForm, type: 'expense', categoryId: data.categories.find((category) => category.type === 'expense' || category.type === 'both')?.id ?? transactionForm.categoryId })}>Gasto</button>
              <button type="button" className={transactionForm.type === 'income' ? 'active' : ''} onClick={() => setTransactionForm({ ...transactionForm, type: 'income', categoryId: data.categories.find((category) => category.type === 'income' || category.type === 'both')?.id ?? transactionForm.categoryId })}>Rendimento</button>
            </div>

            <label>Valor<input autoFocus inputMode="decimal" placeholder="0,00" value={transactionForm.amount} onChange={(event) => setTransactionForm({ ...transactionForm, amount: event.target.value })} /></label>
            <label>Categoria<select value={transactionForm.categoryId} onChange={(event) => setTransactionForm({ ...transactionForm, categoryId: event.target.value })}>
              {visibleCategories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}
            </select></label>
            <label>Conta<select value={transactionForm.accountId} onChange={(event) => setTransactionForm({ ...transactionForm, accountId: event.target.value })}>
              {data.accounts.map((account) => <option value={account.id} key={account.id}>{account.name}</option>)}
            </select></label>
            <label>Descricao<input placeholder="Ex: almoco, mercado, freela..." value={transactionForm.description} onChange={(event) => setTransactionForm({ ...transactionForm, description: event.target.value })} /></label>
            <div className="form-grid">
              <label>Data<input type="date" value={transactionForm.date} onChange={(event) => setTransactionForm({ ...transactionForm, date: event.target.value })} /></label>
              <label>Parcelas<input inputMode="numeric" value={transactionForm.installments} onChange={(event) => setTransactionForm({ ...transactionForm, installments: event.target.value })} /></label>
            </div>
            <label className="check-row"><input type="checkbox" checked={transactionForm.recurring} onChange={(event) => setTransactionForm({ ...transactionForm, recurring: event.target.checked })} /> Recorrente/fixo</label>
            <button className="primary-button" type="submit">Salvar lancamento</button>
          </form>
        </div>
      )}
    </main>
  )
}

function Metric({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: 'income' | 'expense' }) {
  return (
    <article className={`metric-card ${tone ?? ''}`}>
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

function Panel({ eyebrow, title, children, wide, action }: { eyebrow: string; title: string; children: React.ReactNode; wide?: boolean; action?: React.ReactNode }) {
  return (
    <article className={`panel ${wide ? 'wide' : ''}`}>
      <div className="section-heading">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </article>
  )
}

function TabButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button className={active ? 'active' : ''} type="button" onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  )
}

function SearchBox({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="search-box">
      <Search size={17} />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Buscar" />
    </label>
  )
}

function BudgetRow({ item, money }: { item: Category & { spent: number; percent: number }; money: (value: number) => string }) {
  return (
    <div className="budget-row">
      <div>
        <strong>{item.name}</strong>
        <span>{money(item.spent)} de {money(item.budget)}</span>
      </div>
      <div className="budget-bar">
        <div style={{ width: `${Math.min(item.percent, 100)}%`, background: item.percent >= 100 ? '#dc2626' : item.color }} />
      </div>
      <small>{item.percent.toFixed(0)}%</small>
    </div>
  )
}

function ReportLine({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="report-line">
      <span>{label}</span>
      <strong className={good === false ? 'negative' : good ? 'positive' : ''}>{value}</strong>
    </div>
  )
}

export default App
