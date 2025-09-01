#Projeto PagAI - https://pagai-9el.pages.dev

PagAÍ — Controle simples de devedores

App web para gerenciamento de devedores: cadastre valores devidos, registre pagamentos (com data/hora e observação), acompanhe saldo restante, visualize métricas (total x mensal), histórico, calendário por ano/mês e arquivos (arquivados/quitados). Interface moderna, responsiva e leve.

✨ Stack

React + Vite + TypeScript

Tailwind CSS

Firebase (Auth + Firestore)

Deploy Cloudflare Pages

✅ Funcionalidades

Autenticação por e-mail/senha (Firebase Auth)

CRUD de devedores (soft delete e arquivamento automático quando quitado)

Registro de pagamentos (soft delete de pagamento)

Home/Dashboard com progresso (pago x restante)

Métricas: visão Total e Mensal (com alternância no UI)

Calendário: Anos → Meses → Devedores do período

Arquivados: devedores quitados (reabrir ou excluir)

Exportar CSV (apenas itens visíveis)

Responsivo (mobile/desktop), com toasts e UI/UX consistente

Formatação monetária BR (1.234,56)

📦 Estrutura (resumo) src/ components/ AuthGuard.tsx BackgroundFX.tsx Footer.tsx Navbar.tsx UserMenu.tsx lib/ firebase.ts money.ts # parseAmountBR / formatMoneyBR auth.ts pages/ Home.tsx Dashboard.tsx Debtor.tsx Metrics.tsx Profile.tsx Login.tsx Register.tsx Archived.tsx calendar/ CalendarYears.tsx CalendarMonths.tsx CalendarMonthDebtors.tsx types.ts main.tsx App.tsx index.html tailwind.config.js postcss.config.js

🧭 Rotas principais

/login / /register

/ (Home/Dashboard)

/debt/:id (página do devedor)

/metrics (Total/Mensal, por devedor e geral)

/calendar → /calendar/:year → /calendar/:year/:month

/archived (quitados/arquivados)

/profile

💡 Convenções de UX

Dinheiro: formatMoneyBR (lib money.ts)

Entrada de valores: aceita 1.000,50 ou 1000.50 (lib parseAmountBR)

Ordenação de pagamentos: mais recentes primeiro

Exclusão: soft delete (pagamentos e devedor)

Arquivamento automático quando o restante chegar a 0 (<= 0,01)
