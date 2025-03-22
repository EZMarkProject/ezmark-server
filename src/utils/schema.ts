import { z } from "zod"

export const HeaderSchema = z.object({
    reason: z.string().describe('Reason for the answer. Think step by step. Output before name and studentId.'),
    name: z.string().describe('Student name'),
    studentId: z.string().describe('Student ID'),
})

export interface Header {
    name: string;
    studentId: string;
}

export const MCQSchema = z.object({
    reason: z.string().describe('Reason for the answer. Think step by step. Output before answer.'),
    answer: z.array(z.string()).describe('Answers, such as ["A"], ["B", "C"]'),
})

export interface MCQResult {
    answer: string[];
}
