import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function ForgotPassword() {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Yêu cầu gửi OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email) {
      setServerError("Vui lòng nhập email");
      return;
    }
    setIsLoading(true);
    setServerError('');

    try {
      const res = await fetch('http://localhost:9000/api/auth/forgot-password-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();

      if (res.ok) {
        setStep(2);
      } else {
        setServerError(data.error || "Email không tồn tại");
      }
    } catch (err) { console.error(err);
      setServerError("Lỗi kết nối đến server");
    } finally {
      setIsLoading(false);
    }
  };

  // Nộp OTP và đổi pass luôn (hoặc bước 3 mới đổi pass, ở đây gộp bước 2 và 3 vào chung giao diện nếu đã ở step 2 thì show cả OTP và pass)
  // Thực ra chia step 2 nhập OTP riêng, xác nhận OTP thành công thì sang step 3 mới an toàn.
  // Nhưng để tiện, khi step = 2, ta cho nhập luôn New Password.
  
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otp || otp.length < 6) {
      setServerError("Vui lòng nhập đủ mã OTP");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setServerError("Mật khẩu phải từ 6 ký tự");
      return;
    }

    setIsLoading(true);
    setServerError('');

    try {
      const res = await fetch('http://localhost:9000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword })
      });
      const data = await res.json();

      if (res.ok) {
        alert("Đổi mật khẩu thành công!");
        navigate('/login');
      } else {
        setServerError(data.error || "Mã OTP không đúng hoặc đã hết hạn");
      }
    } catch (err) { console.error(err);
      setServerError("Lỗi kết nối đến server");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold">Khôi phục mật khẩu</h2>
        {step === 2 && <p className="text-sm text-[#888] mt-2">Mã xác nhận đã được gửi đến <strong>{email}</strong></p>}
      </div>

      {serverError && <div className="bg-[#ff4d4f]/10 border border-[#ff4d4f] text-[#ff4d4f] p-3 rounded-lg mb-6 text-sm text-center">{serverError}</div>}

      {step === 1 ? (
        <form onSubmit={handleRequestOtp} className="flex flex-col gap-4">
          <div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" size={18} />
              <input
                type="email" 
                placeholder="Email của bạn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full py-3 pl-10 pr-4 rounded-lg bg-[#0f0f0f] border border-[#333] focus:border-[#00e6e6] outline-none transition-all text-sm`}
                required
              />
            </div>
          </div>
          <button type="submit" disabled={isLoading} className="mt-4 p-3 rounded-lg bg-gradient-to-r from-[#00e6e6] to-[#008080] text-black font-bold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer">
            {isLoading ? "Đang gửi mã..." : "Gửi mã xác nhận"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
          <div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" size={18} />
              <input
                type="text" 
                placeholder="Nhập mã OTP 6 số"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                className={`w-full py-3 pl-10 pr-4 rounded-lg bg-[#0f0f0f] border border-[#333] focus:border-[#00e6e6] outline-none transition-all text-sm tracking-[0.5em] text-center font-bold`}
              />
            </div>
          </div>
          <div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" size={18} />
              <input
                type={showPassword ? "text" : "password"} 
                placeholder="Mật khẩu mới"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={`w-full py-3 pl-10 pr-10 rounded-lg bg-[#0f0f0f] border border-[#333] focus:border-[#00e6e6] outline-none transition-all text-sm`}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] hover:text-[#00e6e6]">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={isLoading || otp.length < 6 || newPassword.length < 6} className="mt-4 p-3 rounded-lg bg-gradient-to-r from-[#00e6e6] to-[#008080] text-black font-bold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer">
            {isLoading ? "Đang xử lý..." : "Lưu mật khẩu mới"}
          </button>
          <button type="button" onClick={() => setStep(1)} className="text-sm text-[#a0a0a0] hover:text-white mt-2">
            Đổi email khác
          </button>
        </form>
      )}

      <p className="text-center text-sm text-[#888] mt-6">
        <Link to="/login" className="text-[#00e6e6] hover:underline">Quay lại Đăng nhập</Link>
      </p>
    </>
  );
}
