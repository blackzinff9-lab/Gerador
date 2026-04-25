# ENGAJAÍ

**Gerador gratuito de títulos, hashtags, descrições e estilos de edição virais para YouTube, TikTok e Instagram Reels.**

Você digita o tema do seu vídeo e escolhe a rede social — o ENGAJAÍ devolve ideias virais específicas e coerentes (não genéricas), usando tendências reais do YouTube combinadas com IA.

100% gratuito para rodar: sem APIs pagas, sem cartão de crédito.

---

## Como funciona

1.  Você escolhe a rede (YouTube, TikTok, Reels ou Todas).
2.  Descreve o tema do vídeo em texto livre (ex: "como fazer bolo de chocolate").
3.  O ENGAJAÍ busca tendências reais do YouTube, envia como contexto para a Groq (rodando o modelo Llama 3) e devolve:
    *   **10–15 hashtags** em alta por plataforma
    *   **Melhor título viral** específico por plataforma
    *   **Melhor descrição** coerente com título e hashtags
    *   **Estilo de edição recomendado** (ritmo, gancho, cortes, música, duração e dicas)

---

## Stack (tudo grátis)

| Camada | Tecnologia |
|---|---|
| Frontend + Backend | Next.js 14 (App Router, JavaScript) |
| IA | Groq (Llama 3) via `groq-sdk` (free tier generoso) |
| YouTube | YouTube Data API v3 (free tier: 10k unidades/dia) |
| Estilo | Tailwind CSS |
| Hospedagem | Railway (plano grátis) |
| Cache | Map em memória (TTL 6–24h) |

---

## Como rodar na sua máquina

### 1. Instalar Node.js (uma vez)

Baixe em https://nodejs.org → **versão LTS** (20.x ou 22.x) → instale com padrões.

Depois, abra o terminal (Mac/Linux) ou PowerShell (Windows) e confirme:

```bash
node -v
npm -v
```

Ambos devem imprimir um número de versão.

### 2. Instalar as dependências do projeto

No terminal, dentro da pasta do projeto:

```bash
npm install
```

### 3. Pegar as chaves de API (grátis)

**Chave da Groq:**
1.  Vá em https://console.groq.com/keys
2.  Entre com sua conta Google.
3.  Clique em **Create API key**.
4.  Copie a chave.

**Chave do YouTube Data API v3:**
1.  Vá em https://console.cloud.google.com
2.  No menu superior, crie um novo projeto (nome: `ENGAJAI`).
3.  Na barra de busca, procure por **"YouTube Data API v3"** → clique **Enable**.
4.  Vá em **APIs & Services → Credentials → Create Credentials → API key**.
5.  Copie a chave.
6.  (Recomendado) clique **Restrict key** e restrinja à **YouTube Data API v3**.

**Credenciais OAuth do Google (pro login):**
1.  No MESMO projeto do passo acima, vá em **APIs & Services → OAuth consent screen**.
2.  Escolha **External**, preencha nome do app, e-mail de suporte e salve.
3.  Vá em **Credentials → Create Credentials → OAuth client ID**.
4.  **Application type**: Web application. Nome: `ENGAJAI`.
5.  Em **Authorized JavaScript origins** adicione `http://localhost:3000`.
6.  Em **Authorized redirect URIs** adicione `http://localhost:3000/api/auth/callback/google`.
7.  **IMPORTANTE:** Você precisará adicionar as URLs de produção do Railway aqui DEPOIS do primeiro deploy.
8.  Copie **Client ID** e **Client Secret**.

**Segredo do NextAuth:**
Gere um valor aleatório no terminal: `openssl rand -base64 32`. Essa string vai no `NEXTAUTH_SECRET`.

### 4. Criar o arquivo `.env.local`

Na raiz do projeto, crie um arquivo chamado `.env.local` e preencha com as suas chaves:

```
GROQ_API_KEY=gsk...sua_chave_groq
YOUTUBE_API_KEY=AIza...sua_chave_youtube
NEXTAUTH_SECRET=o_valor_aleatorio_que_voce_gerou
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
```

> Em produção no Railway, o `NEXTAUTH_URL` será configurado automaticamente ou você poderá defini-lo nas variáveis de ambiente com a URL pública do seu serviço.

