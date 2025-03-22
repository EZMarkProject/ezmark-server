import path from "path";
import { Class, ExamSchedule, Paper, Student, User } from "../../types/type";
import fs from 'fs';
import { ExamResponse } from "../../types/exam";
import { PDFDocument } from "pdf-lib";
import pdf2png from "./pdf2png";
import { nanoid } from "nanoid";
import sharp from "sharp";
import { mmToPixels } from "./tools";
import { recognizeHeader } from "./llm";

const PADDING = 70;

// 启动一个异步任务，专门处理流水线
export async function startMatching(documentId: string) {
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
    const papers: Paper[] = [] // 保存所有试卷的id, startPage, endPage
    const headerComponentId = exam.examData.components.find(com => com.type === 'default-header').id;
    const headerImagePaths = []
    for (let i = 0; i < studentCount; i++) {
        const paperId = nanoid()
        const paperDir = path.join(rootDir, 'public', 'pipeline', schedule.documentId, paperId);
        if (!fs.existsSync(paperDir)) {
            fs.mkdirSync(paperDir, { recursive: true });
        }
        // 计算页面范围
        const startPage = i * pagesPerExam;
        const endPage = startPage + pagesPerExam;
        // 根据页面范围，从allImagesDir中获取图片
        const images = fs.readdirSync(allImagesDir);
        const imagesInRange = images.slice(startPage, endPage);
        // 将图片保存到paperDir中
        imagesInRange.forEach((image, index) => {
            fs.copyFileSync(path.join(allImagesDir, image), path.join(paperDir, `page-${index}.png`));
        });

        // 5.4 更新papers数组,追加一条
        papers.push({ paperId, startPage, endPage, name: '', studentId: '', headerImgUrl: '', studentDocumentId: '' })
        // 5.5 根据Exam的数据，切割题目 public/pipeline/{scheduleDocumentId}/{paperId}/questions
        const questionsDir = path.join(paperDir, 'questions');
        if (!fs.existsSync(questionsDir)) {
            fs.mkdirSync(questionsDir, { recursive: true });
        }

        // 循环处理每一页
        for (let i = 0; i < pagesPerExam; i++) {
            const imgPath = path.join(paperDir, `page-${i}.png`);
            // 加载当前页图片
            const image = sharp(imgPath);
            const imageInfo = await image.metadata();
            // 过滤出当前页面的组件
            const pageComponents = exam.examData.components.filter(com => com.position?.pageIndex === i);
            console.log(`page-${i} has ${pageComponents.length} components`)
            // 循环处理每个组件
            for (let compIndex = 0; compIndex < pageComponents.length; compIndex++) {
                const comp = pageComponents[compIndex];
                const rect = comp.position;
                const outputFilePath = path.join(questionsDir, `${comp.id}.png`); // 组件的id作为文件名
                // 将毫米转换为像素
                const left = 0;
                const top = Math.max(mmToPixels(rect.top, imageInfo) - PADDING, 0);
                const width = imageInfo.width!;
                const height = mmToPixels(rect.height, imageInfo) + PADDING * 2;
                // 裁剪图片
                await image.clone().extract({ left, top, width, height }).toFile(outputFilePath);
            }
        }

        // 把Header添加到数组中
        headerImagePaths.push(path.join(questionsDir, `${headerComponentId}.png`))
    }

    // 6. VLM识别姓名和学号
    // 6.1 识别所有header
    console.log(`Start recognizing header... for schedule ${schedule.documentId}`)
    const headerResults = await Promise.all(headerImagePaths.map(async (path) => {
        const header = await recognizeHeader(path);
        return header;
    }));
    console.log(headerResults)
    console.log(`End recognizing header... for schedule ${schedule.documentId}`)

    // 6.1 更新papers数组,追加name和studentId
    papers.forEach((paper, index) => {
        paper.name = headerResults[index].name;
        paper.studentId = headerResults[index].studentId;
        paper.headerImgUrl = path.join('pipeline', schedule.documentId, paper.paperId, 'questions', `${headerComponentId}.png`)
    });

    // 7. 和students和papers进行比对和关联
    const students = classData.students;

    // 创建匹配和未匹配记录
    const matchedPairs: { paper: Paper, student: Student }[] = []; // 已经匹配好的对
    const unmatchedPapers: Paper[] = []; // 未匹配到学生的试卷
    const matchedStudentIds = new Set();

    // 精确匹配：遍历试卷查找匹配的学生
    for (const paper of papers) {
        const matchedStudent = students.find(student => student.studentId === paper.studentId);
        if (matchedStudent) {
            // 找到匹配的学生
            matchedPairs.push({
                paper,
                student: matchedStudent
            });
            matchedStudentIds.add(matchedStudent.studentId);
        } else {
            // 未找到匹配的学生
            unmatchedPapers.push(paper);
        }
    }
    // 找出未匹配的学生
    const unmatchedStudents = students.filter(student => !matchedStudentIds.has(student.studentId));
    // 记录匹配和未匹配信息
    console.log(`匹配成功: ${matchedPairs.length} 份试卷`);
    console.log(`未匹配试卷: ${unmatchedPapers.length} 份`);
    console.log(`未匹配学生: ${unmatchedStudents.length} 名`);

    // 8. 更新Schedule的result和papers，添加匹配结果
    await strapi.documents('api::schedule.schedule').update({
        documentId: schedule.documentId,
        data: {
            result: JSON.stringify({
                ...schedule.result,
                papers,
                progress: 'MATCH_DONE', // 更新progress
                matchResult: {
                    matched: matchedPairs.map(pair => ({
                        studentId: pair.student.studentId,
                        paperId: pair.paper.paperId,
                        headerImgUrl: path.join('pipeline', schedule.documentId, pair.paper.paperId, 'questions', `${headerComponentId}.png`)
                    })),
                    unmatched: {
                        studentIds: unmatchedStudents.map(student => student.studentId),
                        papers: unmatchedPapers.map(paper => ({
                            paperId: paper.paperId,
                            headerImgUrl: path.join('pipeline', schedule.documentId, paper.paperId, 'questions', `${headerComponentId}.png`)
                        }))
                    },
                    done: unmatchedPapers.length === 0 && unmatchedStudents.length === 0
                }
            })
        }
    });

    // END: 当前流水线结束，在前端展示结果，前端通过接口开启下一个流水线
}
