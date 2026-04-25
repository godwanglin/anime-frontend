import type { AiInstructionMessage } from './subtitle-studio';

export const AI_INSTRUCTION_REJECT_MESSAGE =
	'Maaf, aku tidak mengerti maksud kamu. Instruksi cuma bisa untuk translate, auto generate, timing, tone, nama karakter, atau revisi subtitle.';

const timestampPattern =
	/(?:^|[^\d])\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d+)?(?!\d)|\b\d{1,3}\s*m(?:enit)?\s*\d{0,2}\s*s?\b|\b(?:menit|minute|min|detik|second|sec)\b/i;

const subtitleKeywordPattern =
	/\b(subtitle|sub|caption|translate|translation|terjemah|terjemahan|dialog|cue|timing|durasi|duration|sync|sinkron|kalimat|teks|kata|bahasa|indonesia|mandarin|china|jepang|korea|english|tone|style|gaya|formal|santai|natural|kasual|anime|karakter|nama|panggilan|revisi|ubah|ganti|perbaiki|typo|maju|mundur|cepat|lambat|telat|scene|adegan|generate|auto generate)\b/i;

export function isSubtitleAiInstruction(value: string) {
	const text = value.trim();
	return Boolean(text) && (timestampPattern.test(text) || subtitleKeywordPattern.test(text));
}

export function compactAiInstructionMessages(messages: AiInstructionMessage[], limit = 6) {
	return messages
		.filter(
			(message) => message.role === 'user' && isSubtitleAiInstruction(message.content)
		)
		.slice(-limit);
}
