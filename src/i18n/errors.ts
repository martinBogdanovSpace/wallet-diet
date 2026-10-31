import type { Dict } from "./en";

/** Maps known Supabase / database error messages to translated text. */
export function friendlyError(message: string, t: Dict) {
  if (/invalid login credentials/i.test(message)) return t.errors.invalidCredentials;
  if (/already (been )?registered/i.test(message)) return t.errors.alreadyRegistered;
  if (/email not confirmed/i.test(message)) return t.errors.emailNotConfirmed;
  if (/invalid invite code/i.test(message)) return t.errors.invalidInvite;
  if (/already belong/i.test(message)) return t.errors.alreadyInHousehold;
  return message;
}
