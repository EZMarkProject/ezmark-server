export default {
    routes: [
        {
            method: 'POST',
            path: '/schedules/:documentId/startPipeline',
            handler: 'api::schedule.schedule.startPipeline',
            config: {
                policies: [],
                middlewares: [],
            },
        },
    ],
}; 