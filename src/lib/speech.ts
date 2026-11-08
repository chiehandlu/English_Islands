"use client";

/**
 * 朗讀：用瀏覽器內建的 speechSynthesis，不需要網路或 API。
 * iPad Safari 要在使用者點過畫面之後才會出聲，所以所有朗讀都由按鈕或答題動作觸發。
 */

type Lang = "en-US" | "zh-TW";

let voices: SpeechSynthesisVoice[] = [];

function loadVoices() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) {
    window.speechSynthesis.addEventListener(
      "voiceschanged",
      () => {
        voices = window.speechSynthesis.getVoices();
      },
      { once: true },
    );
  }
}

/** 偏好較自然的語音：iOS 的 Samantha / Google 的英文，中文找 zh-TW。 */
function pickVoice(lang: Lang): SpeechSynthesisVoice | undefined {
  if (voices.length === 0) loadVoices();
  const candidates = voices.filter((v) => v.lang.replace("_", "-").startsWith(lang));
  const preferred = ["Samantha", "Google US English", "Ava", "Allison", "Mei-Jia", "Google 國語"];
  for (const name of preferred) {
    const v = candidates.find((c) => c.name.includes(name));
    if (v) return v;
  }
  return candidates[0];
}

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel();
}

/** 朗讀一段文字；回傳的 Promise 在唸完或被取消時 resolve。 */
export function speak(text: string, lang: Lang = "en-US", rate = 0.9): Promise<void> {
  if (!canSpeak() || !text.trim()) return Promise.resolve();
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = rate;
    const voice = pickVoice(lang);
    if (voice) u.voice = voice;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  });
}

export function speakEnglish(text: string) {
  return speak(text, "en-US", 0.85);
}

export function speakChinese(text: string) {
  return speak(text, "zh-TW", 1);
}
