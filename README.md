PagAÍ – Controle Simples de Devedores

Demo: https://pagai-9el.pages.dev

App web para gerenciamento de devedores: cadastre valores devidos, registre pagamentos (com data/hora e observação), acompanhe saldo restante, visualize métricas (total x mensal), histórico, calendário por ano/mês e arquivos (arquivados/quitados). Interface moderna, responsiva e leve.

✨ Stack

Frontend: React + Vite + TypeScript

Estilização: Tailwind CSS

Backend/Autenticação: Firebase (Auth + Firestore)

Deploy: Cloudflare Pages

✅ Funcionalidades
Autenticação & Perfil

Cadastro e login por e-mail/senha

Reset de senha via e-mail (modal integrado ao login)

Confirmação de e-mail e reenvio de verificação

Perfil de usuário com atualização de senha

Gestão de Devedores

CRUD completo de devedores (soft delete e arquivamento automático quando quitado)

Registro de pagamentos (soft delete disponível)

Home/Dashboard com progresso pago x restante

Visualização de métricas Total e Mensal, com alternância na interface

Calendário e Arquivados

Navegação por calendário: Ano → Mês → Devedores do período

Arquivados: devedores quitados, com opção de reabrir ou excluir

Pagamentos via PIX

Geração de QR Code PIX com polling interno para atualizar o plano automaticamente

Integração com Mercado Pago para assinatura PRO

Exportação e UI

Exportar CSV apenas com os itens visíveis

Interface responsiva (mobile/desktop)

Toastrs e mensagens consistentes para feedback do usuário

Formatação monetária BR (1.234,56)

📦 Estrutura resumida (src/)

Components:
AuthGuard.tsx, BackgroundFX.tsx, Footer.tsx, Navbar.tsx, UserMenu.tsx, ConfirmModal.tsx

Libs:
firebase.ts, money.ts (parseAmountBR / formatMoneyBR), auth.ts

Pages:
Home.tsx, Dashboard.tsx, Debtor.tsx, Metrics.tsx, Profile.tsx, Login.tsx, Register.tsx, ForgotMyPass.tsx
Archived.tsx

Calendário:
calendar/CalendarYears.tsx, CalendarMonths.tsx, CalendarMonthDebtors.tsx

Outros:
types.ts, main.tsx, App.tsx, index.html, tailwind.config.js, postcss.config.js

🧭 Rotas principais
Rota	Descrição
/login	Tela de login + reset de senha
/register	Cadastro de usuário
/	Home / Dashboard
/debt/:id	Página detalhada do devedor
/metrics	Métricas Total/Mensal, por devedor e geral
/calendar → /calendar/:year → /calendar/:year/:month	Navegação por calendário
/archived	Devedores quitados/arquivados
/profile	Perfil do usuário
💡 Convenções de UX

Dinheiro: formatMoneyBR (lib money.ts)

Entrada de valores: aceita 1.000,50 ou 1000.50 (lib parseAmountBR)

Ordenação de pagamentos: mais recentes primeiro

Exclusão: soft delete (pagamentos e devedor)

Arquivamento automático: quando o restante chega a 0 (<= 0,01)
