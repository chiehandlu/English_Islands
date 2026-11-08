import type { Unit } from "@/game/types";
import u03 from "./u03.json";
import u04 from "./u04.json";

/**
 * 所有單元，依課本順序。
 * 新增單元：把 Claude 專案產出的 uNN.json 放進這個資料夾，再在這裡加一行 import 與一個項目。
 */
export const UNITS: Unit[] = [u03 as Unit, u04 as Unit];
