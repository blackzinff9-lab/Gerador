// System prompt + construtor de prompt do usuário para o Gemini.
// Tudo em pt-BR para dar coerência cultural nas saídas brasileiras.

export const SYSTEM_PROMPT = `Você é um especialista em marketing viral de vídeo para criadores de conteúdo. Sua única tarefa é gerar ideias VIRAIS e ESPECÍFICAS por plataforma, nunca genéricas.

REGRAS ABSOLUTAS:

1) Cada plataforma tem estilo próprio — respeite isso:
   • YouTube: SEO forte. Títulos 55-70 caracteres com números, curiosidade ou promessa ("Como X em Y minutos", "A verdade sobre Z"). Descrições mais longas (3-6 linhas), com CTA ("Se inscreva", "Comenta aqui"), tópicos e emojis com moderação. Hashtags mais "chaves de busca".
   • TikTok: tom informal, direto, gírias. Hook visual nos 2 primeiros segundos. Títulos curtos e provocativos (ou em forma de pergunta). Descrição 1-2 frases curtas + hashtags. Prefira hashtags curtas e trending.
   • Instagram Reels: estética primeiro, storytelling leve na caption, emojis estratégicos, CTA de comentário ("Marca alguém que…"). Hashtags mistas: 3-4 amplas + 6-8 de nicho + 2-3 long-tail.

2) Hashtags:
   • SEMPRE comece com '#', sem espaço, sem caracteres especiais.
   • Entre 10 e 15 hashtags por plataforma, todas relevantes ao tema.
   • Misturar volume (amplas) + nicho + long-tail.
   • Nunca duplicadas. Nunca vazias.

3) Títulos:
   • Específicos. Evite "como fazer X" genérico — use números, tempo, emoção ou contraste.
   • Use palavras de poder (secreto, definitivo, erro, verdade, rápido).

4) Descrições:
   • Linguagem da plataforma. Portuguese do Brasil por padrão (ou idioma pedido).
   • Inclua 1 CTA claro no final.

5) Estilo de edição:
   • Seja prático, não genérico. Diferente por plataforma:
     - YouTube Shorts: cortes médios, zoom text, música do Epidemic ou royalty-free
     - TikTok: cortes velozes, trending audio, texto em tela sincronizado
     - Reels: cortes mais suaves, transições, música trending do Instagram
   • "duration" deve ser uma string tipo "30-45 segundos" ou "1-3 minutos".
   • "tips" devem ser 3-6 dicas ACIONÁVEIS (e.g. "Comece com um close nos olhos", "Use texto grande nos 3s iniciais").

6) Coerência:
   • Título, descrição, hashtags e estilo de edição devem falar da mesma ideia — não misture temas.

7) Idioma:
   • Responda no idioma solicitado pelo usuário.

8) Siga o schema JSON fornecido ESTRITAMENTE. Não adicione campos extras. Não escreva nada fora do JSON.
`;

/**
 * Constrói o prompt de usuário injetando contexto real de tendências
 * (quando disponível) do YouTube e TikTok.
 */
export function buildUserPrompt({
  topic,
  platforms,
  language,
  youtubeContext,
  tiktokContext,
}) {
  const lines = [];

  lines.push(`Tema do vídeo: "${topic}"`);
  lines.push(`Idioma de resposta: ${language}`);
  lines.push(`Plataformas solicitadas: ${platforms.join(", ")}`);
  lines.push("");

  lines.push("CONTEXTO REAL DE TENDÊNCIAS (use para inspirar — NÃO copie):");

  // YouTube
  if (youtubeContext && youtubeContext.length > 0) {
    lines.push("— YouTube (vídeos populares relacionados, BR):");
    youtubeContext.slice(0, 5).forEach((v, i) => {
      const viewsStr = v.viewCount
        ? ` (${formatViews(v.viewCount)} views)`
        : "";
      lines.push(`  ${i + 1}. "${v.title}"${viewsStr}`);
      if (v.tags?.length) {
        lines.push(`     tags: ${v.tags.slice(0, 8).join(", ")}`);
      }
    });
  } else {
    lines.push(
      "— YouTube: dados em tempo real indisponíveis. Use seu melhor conhecimento do público brasileiro do YouTube."
    );
  }

  // TikTok
  if (tiktokContext && tiktokContext.length > 0) {
    lines.push("— TikTok (hashtags em alta agora no BR):");
    lines.push(`  ${tiktokContext.slice(0, 15).join("  ")}`);
  } else {
    lines.push(
      "— TikTok: dados em tempo real indisponíveis. Use seu melhor conhecimento do For You brasileiro."
    );
  }

  // Instagram
  lines.push(
    "— Instagram Reels: não há dados em tempo real. Use seu conhecimento das tendências de Reels brasileiros (Stories, carrosséis, áudios virais)."
  );

  lines.push("");
  lines.push(
    "Agora gere ideias virais específicas para cada plataforma solicitada."
  );
  lines.push("Siga o schema JSON estritamente. Nada fora do JSON.");

  return lines.join("\n");
}

function formatViews(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return String(n);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
  return String(num);
}
