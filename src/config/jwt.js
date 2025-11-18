export default {
  accessTokenSecret: process.env.JWT_ACCESS_SECRET,
  refreshTokenSecret: process.env.JWT_REFRESH_SECRET,
  accessTokenExpiry: '50m',
  refreshTokenExpiry: '7d',
  issuer: 'saludK-backend',
  audience: 'saludK-app',
};