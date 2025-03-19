/**
 * schedule controller
 */

import { factories } from '@strapi/strapi'
import { startPipeline } from '../../../utils/pipeline';

export default factories.createCoreController('api::schedule.schedule', ({ strapi }) => ({
    /**
     * 流水线函数 
     */
    async startPipeline(ctx) {
        try {
            const { documentId } = ctx.params;

            if (!documentId) {
                return ctx.badRequest('documentId is required');
            }

            //启动一个异步任务，专门处理流水线
            startPipeline(documentId);

            // 成功的返回值
            const result = {
                success: true,
                message: `Pipeline has been started for document ID ${documentId}`,
                documentId
            };
            return result;
        } catch (error) {
            ctx.throw(500, error);
        }
    }
}));
