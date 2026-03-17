/**
 * Response Utility
 */
class Response {
  static success(data, message = 'Success') {
    return {
      success: true,
      message,
      data
    };
  }

  static error(message, code = null, details = null) {
    const response = {
      success: false,
      message
    };
    if (code) response.code = code;
    if (details) response.details = details;
    return response;
  }

  static paginated(data, page, pageSize, total) {
    return {
      success: true,
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }
}

module.exports = Response;
