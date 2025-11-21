import { createPoem } from "./poems";

const FIRECRAWL_API_URL = "https://api.firecrawl.dev/v1/scrape";
const FIRECRAWL_API_KEY = "fc-30b220a1ecac4609a71a83f2c25df551";

export interface ScrapeResult {
  author: string;
  title: string;
  fullText: string;
  analyses: string;
}

interface FirecrawlExtractData {
  isNotGood?: boolean;
  author?: string;
  text_name?: string;
  text_content?: string;
  thematic_analysis?: string;
  stylistic_analysis?: string;
  structural_analysis?: string;
  contextual_analysis?: string;
  line_by_line_commentary?: string;
  conclusion?: string;
  critical_perspectives?: string;
  vocabulary_notes?: string;
}

/**
 * Pre-check if the page contains valid literary analysis markers
 */
async function validatePageContent(url: string): Promise<void> {
  const response = await fetch(FIRECRAWL_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["markdown"],
      onlyMainContent: true,
    }),
  });

  if (!response.ok) {
    throw new Error("Impossible de vérifier le contenu de la page");
  }

  const result = await response.json();
  const content = result.data?.markdown || "";

  const hasValidMarkers =
    content.includes("Texte étudié") || content.includes("Poème étudié") || content.includes("Poème analysé") || content.includes("Texte analysé") || content.includes("Extrait analysé") || content.includes("Extrait étudié");

  if (!hasValidMarkers) {
    throw new Error(
      "Cette page ne contient pas d'analyse littéraire",
    );
  }
}

/**
 * Scrape a poem analysis from commentairecompose.fr using Firecrawl
 */
export async function scrapePoem(url: string): Promise<ScrapeResult> {
  // Pre-validation
  await validatePageContent(url);

  const response = await fetch(FIRECRAWL_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["extract"],
      onlyMainContent: true,
      maxAge: 172800000,
      timeout: 360000,
      extract: {
        schema: {
          type: "object",
          properties: {
            isNotGood: {
              type: "boolean",
              description:
                "Set to TRUE if this page is NOT a proper literary analysis with a studied text/poem section. Set to TRUE if you cannot find clear literary commentary and analysis.",
            },
            author: {
              type: "string",
              description: "The author's full name",
            },
            text_name: {
              type: "string",
              description: "The complete title of the literary work",
            },
            text_content: {
              type: "string",
              description:
                "The entire original text, word for word, preserving line breaks and formatting",
            },
            thematic_analysis: {
              type: "string",
              description:
                "Deep exploration of main themes, symbols, motifs, and underlying meanings",
            },
            stylistic_analysis: {
              type: "string",
              description:
                "Literary devices, figures of speech, rhythm, metrics, sound patterns, syntax, and writing style with specific examples",
            },
            structural_analysis: {
              type: "string",
              description:
                "Text structure, composition, stanza organization, verse patterns, progression, and internal coherence",
            },
            contextual_analysis: {
              type: "string",
              description:
                "Historical period, author's biography, literary movement, cultural context, and publication circumstances",
            },
            line_by_line_commentary: {
              type: "string",
              description:
                "Detailed verse-by-verse or stanza-by-stanza interpretation with explicit references to specific lines",
            },
            conclusion: {
              type: "string",
              description:
                "Final synthesis connecting all analytical elements and overall interpretation of the work's significance",
            },
            critical_perspectives: {
              type: "string",
              description:
                "Multiple critical interpretations, scholarly debates, or different analytical approaches",
            },
            vocabulary_notes: {
              type: "string",
              description:
                "Definitions of difficult, archaic, or culturally specific words with etymological notes when relevant",
            },
          },
          required: [],
        },
        prompt: `CRITICAL VALIDATION FIRST:
- If this page does NOT contain a proper literary analysis with a studied text/poem, set "isNotGood" to true and STOP.
- Only proceed with extraction if you find a clear "Texte étudié" or "Poème étudié" section with actual literary commentary.

If this IS a valid literary analysis page, set "isNotGood" to false and extract:

**Essential Elements:**
- Complete original text with exact formatting and line breaks
- Full author name and precise title of the work

**Core Analysis (extract every detail available):**
- Thematic analysis: identify ALL themes, symbols, recurring motifs, and deeper meanings
- Stylistic analysis: catalog EVERY literary device, figure of speech, sound effect, rhythm pattern, and syntax choice with textual evidence
- Structural analysis: map the entire composition, stanza arrangement, verse progression, and organizational logic
- Historical & biographical context: period, movement, author's life events relevant to the work

**Detailed Commentary:**
- Line-by-line or verse-by-verse explanation referencing specific passages
- Multiple critical interpretations if presented
- Vocabulary explanations for challenging terms

**Synthesis:**
- Concluding interpretation tying all elements together

Extract EVERY paragraph, explanation, commentary, and analytical note present on the page. Prioritize completeness and depth over brevity.`,
        agent: { model: "FIRE-1" },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`Firecrawl API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || "Failed to scrape poem");
  }

  const data = result.data?.extract as FirecrawlExtractData | undefined;

  // Check if AI determined this is not a valid analysis
  if (data?.isNotGood === true) {
    throw new Error(
      "Cette page n'est pas une analyse littéraire valide selon l'IA",
    );
  }

  if (!data?.author || !data?.text_name || !data?.text_content) {
    throw new Error(
      "Données incomplètes : auteur, titre ou texte manquant dans l'extraction",
    );
  }

  // Build comprehensive analysis with clear sections
  const analysisSections = [
    {
      title: "Analyse thématique",
      content: data.thematic_analysis,
    },
    {
      title: "Analyse stylistique",
      content: data.stylistic_analysis,
    },
    {
      title: "Analyse structurelle",
      content: data.structural_analysis,
    },
    {
      title: "Contexte historique et biographique",
      content: data.contextual_analysis,
    },
    {
      title: "Commentaire détaillé",
      content: data.line_by_line_commentary,
    },
    {
      title: "Perspectives critiques",
      content: data.critical_perspectives,
    },
    {
      title: "Notes de vocabulaire",
      content: data.vocabulary_notes,
    },
    {
      title: "Conclusion",
      content: data.conclusion,
    },
  ];

  const fullAnalysis = analysisSections
    .filter((section) => section.content?.trim())
    .map((section) => `## ${section.title}\n\n${section.content}`)
    .join("\n\n");

  return {
    author: data.author,
    title: data.text_name,
    fullText: data.text_content,
    analyses: fullAnalysis || "Aucune analyse disponible",
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