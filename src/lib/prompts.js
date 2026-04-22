// System prompt + construtor de prompt do usuário para o Gemini.
// Tudo em pt-BR para dar coerência cultural nas saídas brasileiras.

export const SYSTEM_PROMPT = `Você é um especialista em marketing viral de vídeo para criadores de conteúdo. Sua única tarefa é gerar ideias VIRAIS e ESPECÍFICAS por plataforma, nunca genéricas.

REGRAS ABSOLUTAS:

1) Cada plataforma tem estilo próprio — respeite isso:
   • YouTube: SEO forte. Títulos 55-70 caracteres com números, curiosidade ou promessa ("Como X em Y minutos", "A verdade sobre Z"). Descrições mais longas (3-6 linhas), com CTA ("Se inscreva", "Comenta aqui"), tópicos e emojis com moderação. Hashtags mais "chaves de busca".
   • TikTok: tom informal, direto, gírias. Hook visual nos 2 primeiros segundos. Títulos curtos e provocativos (ou em forma de pergunta). Descrição 1-2 frases curtas + hashtags. Prefira hashtags curtas e trending.
   • Instagram Reels: estética primeiro, storytelling leve na caption, emojis estratégicos, CTA de comentário ("Marca alguém que…"). Hashtags mistas: 3-4 amplas + 6-8 de nicho + 2-3 long-tail.

2) Títulos (GERE EXATAMENTE 3 POR PLATAFORMA):
   • Cada plataforma deve ter um array \`titles\` com 3 variações DIFERENTES ENTRE SI — cada uma com um ângulo distinto:
     - Ângulo A: pergunta provocativa ou curiosity gap ("Você sabia que...?", "Por que ninguém fala sobre...?").
     - Ângulo B: número/lista/tempo ("3 erros que...", "Em 30 segundos você...").
     - Ângulo C: contraste/choque/promessa ("A verdade sobre X", "Parei de Y e aconteceu isso").
   • OS 3 TÍTULOS DA MESMA PLATAFORMA devem compartilhar os mesmos 3-5 termos-chave centrais do tema, porque quem escolhe qual título usar espera que os três funcionem com as MESMAS hashtags e descrição.
   • Use palavras de poder (secreto, definitivo, erro, verdade, rápido). Evite "como fazer X" genérico.

3) Coerência entre Título + Descrição + Hashtags (CRÍTICO):
   • Título, descrição e hashtags DEVEM compartilhar os 3-5 termos-chave centrais do tema. O algoritmo do YouTube/TikTok/Reels associa seu conteúdo a um nicho pela REPETIÇÃO desses tokens em título + descrição + tags. Se eles não baterem, o algoritmo não sabe pra quem mostrar.
   • Exemplo: se o tema é "bolo de chocolate fofinho", os 3 títulos, a descrição e pelo menos 5-6 hashtags devem conter variações de "bolo", "chocolate" e "fofinho/fofo".

4) Hashtags (10-15 por plataforma, CLASSIFICADAS POR COR):
   • SEMPRE comece com '#', sem espaço, sem caracteres especiais.
   • Nunca duplicadas. Nunca vazias.
   • Cada hashtag vem como objeto { tag, level } onde level é UM dos valores:
     - "green" = ALTAMENTE RECOMENDADA: termo de nicho com volume saudável, baixa-média saturação, aderência forte ao tema específico. Essas devem ser a MAIORIA (pelo menos 60%, idealmente 7-10 de 10-15).
     - "yellow" = MEDIANA: termo amplo demais ou muito específico demais, funciona mas não é o melhor (ex: tags genéricas do nicho que todo mundo usa, tags regionais sem volume). Entre 2-4 por lista.
     - "red" = NÃO RECOMENDADA: termos genéricos demais ("#fyp", "#viral", "#foryou", "#reels" soltos), tags saturadas, tags com risco de shadow-ban (as muito spam-like), tags fora do tema. Devem ser MINORIA (0-2 de 10-15). Inclua apenas as que ainda têm algum valor residual — senão, não inclua.
   • Misturar volume: amplas + nicho + long-tail, com maioria em "green" pro perfil do criador ser puxado pra nichos relevantes.

5) Descrições:
   • Linguagem da plataforma. Português do Brasil por padrão (ou idioma pedido).
   • Inclua 1 CTA claro no final.
   • Repita naturalmente os termos-chave que estão no título e nas hashtags green (coerência do item 3).

6) Estilo de edição:
   • Seja prático, não genérico. Diferente por plataforma:
     - YouTube Shorts: cortes médios, zoom text, música do Epidemic ou royalty-free
     - TikTok: cortes velozes, trending audio, texto em tela sincronizado
     - Reels: cortes mais suaves, transições, música trending do Instagram
   • "duration" deve ser uma string tipo "30-45 segundos" ou "1-3 minutos".
   • "tips" devem ser 3-6 dicas ACIONÁVEIS (e.g. "Comece com um close nos olhos", "Use texto grande nos 3s iniciais").

7) Roteiro (CAMPO OPCIONAL \`script\` no topo do JSON):
   • SÓ preencha o campo \`script\` quando o usuário pedir explicitamente ("wantsScript: true" no prompt do usuário). Caso contrário, OMITA o campo inteiro.
   • Quando preencher, o roteiro deve ser enxuto e executável por um criador iniciante:
     - \`script.hook\` = 1-2 frases do gancho dos primeiros 0-3 segundos (a primeira coisa que a pessoa vê/ouve).
     - \`script.body\` = 3-6 frases do desenvolvimento (o "miolo" do vídeo, com a informação ou história principal).
     - \`script.cta\` = 1 frase da chamada pra ação final ("comenta X", "salva pra depois", "segue pra parte 2").
   • O roteiro deve falar do MESMO tema do título/descrição/hashtags — e é genérico o suficiente pra servir aos 3 títulos.

8) Coerência geral:
   • Título, descrição, hashtags, estilo de edição e roteiro (se houver) devem falar da MESMA ideia — não misture temas.

9) Idioma:
   • Responda no idioma solicitado pelo usuário.

10) Siga o schema JSON fornecido ESTRITAMENTE. Não adicione campos extras. Não escreva nada fora do JSON.
`;

