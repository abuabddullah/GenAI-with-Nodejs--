import Cerebras from "@cerebras/cerebras_cloud_sdk";

const cerebras = new Cerebras({
  apiKey: process.env["CEREBRAS_API_KEY"],
  // This is the default and can be omitted
});

async function main() {
  const stream = await cerebras.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "Are you a robot?",
      },
    ],
    model: "gpt-oss-120b",
    stream: true,
    max_completion_tokens: 65536,
    temperature: 1,
    top_p: 1,
  });

  for await (const chunk of stream) {
    process.stdout.write(
      (chunk as unknown as any).choices[0]?.delta?.content || ""
    );
  }
}

main();