### 5. Rodar localmente

```bash
npm run dev
```

Abra http://localhost:3000 no navegador.

---

## Como fazer o deploy grátis no Railway

### 1. Crie uma conta no GitHub

Em https://github.com, crie uma conta grátis se ainda não tem.

### 2. Coloque o projeto no GitHub

No terminal, dentro do projeto:

```bash
git add .
git commit -m "primeiro commit"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/engajai.git
git push -u origin main
```

> Substitua `SEU_USUARIO` pelo seu usuário do GitHub. O repositório pode ser público ou privado.

### 3. Deploy no Railway

1.  Vá em https://railway.app → entre com sua conta do GitHub.
2.  Clique **New Project → Deploy from GitHub repo**.
3.  Selecione o repositório `engajai`.
4.  Assim que o projeto for criado, vá para a aba **Variables** do novo serviço.
5.  Adicione as seguintes variáveis de ambiente:
    *   `GROQ_API_KEY` = sua chave da Groq
    *   `YOUTUBE_API_KEY` = sua chave do YouTube
    *   `NEXTAUTH_SECRET` = o valor aleatório (`openssl rand -base64 32`)
    *   `GOOGLE_CLIENT_ID` = sua credencial OAuth do Google
    *   `GOOGLE_CLIENT_SECRET` = o secret da mesma credencial
    *   `NEXTAUTH_URL` = A URL pública que o Railway gerou para seu app (ex: `https://engajai-production-xxxx.up.railway.app`)
6.  O Railway irá fazer o deploy automaticamente. Vá para a aba **Deployments** para acompanhar.
7.  **Pós-deploy**: Pegue a URL pública do seu app no Railway e volte no painel do Google Cloud. Adicione a URL final do Railway em **Authorized JavaScript origins** e a URL de callback (`https://SUA-URL.up.railway.app/api/auth/callback/google`) em **Authorized redirect URIs**. Sem isso, o botão "Entrar com Google" retorna erro `redirect_uri_mismatch`.

### 4. Atualizações futuras

Toda vez que mudar algo no código:

```bash
git add .
git commit -m "o que mudou"
git push
```

O Railway detecta o push e publica a nova versão automaticamente.

---

## Limites do plano grátis (resumo)

| Serviço | Limite |
|---|---|
| Groq (Llama 3) | Tier gratuito generoso (consulte a documentação oficial para detalhes) |
| YouTube Data API v3 | 10.000 unidades/dia (cada busca por tema custa ~100) |
| Railway Starter | Um valor em dólares de uso computacional gratuito por mês. |

O ENGAJAÍ usa **cache agressivo** (6–24h) para ficar muito dentro desses limites, mesmo com centenas de usuários por dia.

---

## Estrutura do projeto

```
src/
├── app/
│   ├── layout.js              # <html>, fontes, metadata
│   ├── page.js                # página única (form + resultado)
│   ├── globals.css            # Tailwind + utilitários
│   └── api/generate/route.js  # BACKEND — orquestração
├── components/                # UI (form, cards, botões)
└── lib/                       # lógica (groq, youtube, cache…)
```

Arquivos mais importantes:

- `src/app/api/generate/route.js` — fluxo principal do backend
- `src/lib/groq.js` — chamada da Groq com JSON schema
- `src/lib/prompts.js` — system prompt + construtor de prompt
- `src/lib/schema.js` — schema de resposta estruturada

---

## Tratamento de falhas (fail-soft)

- **YouTube falha** → app continua; Groq gera só com conhecimento próprio.
- **Groq falha** → única falha irrecuperável, mostra mensagem amigável em pt-BR.

---

## Roadmap de monetização (futuro)

O código já tem comentários `TODO` marcando onde plugar cada coisa:

- Banner AdSense (em `src/app/page.js`)
- Gate "Pro" na API (em `src/app/api/generate/route.js`)
- Links afiliados (em `src/components/ResultCard.js`)
- Newsletter (em `src/components/Footer.js`)

Nenhum desses está ativo na v1 — foco é estabilizar o produto grátis primeiro.

---

## Licença

Uso pessoal e educativo.
