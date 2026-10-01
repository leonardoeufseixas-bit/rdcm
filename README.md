# RDCM Transportes e Guincho

Sistema de controle de fretes, cobrança, pagamento da equipe e gastos. Funciona no celular (dá pra instalar como app) e no computador.

O frete é lançado **uma vez** e já aparece:

- na **cobrança** do cliente (agrupado por cliente, ex.: Terra Verde com 3 fretes em aberto);
- no **extrato do motorista** (ganho acumulando frete a frete);
- no **resultado do mês** do Rafael.

## Regra de divisão

Frete de R$ 100:

1. 10% vai direto pro motorista: R$ 10
2. Sobram R$ 90, divididos 50/50: R$ 45 Rafael, R$ 45 motorista
3. **Motorista: R$ 55 · Rafael: R$ 45**

Quando o próprio Rafael dirige, o frete inteiro é dele. Os percentuais podem ser mudados em **Cadastros → Regras** e cada frete guarda a regra com que foi lançado (mudar a regra não altera o passado).

**Resultado do Rafael** = parte dele nos fretes − gastos do período.

## Quem vê o quê

| Perfil | Acesso |
| --- | --- |
| Dono (Rafael) | Tudo, inclusive regras e acessos |
| Administrador | Tudo, menos regras e promover outros admins |
| Colaborador | Só os próprios fretes, gastos e extrato. Pode lançar frete e gasto em nome próprio |
| Pendente | Nada, até o Rafael liberar |

A **primeira conta criada** no sistema vira o dono. Os outros criam a conta na tela de login e o Rafael libera em **Cadastros → Acessos**. As permissões são garantidas no servidor pelas regras do Firestore (`firestore.rules`), não só escondidas na tela.

## Rodar

```bash
npm install
npm run demo   # modo demonstração: dados de exemplo, salvos só no navegador
npm run dev    # usa o Firebase configurado no .env.local
```

No modo demonstração dá pra entrar como Rafael (dono) ou João (motorista) com um clique.

## Colocar no ar (Firebase)

1. Crie um projeto novo em <https://console.firebase.google.com> (sugestão: `rdcm-transportes`). Não use o projeto de outro sistema: o deploy substitui as regras do Firestore dele.
2. No projeto, ative:
   - **Authentication → Método de login → E-mail/senha**
   - **Firestore Database** (modo produção, região `southamerica-east1`)
3. Em **Configurações do projeto → Seus apps → Web**, copie a configuração para o `.env.local` (modelo em `.env.example`).
4. Se o ID do projeto for diferente de `rdcm-transportes`, ajuste o `.firebaserc`.
5. Publique:

```bash
firebase login
npm run deploy   # build + regras do Firestore + hosting
```

O endereço fica `https://<projeto>.web.app`. No celular, abra o link e use "Adicionar à tela inicial".

6. Abra o sistema e crie a conta do Rafael primeiro (ela vira a conta do dono).

## Estrutura

```
src/
  lib/
    calc.ts            regra de divisão e extrato do colaborador
    store.tsx          login, perfil, permissões e dados em tempo real
    firebaseBackend.ts Firestore + Auth (com cache offline)
    demoBackend.ts     modo demonstração (localStorage)
  pages/               Visão geral, Fretes, Cobrança, Equipe, Gastos, Cadastros
  components/          formulário de frete, extrato, componentes visuais
firestore.rules        permissões no servidor
```

## Dados no Firestore

`config/geral`, `usuarios`, `colaboradores`, `clientes`, `veiculos`, `fretes`, `gastos`, `pagamentos`.

O app usa o cache offline do Firestore: com sinal fraco ele continua abrindo e lançando, e sincroniza quando a conexão volta.
