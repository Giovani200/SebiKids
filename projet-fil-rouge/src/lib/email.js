import nodemailer from 'nodemailer';

function sendMail({ to, subject, text }) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
  return transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, text });
}

function activationUrl(activationToken) {
  return `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/activate?token=${activationToken}`;
}

export function sendParentalApprovalEmail(parentEmail, childName, activationToken) {
  return sendMail({
    to: parentEmail,
    subject: 'Approbation parentale requise',
    text: `Bonjour,

Votre enfant ${childName} s'est inscrit sur Sebi. Pour valider son inscription, cliquez sur le lien suivant (valable 7 jours) :

${activationUrl(activationToken)}

Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.`,
  });
}

export function sendEmailVerification(email, firstName, activationToken) {
  return sendMail({
    to: email,
    subject: 'Activez votre compte Sebi',
    text: `Bonjour ${firstName},

Pour activer votre compte, cliquez sur le lien suivant (valable 7 jours) :

${activationUrl(activationToken)}

Si vous n'êtes pas à l'origine de cette inscription, ignorez cet email.`,
  });
}

export function sendAccountExistsEmail(email) {
  return sendMail({
    to: email,
    subject: 'Tentative d\'inscription sur Sebi',
    text: `Bonjour,

Quelqu'un a tenté de créer un compte Sebi avec votre adresse, qui possède déjà un compte.

Si c'était vous, connectez-vous ou utilisez « Mot de passe oublié ». Sinon, ignorez cet email.`,
  });
}

export function sendPasswordResetEmail(email, resetToken) {
  return sendMail({
    to: email,
    subject: 'Réinitialisation du mot de passe',
    text: `Bonjour,

Pour réinitialiser ton mot de passe, clique sur ce lien (valable 10 minutes) :

${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?token=${resetToken}`,
  });
}
