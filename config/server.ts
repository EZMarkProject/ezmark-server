module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  url: env('NODE_ENV') === 'production'
    ? env('PUBLIC_URL', 'https://csi420-01-vm7.ucd.ie/strapi')
    : env('PUBLIC_URL', 'http://localhost:1337'),
  app: {
    keys: env.array('APP_KEYS'),
  },
});
