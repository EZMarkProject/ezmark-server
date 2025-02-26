module.exports = {
    apps: [{
        name: 'ezmark-server',
        script: 'pnpm',
        args: 'run start',
        interpreter: 'none',
        watch: '.'
    }],
};