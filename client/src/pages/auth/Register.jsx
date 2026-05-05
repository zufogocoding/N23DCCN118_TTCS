import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const registerSchema = z.object({
  username: z.string().min(3, "Tên đăng nhập phải có ít nhất 3 ký tự").max(20, "Tên đăng nhập tối đa 20 ký tự"),
  email: z.string().email("Định dạng email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Mật khẩu xác nhận không khớp",
  path: ["confirmPassword"],
});

export default function Register() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(registerSchema)
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    setIsLoading(true);
    setServerError('');

    try {
      const res = await fetch('http://localhost:9000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: data.username,
          email: data.email,
          password: data.password
        })
      });
      const resData = await res.json();

      if (res.ok) {
        alert("Đăng ký thành công! Đăng nhập ngay nào.");
        navigate('/login');
      } else {
        setServerError(resData.error || "Đăng ký thất bại!");
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
        <h2 className="text-xl font-bold">Tạo tài khoản mới</h2>
      </div>

      {serverError && <div className="bg-[#ff4d4f]/10 border border-[#ff4d4f] text-[#ff4d4f] p-3 rounded-lg mb-6 text-sm text-center">{serverError}</div>}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" size={18} />
            <input
              type="text" placeholder="Tên hiển thị (Username)"
              className={`w-full py-3 pl-10 pr-4 rounded-lg bg-[#0f0f0f] border ${errors.username ? 'border-[#ff4d4f]' : 'border-[#333] focus:border-[#00e6e6]'} outline-none transition-all text-sm`}
              {...register("username")}
            />
          </div>
          {errors.username && <p className="text-[#ff4d4f] text-xs mt-1 text-left">{errors.username.message}</p>}
        </div>

        <div>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" size={18} />
            <input
              type="email" placeholder="Email address"
              className={`w-full py-3 pl-10 pr-4 rounded-lg bg-[#0f0f0f] border ${errors.email ? 'border-[#ff4d4f]' : 'border-[#333] focus:border-[#00e6e6]'} outline-none transition-all text-sm`}
              {...register("email")}
            />
          </div>
          {errors.email && <p className="text-[#ff4d4f] text-xs mt-1 text-left">{errors.email.message}</p>}
        </div>

        <div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" size={18} />
            <input
              type={showPassword ? "text" : "password"} placeholder="Mật khẩu"
              className={`w-full py-3 pl-10 pr-10 rounded-lg bg-[#0f0f0f] border ${errors.password ? 'border-[#ff4d4f]' : 'border-[#333] focus:border-[#00e6e6]'} outline-none transition-all text-sm`}
              {...register("password")}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] hover:text-[#00e6e6]">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && <p className="text-[#ff4d4f] text-xs mt-1 text-left">{errors.password.message}</p>}
        </div>

        <div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" size={18} />
            <input
              type={showConfirmPassword ? "text" : "password"} placeholder="Xác nhận mật khẩu"
              className={`w-full py-3 pl-10 pr-10 rounded-lg bg-[#0f0f0f] border ${errors.confirmPassword ? 'border-[#ff4d4f]' : 'border-[#333] focus:border-[#00e6e6]'} outline-none transition-all text-sm`}
              {...register("confirmPassword")}
            />
            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] hover:text-[#00e6e6]">
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.confirmPassword && <p className="text-[#ff4d4f] text-xs mt-1 text-left">{errors.confirmPassword.message}</p>}
        </div>

        <button type="submit" disabled={isLoading} className="mt-4 p-3 rounded-lg bg-gradient-to-r from-[#00e6e6] to-[#008080] text-black font-bold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer">
          {isLoading ? "Đang xử lý..." : "Đăng Ký"}
        </button>
      </form>

      <p className="text-center text-sm text-[#888] mt-6">
        Đã có tài khoản? <Link to="/login" className="text-[#00e6e6] hover:underline">Đăng nhập</Link>
      </p>
    </>
  );
}
