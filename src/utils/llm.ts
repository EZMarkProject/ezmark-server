import OpenAI from "openai";
import { HEADER_PROMPT } from "./prompt";
import { zodResponseFormat } from "openai/helpers/zod";
import { Header, HeaderSchema } from "./schema";
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
        const header = HeaderSchema.parse(JSON.parse(response.choices[0].message.content!));
        return header as Header;
    } catch (error) {
        return {
            name: 'Unknown',
            studentId: 'Unknown'
        }
    }
}