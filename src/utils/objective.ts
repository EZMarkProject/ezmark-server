import path from "path";
import { BaseQuestion, Exam, MultipleChoiceQuestionData, QuestionType, UnionComponent } from "../../types/exam";
import { ExamSchedule } from "../../types/type";
import { recognizeMCQ } from "./llm";
import { MCQResult } from "./schema";

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
    for (const question of objectiveQuestions) {
        const questionId = question.id;
        // 6.1 收集所有学生的答案图片
        const studentAnswers = schedule.result.papers.map((paper) => {
            return {
                studentId: paper.studentId,
                paperId: paper.paperId,
                answerImage: path.join('pipeline', schedule.documentId, paper.paperId, 'questions', `${questionId}.png`)
            }
        })
        // 6.2 发送请求
        console.log(`LLM开始处理MCQ: ${question.id}`)
        console.log(studentAnswers)
        const llmResult: MCQResult[] = await Promise.all(studentAnswers.map(async (studentAnswer) => {
            const imagePath = path.join(publicDir, studentAnswer.answerImage);
            const answer = await recognizeMCQ(imagePath);
            return answer;
        }))
        console.log(`LLM Result: ${question.id}`)
        // 6.3 把llmResult添加到studentPapers中
        llmResult.forEach((result, index) => {
            const studentPaper = schedule.result.studentPapers[index];
            studentPaper.objectiveQuestions.push({
                questionId: question.id,
                studentAnswer: result.answer,
                llmUnknown: result.answer.length === 0 || result.answer.includes('Unknown'), // 是否是LLM识别失败
                score: -1, // 客观题的分数最后再计算
                imageUrl: studentAnswers[index].answerImage,
            });
        });
    }

    // 7. 计算客观题的分数
    // 遍历所有客观题目
    for (const question of objectiveQuestions) {
        const questionData = question as MultipleChoiceQuestionData;
        const questionId = questionData.id;
        const questionAnswer = questionData.answer;
        // 遍历所有学生试卷中的客观题
        for (const studentPaper of schedule.result.studentPapers) {
            const studentAnswer = studentPaper.objectiveQuestions.find((answer) => answer.questionId === questionId);
            if (studentAnswer.llmUnknown) continue // LLM识别失败，跳过不计算
            // 比较学生答案和标准答案数组,如果完全匹配(顺序可以不一样)，则得分，否则0分
            if (studentAnswer.studentAnswer.sort().join(',') === questionAnswer.sort().join(',')) {
                studentAnswer.score = questionData.score;
            } else {
                studentAnswer.score = 0;
            }
        }
    }

    // 8. 更新schema到数据库
    schedule.result.progress = 'OBJECTIVE_DONE'; // 更新进度
    await strapi.documents('api::schedule.schedule').update({
        documentId,
        data: {
            result: JSON.stringify(schedule.result),
        },
    });

    // 客观题流水线结束
    console.log('OBJECTIVE DONE')
}