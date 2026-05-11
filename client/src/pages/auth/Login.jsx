import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Lock, Eye, EyeOff } from 'lucide-react'; // Đổi Mail thành User cho phù hợp với cả 2 hình thức
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Định nghĩa Zod Schema
const loginSchema = z.object({
  identifier: z.string().min(1, "Vui lòng nhập Tên đăng nhập hoặc Email"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export default function Login() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema)
  });

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    setIsLoading(true);
    setServerError('');

    try {
      const res = await fetch('http://localhost:9000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: data.identifier,
          password: data.password
        }) // Gửi identifier thay vì email
      });
      const resData = await res.json();

      if (res.ok) {
        localStorage.setItem('user', JSON.stringify(resData.user || resData));
        navigate('/');
      } else {
        setServerError(resData.error || resData.message || "Sai thông tin đăng nhập!");
      }
    } catch (err) {
      setServerError("Không thể kết nối đến server!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold">Mừng bạn trở lại!</h2>
      </div>

      {serverError && <div className="bg-[#ff4d4f]/10 border border-[#ff4d4f] text-[#ff4d4f] p-3 rounded-lg mb-6 text-sm text-center">{serverError}</div>}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" size={18} />
            <input
              type="text" // Đổi từ email sang text để nhập được cả username
              placeholder="Email hoặc Tên đăng nhập"
              className={`w-full py-3 pl-10 pr-4 rounded-lg bg-[#0f0f0f] border ${errors.identifier ? 'border-[#ff4d4f]' : 'border-[#333] focus:border-[#00e6e6]'} outline-none transition-all text-sm`}
              {...register("identifier")}
            />
          </div>
          {errors.identifier && <p className="text-[#ff4d4f] text-xs mt-1 text-left">{errors.identifier.message}</p>}
        </div>

        <div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" size={18} />
            <input
              type={showPassword ? "text" : "password"} placeholder="Mật khẩu"
              className={`w-full py-3 pl-10 pr-10 rounded-lg bg-[#0f0f0f] border ${errors.password ? 'border-[#ff4d4f]' : 'border-[#333] focus:border-[#00e6e6]'} outline-none transition-all text-sm`}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] hover:text-[#00e6e6] transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && <p className="text-[#ff4d4f] text-xs mt-1 text-left">{errors.password.message}</p>}
          <div className="flex justify-end mt-1">
            <Link to="/forgot-password" className="text-xs text-[#a0a0a0] hover:text-[#00e6e6] transition-colors">Quên mật khẩu?</Link>
          </div>
        </div>

        <button type="submit" disabled={isLoading} className="mt-4 p-3 rounded-lg bg-gradient-to-r from-[#00e6e6] to-[#008080] text-black font-bold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer">
          {isLoading ? "Đang xử lý..." : "Đăng Nhập"}
        </button>
      </form>

      <p className="text-center text-sm text-[#888] mt-6">
        Chưa có tài khoản? <Link to="/register" className="text-[#00e6e6] hover:underline">Đăng ký ngay</Link>
      </p>
    </>
  );
}
