export default () => ({
    'users-permissions': {
        config: {
            jwt: {
                expiresIn: '7d', // Eg: 60, "45m", "10h", "2 days", "7d", "2y"
            }
        }
    },
    upload: {
        config: {
            sizeLimit: 1024 * 1024 * 1024, // 1GB
            providerOptions: {
                localServer: {
                    maxage: 300000, // 强制缓存5 minutes
                }
            }
        }
    }
});
