const { OpenAI } = require("openai");
const dotenv = require("dotenv");
dotenv.config();

const openai = new OpenAI();

type Context = {
  role: "user" | "assistant" | "system";
  content: string;
};

// Configuration for context management
const CONFIG = {
  MAX_CONTEXT_LENGTH: 10, // Maximum number of messages to keep
  MAX_TOKENS_ESTIMATE: 3000, // Rough token limit before pruning
  KEEP_RECENT_MESSAGES: 4, // Always keep this many recent messages
};

// Initialize context with system message
const systemMessage: Context = {
  role: "system",
  content: "You are a helpful assistant.",
};

let context: Context[] = [systemMessage];

// Rough token estimation (4 characters ≈ 1 token)
function estimateTokens(messages: Context[]): number {
  return messages.reduce((total, msg) => total + Math.ceil(msg.content.length / 4), 0);
}

// Summarize old messages to preserve context while reducing tokens
async function summarizeOldMessages(messages: Context[]): Promise<string> {
  const messagesToSummarize = messages.slice(1, -CONFIG.KEEP_RECENT_MESSAGES); // Exclude system and recent messages
  
  if (messagesToSummarize.length === 0) return "";
  
  const conversationText = messagesToSummarize
    .map(msg => `${msg.role}: ${msg.content}`)
    .join("\n");
  
  try {
    const response = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Summarize the following conversation in 2-3 sentences, preserving key information and context."
        },
        {
          role: "user",
          content: conversationText
        }
      ],
      model: "gpt-4o-mini",
      max_tokens: 150
    });
    
    return response.choices[0].message.content || "";
  } catch (error) {
    console.warn("Failed to summarize messages:", error);
    return "Previous conversation context unavailable.";
  }
}

// Manage context to prevent token overflow
async function manageContext() {
  const tokenCount = estimateTokens(context);
  
  // If we're approaching token limits or have too many messages
  if (context.length > CONFIG.MAX_CONTEXT_LENGTH || tokenCount > CONFIG.MAX_TOKENS_ESTIMATE) {
    console.log(`🔄 Managing context (${context.length} messages, ~${tokenCount} tokens)`);
    
    // Get recent messages to keep
    const recentMessages = context.slice(-CONFIG.KEEP_RECENT_MESSAGES);
    const messagesToSummarize = context.slice(1, -CONFIG.KEEP_RECENT_MESSAGES);
    
    if (messagesToSummarize.length > 0) {
      // Create summary of old messages
      const summary = await summarizeOldMessages(context);
      
      if (summary) {
        // Rebuild context: system message + summary + recent messages
        context = [
          systemMessage,
          {
            role: "system",
            content: `Previous conversation summary: ${summary}`
          },
          ...recentMessages
        ];
        
        console.log(`✅ Context optimized: ${context.length} messages, ~${estimateTokens(context)} tokens`);
      }
    }
  }
}

async function chatCompletion() {
  // Manage context before making API call
  await manageContext();
  
  const response = await openai.chat.completions.create({
    messages: context,
    model: "gpt-4o-mini",
    max_tokens: 1000, // Limit response length
  });

  const responseMessage = response.choices[0].message;

  context.push({
    role: "assistant",
    content: responseMessage.content || "",
  });

  console.log(`Assistant: ${responseMessage.content}`);
  console.log(`📊 Context: ${context.length} messages, ~${estimateTokens(context)} tokens\n`);
}

async function run() {
  const input = require("prompt-sync")({ sigint: true });
  
  console.log("🤖 Optimized Chat Assistant (type 'exit' to quit)");
  console.log("💡 Context is automatically managed to avoid token limits\n");

  while (true) {
    const userInput = input("You: ") as string;
    if (userInput.toLowerCase() === "exit") {
      console.log("Exiting chat...");
      break;
    }
    
    if (userInput.trim() === "") {
      console.log("Please enter a message.\n");
      continue;
    }

    context.push({
      role: "user",
      content: userInput,
    });

    try {
      await chatCompletion();
    } catch (error) {
      console.error("❌ Error:", error);
      console.log("Please try again.\n");
    }
  }
}

run();
