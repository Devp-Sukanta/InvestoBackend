
import jwt from "jsonwebtoken";

const authMiddleware = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      if (allowedRoles.includes("anonymous")) {
        return next();
      }

      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          success: false,
          message: "Authentication required. Please login.",
        });
      }

      const token = authHeader.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (!decoded.id) {
        return res.status(401).json({
          success: false,
          message: "Invalid authentication token.",
        });
      }


      if (!allowedRoles.includes("user")) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to access this resource.",
        });
      }

      req.user = decoded;

      next();

    } catch (error) {
      return res.status(401).json({
        success: false,
        message:
          error.name === "TokenExpiredError"
            ? "Session expired. Please login again."
            : "Invalid authentication token.",
      });
    }
  };
};

export default authMiddleware;
