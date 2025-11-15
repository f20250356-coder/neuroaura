// src/api/cometClient.ts
// Uses Perplexity as the LLM backend, but keeps the same
// function name (sendToComet) so the rest of the app works.

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

// -------- Perplexity config from .env --------
const PPLX_API_KEY = process.env.EXPO_PUBLIC_PPLX_API_KEY;
const PPLX_BASE_URL =
  process.env.EXPO_PUBLIC_PPLX_BASE_URL ?? "https://api.perplexity.ai";

// Use env if set, otherwise default to a valid Perplexity model ("sonar-pro")
const PPLX_MODEL =
  process.env.EXPO_PUBLIC_PPLX_MODEL &&
  process.env.EXPO_PUBLIC_PPLX_MODEL.trim().length > 0
    ? process.env.EXPO_PUBLIC_PPLX_MODEL.trim()
    : "sonar-pro";

// -------- System prompt for "Your Friend" --------
const SYSTEM_PROMPT = `
You are "Your Friend", a warm, friendly, neurodivergent-affirming assistant.
Communicate gently, clearly, and without judgment.
Use simple language, break information into small steps, and avoid overwhelming the user.
Offer choices such as "short version or detailed?".
Validate feelings, normalize struggles, and maintain a calm, supportive tone.
Avoid medical or diagnostic advice.
Your goal is to help users with ADHD, autism, learning differences, and other neurodivergent traits feel safe, understood, and supported.
If the user asks for medical, diagnostic, or crisis advice, gently remind them you're not a doctor or therapist and encourage them to reach out to a trusted adult or professional.
`;

// Internal type for Perplexity messages (includes system)
type ApiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

// Main function used by YourFriendChat.tsx
export async function sendToComet(
  conversation: ChatMessage[]
): Promise<string> {
  if (!PPLX_API_KEY) {
    console.warn(
      "[Perplexity] API key missing. Set EXPO_PUBLIC_PPLX_API_KEY in your .env."
    );
    throw new Error("Perplexity not configured");
  }

  try {
    // 1) Filter to only user/assistant (no weird roles)
    const filtered: ChatMessage[] = conversation.filter(
      (m) => m.role === "user" || m.role === "assistant"
    );

    // 2) Drop any leading assistant messages so that AFTER the system
    //    message, the first one is always a user (Perplexity requirement).
    while (filtered.length > 0 && filtered[0].role !== "user") {
      filtered.shift();
    }

    // (We know from our UI that once the first user appears,
    //   messages alternate user/assistant correctly.)

    const messages: ApiMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...filtered,
    ];

    const response = await fetch(`${PPLX_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PPLX_API_KEY}`,
      },
      body: JSON.stringify({
        model: PPLX_MODEL,
        messages,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("[Perplexity] HTTP error:", response.status, text);
      throw new Error("Failed to reach Perplexity");
    }

    const data: any = await response.json();

    const content =
      data?.choices?.[0]?.message?.content ??
      "I'm here with you. Something glitched on my side, but you can try again in a moment.";

    return content;
  } catch (err) {
    console.error("[Perplexity] Request error:", err);
    // Soft fallback message so the user isn't left hanging
    return "I’m having trouble thinking clearly right now because my connection to the server glitched. You didn’t do anything wrong. You can try again in a bit, or take a tiny break and come back when you feel ready. 💛";
  }
}