import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:9000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('user', JSON.stringify(data.user || data));
        navigate('/'); 
      } else {
        setError(data.error || "Sai thông tin đăng nhập!");
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
        <h2 className="text-xl font-bold">Mừng bạn trở lại!</h2>
      </div>

      {error && <div className="bg-[#ff4d4f]/10 border border-[#ff4d4f] text-[#ff4d4f] p-3 rounded-lg mb-6 text-sm text-center">{error}</div>}

      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" size={18} />
          <input 
            type="email" placeholder="Email address" required
            className="w-full py-3 pl-10 pr-4 rounded-lg bg-[#0f0f0f] border border-[#333] focus:border-[#00e6e6] outline-none transition-all text-sm"
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" size={18} />
          <input 
            type={showPassword ? "text" : "password"} placeholder="Mật khẩu" required
            className="w-full py-3 pl-10 pr-10 rounded-lg bg-[#0f0f0f] border border-[#333] focus:border-[#00e6e6] outline-none transition-all text-sm"
            value={password} onChange={(e) => setPassword(e.target.value)}
          />
          <button 
            type="button" 
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] hover:text-[#00e6e6] transition-colors"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <button disabled={isLoading} className="mt-4 p-3 rounded-lg bg-gradient-to-r from-[#00e6e6] to-[#008080] text-black font-bold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer">
          {isLoading ? "Đang xử lý..." : "Đăng Nhập"}
        </button>
      </form>

      <p className="text-center text-sm text-[#888] mt-6">
        Chưa có tài khoản? <Link to="/register" className="text-[#00e6e6] hover:underline">Đăng ký ngay</Link>
      </p>
    </>
  );
}