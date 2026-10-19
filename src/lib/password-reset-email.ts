const config = {
  apiKey: process.env.RESEND_API_KEY,
  from: process.env.EMAIL_FROM,
  appUrl: process.env.APP_URL ?? process.env.NEXTAUTH_URL,
};

export async function sendPasswordResetEmail(email: string, rawToken: string) {
  if (!config.apiKey || !config.from || !config.appUrl) throw new Error("PASSWORD_RESET_EMAIL_NOT_CONFIGURED");
  const resetUrl = new URL("/reset-password", config.appUrl);
  resetUrl.searchParams.set("token", rawToken);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: config.from,
      to: [email],
      subject: "Reset your Agni Education Advisor password",
      text: `Use this link to reset your password. It expires in 30 minutes and can be used only once:\n\n${resetUrl.toString()}\n\nIf you did not request this, you can ignore this email.`,
    }),
  });
  if (!response.ok) throw new Error("PASSWORD_RESET_EMAIL_FAILED");
}
