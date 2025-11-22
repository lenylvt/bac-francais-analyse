import { createPoem } from "./poems";

const FIRECRAWL_API_URL = "https://api.firecrawl.dev/v2/scrape";
const FIRECRAWL_API_KEY = import.meta.env.VITE_FIRECRAWL_API_KEY;
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

export interface ScrapeResult {
  author: string;
  title: string;
  fullText: string;
  analyses: string;
}

/**
 * Scrape a poem analysis from a URL using Firecrawl + OpenRouter
 */
export async function scrapePoem(url: string): Promise<ScrapeResult> {
  // Scrape with Firecrawl
  const firecrawlResponse = await fetch(FIRECRAWL_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      onlyMainContent: true,
      maxAge: 172800000,
      timeout: 360000,
      parsers: [],
      formats: ["markdown"],
    }),
  });

  if (!firecrawlResponse.ok) {
    throw new Error("Impossible de charger la page avec Firecrawl");
  }

  const firecrawlResult = await firecrawlResponse.json();
  const markdown = firecrawlResult.data?.markdown || "";

  if (!markdown) {
    throw new Error("Aucun contenu trouvé");
  }

  // Use OpenRouter to extract and analyze
  const openrouterResponse = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tngtech/deepseek-r1t-chimera:free",
        messages: [
          {
            role: "user",
            content: `Analyse ce contenu markdown d'une page d'analyse littéraire.

            ⚠️ CRITIQUE : Je veux l'INTÉGRALITÉ du contenu
            - TOUT le texte du poème sans exception
            - TOUTE l'analyse littéraire présente dans le markdown
            - Ne résume RIEN, ne coupe RIEN, ne raccourcis RIEN

            Retourne UNIQUEMENT un JSON valide avec cette structure :

            {
              "author": "Nom de l'auteur",
              "title": "Titre du poème/texte",
              "fullText": "Texte COMPLET du poème avec ||| entre chaque vers et ### entre les strophes",
              "analyses": "ANALYSE COMPLÈTE en markdown - inclut TOUT ce qui est écrit dans le markdown original : figures de style, thèmes, structure, versification, syntaxe, registres, etc. Utilise **gras** et *italique* pour la mise en forme. PAS de titres de sections artificiels (pas de '## Analyse stylistique'), juste le contenu d'analyse tel quel, de manière fluide et naturelle"
            }

            Instructions de formatage :
            - fullText : ||| = séparateur de vers, ### = séparateur de strophes
            - analyses : Copie TOUTE l'analyse présente, sans sections artificielles, juste le texte d'analyse brut

            Contenu markdown :
${markdown}`,
          },
        ],
      }),
    },
  );

  if (!openrouterResponse.ok) {
    throw new Error("Erreur OpenRouter");
  }

  const openrouterResult = await openrouterResponse.json();
  const content = openrouterResult.choices[0]?.message?.content || "";

  // Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Impossible d'extraire les données");
  }

  const data = JSON.parse(jsonMatch[0]);

  if (!data.author || !data.title || !data.fullText) {
    throw new Error("Données incomplètes");
  }

  // Convert separators to proper format
  const finalText = data.fullText
    .split("###")
    .map((stanza: string) => stanza.split("|||").join("\n").trim())
    .filter((stanza: string) => stanza)
    .join("\n\n");

  return {
    author: data.author,
    title: data.title,
    fullText: finalText,
    analyses: data.analyses || "Aucune analyse disponible",
  };
}

/**
 * Scrape and save a poem to database
 */
export async function scrapePoemAndSave(url: string): Promise<string> {
  const result = await scrapePoem(url);

  const poem = await createPoem({
    title: result.title,
    author: result.author,
    fullText: result.fullText,
    analyses: result.analyses,
  });

  return poem.$id;
}

/**
 * Search for poems in a list of links
 */
export function searchPoemInLinks(
  links: Array<{ url: string; title?: string; description?: string }>,
  searchQuery: string,
): Array<{ url: string; title?: string; description?: string }> {
  const query = searchQuery.toLowerCase().trim();

  if (!query) return [];

  return links
    .filter((link) => {
      const searchableText = [link.title, link.description, link.url]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    })
    .slice(0, 10);
}
