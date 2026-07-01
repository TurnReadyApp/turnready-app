export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { messages } = req.body;
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

    if (!ANTHROPIC_API_KEY) {
      return res.status(200).json({ text: "AI is not configured yet. Ask Harvey to set up the API key." });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: "You are the TurnReady AI assistant built into a professional cleaning management app for Harvey's Professional Cleaning LLC. Help with cleaning protocols, Airbnb staging, property management, and app usage. Keep responses concise and practical for mobile viewing.",
        messages: messages
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(200).json({ error: data.error.message });
    }

    const text = (data.content && data.content[0] && data.content[0].text) || "No response";
    return res.status(200).json({ text });

  } catch (err) {
    return res.status(200).json({ error: err.message });
  }
}
