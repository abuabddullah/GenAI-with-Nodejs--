/* requirement:
Agentic AI Project

Overview / Story: A chatbot designed for general communication, including discussions about learning topics, news, and weather updates.

Tool : API usage .

Task Example:
 Prompt: “I want to schedule an AI/ML session on the 5th.”
Steps:
- Access Google Calendar and create an event for the session on the 5th with the specified topic.
- Access Gmail to send a notification email about the event.
- Send a message with the topic via WhatsApp or Facebook automatically.

Framework / Tech Stack:
JavaScript: agentkit.inngest or agno.agent
*/

// index.js
import {
    GmailCreateDraft,
    GmailSendMessage,
} from "@langchain/community/tools/gmail";
import {
    GoogleCalendarCreateTool,
    GoogleCalendarViewTool,
} from "@langchain/community/tools/google_calendar";
import { ChatGroq } from "@langchain/groq";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import dotenv from "dotenv";
import express from "express";
import fetch from "node-fetch"; // For Facebook API calls
import twilio from "twilio";

dotenv.config();

const app = express();
app.use(express.json());

// Initialize Groq Chat model
const model = new ChatGroq({
  model: "llama-3.3-70b-versatile",
  temperature: 0,
  maxRetries: 2,
});

// Google Calendar tool params
const googleCalendarParams = {
  credentials: {
    clientEmail: process.env.GOOGLE_CALENDAR_CLIENT_EMAIL,
    privateKey: process.env.GOOGLE_CALENDAR_PRIVATE_KEY.replace(/\\n/g, "\n"),
    calendarId: process.env.GOOGLE_CALENDAR_CALENDAR_ID,
  },
  scopes: [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events",
  ],
  model,
};

// Initialize Twilio client for WhatsApp
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Custom tool to send WhatsApp message via Twilio
const WhatsAppMessageTool = {
  name: "SendWhatsAppMessage",
  description: "Send a WhatsApp message via Twilio API",
  async call({ to, message }) {
    if (!to || !message) {
      throw new Error("Missing 'to' phone number or 'message' content");
    }
    const from = process.env.TWILIO_WHATSAPP_FROM; // e.g. "whatsapp:+1234567890"
    const sentMessage = await twilioClient.messages.create({
      from,
      to: `whatsapp:${to}`,
      body: message,
    });
    return `WhatsApp message sent with SID: ${sentMessage.sid}`;
  },
};

// Custom tool to send Facebook Messenger message via Facebook Graph API
const FacebookMessengerTool = {
  name: "SendFacebookMessage",
  description: "Send a Facebook Messenger message via Facebook Graph API",
  async call({ recipientId, message }) {
    if (!recipientId || !message) {
      throw new Error("Missing 'recipientId' or 'message' content");
    }
    const pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN;
    const url = `https://graph.facebook.com/v17.0/me/messages?access_token=${pageAccessToken}`;

    const body = {
      recipient: { id: recipientId },
      message: { text: message },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Facebook API error: ${errorText}`);
    }

    const data = await response.json();
    return `Facebook message sent with message ID: ${data.message_id}`;
  },
};

// Initialize tools array
const tools = [
  new GoogleCalendarCreateTool(googleCalendarParams),
  new GoogleCalendarViewTool(googleCalendarParams),
  new GmailCreateDraft({
    credentials: {
      clientEmail: process.env.GMAIL_CLIENT_EMAIL,
      privateKey: process.env.GMAIL_PRIVATE_KEY.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/gmail.send"],
    model,
  }),
  new GmailSendMessage({
    credentials: {
      clientEmail: process.env.GMAIL_CLIENT_EMAIL,
      privateKey: process.env.GMAIL_PRIVATE_KEY.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/gmail.send"],
    model,
  }),
  WhatsAppMessageTool,
  FacebookMessengerTool,
];

// Create LangGraph React Agent
const agent = createReactAgent({
  llm: model,
  tools,
});

app.post("/chat", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt in request body" });
    }

    const result = await agent.invoke({
      messages: [{ role: "user", content: prompt }],
    });

    res.json({ output: result.output });
  } catch (error) {
    console.error("Error processing chat:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Agentic AI server running on port ${PORT}`);
});
