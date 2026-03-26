export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      const error = new Error('Not authorized');
      error.status = 401;
      return next(error);
    }

    if (!roles.includes(req.user.role)) {
      const error = new Error('Forbidden');
      error.status = 403;
      return next(error);
    }

    next();
  };
}
