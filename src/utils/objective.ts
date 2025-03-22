import path from "path";
import { BaseQuestion, Exam, QuestionType, UnionComponent } from "../../types/exam";
import { ExamSchedule } from "../../types/type";

export async function startObjective(documentId: string) {
    // 1. 先通过documentId获得schedule
    const scheduleData = await strapi.documents('api::schedule.schedule').findOne({
        documentId,
        populate: ['exam', 'class', 'teacher']
    });
    const schedule = scheduleData as unknown as ExamSchedule; //

    // 2. 遍历每一个paper，补充学生documentId和name
    schedule.result.papers = await Promise.all(schedule.result.papers.map(async (paper) => {
        const student = await strapi.documents('api::student.student').findFirst({
            filters: {
                studentId: {
                    $eq: paper.studentId,
                }
            },
        });
        paper.studentDocumentId = student?.documentId;
        paper.name = student?.name;
        return paper;
    }));

    // 3. 遍历每一个paper，创建studentPaper
    schedule.result.studentPapers = schedule.result.papers.map((paper) => {
        return {
            student: {
                name: paper.name,
                studentId: paper.studentId,
                documentId: paper.studentDocumentId,
                publishedAt: '',
            },
            paperId: paper.paperId,
            objectiveQuestions: [],
            subjectiveQuestions: [],
            totalScore: 0,
        }
    })

    // 4. 更新schema到数据库
    await strapi.documents('api::schedule.schedule').update({
        documentId,
        data: {
            result: JSON.stringify(schedule.result),
        },
    });

    // 下面的工作都会在schedule.result.studentPapers中进行

    // 目前只有MCQ是客观题
    const OBJECTIVE_TYPES: QuestionType[] = ['multiple-choice']

    // 5. 收集所有的客观题
    const examData = schedule.exam.examData as Exam;
    const objectiveQuestions: UnionComponent[] = []
    for (const question of examData.components) {
        if (OBJECTIVE_TYPES.includes(question.type as QuestionType)) {
            objectiveQuestions.push(question)
        }
    }

    // 6. 遍历每一个question，获得所有学生的答案图片，组装好，发送请求,一道一道题发送
    const rootDir = process.cwd();
    const publicDir = path.join(rootDir, 'public');
    console.log(publicDir)
    for (const question of objectiveQuestions) {
        const questionId = question.id;
        const studentAnswers = schedule.result.papers.map((paper) => {
            return {
                studentId: paper.studentId,
                paperId: paper.paperId,
                answerImage: path.join('pipeline', schedule.documentId, paper.paperId, 'questions', `${questionId}.png`)
            }
        })
        // 发送请求
        console.log(studentAnswers)
    }

    // 客观题流水线结束
    console.log('OBJECTIVEDONE')
}