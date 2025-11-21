import { useEffect } from "react";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * Preload API connection to reduce latency on first request
 */
export function usePreloadAPI() {
  useEffect(() => {
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

    if (!apiKey) return;

    // Warm up DNS and TCP connection
    const link = document.createElement("link");
    link.rel = "dns-prefetch";
    link.href = "https://openrouter.ai";
    document.head.appendChild(link);

    const preconnect = document.createElement("link");
    preconnect.rel = "preconnect";
    preconnect.href = "https://openrouter.ai";
    preconnect.crossOrigin = "anonymous";
    document.head.appendChild(preconnect);

    // Optional: warm up the API with a minimal request
    const warmUp = async () => {
      try {
        await fetch(OPENROUTER_API_URL, {
          method: "OPTIONS",
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }).catch(() => {
          // Ignore errors, this is just for connection warming
        });
      } catch {
        // Silent fail
      }
    };

    // Delay warmup to not block initial render
    const timer = setTimeout(warmUp, 1000);

    return () => {
      clearTimeout(timer);
      document.head.removeChild(link);
      document.head.removeChild(preconnect);
    };
  }, []);
}
