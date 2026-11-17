import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/app/models/User.model';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { parseJsonBody, resetPasswordSchema } from '@/server/validation';

export const POST = async (req) => {
  const { data, errorResponse } = await parseJsonBody(req, resetPasswordSchema);
  if (errorResponse) return errorResponse;
  const { token, newPassword } = data;

  await connectDB();

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    return NextResponse.json({ message: "Lien invalide ou expiré." }, { status: 400 });
  }

  // Mise à jour du mot de passe
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  return NextResponse.json({ message: "Mot de passe réinitialisé avec succès." });
};
