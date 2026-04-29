const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../db/index');

// Cứ để đây, nhưng nếu undefined thì lát nữa sẽ có phương án dự phòng
const JWT_SECRET = process.env.JWT_SECRET; 

const authController = {
  signup: async (req, res) => {
    try {
      const { username, email, password, dob, country } = req.body;
      const existingUser = await prisma.user.findUnique({ where: { email: email } });

      if (existingUser) return res.status(400).json({ error: 'Email này đã được sử dụng!' });

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await prisma.user.create({
        data: {
          username: username,
          email: email,
          password: hashedPassword,
          dob: dob ? new Date(dob) : null,
          country: country
        },
        select: { id: true, username: true, email: true, isAdmin: true }
      });

      res.status(201).json({ message: 'Đăng ký thành công!', user: newUser });
    } catch (error) {
      console.log("🚨 LỖI SIGNUP:", error); // Gắn loa báo lỗi
      res.status(500).json({ error: 'Lỗi server khi đăng ký' });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await prisma.user.findUnique({ where: { email: email } });

      if (!user) return res.status(401).json({ error: 'Sai email hoặc mật khẩu!' });

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) return res.status(401).json({ error: 'Sai email hoặc mật khẩu!' });

      // Lấy Secret từ .env, nếu không có thì xài tạm chuỗi này để không bao giờ bị lỗi sập server
      const secretKey = JWT_SECRET || 'PandaExpress_Backup_Secret_Key_123!@#';

      const token = jwt.sign(
        { userId: user.id, role: user.isAdmin ? 'admin' : 'user' },
        secretKey, 
        { expiresIn: '1h' }
      );

      res.status(200).json({
        message: 'Đăng nhập thành công!',
        token: token,
        user: { id: user.id, username: user.username, email: user.email, isAdmin: user.isAdmin }
      });
    } catch (error) {
      console.log("🚨 LỖI LOGIN:", error); // Gắn loa báo lỗi
      res.status(500).json({ error: 'Lỗi server khi đăng nhập' });
    }
  }
};

module.exports = authController;