module.exports = {
    apps: [{
        name: 'ezmark-server',
        script: 'pnpm',
        args: 'run start',
        env: {
            NODE_ENV: 'production',
        },
        interpreter: 'none',
        watch: '.'
    }],
};