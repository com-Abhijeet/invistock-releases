import jwt from "jsonwebtoken";

const JWT_SECRET = "K05H1NV3NT0R7";

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    // Bearer <token>
    const token = authHeader.split(" ")[1];

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        console.log("[Auth] Token verification failed:", err.message);
        return res.sendStatus(403); // Forbidden
      }

      // Attach user info to request so Controller can see it
      req.user = user;
      next();
    });
  } else {
    console.log("[Auth] No Authorization header found");
    res.sendStatus(401); // Unauthorized
  }
};
