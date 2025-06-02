import { GoogleGenerativeAI } from "@google/generative-ai";

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
    let text: string[];
    try {
      // Debug: Log environment variable
      console.log('API Key available:', !!process.env.GOOGLE_GENERATIVE_AI_API_KEY);
      console.log('API Key length:', process.env.GOOGLE_GENERATIVE_AI_API_KEY?.length);

      console.log('Starting AI generation with params:', {
        role, level, type: normalizedType, techstack, amount
      });

      // Initialize AI
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!apiKey) {
        throw new Error('Google AI API key is not configured');
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      console.log('AI client initialized');

      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      console.log('Model selected');

      const prompt = `Generate ${amount} ${normalizedType} interview questions for a ${level} ${role} position.
        Tech Stack: ${techstack}

        IMPORTANT: Return ONLY a valid JSON array of strings, nothing else.
        Format: ["Question 1", "Question 2", ...]
        Rules:
        - No special characters
        - Clear and concise questions
        - Exactly ${amount} questions
        - Technical depth appropriate for ${level} level
      `;

      console.log('Sending prompt to AI...');
      const result = await model.generateContent(prompt);
      console.log('Got result from AI');

      const response = await result.response;
      console.log('Got response from result');

      const responseText = response.text();
      console.log('Raw response:', responseText);
      
      try {
        // First try to parse the entire response as JSON
        const parsed = JSON.parse(responseText);
        if (!Array.isArray(parsed)) {
          throw new Error('Response is not an array');
        }
        text = parsed.map(q => String(q));
      } catch (e) {
        console.error('Failed to parse response:', e);
        throw new Error('Could not parse AI response as JSON array');
      }
      console.log('Extracted text from response');

      if (!text || text.length === 0) {
        throw new Error('Empty response from AI');
      }

      // Update interview document with questions array
      const interview = {
        role,
        type: normalizedType,
        level,
        techstack: techstack.split(',').map(t => t.trim()),
        questions: text,  // Now text is string[]
        userId: userid || null,
        finalized: true,
        coverImage: getRandomInterviewCover(),
        createdAt: new Date().toISOString(),
      };

      console.log('Saving interview:', interview);

      // Save to Firestore
      const docRef = await db.collection('interviews').add(interview);

      return Response.json({
        success: true,
        data: {
          id: docRef.id,
          questions: text,
          type: normalizedType
        }
      }, { status: 200 });
    } catch (error: any) {
      console.error("AI Generation Error:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause,
        code: error.code,
        details: error.details,
        response: error.response,
      });
      return Response.json(
        { 
          success: false, 
          error: "Failed to generate questions", 
          details: error.message,  // Always show error message for debugging
          code: error.code,
          name: error.name
        },
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
