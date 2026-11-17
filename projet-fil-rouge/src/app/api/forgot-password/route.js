import { NextResponse, after } from "next/server";
import crypto from "crypto";
import connectDB from "@/lib/db";
import User from "@/app/models/User.model";
import { sendPasswordResetEmail } from "@/lib/email";
import { forgotPasswordSchema, parseJsonBody } from "@/server/validation";

const RESET_TOKEN_TTL_MS = 10 * 60 * 1000;

/**
 * Always returns the same response, and sends the email after responding, so
 * neither the message nor the response time reveals whether an account exists.
 */
export const POST = async (req) => {
  const { data, errorResponse } = await parseJsonBody(req, forgotPasswordSchema);
  if (errorResponse) return errorResponse;
  const { email } = data;

  await connectDB();
  const user = await User.findOne({ email });

  if (user) {
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.resetPasswordExpires = Date.now() + RESET_TOKEN_TTL_MS;
    await user.save();

    after(() => sendPasswordResetEmail(email, resetToken).catch((error) => console.error("Reset email failed:", error)));
  }

  return NextResponse.json({ message: "Si un compte existe pour cet email, un lien de réinitialisation a été envoyé." });
};
