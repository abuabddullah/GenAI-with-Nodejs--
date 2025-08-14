import Cerebras from "@cerebras/cerebras_cloud_sdk";
import 'dotenv/config';

const cerebras = new Cerebras({
  apiKey: process.env.CEREBRAS_API_KEY,
});

// Define the tool function to get current time in New York
function get_time_in_new_york() {
  return new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
}

// Main asynchronous function to call Cerebras with tool
async function callCerebrasWithTool() {
  // Initial context for the conversation
  const messages: any[] = [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "What is the current time in New York?" }
  ];

  // First call to Cerebras with the tool defined
  const response = await cerebras.chat.completions.create({
    model: "gpt-oss-120b",
    messages: messages,
    tools: [
      {
        type: "function",
        function: {
          name: "get_time_in_new_york",
          description: "Get current time in New York.",
          parameters: {
            type: "object",
            properties: {},
            required: []
          }
        }
      }
    ],
    tool_choice: "auto" // Allow AI to decide whether to use the tool
  });

  // Determine if the tool needs to be invoked
  const choice = (response as any).choices[0].message;
  
  if (choice.tool_calls) {
    const toolCall = choice.tool_calls[0];
    const toolName = toolCall.function.name;

    // Check if the tool name matches our defined tool
    if (toolName === "get_time_in_new_york") {
      console.log(`Model executing function '${toolName}'`);
      
      const time = get_time_in_new_york();
      console.log(`Time result: ${time}`);

      // Push the AI's tool call message to context
      messages.push(choice);

      // Push the tool's output to context
      messages.push({
        role: "tool",
        content: time,
        tool_call_id: toolCall.id
      });

      // Second call to Cerebras with the updated context including tool output
      const finalResponse = await cerebras.chat.completions.create({
        model: "gpt-oss-120b",
        messages: messages
      });

      // Print the final response from the AI
      console.log("Final AI response:", (finalResponse as any).choices[0].message.content);
    }
  } else {
    // If no tool call, print the initial response content
    console.log("Direct response:", choice.content);
  }
}

// Interactive chat function
async function run() {
  const input = require("prompt-sync")({ sigint: true });
  
  console.log("Cerebras Chat with Time Tool (type 'exit' to quit)");
  console.log("Try asking: 'What is the current time in New York?'");
  
  const messages: any[] = [
    { role: "system", content: "You are a helpful assistant that can get the current time in New York when asked." }
  ];

  while (true) {
    const userInput = input("You: ");
    if (userInput.toLowerCase() === "exit") {
      console.log("Exiting chat...");
      break;
    }

    // Add user input to messages
    messages.push({
      role: "user",
      content: userInput,
    });

    try {
      // Call Cerebras with tool support
      const response = await cerebras.chat.completions.create({
        model: "gpt-oss-120b",
        messages: messages,
        tools: [
          {
            type: "function",
            function: {
              name: "get_time_in_new_york",
              description: "Get current time in New York.",
              parameters: {
                type: "object",
                properties: {},
                required: []
              }
            }
          }
        ],
        tool_choice: "auto"
      });

      const choice = (response as any).choices[0].message;
      
      if (choice.tool_calls) {
        const toolCall = choice.tool_calls[0];
        const toolName = toolCall.function.name;

        if (toolName === "get_time_in_new_york") {
          const time = get_time_in_new_york();

          // Add assistant's tool call message
          messages.push(choice);

          // Add tool result
          messages.push({
            role: "tool",
            content: time,
            tool_call_id: toolCall.id
          });

          // Get final response
          const finalResponse = await cerebras.chat.completions.create({
            model: "gpt-oss-120b",
            messages: messages
          });

          const finalMessage = (finalResponse as any).choices[0].message;
          console.log("Assistant:", finalMessage.content);
          messages.push(finalMessage);
        }
      } else {
        // No tool call needed
        console.log("Assistant:", choice.content);
        messages.push(choice);
      }
    } catch (error) {
      console.error("Error:", (error as any).message);
    }
  }
}

// Run the interactive chat
run();
