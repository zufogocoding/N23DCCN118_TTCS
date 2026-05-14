const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../db/index');
const { sendOtpEmail } = require('../utils/emailService');

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// 1. Gửi OTP Đăng ký
const requestRegisterOtp = async (req, res) => {
  try {
    const { email, username } = req.body;
    if (!email || !username) {
      return res.status(400).json({ error: "Vui lòng cung cấp email và tên đăng nhập" });
    }

    // Kiểm tra trùng lặp
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email: email }, { username: username }] }
    });

    if (existingUser) {
      const duplicateField = existingUser.email === email ? "Email" : "Username";
      return res.status(400).json({ error: `${duplicateField} đã được sử dụng` });
    }

    // Xóa OTP cũ nếu có
    await prisma.otp.deleteMany({
      where: { email: email, purpose: 'REGISTER' }
    });

    // Tạo OTP mới
    const otpCode = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 phút

    await prisma.otp.create({
      data: {
        email,
        otp: otpCode,
        purpose: 'REGISTER',
        expiresAt
      }
    });

    // Gửi email
    const emailSent = await sendOtpEmail(email, otpCode, 'REGISTER');
    if (!emailSent) {
      return res.status(500).json({ error: "Không thể gửi email OTP, vui lòng thử lại sau" });
    }

    res.status(200).json({ message: "Mã OTP đã được gửi đến email của bạn" });
  } catch (error) {
    console.error("Lỗi tại requestRegisterOtp:", error);
    res.status(500).json({ error: "Lỗi server khi yêu cầu OTP" });
  }
};

const signup = async (req, res) => {
  try {
    const { username, email, password, otp } = req.body;

    if (!username || !email || !password || !otp) {
      return res.status(400).json({ error: "Vui lòng cung cấp đủ thông tin và mã OTP" });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email },
          { username: username }
        ]
      }
    });

    if (existingUser) {
      const duplicateField = existingUser.email === email ? "Email" : "Username";
      return res.status(400).json({ error: `${duplicateField} đã được sử dụng` });
    }

    // Kiểm tra OTP
    const otpRecord = await prisma.otp.findFirst({
      where: { email: email, otp: otp, purpose: 'REGISTER' },
      orderBy: { createdAt: 'desc' }
    });

    if (!otpRecord) {
      return res.status(400).json({ error: "Mã OTP không hợp lệ" });
    }

    if (new Date() > otpRecord.expiresAt) {
      return res.status(400).json({ error: "Mã OTP đã hết hạn" });
    }

    // Tiến hành tạo User

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      }
    });

    // Xóa OTP sau khi dùng xong
    await prisma.otp.deleteMany({
      where: { email: email, purpose: 'REGISTER' }
    });

    const { password: _, ...userWithoutPassword } = newUser;

    res.status(201).json({
      message: "Đăng ký thành công",
      user: userWithoutPassword
    });

  } catch (error) {
    console.error("Lỗi tại authController.signup:", error);
    res.status(500).json({ error: "Lỗi server trong quá trình đăng ký" });
  }
};

const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: "Vui lòng cung cấp đủ thông tin" });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { username: identifier }
        ]
      },
      include: {
        artist: {
          select: { artistName: true }
        }
      }
    });

    if (!user) {
      return res.status(401).json({ error: "Tài khoản không tồn tại" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Sai mật khẩu" });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'fallback_secret_key',
      { expiresIn: '7d' } // Token sống 7 ngày
    );

    const { password: _, artist, ...userWithoutPassword } = user;

    res.status(200).json({
      message: "Đăng nhập thành công",
      user: {
        ...userWithoutPassword,
        isArtist: !!artist,
        artistName: artist?.artistName || null
      },
      token
    });

  } catch (error) {
    console.error("Lỗi tại authController.login:", error);
    res.status(500).json({ error: "Lỗi server trong quá trình đăng nhập" });
  }
};

// 3. Quên mật khẩu - Gửi OTP
const requestForgotPasswordOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Vui lòng cung cấp email" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: "Email này chưa được đăng ký" });
    }

    // Xóa OTP cũ
    await prisma.otp.deleteMany({
      where: { email: email, purpose: 'FORGOT_PASSWORD' }
    });

    const otpCode = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.otp.create({
      data: {
        email,
        otp: otpCode,
        purpose: 'FORGOT_PASSWORD',
        expiresAt
      }
    });

    const emailSent = await sendOtpEmail(email, otpCode, 'FORGOT_PASSWORD');
    if (!emailSent) {
      return res.status(500).json({ error: "Không thể gửi email OTP" });
    }

    res.status(200).json({ message: "Mã OTP đã được gửi" });
  } catch (error) {
    console.error("Lỗi tại requestForgotPasswordOtp:", error);
    res.status(500).json({ error: "Lỗi server" });
  }
};

// 4. Đặt lại mật khẩu (Verify OTP & Update Password)
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: "Thiếu thông tin yêu cầu" });
    }

    const otpRecord = await prisma.otp.findFirst({
      where: { email: email, otp: otp, purpose: 'FORGOT_PASSWORD' },
      orderBy: { createdAt: 'desc' }
    });

    if (!otpRecord) {
      return res.status(400).json({ error: "Mã OTP không hợp lệ" });
    }

    if (new Date() > otpRecord.expiresAt) {
      return res.status(400).json({ error: "Mã OTP đã hết hạn" });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword }
    });

    await prisma.otp.deleteMany({
      where: { email: email, purpose: 'FORGOT_PASSWORD' }
    });

    res.status(200).json({ message: "Đặt lại mật khẩu thành công" });
  } catch (error) {
    console.error("Lỗi tại resetPassword:", error);
    res.status(500).json({ error: "Lỗi server" });
  }
};

module.exports = {
  requestRegisterOtp,
  signup,
  login,
  requestForgotPasswordOtp,
  resetPassword
};
