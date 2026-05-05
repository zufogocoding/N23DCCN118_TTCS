const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../db/index');

const signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "Vui lòng cung cấp đủ thông tin" });
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

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      }
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

    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json({
      message: "Đăng nhập thành công",
      user: userWithoutPassword,
      token
    });

  } catch (error) {
    console.error("Lỗi tại authController.login:", error);
    res.status(500).json({ error: "Lỗi server trong quá trình đăng nhập" });
  }
};

module.exports = {
  signup,
  login
};
