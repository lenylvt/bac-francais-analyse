import type { Poem } from "@/types";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "tngtech/deepseek-r1t-chimera:free";

interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
}

/**
 * Structure d'une analyse individuelle soumise par l'élève
 */
export interface AnalysisSubmission {
  analysisNumber: number;
  selectedWords: string[];
  userAnalysis: string;
}

/**
 * Structure de l'évaluation d'une analyse individuelle
 */
export interface AnalysisEvaluation {
  analysisNumber: number;
  selectedWords: string[];
  userAnalysis: string;
  score: number;
  feedback: string;
  strengths: string[];
  missedPoints: string[];
}

/**
 * Structure de la réponse complète de l'IA
 */
export interface MultipleAnalysesResult {
  evaluations: AnalysisEvaluation[];
  averageScore: number;
  globalFeedback: string;
}

/**
 * Évalue plusieurs analyses d'un même poème en une seule requête API
 * Plus rapide et cohérent que des évaluations séparées
 */
export async function evaluateMultipleAnalyses(
  poem: Poem,
  savedAnalyses: Array<{ selectedWords: string[]; analysis: string }>,
): Promise<MultipleAnalysesResult> {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("Clé API OpenRouter manquante");
  }

  // Vérifier si le poème a une analyse de référence
  const referenceAnalysis =
    poem.analyses || "Pas d'analyse de référence disponible";

  // Construction du JSON des analyses élève
  const analysesJson: AnalysisSubmission[] = savedAnalyses.map(
    (analysis, index) => ({
      analysisNumber: index + 1,
      selectedWords: analysis.selectedWords,
      userAnalysis: analysis.analysis,
    }),
  );

  const systemPrompt = `Tu es un **correcteur du baccalauréat français** version FINAL BOSS.
  Pas de pitié, pas de participation trophy, juste la VÉRITÉ PURE.
  Tu évalues les analyses littéraires comme si ta réputation en dépendait.`;

  const userPrompt = `# POÈME À ANALYSER

**Titre** : "${poem.title}"
**Auteur** : ${poem.author}

**Texte intégral** :
${Array.isArray(poem.fullText) ? poem.fullText.join("\n") : poem.fullText}

---

# ANALYSE DE RÉFÉRENCE COMPLÈTE

${referenceAnalysis}

---

# ANALYSES DE L'ÉLÈVE

L'élève a réalisé ${savedAnalyses.length} analyse(s) distincte(s) :

${JSON.stringify(analysesJson, null, 2)}

---

# CONSIGNES D'ÉVALUATION

Pour CHAQUE analyse que l'élève ose te soumettre :

### 1️⃣ **Massacre Méthodique des Choix de Mots**
- Ces mots sont-ils VRAIMENT importants ou l'élève a juste cliqué au hasard ?
- Est-ce que ça apporte quelque chose ou c'est du remplissage niveau mousse expansive ?
- **Sois sans pitié** : si c'est superflu, DÉNONCE-LE

### 2️⃣ **Dissection Chirurgicale de l'Explication**
- Figures de style : reconnues ou confondues avec la recette des crêpes ?
- Thèmes : compris en profondeur ou survolés en mode "j'ai lu le résumé Wikipédia" ?
- Sens du texte : capté ou complètement à côté de la plaque ?
- **Attends-toi à l'excellence**, pas à de la soupe tiède

### 3️⃣ **Points Forts (s'il y en a)**
- Qu'est-ce qui est RÉELLEMENT bien fait ?
- Pas de compliments gratuits - mérite ou silence
- Sois précis : "bien" c'est pas un argument, "analyse fine de la métaphore filée avec mise en contexte historique" OUI

### 4️⃣ **Les Ratés Monumentaux**
- Qu'est-ce qui AURAIT DÛ être dit et qui brille par son absence ?
- Les éléments cruciaux qu'un élève de Terminale DOIT maîtriser
- Les occasions manquées qui font mal au cœur
- **Liste TOUT** ce qui manque - l'élève doit comprendre où il a merdé

### 5️⃣ **Le Verdict Sans Filtre**
- Note sur 20 - **SÉVÈRE mais JUSTE**
- Pas de notes de complaisance
- Si c'est médiocre, assume le 0/20
- Si c'est brillant, assume le 20/20

## 🎭 TON STYLE D'ÉVALUATION

- **Honnête jusqu'à la brutalité** - mais toujours constructif
- **Précis comme un scalpel** - pas de vague "c'est bien"
- **Motivant malgré la sévérité** - l'objectif c'est la progression
- **Exemples concrets** - montre ce qui aurait dû être dit
- **Zéro langue de bois** - appelle un chat un chat

Tu n'es PAS là pour flatter l'ego.
Tu es là pour FORGER des analystes littéraires d'élite.

**Let's go. Montre-leur ce que "excellence" veut dire.** 🔥

# FORMAT DE RÉPONSE ATTENDU

Réponds UNIQUEMENT avec ce JSON (aucun texte avant ou après) :

{
  "evaluations": [
    {
      "analysisNumber": 1,
      "selectedWords": ["mot1", "mot2"],
      "userAnalysis": "texte de l'élève",
      "score": 12,
      "feedback": "Commentaire spécifique sur cette analyse (2-3 phrases)",
      "strengths": ["Point fort 1", "Point fort 2"],
      "missedPoints": ["Manque 1", "Manque 2"]
    }
  ],
  "averageScore": 12.5,
  "globalFeedback": "Commentaire global sur l'ensemble du travail de l'élève (2-3 phrases)"
}

**IMPORTANT** :
- Retourne une évaluation pour CHAQUE analyse
- Le nombre d'évaluations doit correspondre au nombre d'analyses de l'élève (${savedAnalyses.length})
- Sois précis et constructif dans tes commentaires
- Les commentaires doivent être en français`;

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
      throw new Error(`Erreur API (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error("Réponse vide de l'API");
    }

    // Nettoyer le JSON (enlever les balises markdown si présentes)
    let jsonString = content.trim();
    if (jsonString.startsWith("```json")) {
      jsonString = jsonString.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    } else if (jsonString.startsWith("```")) {
      jsonString = jsonString.replace(/```\n?/g, "");
    }

    // Extraire le JSON
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Impossible d'extraire le JSON de la réponse");
    }

    const result: MultipleAnalysesResult = JSON.parse(jsonMatch[0]);

    // Validation stricte
    if (!result.evaluations || !Array.isArray(result.evaluations)) {
      throw new Error("Le champ 'evaluations' est manquant ou invalide");
    }

    if (result.evaluations.length !== savedAnalyses.length) {
      throw new Error(
        `Nombre d'évaluations incorrect: attendu ${savedAnalyses.length}, reçu ${result.evaluations.length}`,
      );
    }

    // Valider chaque évaluation
    result.evaluations.forEach((evaluation, index) => {
      if (
        typeof evaluation.score !== "number" ||
        !evaluation.feedback ||
        !Array.isArray(evaluation.strengths) ||
        !Array.isArray(evaluation.missedPoints)
      ) {
        throw new Error(
          `Évaluation ${index + 1} invalide: champs manquants ou mal formatés`,
        );
      }
    });

    if (
      typeof result.averageScore !== "number" ||
      typeof result.globalFeedback !== "string"
    ) {
      throw new Error("Champs globaux manquants ou invalides");
    }

    return result;
  } catch (error) {
    console.error("Erreur lors de l'évaluation multiple:", error);
    throw error;
  }
}
