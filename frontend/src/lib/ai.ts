const API_KEY = import.meta.env.VITE_AI_API_KEY as string;
const BASE_URL = import.meta.env.VITE_AI_BASE_URL as string;
const MODEL = import.meta.env.VITE_AI_MODEL as string || "gpt-4o-mini";

export type ReceiptResult = {
  amount: string;
  description: string;
  category: string;
  items: { name: string; amount: string }[];
};

export async function scanReceipt(imageBase64: string): Promise<ReceiptResult> {
  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are a receipt scanner. Extract structured data from receipt images.
Return ONLY valid JSON with this exact shape:
{
  "amount": "total amount as a number string, e.g. \"42.50\"",
  "description": "short merchant name or description, e.g. \"Starbucks Coffee\"",
  "category": one of: "food_drink", "transport", "shopping", "entertainment", "bills", "travel", "health", "other",
  "items": [{"name": "item name", "amount": "item price as string"}]
}
If you cannot read the receipt clearly, make your best guess. Always return valid JSON.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Scan this receipt and extract the total amount, description, category, and line items.",
            },
            {
              type: "image_url",
              image_url: {
                url: imageBase64.startsWith("data:")
                  ? imageBase64
                  : `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1024,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AI API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  const content: string = data.choices?.[0]?.message?.content ?? "";

  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse receipt data from AI response");
  }

  const parsed = JSON.parse(jsonMatch[0]) as ReceiptResult;

  // Validate and sanitize
  return {
    amount: String(parseFloat(parsed.amount) || 0),
    description: parsed.description?.slice(0, 100) || "Receipt expense",
    category: [
      "food_drink", "transport", "shopping", "entertainment",
      "bills", "travel", "health", "other",
    ].includes(parsed.category)
      ? parsed.category
      : "other",
    items: Array.isArray(parsed.items)
      ? parsed.items.map((it) => ({
          name: String(it.name || ""),
          amount: String(parseFloat(it.amount) || 0),
        }))
      : [],
  };
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
