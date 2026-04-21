const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Secret Key để tạo Token (Thực tế nên bỏ vào file .env: process.env.JWT_SECRET)
const JWT_SECRET = 'PandaExpress_Secret_Key_123!@#';

// 1. API ĐĂNG KÝ (SIGN UP)
router.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, email, password, dob, country } = req.body;

    //Kiểm tra Email đã tồn tại chưa bằng Prisma
    const existingUser = await prisma.user.findUnique({
      where: { email: email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email này đã được sử dụng!' });
    }

    //Băm mật khẩu (Mã hóa 1 chiều)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    //Tạo User mới trong DB
    const newUser = await prisma.user.create({
      data: {
        username: username,
        email: email,
        password: hashedPassword,
        // Ép kiểu dob về dạng DateTime của Prisma nếu có gửi lên
        dob: dob ? new Date(dob) : null,
        country: country
      },
      // Chỉ select trả về những thông tin an toàn (Giấu password đi)
      select: {
        id: true,
        username: true,
        email: true,
        isAdmin: true
      }
    });

    res.status(201).json({
      message: 'Đăng ký thành công!',
      user: newUser
    });

  } catch (error) {
    console.error('Lỗi Sign Up:', error);
    res.status(500).json({ error: 'Lỗi server khi đăng ký' });
  }
});

// 2. API ĐĂNG NHẬP (LOGIN)
router.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    //Tìm User theo Email
    const user = await prisma.user.findUnique({
      where: { email: email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Sai email hoặc mật khẩu!' });
    }

    //Đối chiếu mật khẩu
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Sai email hoặc mật khẩu!' });
    }

    //Tạo JWT Token
    const token = jwt.sign(
      {
        userId: user.id,
        role: user.isAdmin ? 'admin' : 'user'
      },
      JWT_SECRET,
      { expiresIn: '1h' } // Hạn sử dụng Token: 1 tiếng
    );

    res.status(200).json({
      message: 'Đăng nhập thành công!',
      token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin
      }
    });

  } catch (error) {
    console.error('Lỗi Login:', error);
    res.status(500).json({ error: 'Lỗi server khi đăng nhập' });
  }
});

module.exports = router;
