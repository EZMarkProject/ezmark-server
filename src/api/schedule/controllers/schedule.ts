import { factories } from '@strapi/strapi'
import { startMatching } from '../../../utils/matching';
import { startObjective } from '../../../utils/objective';
import { startSubjective } from '../../../utils/subjective';
import { askSubjective } from '../../../utils/llm';
import { cwd } from 'process';
import path from 'path';

export default factories.createCoreController('api::schedule.schedule', ({ strapi }) => ({
    async startMatching(ctx) {
        try {
            const { documentId } = ctx.params;

            if (!documentId) {
                return ctx.badRequest('documentId is required');
            }

            //启动一个异步任务，专门处理流水线
            startMatching(documentId);

            // 成功的返回值
            const result = {
                success: true,
                message: `Matching has been started for document ID ${documentId}`,
                documentId
            };
            return result;
        } catch (error) {
            ctx.throw(500, error);
        }
    },
    async startObjective(ctx) {
        try {
            const { documentId } = ctx.params;

            if (!documentId) {
                return ctx.badRequest('documentId is required');
            }

            startObjective(documentId);
            // 成功的返回值
            const result = {
                success: true,
                message: `Objective has been started for document ID ${documentId}`,
                documentId
            };
            return result;
        } catch (error) {
            ctx.throw(500, error);
        }
    },
    async startSubjective(ctx) {
        try {
            const { documentId } = ctx.params;

            if (!documentId) {
                return ctx.badRequest('documentId is required');
            }

            startSubjective(documentId);

            // 成功的返回值
            const result = {
                success: true,
                message: `Subjective has been started for document ID ${documentId}`,
                documentId
            };
            return result;
        } catch (error) {
            ctx.throw(500, error);
        }
    },
    async askSubjective(ctx) {
        try {
            const { question, answer, score, imageUrl } = ctx.request.body;
            const rootDir = cwd();
            const imagePath = path.join(rootDir, 'public', imageUrl);
            const result = await askSubjective({ question, answer, score, imageUrl: imagePath });
            return result;
        } catch (error) {
            ctx.throw(500, error);
        }
    }
}));
