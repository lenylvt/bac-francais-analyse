import type { Poem, UserAnswer, AIEvaluation } from "@/types";

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
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Clé API OpenRouter manquante. Ajoutez VITE_OPENROUTER_API_KEY dans .env",
    );
  }

  const stanza = poem.stanzas.find((s) => s.id === userAnswer.stanzaId);
  const analysis = poem.linearAnalysis.find(
    (a) => a.stanzaId === userAnswer.stanzaId,
  );

  if (!stanza || !analysis) {
    throw new Error("Strophe ou analyse introuvable");
  }

  const systemPrompt = `Tu es un professeur de français expert en analyse littéraire pour le baccalauréat.
Tu évalues les réponses des élèves avec bienveillance mais rigueur.
Tu notes sur 20 et tu donnes un feedback constructif.`;

  const userPrompt = `Poème : "${poem.title}" de ${poem.author}

Strophe à analyser :
${stanza.lines.join("\n")}

Analyse linéaire officielle de référence :
${analysis.analysis}

Mots-clés importants :
${analysis.keywords.map((k) => `- ${k.word}: ${k.explanation}`).join("\n")}

Réponse de l'élève :
Mots sélectionnés : ${userAnswer.selectedWords.join(", ")}
Analyse : ${userAnswer.analysis}

Évalue cette réponse en JSON strict avec cette structure exacte :
{
  "score": <nombre entre 0 et 20>,
  "feedback": "<commentaire général>",
  "missedPoints": ["<point 1>", "<point 2>"],
  "strengths": ["<force 1>", "<force 2>"]
}

Réponds UNIQUEMENT avec le JSON, sans texte avant ou après.`;

  try {
    console.log("🔑 API Key présente:", !!apiKey);
    console.log("🔑 API Key début:", apiKey?.substring(0, 10) + "...");

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

    console.log("📡 Status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Erreur complète:", errorText);
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      throw new Error(
        `Erreur API OpenRouter (${response.status}): ${errorData.error?.message || errorData.message || errorText}`,
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
      !Array.isArray(evaluation.strengths)
    ) {
      throw new Error("Format de réponse invalide");
    }

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
