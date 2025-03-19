import sharp from "sharp";
import fs from 'fs'

// 转换毫米到像素的函数
export function mmToPixels(mm: number, imageInfo: sharp.Metadata, pageWidthMM: number = 210): number {
    // A4尺寸为210mm x 297mm
    // 计算转换比例：图像宽度（像素）/ 页面宽度（毫米）
    const pixelsPerMm = imageInfo.width! / pageWidthMM;
    return Math.round(mm * pixelsPerMm);
}

export function imageToBase64(image: string) {
    const imageBuffer = fs.readFileSync(image)
    const base64 = imageBuffer.toString('base64')
    return base64
}