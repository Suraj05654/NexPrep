import { generateText } from "ai";
import { google } from "@ai-sdk/google";

import { db } from "@/firebase/admin";
import { getRandomInterviewCover } from "@/lib/utils";

// Optional safe parser
function safeJsonParse(text: string): string[] {
  try {
    // Try direct parse
    return JSON.parse(text);
  } catch {
    // Try to extract array inside string
    const match = text.match(/\[(.*?)\]/s);
    if (match) {
      try {
        return JSON.parse(`[${match[1]}]`);
      } catch {
        throw new Error("Invalid embedded array JSON.");
      }
    }
    throw new Error("No valid JSON array found.");
  }
}

export async function POST(request: Request) {
  try {
    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { type, role, level, techstack, amount, userid } = body;

    // Validate required fields
    const requiredFields = { type, role, level, techstack, amount };
    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value && value !== 0)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return Response.json(
        { 
          success: false, 
          error: `Missing required fields: ${missingFields.join(", ")}` 
        },
        { status: 400 }
      );
    }

    // Validate amount
    if (!Number.isInteger(amount) || amount < 1 || amount > 10) {
      return Response.json(
        { 
          success: false, 
          error: 'Amount must be an integer between 1 and 10' 
        },
        { status: 400 }
      );
    }

    // Validate type
    const normalizedType = type.toLowerCase();
    if (!['technical', 'behavioral'].includes(normalizedType)) {
      return Response.json(
        { 
          success: false, 
          error: 'Type must be either "technical" or "behavioral"' 
        },
        { status: 400 }
      );
    }
    // Generate questions using AI
    let text;
    try {
      const response = await generateText({
        model: google("gemini-2.0-flash-001"),
        prompt: `Prepare ${amount} questions for a ${level} ${role} job interview.
          Focus on ${normalizedType} questions.
          Technical stack: ${techstack}.
          Format: Return ONLY a JSON array of strings containing the questions.
          Example format: ["Question 1", "Question 2"]
          Rules:
          - No special characters like / or *
          - Questions should be clear and concise
          - Return exactly ${amount} questions
        `,
      });
      text = response.text;
    } catch (err) {
      console.error("AI Generation Error:", err);
      return Response.json(
        { success: false, error: "Failed to generate questions" },
        { status: 500 }
      );
    }

    console.log("Gemini Response:", text);

    // Parse AI response
    let parsedQuestions: string[];
    try {
      parsedQuestions = safeJsonParse(text);
      
      if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      console.error("JSON Parse Error:", err);
      return Response.json(
        { 
          success: false, 
          error: "Failed to parse AI response", 
          rawOutput: text 
        },
        { status: 500 }
      );
    }

    // Prepare interview document
    const interview = {
      role,
      type: normalizedType,
      level,
      techstack: techstack.split(",").map((t) => t.trim()),
      questions: parsedQuestions,
      userId: userid || null,
      finalized: true,
      coverImage: getRandomInterviewCover(),
      createdAt: new Date().toISOString(),
    };

    // Save to Firestore
    let docRef;
    try {
      docRef = await db.collection("interviews").add(interview);
    } catch (err) {
      console.error("Firestore Error:", err);
      return Response.json(
        { success: false, error: "Failed to save interview" },
        { status: 500 }
      );
    }

    // Return success response
    return Response.json({
      success: true,
      data: {
        id: docRef.id,
        questions: parsedQuestions,
        type: normalizedType
      }
    }, { status: 200 });
  } catch (error) {
    console.error("Unexpected Error:", error);
    return Response.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return Response.json({ success: true, data: "Thank you!" }, { status: 200 });
}
