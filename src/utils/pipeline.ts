import path from "path";
import { ExamSchedule } from "../../types/type";
import fs from 'fs';

// 启动一个异步任务，专门处理流水线
export async function startPipeline(documentId: string) {
    // 1. 先通过documentId获得schedule
    const scheduleData = await strapi.documents('api::schedule.schedule').findOne({
        documentId
    });

    // 强制将返回结果转换为ExamSchedule类型
    const schedule = scheduleData as unknown as ExamSchedule;

    // 2. 拿到pdfId (从result属性中获取)
    const pdfUrl = schedule.result.pdfUrl; // /uploads/exam_scan_732425fbd9.pdf

    // 3. 通过pdfId直接从文件夹中获取pdf文件
    const rootDir = process.cwd();
    const pdfPath = path.join(rootDir, 'public', pdfUrl);

    // 4. 检查pdf文件是否存在
    if (!fs.existsSync(pdfPath)) {
        console.log('PDF file not found');
        // TODO 设置progress为ERROR,并且设置一个message
        return
    }

    // 5. 读取pdf文件


    console.log(JSON.stringify(schedule, null, 2));
}
