import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

const port = process.env.PORT || 3000;

// 1. import functions ⬇️⬇️
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";
// 1. import functions ⬆️⬆️**

// 2. create model for gemini ⬇️⬇️
const googleApiKey = process.env.GOOGLE_API_KEY;
if (!googleApiKey) {
  console.warn(
    "AI_GOOGLE_API_KEY is not set. Google calls will fail unless provided."
  );
}
const model = new ChatGoogleGenerativeAI({
  model: "models/gemini-2.5-flash",
  maxOutputTokens: 2048,
  temperature: 0.7,
  apiKey: googleApiKey,
});
// 2. create model for gemini ⬆️⬆️**

// 3. create a tool for rag ⬇️⬇️
const getMenuTool = new DynamicStructuredTool({
  name: "getMenuTool",
  description:
    "Returns the final answer for today's menu for the given category (breakfast, lunch, or dinner). Use this tool to answer the user's menu question directly.",
  schema: z.object({
    category: z
      .string()
      .describe("Type of food. Example: breakfast, lunch, dinner"),
  }),
  func: async ({ category }) => {
    const menus = {
      breakfast: "Aloo Paratha, Poha, Masala Chai",
      lunch: "Paneer Butter Masala, Dal Fry, Jeera Rice, Roti",
      dinner: "Veg Biryani, Raita, Salad, Gulab Jamun",
    };
    return menus[category.toLowerCase()] || "No menu found for that category.";
  },
});
// 3. create a tool for rag ⬆️⬆️**

// 4. create agent ⬇️⬇️
const prompt = ChatPromptTemplate.fromMessages([
  ["system", "You are a hotel assistant. That uses tool when needed."],
  ["human", "{input}"],
  ["ai", "{agent_scratchpad}"],
]);
const agent = await createToolCallingAgent({
  llm: model,
  tools: [getMenuTool],
  prompt,
});
// 4. create agent ⬆️⬆️**

// 5. create executor ⬇️⬇️
const executor = await AgentExecutor.fromAgentAndTools({
  agent,
  tools: [getMenuTool],
  verbose: true, // debugging help
  maxIterations: 1,
  returnIntermediateSteps: true,
});
// 5. create executor ⬆️⬆️**

// 6. create route ⬇️⬇️
app.post("/chat", async (req, res) => {
  const { input } = req.body;
  try {
    const result = await executor.invoke({ input });
    const data = result.intermediateSteps[0].observation;
    if (
      result.output &&
      result.output != "Agent stopped due to max iterations."
    ) {
      return res.json({
        input,
        output: result.output,
      });
    } else if (data != null) {
      return res.json({
        input,
        output: data,
      });
    }
    return res.status(400).json({ error: "No output found" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Something went wrong" });
  }
});
// 6. create route ⬆️⬆️**

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
