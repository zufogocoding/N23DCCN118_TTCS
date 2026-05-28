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

const sendTakedownEmail = async (toEmail, artistName, targetTitle, targetType, reason, proofUrl) => {
  const transporter = createTransporter();

  const subject = `[SoundWave] Thông báo gỡ bỏ nội dung vi phạm bản quyền: ${targetTitle}`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #ffffff; color: #333333;">
      <h2 style="color: #ff3333; text-align: center; border-bottom: 2px solid #ff3333; padding-bottom: 10px;">THÔNG BÁO KHÓA/GỠ BỎ NỘI DUNG</h2>
      <p>Kính gửi nghệ sĩ <strong>${artistName}</strong>,</p>
      <p>Chúng tôi rất tiếc phải thông báo rằng nội dung sau đây của bạn đã bị gỡ bỏ hoặc khóa truy cập do nhận được báo cáo vi phạm bản quyền hợp lệ:</p>
      <div style="background-color: #f9f9f9; padding: 15px; border-left: 5px solid #ff3333; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Loại nội dung:</strong> ${targetType === 'SONG' ? 'Bài hát' : 'Album'}</p>
        <p style="margin: 5px 0;"><strong>Tiêu đề:</strong> "${targetTitle}"</p>
        <p style="margin: 5px 0;"><strong>Lý do gỡ bỏ:</strong> Vi phạm quy định bản quyền (${reason})</p>
        ${proofUrl ? `<p style="margin: 5px 0;"><strong>Tài liệu/Bằng chứng tham chiếu:</strong> <a href="${proofUrl}" target="_blank">${proofUrl}</a></p>` : ''}
      </div>
      <p><strong>Hướng dẫn Kháng cáo Bản quyền:</strong></p>
      <p>Nếu bạn tin rằng đây là một sự nhầm lẫn hoặc bạn sở hữu đầy đủ bản quyền hợp pháp đối với tác phẩm này, bạn có thể nộp đơn khiếu nại/kháng cáo bằng cách gửi thư phản hồi trực tiếp tới email này (<strong>${process.env.EMAIL_USER}</strong>) kèm theo:</p>
      <ul style="padding-left: 20px;">
        <li>Giấy tờ chứng minh quyền sở hữu trí tuệ hợp pháp.</li>
        <li>Hợp đồng phân phối hoặc văn bản đồng thuận sử dụng tác quyền.</li>
        <li>Giải trình chi tiết của bạn về tác phẩm.</li>
      </ul>
      <p style="color: #666666; font-size: 13px; margin-top: 25px; border-top: 1px solid #eeeeee; padding-top: 15px;">
        * Lưu ý: Mọi hành vi cố tình vi phạm bản quyền nhiều lần có thể dẫn tới khóa vĩnh viễn tài khoản nghệ sĩ mà không báo trước.
      </p>
      <p>Trân trọng,<br>Ban quản trị SoundWave</p>
    </div>
  `;

  const mailOptions = {
    from: `"SoundWave Copyright Protection" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: subject,
    html: htmlContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Takedown email sent to ' + toEmail + ': ' + info.response);
    return true;
  } catch (error) {
    console.error('Lỗi khi gửi email gỡ bỏ bản quyền:', error);
    return false;
  }
};

module.exports = {
  sendOtpEmail,
  sendTakedownEmail
};
