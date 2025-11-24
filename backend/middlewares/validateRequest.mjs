export const validateRequest = (schema) => async (req, res, next) => {
  try {

    req.body = await schema.parse(req.body);
    next();
  } catch (err) {
    const message =
      err?.errors?.[0]?.message ||
      err?.message ||
      "Invalid request body format.";
    console.dir(message);
    return res.status(400).json({ status: false, message });
  }
};
