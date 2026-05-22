/**
 * asyncHandler wrapper to catch errors in async route handlers
 * and pass them to the Express global error handler.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * wrapController wraps all functional methods of a controller with asyncHandler.
 * @param {Object} controller - The controller object containing route handler methods.
 * @returns {Object} A new object with all methods wrapped.
 */
const wrapController = (controller) => {
  const wrapped = {};
  for (const key of Object.keys(controller)) {
    if (typeof controller[key] === 'function') {
      wrapped[key] = asyncHandler(controller[key]);
    } else {
      wrapped[key] = controller[key];
    }
  }
  return wrapped;
};

module.exports = {
  asyncHandler,
  wrapController
};
