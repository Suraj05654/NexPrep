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
  const { type, role, level, techstack, amount, userid } = await request.json();

  try {
    const { text } = await generateText({
      model: google("gemini-2.0-flash-001"),
      prompt: `Prepare questions for a job interview.
        The job role is ${role}.
        The job experience level is ${level}.
        The tech stack used in the job is: ${techstack}.
        The focus between behavioural and technical questions should lean towards: ${type}.
        The amount of questions required is: ${amount}.
        Please return only the questions, without any additional text.
        The questions are going to be read by a voice assistant so do not use "/" or "*" or any other special characters which might break the voice assistant.
        Return the questions formatted like this:
        ["Question 1", "Question 2", "Question 3"]
        
        Thank you! <3
    `,
    });

    console.log("Gemini Response:", text);

    let parsedQuestions: string[];
    try {
      parsedQuestions = safeJsonParse(text);
    } catch (err) {
      console.error("JSON Parse Error:", err);
      return Response.json(
          { success: false, error: "Gemini response not valid JSON", rawOutput: text },
          { status: 500 }
      );
    }

    const interview = {
      role,
      type,
      level,
      techstack: techstack.split(",").map((t) => t.trim()),
      questions: parsedQuestions,
      userId: userid,
      finalized: true,
      coverImage: getRandomInterviewCover(),
      createdAt: new Date().toISOString(),
    };

    await db.collection("interviews").add(interview);

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Outer Error:", error);
    return Response.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ success: true, data: "Thank you!" }, { status: 200 });
}
