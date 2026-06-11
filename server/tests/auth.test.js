const request = require('supertest');
const app = require('../server');
const prisma = require('../db/index');

describe('=== SoundClown Auth API Integration Tests ===', () => {
  const testEmail = 'testuser_auth_api@example.com';
  const testUsername = 'testuser_auth_api';
  const testPassword = 'Password123!';

  // Trước khi chạy test, dọn dẹp sạch sẽ nếu có tài khoản test cũ
  beforeAll(async () => {
    await prisma.otp.deleteMany({ where: { email: testEmail } });
    await prisma.user.deleteMany({ where: { email: testEmail } });
  });

  // Sau khi chạy xong test, dọn dẹp một lần nữa để tránh rác DB
  afterAll(async () => {
    await prisma.otp.deleteMany({ where: { email: testEmail } });
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await prisma.$disconnect();
  });

  let otpCode = '';
  let token = '';

  // 1. Test yêu cầu gửi mã OTP đăng ký
  it('1. POST /api/auth/register-otp - Yêu cầu gửi OTP đăng ký', async () => {
    const res = await request(app)
      .post('/api/auth/register-otp')
      .send({
        email: testEmail,
        username: testUsername
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toContain('Mã OTP đã được gửi đến email');

    // Lấy OTP code trực tiếp từ database vì môi trường test không gửi email thật
    const otpRecord = await prisma.otp.findFirst({
      where: { email: testEmail, purpose: 'REGISTER' },
      orderBy: { createdAt: 'desc' }
    });

    expect(otpRecord).not.toBeNull();
    otpCode = otpRecord.otp;
    console.log(`[TEST HELP] Lấy được mã OTP tự động từ DB: ${otpCode}`);
  });

  // 2. Test Đăng ký tài khoản (Signup) với OTP hợp lệ
  it('2. POST /api/auth/signup - Đăng ký tài khoản mới với OTP', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        username: testUsername,
        email: testEmail,
        password: testPassword,
        otp: otpCode
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('message', 'Đăng ký thành công');
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('username', testUsername);
    expect(res.body.user).toHaveProperty('email', testEmail);
  });

  // 3. Test Đăng nhập (Login) tài khoản vừa tạo
  it('3. POST /api/auth/login - Đăng nhập nhận JWT token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: testEmail,
        password: testPassword
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message', 'Đăng nhập thành công');
    expect(res.body).toHaveProperty('token');
    
    token = res.body.token; // Lưu token lại cho các API sau cần authenticate
  });

  // 4. Test Đăng nhập thất bại do sai mật khẩu
  it('4. POST /api/auth/login - Đăng nhập thất bại (Sai mật khẩu)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: testEmail,
        password: 'WrongPassword'
      });

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error', 'Sai mật khẩu');
  });

  // 5. Test Lấy thông tin cá nhân (GET /api/auth/me) dùng JWT token
  it('5. GET /api/auth/me - Lấy thông tin cá nhân (Có token)', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('username', testUsername);
    expect(res.body).toHaveProperty('email', testEmail);
  });

  // 6. Test Xóa tài khoản (DELETE /api/auth/delete-account) dọn dẹp DB
  it('6. DELETE /api/auth/delete-account - Xóa tài khoản (Dọn dẹp dữ liệu test)', async () => {
    const res = await request(app)
      .delete('/api/auth/delete-account')
      .set('Authorization', `Bearer ${token}`)
      .send({
        password: testPassword
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message', 'Xóa tài khoản thành công');

    // Xác nhận tài khoản không còn trong database
    const userDeleted = await prisma.user.findUnique({
      where: { email: testEmail }
    });
    expect(userDeleted).toBeNull();
  });
});
