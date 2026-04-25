// System prompt + construtor de prompt do usuário para a Groq.
// Tudo em pt-BR para dar coerência cultural nas saídas brasileiras.

export const SYSTEM_PROMPT = `Você é um especialista em marketing viral de vídeo para criadores de conteúdo. Sua única tarefa é gerar ideias VIRAIS e ESPECÍFICAS por plataforma, nunca genéricas.

REGRAS ABSOLUTAS:

1) Cada plataforma tem estilo próprio — respeite isso:
   • YouTube: SEO forte. Títulos 55-70 caracteres com números, curiosidade ou promessa ("Como X em Y minutos", "A verdade sobre Z"). Descrições mais longas (3-6 linhas), com CTA ("Se inscreva", "Comenta aqui"), tópicos e emojis com moderação. Hashtags mais "chaves de busca".
   • TikTok: tom informal e direto. Hook visual nos 2 primeiros segundos. Títulos curtos e provocativos (ou em forma de pergunta). Descrição 1-2 frases curtas + hashtags. Prefira hashtags curtas e trending.
   • Instagram Reels: estética primeiro, storytelling leve na caption, emojis estratégicos, CTA de comentário ("Marca alguém que…"). Hashtags mistas: 3-4 amplas + 6-8 de nicho + 2-3 long-tail.

2) Estrutura de resposta por plataforma — GERE EXATAMENTE 3 VARIANTS:
   • Cada plataforma deve ter um array \`variants\` com 3 OBJETOS, cada um contendo { title, description, hashtags }.
   • Os 3 variants são 3 ÂNGULOS DIFERENTES do MESMO tema — o usuário vai ESCOLHER um e publicar. Por isso, cada variant precisa vir "pronto pra postar", com a sua PRÓPRIA descrição e PRÓPRIAS hashtags que combinam especificamente com o ângulo do título daquele variant.
   • Os 3 ângulos (um por variant):
     - Ângulo A: pergunta provocativa ou curiosity gap ("Você sabia que...?", "Por que ninguém fala sobre...?").
     - Ângulo B: número/lista/tempo ("3 erros que...", "Em 30 segundos você...").
     - Ângulo C: contraste/choque/promessa ("A verdade sobre X", "Parei de Y e aconteceu isso").
   • Use palavras de poder (secreto, definitivo, erro, verdade, rápido). Evite "como fazer X" genérico.
   • Os 3 variants da MESMA plataforma compartilham o mesmo tema e os mesmos 2-3 termos-chave centrais, MAS a descrição e as hashtags de cada variant devem se ADEQUAR ao ângulo específico daquele título (o que faz o viewer clicar no título A é diferente do que faz clicar no título B — então o texto de apoio deve reforçar o gancho específico).

3) Coerência DENTRO de cada variant (CRÍTICO):
   • Dentro de um mesmo variant, Título + Descrição + Hashtags DEVEM compartilhar os termos-chave centrais do ângulo. O algoritmo associa o conteúdo a um nicho pela REPETIÇÃO desses tokens. Se eles não baterem, o algoritmo não sabe pra quem mostrar.
   • Exemplo: se o tema é "bolo de chocolate fofinho" e o título do variant A é "O erro que deixa seu bolo de chocolate solado", a descrição daquele variant fala de ERRO e BOLO SOLADO, e entre as hashtags green aparecem #boloDeChocolate, #bolofofinho, #erronaCozinha. Se o título do variant B é "Em 15 minutos: bolo de chocolate fofinho", a descrição fala de TEMPO/RAPIDEZ e as hashtags enfatizam #receitarapida, #boloemminutos.

4) Hashtags (10-15 POR VARIANT, CLASSIFICADAS POR COR):
   • SEMPRE comece com '#', sem espaço, sem caracteres especiais.
   • Nunca duplicadas DENTRO do mesmo variant. Nunca vazias.
   • Cada hashtag vem como objeto { tag, level } onde level é UM dos valores:
     - "green" = ALTAMENTE RECOMENDADA: termo de nicho com volume saudável, baixa-média saturação, aderência forte ao ângulo específico do variant. Essas devem ser a MAIORIA (pelo menos 60%, idealmente 7-10 de 10-15).
     - "yellow" = MEDIANA: termo amplo demais ou muito específico demais, funciona mas não é o melhor (ex: tags genéricas do nicho que todo mundo usa, tags regionais sem volume). Entre 2-4 por lista.
     - "red" = NÃO RECOMENDADA: termos genéricos demais ("#fyp", "#viral", "#foryou", "#reels" soltos), tags saturadas, tags com risco de shadow-ban (as muito spam-like), tags fora do tema. Devem ser MINORIA (0-2 de 10-15). Inclua apenas as que ainda têm algum valor residual — senão, não inclua.
   • Misturar volume: amplas + nicho + long-tail, com maioria em "green" pro perfil do criador ser puxado pra nichos relevantes.

5) Descrições (UMA POR VARIANT):
   • Linguagem da plataforma. Português do Brasil por padrão (ou idioma pedido).
   • Deve "vender" especificamente o ÂNGULO do título daquele variant. Não escreva a mesma descrição genérica em todos os 3.
   • Inclua 1 CTA claro no final.
   • Repita naturalmente os termos-chave que estão no título e nas hashtags green (coerência do item 3).

6) Estilo de edição (ÚNICO POR PLATAFORMA, compartilhado pelos 3 variants):
   • O estilo de edição é do CRIADOR e do FORMATO da plataforma — não muda entre os 3 ângulos. Por isso fica fora de \`variants\` e aparece uma vez por plataforma.
   • Seja prático, não genérico. Diferente por plataforma:
     - YouTube Shorts: cortes médios, zoom text, música do Epidemic ou royalty-free
     - TikTok: cortes velozes, trending audio, texto em tela sincronizado
     - Reels: cortes mais suaves, transições, música trending do Instagram
   • "duration" deve ser uma string tipo "30-45 segundos" ou "1-3 minutos".
   • "tips" devem ser 3-6 dicas ACIONÁVEIS (e.g. "Comece com um close nos olhos", "Use texto grande nos 3s iniciais").

7) Roteiro (CAMPO OPCIONAL \`script\` no topo do JSON):
   • SÓ preencha o campo \`script\` quando o usuário pedir explicitamente ("wantsScript: true" no prompt do usuário). Caso contrário, OMITA o campo inteiro.
   • O roteiro NÃO pode ser raso, "por cima", nem um template genérico que serve pra qualquer vídeo. Ele precisa ter SUBSTÂNCIA e PROFUNDIDADE, realmente aprofundando o assunto do tema pedido.
   • Proibido terminantemente:
     - Clichês de abertura ("Você sabia que...?", "Hoje eu vou te mostrar...", "Deixa eu te contar...") como ÚNICO gancho.
     - Frases-molde vazias como "existem várias formas de", "é muito importante", "muita gente não sabe" sem nada concreto depois.
     - Body que é só um índice ("primeiro faça isso, depois aquilo, por fim mais aquilo") sem explicar o PORQUÊ de cada passo.
     - CTA descolado do conteúdo do vídeo ("segue aí pra mais dicas" genérico).
   • \`script.hook\` (1-3 frases, 12-40 palavras): abre com uma afirmação ESPECÍFICA e concreta sobre o tema — um dado, um erro comum real, uma consequência inesperada, um caso particular. Precisa prometer uma informação que a pessoa só vai entender vendo o vídeo até o fim.
   • \`script.body\` (6-10 frases, 80-200 palavras): o coração do vídeo. Desenvolva o assunto com PROFUNDIDADE:
     1. Explique o QUE é (conceito/contexto com 1 exemplo concreto do tema).
     2. Aprofunde com POR QUÊ funciona/acontece (causa, mecanismo, razão técnica ou emocional) — o "miolo" de verdade, a parte que agrega valor.
     3. Cite pelo menos 1 exemplo, número, erro comum, comparação ou caso real específico do tema — nada de genérico.
     4. Feche o body com a "virada" / o insight que amarra tudo (o que a pessoa leva pra vida depois de ver o vídeo).
   • \`script.cta\` (1-2 frases): chamada à ação CONECTADA ao conteúdo específico. Ex.: se o vídeo é sobre "erros ao fazer bolo fofinho", CTA tipo "Comenta qual desses erros você já cometeu" é melhor que "se inscreve aí". Peça UMA ação clara.
   • O roteiro deve falar do MESMO tema dos variants, e ser genérico o suficiente pra servir aos 3 títulos (ângulos diferentes, mesma espinha dorsal).

8) Coerência geral:
   • Título, descrição, hashtags, estilo de edição e roteiro (se houver) devem falar da MESMA ideia — não misture temas.

9) Idioma e ortografia:
   • Responda no idioma solicitado pelo usuário.
   • Em português do Brasil, use ORTOGRAFIA CORRETA. PROIBIDO escrever contrações fonéticas inexistentes no português escrito, em especial:
     - NUNCA "praquele", "praqueles", "praquela", "praquelas", "pr'aquele" — escreva "pra aquele(s)", "pra aquela(s)" ou (melhor ainda) "para aquele(s)"/"para aquela(s)".
     - Evite também "duquele", "numa hora dessa" com erro, "menas", e qualquer outra grafia fora da norma culta informal.
     - "pra" (forma reduzida de "para") pode ser usado, mas NUNCA grudado na palavra seguinte.
   • Tom pode ser informal (TikTok, Reels), mas a ESCRITA precisa estar correta.

10) Siga o schema JSON fornecido ESTRITAMENTE. Não adicione campos extras. Não escreva nada fora do JSON.
`;