/**
 * Constrói o prompt de usuário injetando contexto real de tendências
 * do YouTube (quando disponível). TikTok/Reels são adaptados pelo Gemini
 * a partir do sinal do YouTube + conhecimento próprio.
 *
 * @param {object} params
 * @param {string} params.topic
 * @param {string[]} params.platforms
 * @param {string} params.language
 * @param {Array} params.youtubeContext
 * @param {"ready"|"making"} [params.hasVideo="ready"]
 * @param {boolean} [params.wantsScript=false]
 */
export function buildUserPrompt({
  topic,
  platforms,
  language,
  youtubeContext,
  hasVideo = "ready",
  wantsScript = false,
}) {
  const lines = [];

  lines.push(`Tema do vídeo: "${topic}"`);
  lines.push(`Idioma de resposta: ${language}`);
  lines.push(`Plataformas solicitadas: ${platforms.join(", ")}`);
  lines.push(
    `Estado do vídeo: ${hasVideo === "making" ? "ainda está sendo produzido" : "já está pronto/gravado"}`
  );

  if (wantsScript) {
    lines.push(
      "PREENCHA o campo `script` no topo do JSON (hook/body/cta). O usuário pediu uma sugestão de roteiro porque ainda está fazendo o vídeo."
    );
  } else {
    lines.push(
      "NÃO preencha o campo `script` — omita ele completamente do JSON. O usuário não pediu roteiro."
    );
  }
  lines.push("");

  lines.push("CONTEXTO REAL DE TENDÊNCIAS (use para inspirar — NÃO copie):");

  // YouTube — fonte real única. Funciona como termômetro da cultura viral:
  // o que bomba no YouTube sobre o tema também indica o que tá em alta
  // no TikTok e Reels (formatos, ganchos, ângulos, palavras-chave).
  if (youtubeContext && youtubeContext.length > 0) {
    lines.push(
      "— YouTube (vídeos em alta RECENTES sobre o tema — últimos 60 dias, BR):"
    );
    youtubeContext.slice(0, 5).forEach((v, i) => {
      const viewsStr = v.viewCount
        ? ` (${formatViews(v.viewCount)} views)`
        : "";
      lines.push(`  ${i + 1}. "${v.title}"${viewsStr}`);
      if (v.tags?.length) {
        lines.push(`     tags: ${v.tags.slice(0, 8).join(", ")}`);
      }
    });
    lines.push("");
    lines.push(
      "IMPORTANTE: use os títulos/tags acima como termômetro da cultura viral ATUAL sobre o tema. Os ganchos, ângulos e palavras-chave que estão bombando no YouTube também são sinal do que está em alta no TikTok e Instagram Reels — a cultura viral atravessa plataformas. Adapte o TOM e FORMATO para cada rede (TikTok mais informal/gírias, Reels mais estético/storytelling), mas mantenha o ângulo do tema alinhado com o que os dados reais mostram."
    );
  } else {
    lines.push(
      "— YouTube: dados em tempo real indisponíveis no momento. Use seu melhor conhecimento do que está em alta no YouTube/TikTok/Reels brasileiros sobre o tema."
    );
  }

  lines.push("");
  lines.push(
    "Para TikTok e Instagram Reels (não temos dados em tempo real dessas redes): adapte o sinal do YouTube + seu conhecimento das tendências atuais de cada plataforma (formatos de vídeo, áudios virais, tipos de gancho, hashtags que bombam)."
  );

  lines.push("");
  lines.push(
    "Agora gere ideias virais específicas para cada plataforma solicitada."
  );
  lines.push(
    "Lembre-se: 3 títulos por plataforma com ângulos DIFERENTES, hashtags classificadas por cor (green/yellow/red), coerência entre título/descrição/hashtags."
  );
  lines.push("Siga o schema JSON estritamente. Nada fora do JSON.");

  return lines.join("\n");
}

