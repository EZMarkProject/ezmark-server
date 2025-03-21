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
    ],
}; 