import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: "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",
});

const response = openai.responses.create({
  model: "gpt-4o-mini",
  input: "write a haiku about ai",
  store: true,
});

response.then((result) => console.log(result.output_text));