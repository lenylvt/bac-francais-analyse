import type { Poem, UserAnswer, AIEvaluation } from "@/types";
import { apiCache } from "@/utils/cache";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "x-ai/grok-4.1-fast:free";

interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
}

export async function evaluateAnswer(
  poem: Poem,
  userAnswer: UserAnswer,
): Promise<AIEvaluation> {
  // Generate cache key
  const cacheKey = `eval_${poem.id}_${userAnswer.stanzaId}_${userAnswer.selectedWords.sort().join(",")}_${userAnswer.analysis.substring(0, 50)}`;

  // Check cache first
  const cached = apiCache.get<AIEvaluation>(cacheKey);
  if (cached) {
    console.log("Using cached evaluation");
    return cached;
  }

  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Clé API OpenRouter manquante. Ajoutez VITE_OPENROUTER_API_KEY dans .env",
    );
  }

  // Ensure stanzas array exists
  if (!poem.stanzas || poem.stanzas.length === 0) {
    throw new Error("Le poème ne contient pas de strophes");
  }

  const stanza = poem.stanzas.find((s) => s.id === userAnswer.stanzaId);
  const analysis = poem.linearAnalysis?.find(
    (a) => a.stanzaId === userAnswer.stanzaId,
  );

  if (!stanza) {
    throw new Error(`Strophe ${userAnswer.stanzaId} introuvable`);
  }

  if (!analysis) {
    console.warn("Analyse linéaire non trouvée, évaluation basique");
  }

  const systemPrompt = `Tu es un professeur de français expert en analyse littéraire pour le baccalauréat.
Tu évalues les réponses des élèves avec bienveillance mais rigueur.
Tu notes sur 20 et tu donnes un feedback constructif.`;

  const referenceAnalysis = analysis
    ? `Analyse linéaire officielle de référence :
${analysis.analysis}

Mots-clés importants :
${analysis.keywords.map((k) => `- ${k.word}: ${k.explanation}`).join("\n")}`
    : `Analyse les éléments littéraires : figures de style, rythme, thèmes, vocabulaire.`;

  const userPrompt = `Poème : "${poem.title}" de ${poem.author}

Strophe à analyser :
${stanza.lines.join("\n")}

${referenceAnalysis}

Réponse de l'élève :
Mots sélectionnés : ${userAnswer.selectedWords.join(", ")}
Analyse : ${userAnswer.analysis}

Évalue cette réponse en JSON strict avec cette structure exacte :
{
  "score": <nombre entre 0 et 20>,
  "feedback": "<commentaire général>",
  "missedPoints": ["<point 1>", "<point 2>"],
  "strengths": ["<force 1>", "<force 2>"],
  "analysis": "<analyse littéraire complète et détaillée de la strophe au format markdown avec figures de style, thèmes, structure, etc.>"
}

Réponds UNIQUEMENT avec le JSON, sans texte avant ou après.`;

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
        "X-Title": "Bac Français App",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      } as OpenRouterRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      throw new Error(
        `Erreur API (${response.status}): ${errorData.error?.message || errorData.message || "Erreur inconnue"}`,
      );
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error("Réponse vide de l'API");
    }

    // Nettoyer le JSON si l'IA a ajouté du texte autour
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : content;

    const evaluation = JSON.parse(jsonString) as AIEvaluation;

    // Validation basique
    if (
      typeof evaluation.score !== "number" ||
      !evaluation.feedback ||
      !Array.isArray(evaluation.missedPoints) ||
      !Array.isArray(evaluation.strengths) ||
      !evaluation.analysis
    ) {
      throw new Error("Format de réponse invalide");
    }

    // Cache the result
    apiCache.set(cacheKey, evaluation, 10 * 60 * 1000); // 10 minutes

    return evaluation;
  } catch (error) {
    console.error("Erreur lors de l'évaluation:", error);
    throw error;
  }
}

export async function evaluateMultipleAnswers(
  poem: Poem,
  answers: UserAnswer[],
): Promise<{ evaluations: AIEvaluation[]; averageScore: number }> {
  const evaluations: AIEvaluation[] = [];

  for (const answer of answers) {
    const evaluation = await evaluateAnswer(poem, answer);
    evaluations.push(evaluation);
  }

  const averageScore =
    evaluations.reduce((sum, e) => sum + e.score, 0) / evaluations.length;

  return { evaluations, averageScore };
}
