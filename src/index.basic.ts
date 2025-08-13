// import OpenAI from "openai";

// const openai = new OpenAI({
//   apiKey: "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",
// });

// const response = openai.responses.create({
//   model: "gpt-4o-mini",
//   input: "what are token left and how its calculated in openai",
//   store: true,
// });

// response.then((result) => console.log(result.output_text));

/* ========================= */

import { OpenAI } from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI();

async function run() {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "user", content: "Hello, how are you?" },
      // {
      //   role: "assistant",
      //   content: "I'm doing great, thank you! How can I assist you today?",
      // },
      // {
      //   role: "system",
      //   content:
      //     "You are a helpful assistant that provides information and answers questions.",
      // },
    ],
  });
  console.log(response.choices[0].message.content);
}
run();
