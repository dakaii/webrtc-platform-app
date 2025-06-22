export const jwtConstants = {
  secret:
    process.env.JWT_SECRET || 'dev-super-secret-jwt-key-change-in-production',
};
