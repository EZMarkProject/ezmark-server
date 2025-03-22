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

    // 3. 更新schema到数据库
    await strapi.documents('api::schedule.schedule').update({
        documentId,
        data: {
            result: JSON.stringify(schedule.result),
        },
    });

    console.log('DONE')
}