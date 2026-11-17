import { NextResponse } from 'next/server';
import { randomBytes, createHash } from 'node:crypto';
import bcrypt from 'bcrypt';
import connectDB from '@/lib/db';
import User from '@/app/models/User.model';
import { sendAccountExistsEmail, sendEmailVerification, sendParentalApprovalEmail } from '@/lib/email';
import { parseJsonBody, registerSchema } from '@/server/validation';

const PARENTAL_CONSENT_AGE = 13;
const ACTIVATION_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function createActivationToken() {
  const token = randomBytes(32).toString('hex');
  return {
    token,
    hash: createHash('sha256').update(token).digest('hex'),
    expiresAt: new Date(Date.now() + ACTIVATION_TOKEN_TTL_MS),
  };
}

function sendActivationEmail(user, activationToken) {
  if (user.parentEmail) {
    return sendParentalApprovalEmail(user.parentEmail, `${user.firstName} ${user.lastName}`, activationToken);
  }
  return sendEmailVerification(user.email, user.firstName, activationToken);
}

/**
 * Answers the same way whether or not the email already has an account, so the
 * endpoint cannot be used to probe for accounts. The difference only shows up in
 * the inbox: an existing active account gets a warning, an unactivated one gets
 * a fresh activation link.
 *
 * Re-registering an unactivated account overwrites its credentials, so a
 * password planted by someone who never controlled the mailbox is not the one
 * that gets activated.
 */
export const POST = async (req) => {
  const { data, errorResponse } = await parseJsonBody(req, registerSchema);
  if (errorResponse) return errorResponse;
  const { firstName, lastName, age, email, parentEmail, password } = data;

  const needsParentalApproval = age < PARENTAL_CONSENT_AGE;
  if (needsParentalApproval && !parentEmail) {
    return NextResponse.json({ message: "L'adresse email d'un parent est requise pour les enfants de moins de 13 ans." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const activation = createActivationToken();

  await connectDB();
  let user = await User.findOne({ email });
  const isNewAccount = !user;

  try {
    if (user?.isActivated) {
      await sendAccountExistsEmail(email);
    } else {
      if (isNewAccount) {
        user = await User.create({
          firstName,
          lastName,
          age,
          email,
          avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${firstName}-${lastName}&backgroundColor=ffdfbf,ffd5dc,d1d4f9,c0aede,b6e3f4`,
          password: passwordHash,
          parentEmail: needsParentalApproval ? parentEmail : null,
          activationTokenHash: activation.hash,
          activationExpiresAt: activation.expiresAt,
        });
      } else {
        user.set({
          firstName,
          lastName,
          age,
          password: passwordHash,
          parentEmail: needsParentalApproval ? parentEmail : null,
          activationTokenHash: activation.hash,
          activationExpiresAt: activation.expiresAt,
        });
        await user.save();
      }
      await sendActivationEmail(user, activation.token);
    }
  } catch (error) {
    console.error('Registration email failed:', error);
    if (isNewAccount && user) await User.deleteOne({ _id: user._id });
    return NextResponse.json({ message: "Erreur lors de l'envoi de l'email. Réessayez plus tard." }, { status: 500 });
  }

  return NextResponse.json({
    message: needsParentalApproval
      ? "Inscription enregistrée. Un email a été envoyé à votre parent pour activer le compte."
      : "Inscription enregistrée. Consultez votre boîte mail pour activer votre compte.",
  }, { status: 201 });
};
