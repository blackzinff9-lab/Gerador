
import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { validateGenerateBody } from "@/lib/validation";
import { fetchYouTubeTrends } from "@/lib/youtube";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/prompts";
import { z } from 'zod';
import { responseSchema as schema } from '@/lib/schema';

export const dynamic = "force-dynamic";

// Função para sanitizar o JSON, removendo caracteres de controle inválidos
function sanitizeJsonString(str) {
  return str.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
}

// Função principal da API
export async function POST(request) {
  try {
    // 1. Validação da Chave de API
    if (!process.env.GROQ_API_KEY) {
      throw new Error("A variável de ambiente GROQ_API_KEY não está configurada.");
    }
    const groq = new Groq();

    // 2. Parse e Validação do Corpo da Requisição
    const body = await request.json();
    const validation = validateGenerateBody(body);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error.message }, { status: 400 });
    }
    const { topic, platforms, language, hasVideo, wantsScript } = validation.data;

    // 3. Fetch de Dados Externos (YouTube)
    let youtubeContext = [];
    try {
      youtubeContext = await fetchYouTubeTrends(topic, language);
    } catch (err) {
      console.error("[API] YouTube fetch error:", err.message);
      // Não bloqueia a execução, apenas loga o erro.
    }

    // 4. Construção do Prompt para a IA
    const userPrompt = buildUserPrompt({
      topic,
      platforms,
      language,
      youtubeContext,
      hasVideo,
      wantsScript,
    });

    // 5. Chamada para a API do Groq com o modelo correto
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      model: "meta-llama/llama-4-scout-17b-16e-instruct", // Modelo Scout, conforme logs do Railway
      temperature: 0.7,
      max_tokens: 4096,
      top_p: 1,
      response_format: { type: "json_object", schema: schema },
    });

    // 6. Processamento da Resposta
    const rawContent = chatCompletion.choices[0]?.message?.content;
    if (!rawContent) {
      throw new Error("A IA não retornou conteúdo.");
    }

    // Limpa a string JSON antes de fazer o parse
    const sanitizedContent = sanitizeJsonString(rawContent);
    const parsed = JSON.parse(sanitizedContent);

    const payload = {
      ok: true,
      data: parsed,
      usedRealData: {
        youtube: youtubeContext.length > 0,
      },
      fromCache: false, // Cache desativado por simplicidade
    };

    // 7. Retorno da Resposta
    return NextResponse.json(payload);

  } catch (error) {
    // 8. Tratamento de Erros
    console.error("[API] CATCH-ALL ERROR:", error);
    // Retorna o erro detalhado para facilitar a depuração no lado do cliente
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