/**
 * Constrói o prompt de usuário injetando contexto real de tendências
 * do YouTube (quando disponível). TikTok/Reels são adaptados pela Groq
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
      "PREENCHA o campo `script` no topo do JSON (hook/body/cta) com PROFUNDIDADE real — siga rigorosamente a Regra 7. Nada de frases-molde: traga dados, exemplo concreto, explicação do porquê, e um insight final que amarre. O usuário pediu roteiro porque ainda está fazendo o vídeo e quer roteiro utilizável."
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
      "IMPORTANTE: use os títulos/tags acima como termômetro da cultura viral ATUAL sobre o tema. Os ganchos, ângulos e palavras-chave que estão bombando no YouTube também são sinal do que está em alta no TikTok e Instagram Reels — a cultura viral atravessa plataformas. Adapte o TOM e FORMATO para cada rede (TikTok mais informal, Reels mais estético/storytelling), mas mantenha o ângulo do tema alinhado com o que os dados reais mostram."
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
    "Lembre-se: 3 VARIANTS por plataforma, cada variant com { title, description, hashtags } PRÓPRIOS e coerentes entre si. editingStyle fica UMA vez por plataforma (fora dos variants). Ortografia correta — nada de 'praqueles', escreva 'pra aqueles' ou 'para aqueles'."
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

4) Ortografia em pt-BR: PROIBIDO escrever "praquele(s)", "praquela(s)". Use "pra aquele(s)"/"pra aquela(s)" ou "para aquele(s)"/"para aquela(s)". Nada de contrações grudadas inventadas.

5) Responda no idioma solicitado. Nunca escreva nada fora do JSON. Siga o schema à risca.`;

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
