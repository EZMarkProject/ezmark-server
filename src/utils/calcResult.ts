import { ExamSchedule } from "../../types/type";
import { ExamResponse, QuestionType, MultipleChoiceQuestionData } from "../../types/exam";
import { ExamQuestionStatistics } from "../../types/type";

// 计算分数
export async function calcResult(documentId: string) {
    // 1. 先通过documentId获得schedule
    const scheduleData = await strapi.documents('api::schedule.schedule').findOne({
        documentId,
        populate: ['exam', 'class', 'teacher']
    });
    const schedule = scheduleData as unknown as ExamSchedule;
    const exam = schedule.exam as unknown as ExamResponse;

    // 初始化数据结构
    schedule.result.statistics = {
        questions: [],
        average: 0,
        highest: 0,
        lowest: 0,
        median: 0,
        standardDeviation: 0,
    }

    // 先等两秒,没有理由,假装在加载
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('Calculating result...');

    // 2. 遍历每一个学生的答题结果
    schedule.result.studentPapers.forEach((studentPaper, index) => {
        let totalScore = 0;
        // 2.1 计算客观题分数
        studentPaper.objectiveQuestions.forEach((objectiveQuestion) => {
            totalScore += objectiveQuestion.score;
        });
        // 2.2 计算主观题分数
        studentPaper.subjectiveQuestions.forEach((subjectiveQuestion) => {
            totalScore += subjectiveQuestion.score;
        });
        // 2.3 更新schedule
        schedule.result.studentPapers[index].totalScore = totalScore;
    });

    // 3. 计算其他数据
    const averageScore = schedule.result.studentPapers.reduce((acc, studentPaper) => acc + studentPaper.totalScore, 0) / schedule.result.studentPapers.length;
    const highestScore = Math.max(...schedule.result.studentPapers.map((studentPaper) => studentPaper.totalScore));
    const lowestScore = Math.min(...schedule.result.studentPapers.map((studentPaper) => studentPaper.totalScore));
    const medianScore = schedule.result.studentPapers.sort((a, b) => a.totalScore - b.totalScore)[Math.floor(schedule.result.studentPapers.length / 2)].totalScore;
    const standardDeviation = Math.sqrt(schedule.result.studentPapers.reduce((acc, studentPaper) => acc + Math.pow(studentPaper.totalScore - averageScore, 2), 0) / schedule.result.studentPapers.length);

    // 4. 计算每个题目的数据
    const questionsStatistics: ExamQuestionStatistics[] = [];
    exam.examData.components.forEach((component) => {
        const allQuestionsType: QuestionType[] = ['multiple-choice', 'fill-in-blank', 'open'];
        if (allQuestionsType.includes(component.type as QuestionType)) {
            const average = schedule.result.studentPapers.reduce((acc, studentPaper) => acc + studentPaper.objectiveQuestions.find((question) => question.questionId === component.id)?.score || 0, 0) / schedule.result.studentPapers.length;
            const highest = Math.max(...schedule.result.studentPapers.map((studentPaper) => studentPaper.objectiveQuestions.find((question) => question.questionId === component.id)?.score || 0));
            const lowest = Math.min(...schedule.result.studentPapers.map((studentPaper) => studentPaper.objectiveQuestions.find((question) => question.questionId === component.id)?.score || 0));
            const median = schedule.result.studentPapers.sort((a, b) => a.objectiveQuestions.find((question) => question.questionId === component.id)?.score - b.objectiveQuestions.find((question) => question.questionId === component.id)?.score)[Math.floor(schedule.result.studentPapers.length / 2)].objectiveQuestions.find((question) => question.questionId === component.id)?.score;
            const scores = schedule.result.studentPapers.map(studentPaper => studentPaper.objectiveQuestions.find((question) => question.questionId === component.id)?.score || 0);
            const standardDeviation = Math.sqrt(scores.reduce((acc, score) => acc + Math.pow(score - average, 2), 0) / scores.length);
            const data: ExamQuestionStatistics = {
                questionId: component.id,
                average: average,
                highest: highest,
                lowest: lowest,
                median: median,
                standardDeviation: standardDeviation,
                correct: -1, // 只有客观题统计这两个数据
                incorrect: -1,
            }
            if (component.type === 'multiple-choice') {
                const currentQuestion = exam.examData.components.find((component) => component.id === component.id) as MultipleChoiceQuestionData;
                data.correct = schedule.result.studentPapers.reduce((acc, studentPaper) => acc + (studentPaper.objectiveQuestions.find((question) => question.questionId === component.id)?.score === currentQuestion.score ? 1 : 0), 0);
                data.incorrect = schedule.result.studentPapers.reduce((acc, studentPaper) => acc + (studentPaper.objectiveQuestions.find((question) => question.questionId === component.id)?.score !== currentQuestion.score ? 1 : 0), 0);
            }
            questionsStatistics.push(data);
        }
    });

    // 5. 更新schedule
    schedule.result.statistics.average = averageScore;
    schedule.result.statistics.highest = highestScore;
    schedule.result.statistics.lowest = lowestScore;
    schedule.result.statistics.median = medianScore;
    schedule.result.statistics.standardDeviation = standardDeviation;
    schedule.result.statistics.questions = questionsStatistics;

    // 6. 更新schedule
    schedule.result.progress = 'RESULT_DONE'; // 设置为完成
    await strapi.documents('api::schedule.schedule').update({
        documentId,
        data: {
            result: JSON.stringify(schedule.result)
        }
    });
    console.log('Result calculated');
}
