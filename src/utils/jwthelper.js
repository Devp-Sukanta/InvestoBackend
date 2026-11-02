import jwt from "jsonwebtoken";

const generateJWT = (userId) => {
  const payload = { id: userId };
  const secretKey = process.env.JWT_SECRET || 'your_jwt_secret_key';
  const options = { expiresIn: '1h' };

  return jwt.sign(payload, secretKey, options);
};

const verifyJWT = (token) => {
  const secretKey = process.env.JWT_SECRET || 'your_jwt_secret_key';
    try {
        return jwt.verify(token, secretKey);    
    } catch (error) {
        return null;
    }
};

export { generateJWT, verifyJWT };