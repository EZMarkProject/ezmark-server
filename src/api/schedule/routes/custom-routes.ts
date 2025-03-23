export default {
    routes: [
        {
            method: 'POST',
            path: '/schedules/:documentId/startMatching',
            handler: 'api::schedule.schedule.startMatching',
            config: {
                policies: [],
                middlewares: [],
            },
        },
        {
            method: 'POST',
            path: '/schedules/:documentId/startObjective',
            handler: 'api::schedule.schedule.startObjective',
            config: {
                policies: [],
                middlewares: [],
            },
        },
        {
            method: 'POST',
            path: '/schedules/:documentId/startSubjective',
            handler: 'api::schedule.schedule.startSubjective',
            config: {
                policies: [],
                middlewares: [],
            },
        },
    ],
}; 