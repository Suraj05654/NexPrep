import { getCurrentUser } from "@/lib/actions/auth.action";
import { db, auth } from "@/firebase/admin";
import { NextResponse } from "next/server";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  try {
    // Delete user from Firestore
    await db.collection("users").doc(user.id).delete();
    // Delete user from Firebase Auth
    await auth.deleteUser(user.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "Failed to delete account" }, { status: 500 });
  }
} 