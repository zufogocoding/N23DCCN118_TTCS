import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function Register() {
  const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return setError("Mật khẩu xác nhận không khớp!");
    }
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:9000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: formData.username, 
          email: formData.email, 
          password: formData.password 
        })
      });
      const data = await res.json();

      if (res.ok) {
        alert("Đăng ký thành công! Đăng nhập ngay nào.");
        navigate('/login'); 
      } else {
        setError(data.error || "Đăng ký thất bại!");
      }
    } catch (err) {
      setError("Không thể kết nối đến server!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold">Tạo tài khoản mới</h2>
      </div>

      {error && <div className="bg-[#ff4d4f]/10 border border-[#ff4d4f] text-[#ff4d4f] p-3 rounded-lg mb-6 text-sm text-center">{error}</div>}

      <form onSubmit={handleRegister} className="flex flex-col gap-4">
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" size={18} />
          <input 
            type="text" placeholder="Tên hiển thị (Username)" required
            className="w-full py-3 pl-10 pr-4 rounded-lg bg-[#0f0f0f] border border-[#333] focus:border-[#00e6e6] outline-none transition-all text-sm"
            value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})}
          />
        </div>

        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" size={18} />
          <input 
            type="email" placeholder="Email address" required
            className="w-full py-3 pl-10 pr-4 rounded-lg bg-[#0f0f0f] border border-[#333] focus:border-[#00e6e6] outline-none transition-all text-sm"
            value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})}
          />
        </div>
        
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" size={18} />
          <input 
            type={showPassword ? "text" : "password"} placeholder="Mật khẩu" required
            className="w-full py-3 pl-10 pr-10 rounded-lg bg-[#0f0f0f] border border-[#333] focus:border-[#00e6e6] outline-none transition-all text-sm"
            value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})}
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] hover:text-[#00e6e6]">
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" size={18} />
          <input 
            type={showConfirmPassword ? "text" : "password"} placeholder="Xác nhận mật khẩu" required
            className="w-full py-3 pl-10 pr-10 rounded-lg bg-[#0f0f0f] border border-[#333] focus:border-[#00e6e6] outline-none transition-all text-sm"
            value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
          />
          <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] hover:text-[#00e6e6]">
            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <button disabled={isLoading} className="mt-4 p-3 rounded-lg bg-gradient-to-r from-[#00e6e6] to-[#008080] text-black font-bold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer">
          {isLoading ? "Đang xử lý..." : "Đăng Ký"}
        </button>
      </form>

      <p className="text-center text-sm text-[#888] mt-6">
        Đã có tài khoản? <Link to="/login" className="text-[#00e6e6] hover:underline">Đăng nhập</Link>
      </p>
    </>
  );
}