import OpenAI from "openai";
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI();

// Define the tool function to get current time in New York
function get_time_in_new_york() {
    return new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
}

// Main asynchronous function to call OpenAI with tool
async function callOpenAITool() {
    // Initial context for the conversation
    const context: OpenAI.ChatCompletionMessageParam[] = [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "What is the current time in New York?" }
    ];

    // First call to OpenAI with the tool defined
    const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: context,
        tools: [
            {
                type: "function",
                function: {
                    name: "get_time_in_new_york",
                    description: "Get current time in New York."
                }
            }
        ],
        tool_choice: "auto" // Allow AI to decide whether to use the tool
    });

    // Determine if the tool needs to be invoked
    const willInvokeTool = response.choices[0].finish_reason === "tool_calls";
    const toolCall = response.choices[0].message.tool_calls?.[0];

    if (willInvokeTool && toolCall) {
        const toolName = toolCall.function.name;

        // Check if the tool name matches our defined tool
        if (toolName === "get_time_in_new_york") {
            const time = get_time_in_new_york();

            // Push the AI's tool call message to context
            context.push(response.choices[0].message);

            // Push the tool's output to context
            context.push({
                role: "tool",
                content: time,
                tool_call_id: toolCall.id || ""
            });

            // Second call to OpenAI with the updated context including tool output
            const secondResponse = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: context
            });

            // Print the final response from the AI
            console.log(secondResponse.choices[0].message.content);
        }
    } else {
        // If no tool call, print the initial response content
        console.log(response.choices[0].message.content);
    }
}

// Call the main function
callOpenAITool();