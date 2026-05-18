export default function AdminAlbums() {
  return (
    <div className="p-8 text-white max-w-2xl">
      <h1 className="text-2xl font-bold mb-4">Album</h1>
      <p className="text-[#a0a0a0] leading-relaxed">
        Album được tạo và quản lý bởi nghệ sĩ trên trang kênh nghệ sĩ và trang chi tiết album. Người dùng có thể duyệt album từ hồ sơ nghệ sĩ hoặc URL{' '}
        <code className="text-[#00e6e6]">/album/:id</code>.
      </p>
    </div>
  );
}
