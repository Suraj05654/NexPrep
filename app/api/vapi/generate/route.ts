import { GoogleGenerativeAI } from "@google/generative-ai";

import { db } from "@/firebase/admin";

// Optional safe parser
function safeJsonParse(text: string): string[] {
  try {
    // Try direct parse
    return JSON.parse(text);
  } catch {
    // Try to extract array inside string
    const match = text.match(/\[(.*?)\]/);
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
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  console.log('Received request:', {
    method: request.method,
    url: request.url,
    headers: Object.fromEntries(request.headers.entries())
  });

  try {
    // Parse and validate request body
    let body;
    try {
      body = await request.json();
      console.log('Request body:', body);
    } catch (e) {
      console.error('Failed to parse request body:', e);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid JSON in request body',
          details: e instanceof Error ? e.message : 'Unknown error',
          name: e instanceof Error ? e.name : 'Error'
        }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          }
        }
      );
    }

    const { type, role, level, techstack, amount, userid } = body;

    console.log('Extracted fields:', { type, role, level, techstack, amount, userid });

    // Validate required fields
    const requiredFields = { type, role, level, techstack, amount };
    const fieldValidation = Object.entries(requiredFields).map(([key, value]) => ({
      field: key,
      value: value,
      valid: value !== undefined && value !== null && value !== '',
      type: typeof value
    }));

    console.log('Field validation:', fieldValidation);

    const missingFields = fieldValidation
      .filter(field => !field.valid)
      .map(field => field.field);

    if (missingFields.length > 0) {
      const error = {
        success: false,
        error: `Missing required fields: ${missingFields.join(", ")}`,
        validation: fieldValidation
      };
      console.error('Validation failed:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Missing required fields: ${missingFields.join(", ")}` 
        }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          }
        }
      );
    }

    // Validate amount
    console.log('Validating amount:', { amount, type: typeof amount });
    
    if (typeof amount === 'string') {
      try {
        body.amount = parseInt(amount, 10);
        console.log('Converted amount string to number:', body.amount);
      } catch (e) {
        console.error('Failed to parse amount:', e);
      }
    }

    if (!Number.isInteger(body.amount) || body.amount < 1 || body.amount > 10) {
      const error = {
        success: false,
        error: 'Amount must be an integer between 1 and 10',
        details: {
          received: amount,
          type: typeof amount,
          isInteger: Number.isInteger(amount),
          value: body.amount
        }
      };
      console.error('Amount validation failed:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Amount must be an integer between 1 and 10',
          details: error.details
        }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          }
        }
      );
    }

    // Validate type
    console.log('Validating type:', { type, normalized: type?.toLowerCase() });
    
    if (typeof type !== 'string') {
      const error = {
        success: false,
        error: 'Type must be a string',
        details: {
          received: type,
          type: typeof type
        }
      };
      console.error('Type validation failed:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Type must be a string',
          details: error.details
        }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          }
        }
      );
    }

    const normalizedType = type.toLowerCase();
    if (!['technical', 'behavioral'].includes(normalizedType)) {
      const error = {
        success: false,
        error: 'Type must be either "technical" or "behavioral"',
        details: {
          received: type,
          normalized: normalizedType,
          allowedValues: ['technical', 'behavioral']
        }
      };
      console.error('Type validation failed:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Type must be either "technical" or "behavioral"',
          details: error.details
        }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          }
        }
      );
    }
    // Generate questions using AI
    let text: string[] = [];
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

      const prompt = `You are a JSON generator that creates interview questions.
        Task: Generate exactly ${amount} ${normalizedType} interview questions for a ${level} ${role} position.
        Tech Stack: ${techstack}

        OUTPUT RULES:
        1. Return ONLY a JSON array of strings
        2. No explanation, no other text
        3. Each question should be clear and concise
        4. Questions should match ${level} level
        5. No special characters like * or /

        Example output format:
        ["What is your experience with React?", "Explain how useEffect works"]

        Remember: Output ONLY the JSON array, nothing else.
      `;

      // Retry configuration
      const maxRetries = 3;
      const baseDelay = 1000; // 1 second
      let lastError;
      let responseText: string | undefined;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`Attempt ${attempt}/${maxRetries}: Sending prompt to AI...`);
          const result = await model.generateContent(prompt);
          console.log('Got result from AI');

          const response = await result.response;
          console.log('Got response from result');
          
          // Get the response text
          responseText = response.text();
          console.log('Raw response:', responseText);
          
          // If we get here, the request was successful
          lastError = null;
          break;
        } catch (error: any) {
          lastError = error;
          
          // Check if it's a 503 error
          if (error?.message?.includes('503 Service Unavailable')) {
            if (attempt < maxRetries) {
              const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
              console.log(`503 error, retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
          }
          // If it's not a 503 error or we're out of retries, throw the error
          throw error;
        }
      }

      // If we exhausted all retries, throw the last error
      if (lastError) {
        throw lastError;
      }

      if (!responseText) {
        throw new Error('No response received from AI');
      }
      
      try {
        // Try to clean up the response text
        let cleanText = responseText.trim();
        
        // If response starts with ``` or ends with ```, remove them
        cleanText = cleanText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        
        console.log('Cleaned text:', cleanText);
        
        // Try to parse as JSON
        const parsed = JSON.parse(cleanText);
        console.log('Parsed result:', parsed);
        
        if (!Array.isArray(parsed)) {
          throw new Error('Response is not an array');
        }
        
        if (parsed.length !== amount) {
          throw new Error(`Expected ${amount} questions but got ${parsed.length}`);
        }
        
        text = parsed.map(q => String(q));
        console.log('Final questions:', text);
      } catch (e) {
        console.error('Failed to parse response:', e);
        console.error('Response text was:', responseText);
        throw new Error('Could not parse AI response as JSON array');
      }
      console.log('Extracted text from response');

      if (!text || text.length === 0) {
        throw new Error('Empty response from AI');
      }

      // Create interview document
      const interview = {
        userId: userid ? userid.trim().toLowerCase() : null,
        role,
        level,
        type: normalizedType,
        techstack: techstack.split(',').map((t: string): string => t.trim()),
        questions: text,
        createdAt: new Date().toISOString(),
        finalized: true
      };

      console.log('Saving interview:', interview);

      // Save to Firestore
      const docRef = await db.collection('interviews').add(interview);

      return new Response(
        JSON.stringify({ 
          success: true,
          id: docRef.id,
          questions: text,
          type: normalizedType
        }),
        { 
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          }
        }
      );
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
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Failed to generate questions", 
          details: error.message,  // Always show error message for debugging
          code: error.code,
          name: error.name
        }),
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          }
        }
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
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Failed to parse AI response", 
          rawOutput: text 
        }),
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          }
        }
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
      createdAt: new Date().toISOString(),
    };

    // Save to Firestore
    let docRef;
    try {
      docRef = await db.collection("interviews").add(interview);
    } catch (err) {
      console.error("Firestore Error:", err);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to save interview" }),
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          }
        }
      );
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: docRef.id,
          questions: parsedQuestions,
          type: normalizedType
        }
      }),
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      }
    );
  } catch (error) {
    console.error("Unexpected Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "An unexpected error occurred" }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      }
    );
  }
}

export async function GET() {
  return new Response(
    JSON.stringify({ success: true, data: "Thank you!" }),
    { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    }
  );
}
