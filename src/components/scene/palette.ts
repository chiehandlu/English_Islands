import type { CarryKind, WalkerKind } from "@/game/types";

/** 3D 場景用色（與 globals.css 的 @theme 色票一致）。 */
export const SCENE_COLORS = {
  sea: "#7cc4d8",
  sand: "#efdcb2",
  grass: "#8cc084",
  grassCurrent: "#a6d47f",
  grassLocked: "#b9c2b5",
  bridge: "#c8a27a",
  accent: "#db6a41",
  wall: "#fbf6ec",
  wallDark: "#d9d2c5",
  roofDark: "#b4aca0",
  window: "#ffd166",
  windowDark: "#8c857a",
  star: "#f6c344",
  tree: "#5f9e5a",
  trunk: "#8d6a4a",
  soil: "#8c6b4f",
  stone: "#b9b4a8",
  farmGrass: "#a9d18e",
  farmYard: "#e6cf98",
  barn: "#d9534f",
  barnRoof: "#7a3b2e",
};

export const ROOF_COLORS = ["#db6a41", "#e2a93b", "#6aa6a0", "#8b7bc4", "#d98a8a"];

export const FLOW_COLORS: Record<string, string> = {
  F1: "#e76f51",
  F2: "#e2a93b",
  F3: "#2a9d8f",
  F4: "#d65a8a",
  F5: "#6a994e",
  F6: "#7b6cc4",
};

export const WALKER_COLORS: Record<WalkerKind, string> = {
  parent: "#3d5a80",
  partner: "#c0507a",
  child: "#f4a261",
  teen: "#2a9d8f",
  grandparent: "#8d7b68",
  helper: "#ffffff",
};

export const CARRY_COLORS: Record<CarryKind, string> = {
  heart: "#e63946",
  bottle: "#a8dadc",
  schoolbag: "#e2a93b",
  coin: "#f1c40f",
  letter: "#f8f4e3",
  photo: "#7b6cc4",
  medkit: "#ffffff",
  seedling: "#52b788",
};
