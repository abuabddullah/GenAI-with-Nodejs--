import OpenAI from "openai";
const dotenv = require("dotenv");
dotenv.config();

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey:
    process.env.OPENAI_API_KEY ||
    "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",
});

type Context = {
  role: "user" | "assistant" | "system";
  content: string;
};

const context: Context[] = [
  {
    role: "system",
    content: "You are a helpful assistant.",
  },
  {
    role: "user",
    content: "Hello, how are you?",
  },
];

async function main() {
  const completion = await openai.chat.completions.create({
    model: "openai/gpt-oss-20b:free",
    messages: context,
  });

  console.log(completion.choices[0].message);
  const responseMessage = completion.choices[0].message;

  context.push({
    role: "assistant",
    content: responseMessage.content || "",
  });

  console.log(
    `Assistant: ${completion.choices[0].message.role}, ${completion.choices[0].message.content}`
  );
}

// main();

async function run() {
  const input = require("prompt-sync")({ sigint: true });

  while (true) {
    const userInput = input() as string;
    if (userInput.toLowerCase() === "exit") {
      console.log("Exiting chat...");
      break;
    }

    context.push({
      role: "user",
      content: userInput,
    });
    await main();
  }
}

run();

