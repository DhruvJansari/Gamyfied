import type { ProfileSnapshot } from "../scoring/scoring.types";
import { PLACEMENT_TASKS, type PlacementTaskKey } from "./placement.config";

export type PlacementTaskResult = {
  key: PlacementTaskKey;
  title: string;
  required: boolean;
  done: boolean;
  /** Only present while the task is incomplete. */
  hint?: string;
};

export type PlacementResult = {
  requiredCompleted: number;
  requiredTotal: number;
  /** All required tasks done. The persisted `scores.is_ranked` is this, made sticky. */
  isRanked: boolean;
  tasks: PlacementTaskResult[];
};

/** Pure: same snapshot, same answer. The optional task can never change `isRanked`. */
export function evaluatePlacement(snapshot: ProfileSnapshot): PlacementResult {
  const tasks = PLACEMENT_TASKS.map((task): PlacementTaskResult => {
    const { done, hint } = task.evaluate(snapshot);
    return { key: task.key, title: task.title, required: task.required, done, ...(done ? {} : { hint }) };
  });
  const required = tasks.filter((t) => t.required);
  const requiredCompleted = required.filter((t) => t.done).length;
  return {
    requiredCompleted,
    requiredTotal: required.length,
    isRanked: requiredCompleted === required.length,
    tasks,
  };
}
