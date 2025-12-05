import OpenAI from "openai";

import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export async function callLLM(messages: ChatCompletionMessageParam[]) {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const resp = await client.chat.completions.create({
        model,
        messages,
        temperature: 0.2
    });
    if (!resp.choices || !resp.choices[0] || !resp.choices[0].message?.content) {
        console.error("OpenAI API returned an unexpected response:", resp);
        throw new Error("Failed to get a valid response from OpenAI API.");
    }
    return resp.choices[0].message.content;
}