import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const TOKEN_EXPIRY_HOURS = 24;

export async function generateVerificationToken(userId: string): Promise<string> {
  // Delete any existing tokens for this user
  await prisma.verificationToken.deleteMany({
    where: { userId },
  });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  await prisma.verificationToken.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  return token;
}

export async function verifyEmailToken(
  token: string
): Promise<{ success: boolean; userId?: string; error?: string }> {
  const verificationToken = await prisma.verificationToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!verificationToken) {
    return { success: false, error: "Invalid verification token" };
  }

  if (verificationToken.expiresAt < new Date()) {
    await prisma.verificationToken.delete({ where: { id: verificationToken.id } });
    return { success: false, error: "Verification token has expired" };
  }

  // Mark email as verified
  await prisma.user.update({
    where: { id: verificationToken.userId },
    data: { emailVerified: new Date() },
  });

  // Delete the used token
  await prisma.verificationToken.delete({ where: { id: verificationToken.id } });

  return { success: true, userId: verificationToken.userId };
}

export async function generatePasswordResetToken(userId: string): Promise<string> {
  // Delete any existing tokens for this user
  await prisma.passwordResetToken.deleteMany({
    where: { userId },
  });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  return token;
}

export async function verifyPasswordResetToken(
  token: string
): Promise<{ success: boolean; userId?: string; error?: string }> {
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  if (!resetToken) {
    return { success: false, error: "Invalid reset token" };
  }

  if (resetToken.expiresAt < new Date()) {
    await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });
    return { success: false, error: "Reset token has expired" };
  }

  return { success: true, userId: resetToken.userId };
}

export async function consumePasswordResetToken(token: string): Promise<void> {
  await prisma.passwordResetToken.delete({ where: { token } });
}
