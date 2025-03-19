import { z } from "zod"

export const HeaderSchema = z.object({
    name: z.string().describe('Student name'),
    studentId: z.string().describe('Student ID'),
})

export interface Header {
    name: string;
    studentId: string;
}