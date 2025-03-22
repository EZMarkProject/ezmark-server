import OpenAI from "openai";
import { HEADER_PROMPT, MCQ_PROMPT } from "./prompt";
import { zodResponseFormat } from "openai/helpers/zod";
import { Header, HeaderSchema, MCQResult, MCQSchema } from "./schema";
import { imageToBase64 } from "./tools";

const llm = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL,
});

export async function recognizeHeader(imagePath: string): Promise<Header> {
    const response = await llm.chat.completions.create({
        model: process.env.MODEL_NAME,
        messages: [{
            role: "user",
            content: [
                {
                    type: "image_url",
                    image_url: {
                        url: `data:image/png;base64,${imageToBase64(imagePath)}`,
                    },
                },
                {
                    type: "text",
                    text: HEADER_PROMPT,
                },
            ]
        }],
        response_format: zodResponseFormat(HeaderSchema, 'header')
    });

    try {
        const header = JSON.parse(response.choices[0].message.content!);
        return header as Header;
    } catch (error) {
        return {
            name: 'Unknown',
            studentId: 'Unknown'
        }
    }
}

export async function recognizeMCQ(imagePath: string): Promise<MCQResult> {
    const response = await llm.chat.completions.create({
        model: process.env.MODEL_NAME,
        messages: [{
            role: "user",
            content: [
                {
                    type: "image_url",
                    image_url: {
                        url: `data:image/png;base64,${imageToBase64(imagePath)}`,
                    },
                },
                {
                    type: "text",
                    text: MCQ_PROMPT,
                },
            ]
        }],
        response_format: zodResponseFormat(MCQSchema, 'answer')
    });

    try {
        const answer = JSON.parse(response.choices[0].message.content!);
        return answer as MCQResult;
    } catch (error) {
        return {
            answer: ['Unknown']
        };
    }
}
