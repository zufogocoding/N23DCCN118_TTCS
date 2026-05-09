const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

const sendOtpEmail = async (toEmail, otpCode, purpose = 'REGISTER') => {
  const transporter = createTransporter();

  let subject = '';
  let htmlContent = '';

  if (purpose === 'REGISTER') {
    subject = 'Mã xác nhận đăng ký tài khoản SoundWave';
    htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #00e6e6; text-align: center;">Chào mừng đến với SoundWave!</h2>
        <p>Cảm ơn bạn đã đăng ký tài khoản. Để hoàn tất, vui lòng sử dụng mã xác nhận (OTP) gồm 6 chữ số dưới đây:</p>
        <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; border-radius: 5px; margin: 20px 0;">
          ${otpCode}
        </div>
        <p style="color: #888; font-size: 14px;">Mã này sẽ hết hạn sau 5 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>
        <p>Trân trọng,<br>Đội ngũ SoundWave</p>
      </div>
    `;
  } else if (purpose === 'FORGOT_PASSWORD') {
    subject = 'Mã xác nhận lấy lại mật khẩu SoundWave';
    htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #00e6e6; text-align: center;">Yêu cầu lấy lại mật khẩu</h2>
        <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Vui lòng sử dụng mã xác nhận (OTP) dưới đây:</p>
        <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; border-radius: 5px; margin: 20px 0;">
          ${otpCode}
        </div>
        <p style="color: #888; font-size: 14px;">Mã này sẽ hết hạn sau 5 phút. Nếu bạn không yêu cầu đổi mật khẩu, vui lòng bỏ qua email này.</p>
        <p>Trân trọng,<br>Đội ngũ SoundWave</p>
      </div>
    `;
  }

  const mailOptions = {
    from: `"SoundWave" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: subject,
    html: htmlContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ' + info.response);
    return true;
  } catch (error) {
    console.error('Lỗi khi gửi email:', error);
    return false;
  }
};

module.exports = {
  sendOtpEmail
};
