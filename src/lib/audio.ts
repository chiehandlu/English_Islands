"use client";

import { Howl } from "howler";

/** 音效檔放在 public/audio/；新增時在此註冊。 */
const SOUNDS = {
  select: "/audio/select.mp3",
  travel: "/audio/travel.mp3",
} as const;

export type SoundName = keyof typeof SOUNDS;

const cache = new Map<SoundName, Howl>();
let muted = true; // 預設靜音，使用者主動開啟後才播放

export function setMuted(value: boolean) {
  muted = value;
}

export function isMuted() {
  return muted;
}

export function playSound(name: SoundName) {
  if (muted) return;
  let sound = cache.get(name);
  if (!sound) {
    sound = new Howl({ src: [SOUNDS[name]], volume: 0.6 });
    cache.set(name, sound);
  }
  sound.play();
}
