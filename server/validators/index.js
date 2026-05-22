const { z } = require('zod');

const registerSchema = z.object({
  username: z.string().min(3, "Tên đăng nhập phải chứa ít nhất 3 ký tự").max(30, "Tên đăng nhập tối đa 30 ký tự"),
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải chứa ít nhất 6 ký tự"),
  otp: z.string().length(6, "Mã OTP phải đúng 6 số"),
});

const loginSchema = z.object({
  identifier: z.string().min(1, "Vui lòng cung cấp tên đăng nhập hoặc email"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: 'Dữ liệu đầu vào không hợp lệ',
      details: result.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })),
    });
  }
  req.validatedBody = result.data;
  next();
};

module.exports = {
  registerSchema,
  loginSchema,
  validate
};
