import jwt from "jsonwebtoken";
import User from "../models/User.model.js";
import { errorMessage } from "../utils/Message.js";

/**
 * Middleware to authenticate JWT and enforce role authorization
 * @param {Array<string>} rolesAllowed - e.g., ["admin"] or ["user", "admin"]
 */
const authMiddleware = (rolesAllowed = []) => {
  return async (req, res, next) => {
    try {
      let token = null;

      if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
      ) {
        token = req.headers.authorization.split(" ")[1];
      }

      if (!token) {
        return errorMessage(res, 401, "Access denied. No token provided.");
      }

 
      const decoded = jwt.verify(token, process.env.JWT_SECRET);


      const user = await User.findById(decoded.id || decoded._id);
      if (!user) {
        return errorMessage(res, 401, "User no longer exists.");
      }

      if (user.accountStatus !== "active") {
        return errorMessage(res, 403, "Your account is not active.");
      }


      if (rolesAllowed.length > 0 && !rolesAllowed.includes(user.role)) {
        return errorMessage(
          res,
          403,
          "Forbidden. You do not have permission to access this resource."
        );
      }

  
      req.user = user;
      next();
    } catch (error) {
      console.error("Auth Middleware Error:", error.message);
      return errorMessage(res, 401, "Invalid or expired token.");
    }
  };
};

export default authMiddleware;