/**
 * Prompt do endpoint `/api/ideas` — gera 10 ideias de próximos vídeos
 * "interligados" pro botão Conteúdo Infinito.
 *
 * Pilar da estratégia: continuidade de série. A pessoa já escolheu um tema
 * e recebeu títulos; agora queremos 10 vídeos que formam uma sequência
 * natural (mesmo universo, públicos sobrepostos, progressão de ideias).
 * Isso cria "playlist de algoritmo" — o feed da plataforma entende que
 * quem assiste um tende a assistir os outros, e puxa o canal.
 */
export const IDEAS_SYSTEM_PROMPT = `Você é um estrategista de conteúdo para criadores de vídeo. Sua tarefa é gerar EXATAMENTE 10 ideias de próximos vídeos formando uma SÉRIE INTERLIGADA a partir de um tema-semente e de títulos já gerados.

REGRAS:

1) As 10 ideias devem compor uma PLAYLIST NATURAL: alguém que assiste o vídeo-semente é o público-alvo dos 10 próximos. Mesmo universo, mesma persona, progressão de subtemas.

2) Interligação:
   • Use os títulos-semente como ponto de partida. Cada uma das 10 ideias é um "próximo passo lógico" — aprofundamento, contraste, bastidor, erro comum, caso real, comparativo, variação regional/temporal, etc.
   • Varie o ÂNGULO entre as 10 (não repita fórmula): alguns educativos, alguns polêmicos, alguns storytime, alguns tutorial curto, alguns reação/opinião.
   • Os termos-chave centrais do tema-semente devem aparecer em PELO MENOS 7 dos 10 títulos, pro algoritmo amarrar o nicho.

3) Formato de cada ideia:
   • \`title\`: título já pronto pra postar (55-70 chars pra YouTube/genérico, mais curto se for claramente TikTok/Reels). Específico, com número/emoção/contraste.
   • \`hook\`: 1 frase (10-20 palavras) explicando o ângulo/gancho — o "porquê isso vira". Em português do Brasil (ou idioma pedido).

4) Responda no idioma solicitado. Nunca escreva nada fora do JSON. Siga o schema à risca.`;

/**
 * Monta o prompt de usuário pras 10 ideias.
 */
export function buildIdeasPrompt({ topic, language, platform, seedTitles }) {
  const lines = [];
  lines.push(`Tema-semente: "${topic}"`);
  lines.push(`Idioma: ${language}`);
  lines.push(`Plataforma principal: ${platform}`);
  lines.push("");

  if (Array.isArray(seedTitles) && seedTitles.length > 0) {
    lines.push("Títulos-semente já gerados (use como ponto de partida):");
    seedTitles.slice(0, 9).forEach((t, i) => {
      lines.push(`  ${i + 1}. "${t}"`);
    });
    lines.push("");
  }

  lines.push(
    "Gere exatamente 10 próximos vídeos INTERLIGADOS, formando uma série coerente que o criador pode postar em sequência. Cada ideia: título específico + 1 frase de gancho (10-20 palavras)."
  );
  lines.push("Siga o schema JSON estritamente.");

  return lines.join("\n");
}

function formatViews(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return String(n);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
  return String(num);
}
