export interface AnswersApp { type: 'answers'; answer: number | null; draws: number; recent?: number[] }
export type AnswersAction = { type: 'answers-draw'; index: number }
