/**
 * schedule controller
 */

import { factories } from '@strapi/strapi'

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

            //要给另一个线程发送启动流水线的任务


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
