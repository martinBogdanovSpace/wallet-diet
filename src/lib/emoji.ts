/** Emoji offered when picking a category icon. */
export const CATEGORY_EMOJI = [
  "🛒", "🍞", "🥩", "🍎", "🍽️", "☕", "🍕", "🍷",
  "🏠", "🔑", "💡", "🔥", "💧", "📶", "📱", "📺",
  "🚗", "⛽", "🚌", "🅿️", "🚕", "✈️", "🏨", "🧳",
  "💊", "🩺", "🦷", "💇", "🧴", "🧹", "🛠️", "🪴",
  "👕", "👟", "👶", "🧸", "🐶", "🎓", "📚", "✏️",
  "🎬", "🎮", "🎵", "🏋️", "⚽", "🎉", "🎁", "💐",
  "💼", "💶", "💰", "📈", "🏦", "💳", "🧾", "🎟️",
  "❤️", "⭐", "🔁", "📦",
];

/**
 * The first emoji in the input, or null if it doesn't start with one.
 * Guards the icon field against a name typed into it.
 */
export function firstEmoji(input: string): string | null {
  const first = [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(input.trim())][0]?.segment;
  return first && /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(first) ? first : null;
}
