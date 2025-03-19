import path from "path";
import { Class, ExamSchedule, User } from "../../types/type";
import fs from 'fs';
import { ExamResponse } from "../../types/exam";
import { PDFDocument } from "pdf-lib";
import pdf2png from "./pdf2png";
import { nanoid } from "nanoid";

// 启动一个异步任务，专门处理流水线
export async function startPipeline(documentId: string) {
    // 1. 先通过documentId获得schedule
    const scheduleData = await strapi.documents('api::schedule.schedule').findOne({
        documentId,
        populate: ['exam', 'class', 'teacher']
    });
    const schedule = scheduleData as unknown as ExamSchedule; // 强制将返回结果转换为ExamSchedule类型

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

    // 5. 获得Exam, Class, Teacher数据
    const examData = await strapi.documents('api::exam.exam').findOne({
        documentId: schedule.exam.documentId,
    });
    const classRawData = await strapi.documents('api::class.class').findOne({
        documentId: schedule.class.documentId,
        populate: ['students', 'teacher']
    });
    const teacherData = await strapi.documents('plugin::users-permissions.user').findOne({
        documentId: schedule.teacher.documentId
    });
    const exam = examData as unknown as ExamResponse;
    const classData = classRawData as unknown as Class;
    const teacher = teacherData as unknown as User;


    // 5. 根据Exam的数据分割PDF文件成多份试卷，保存到不同的文件夹
    // 5.1 校验PDF的页数是否等于(学生人数 * 试卷页数)
    const studentCount = classData.students.length;
    const pagesPerExam = exam.examData.components[exam.examData.components.length - 1].position.pageIndex + 1;
    const totalPages = studentCount * pagesPerExam;
    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const actualTotalPages = pdfDoc.getPageCount();
    if (actualTotalPages !== totalPages) {
        const msg = `The number of PDF pages does not equal (number of students * number of exam pages), please check if the PDF file is correct`;
        // TODO 设置progress为ERROR,并且设置一个message
        return;
    }

    // 5.2 把PDF转换成图片
    // 创建public/pipeline/{scheduleDocumentId}/all文件夹,保存PDF的所有图片
    const allImagesDir = path.join(rootDir, 'public', 'pipeline', schedule.documentId, 'all');
    if (!fs.existsSync(allImagesDir)) {
        fs.mkdirSync(allImagesDir, { recursive: true });
    }
    await pdf2png(pdfPath, allImagesDir);

    // 5.3 根据Exam的数据分割PDF文件成多份试卷，保存到不同的文件夹 public/pipeline/{scheduleDocumentId}/{paperId}
    for (let i = 0; i < studentCount; i++) {
        const paperId = nanoid()
        const paperDir = path.join(rootDir, 'public', 'pipeline', schedule.documentId, paperId);
        if (!fs.existsSync(paperDir)) {
            fs.mkdirSync(paperDir, { recursive: true });
        }
        // 计算页面范围
        const startPage = i * pagesPerExam;
        const endPage = startPage + pagesPerExam;
        console.log(startPage, endPage)
        // 根据页面范围，从allImagesDir中获取图片
        const images = fs.readdirSync(allImagesDir);
        const imagesInRange = images.slice(startPage, endPage);
        console.log(imagesInRange)
        // 将图片保存到paperDir中
        imagesInRange.forEach((image, index) => {
            fs.copyFileSync(path.join(allImagesDir, image), path.join(paperDir, `page-${index}.png`));
        });
    }

    // 5.4 更新Schedule的result.papers

}
