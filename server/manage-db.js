/**
 * ⚡ KÊNH QUẢN TRỊ CƠ SỞ DỮ LIỆU N23DCCN118_TTCS ⚡
 * ------------------------------------------------------------
 * Công cụ CLI hỗ trợ nâng/hạ quyền Admin và dọn dẹp Mock Data
 * Hạn chế tối đa lỗi Prisma Studio do các cột vector (pgvector).
 */

require('dotenv').config();
const prisma = require('./db/index');
const readline = require('readline');

// Bảng mã màu ANSI chuyên nghiệp
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgBlue: "\x1b[44m",
  bgYellow: "\x1b[43m"
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

/**
 * Hiển thị tiêu đề CLI
 */
function printHeader() {
  console.clear();
  console.log(`${colors.cyan}${colors.bold}========================================================================${colors.reset}`);
  console.log(`   ${colors.green}${colors.bold}⚡ TRÌNH QUẢN TRỊ DATABASE CHUYÊN NGHIỆP - SOUNDCLOWN (TTCS) ⚡${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}========================================================================${colors.reset}`);
}

/**
 * Lấy số liệu thống kê cơ sở dữ liệu
 */
async function getStats() {
  try {
    const [userCount, adminCount, songCount, interactionCount, playlistCount, artistCount] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { OR: [{ isAdmin: true }, { role: 'admin' }] } }),
      prisma.song.count(),
      prisma.interaction.count(),
      prisma.playlist.count(),
      prisma.artist.count()
    ]);

    console.log(`\n📊 ${colors.bold}THỐNG KÊ HỆ THỐNG HIỆN TẠI:${colors.reset}`);
    console.log(`  👥 Người dùng: ${colors.bold}${userCount}${colors.reset} (Trong đó có ${colors.green}${colors.bold}${adminCount} Admin${colors.reset})`);
    console.log(`  🎵 Bài hát:     ${colors.bold}${songCount}${colors.reset} | 👨‍🎤 Nghệ sĩ:  ${colors.bold}${artistCount}${colors.reset}`);
    console.log(`  🎧 Lượt tương tác: ${colors.bold}${interactionCount}${colors.reset} | 📂 Playlist: ${colors.bold}${playlistCount}${colors.reset}`);
    console.log(`${colors.cyan}------------------------------------------------------------------------${colors.reset}`);
  } catch (error) {
    console.log(`❌ ${colors.red}Không thể tải thống kê cơ sở dữ liệu: ${error.message}${colors.reset}`);
  }
}

/**
 * Chức năng 1: Hiển thị danh sách Người dùng
 */
async function listUsers() {
  try {
    console.log(`\n🔍 ${colors.bold}ĐANG TẢI DANH SÁCH NGƯỜI DÙNG...${colors.reset}`);
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        role: true,
        isAdmin: true,
        isActive: true,
        createdAt: true
      },
      orderBy: { id: 'asc' },
      take: 50 // Giới hạn 50 người dùng đầu tiên
    });

    console.log(`\n📋 ${colors.bold}DANH SÁCH 50 USER ĐẦU TIÊN:${colors.reset}`);
    console.log(`${colors.bold}ID\t| Tên hiển thị / Username\t| Email\t\t\t\t| Quyền (Role)\t| Trạng thái${colors.reset}`);
    console.log(`-------------------------------------------------------------------------------------------------`);
    users.forEach(u => {
      const name = (u.displayName || u.username || 'N/A').padEnd(25).substring(0, 25);
      const email = u.email.padEnd(30).substring(0, 30);
      const roleStr = u.isAdmin || u.role === 'admin' 
        ? `${colors.bgRed}${colors.white} ADMIN ${colors.reset}` 
        : `${colors.bgBlue}${colors.white} USER  ${colors.reset}`;
      const status = u.isActive 
        ? `${colors.green}Hoạt động${colors.reset}` 
        : `${colors.red}Bị Khóa (Banned)${colors.reset}`;

      console.log(`${u.id}\t| ${name}\t| ${email}\t| ${roleStr}\t| ${status}`);
    });
    console.log(`-------------------------------------------------------------------------------------------------`);
  } catch (error) {
    console.log(`❌ ${colors.red}Lỗi khi lấy danh sách user: ${error.message}${colors.reset}`);
  }
}

/**
 * Chức năng 2 & 3: Cập nhật quyền Admin của User
 */
async function updateAdminStatus(shouldBeAdmin) {
  try {
    console.log(`\n🔑 ${colors.bold}${shouldBeAdmin ? 'CẤP QUYỀN ADMIN' : 'HẠ QUYỀN ADMIN'}${colors.reset}`);
    const identifier = await question(`Nhập ID hoặc Email của user cần cập nhật: `);
    
    if (!identifier.trim()) {
      console.log(`⚠️ ${colors.yellow}Không được bỏ trống!${colors.reset}`);
      return;
    }

    let user;
    if (!isNaN(parseInt(identifier))) {
      user = await prisma.user.findUnique({ where: { id: parseInt(identifier) } });
    } else {
      user = await prisma.user.findUnique({ where: { email: identifier.trim() } });
    }

    if (!user) {
      console.log(`❌ ${colors.red}Không tìm thấy người dùng phù hợp với ID/Email "${identifier}"${colors.reset}`);
      return;
    }

    console.log(`\n👤 Tìm thấy User:`);
    console.log(`   - ID: ${colors.bold}${user.id}${colors.reset}`);
    console.log(`   - Username: ${user.username}`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - Quyền hiện tại: ${user.role === 'admin' || user.isAdmin ? 'ADMIN' : 'USER'}`);

    const confirm = await question(`\nBạn có chắc chắn muốn ${shouldBeAdmin ? colors.green + 'CẤP QUYỀN ADMIN' : colors.red + 'THU HỒI QUYỀN ADMIN'} cho user này? (y/n): `);
    if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          isAdmin: shouldBeAdmin,
          role: shouldBeAdmin ? 'admin' : 'user'
        }
      });
      console.log(`\n🎉 ${colors.green}${colors.bold}CẬP NHẬT THÀNH CÔNG!${colors.reset} User "${user.username}" hiện tại đã là ${shouldBeAdmin ? 'ADMIN' : 'USER'}.`);
    } else {
      console.log(`\n⏩ ${colors.yellow}Đã hủy lệnh cập nhật quyền.${colors.reset}`);
    }
  } catch (error) {
    console.log(`❌ ${colors.red}Lỗi trong quá trình cập nhật: ${error.message}${colors.reset}`);
  }
}

/**
 * Chức năng 4: Dọn dẹp/Xóa Mock Data
 */
async function cleanMockData() {
  try {
    console.log(`\n🧹 ${colors.bold}DỌN DẸP MOCK DATA / SEED DATA THỪA${colors.reset}`);
    console.log(`Chọn phương án dọn dẹp:`);
    console.log(`  ${colors.green}1.${colors.reset} Xóa tất cả user có đuôi email là ${colors.bold}@example.com${colors.reset} (Và toàn bộ data liên quan nhờ cascade)`);
    console.log(`  ${colors.green}2.${colors.reset} Xóa toàn bộ Lượt nghe tương tác (Interaction table)`);
    console.log(`  ${colors.green}3.${colors.reset} Xóa tất cả các bài hát Mock (Song) đang ở trạng thái nháp hoặc chờ duyệt`);
    console.log(`  ${colors.green}4.${colors.reset} Nhập đuôi Email tùy chỉnh để xóa hàng loạt (ví dụ: @fake.com, @test.com)`);
    console.log(`  ${colors.green}5.${colors.reset} Quay lại`);

    const choice = await question(`\nLựa chọn của bạn (1-5): `);

    if (choice === '1') {
      await deleteUsersByEmailPattern('%@example.com');
    } else if (choice === '2') {
      await clearAllInteractions();
    } else if (choice === '3') {
      await clearUnapprovedSongs();
    } else if (choice === '4') {
      const domain = await question(`Nhập đuôi email (ví dụ: @test.com): `);
      if (domain.trim().startsWith('@')) {
        await deleteUsersByEmailPattern(`%${domain.trim()}`);
      } else {
        console.log(`❌ ${colors.red}Đuôi email không hợp lệ (phải bắt đầu bằng chữ @)${colors.reset}`);
      }
    } else {
      console.log(`⏩ ${colors.yellow}Quay lại menu chính.${colors.reset}`);
    }
  } catch (error) {
    console.log(`❌ ${colors.red}Lỗi dọn dẹp: ${error.message}${colors.reset}`);
  }
}

/**
 * Xóa người dùng hàng loạt theo mẫu Email
 */
async function deleteUsersByEmailPattern(pattern) {
  try {
    const users = await prisma.user.findMany({
      where: {
        email: {
          like: pattern.replace('%', '') // Prisma doesn't have native SQL `like` in basic API, we will use endsWith/contains
        }
      },
      select: { id: true, email: true, username: true }
    });

    // Viết logic lọc chuẩn xác cho Prisma
    const actualPattern = pattern.replace('%', '');
    const matchedUsers = await prisma.user.findMany({
      where: {
        email: {
          endsWith: actualPattern
        }
      }
    });

    if (matchedUsers.length === 0) {
      console.log(`\nℹ️  ${colors.yellow}Không tìm thấy người dùng nào khớp với mẫu email "${pattern}"${colors.reset}`);
      return;
    }

    console.log(`\n⚠️  ${colors.bgRed}${colors.white} CẢNH BÁO NGUY HIỂM ${colors.reset}`);
    console.log(`Tìm thấy ${colors.bold}${matchedUsers.length} người dùng${colors.reset} có email kết thúc bằng "${actualPattern}".`);
    console.log(`Nếu bạn xóa các người dùng này, toàn bộ dữ liệu liên quan bao gồm:`);
    console.log(`  - Nghệ sĩ (Artist), Đơn đăng ký (ArtistRequest)`);
    console.log(`  - Playlist, Follow, Thư mục bài hát`);
    console.log(`  - Tất cả Lượt tương tác (Interaction), Thông báo, Báo cáo...`);
    console.log(`SẼ BỊ XÓA HOÀN TOÀN KHỎI HỆ THỐNG VÀ KHÔNG THỂ KHÔI PHỤC!`);

    const confirm = await question(`\nBạn có CHẮC CHẮN muốn xóa sạch ${matchedUsers.length} user này? (Nhập "YES_DELETE" để xác nhận): `);
    
    if (confirm === 'YES_DELETE') {
      console.log(`\n🧹 Đang xóa dữ liệu...`);
      
      // Xóa từng user bằng loop hoặc deleteMany. Vì có cascade nên deleteMany User sẽ tự động xóa tất cả bảng kia!
      const deleteResult = await prisma.user.deleteMany({
        where: {
          email: {
            endsWith: actualPattern
          }
        }
      });

      console.log(`🎉 ${colors.green}${colors.bold}HOÀN TẤT!${colors.reset} Đã xóa thành công ${deleteResult.count} người dùng mock khỏi cơ sở dữ liệu.`);
    } else {
      console.log(`\n⏩ ${colors.yellow}Đã hủy thao tác xóa.${colors.reset}`);
    }
  } catch (error) {
    console.log(`❌ ${colors.red}Lỗi khi xóa người dùng: ${error.message}${colors.reset}`);
  }
}

/**
 * Xóa sạch toàn bộ tương tác lượt nghe
 */
async function clearAllInteractions() {
  try {
    const count = await prisma.interaction.count();
    console.log(`\n⚠️  ${colors.yellow}Hiện có ${count} lượt tương tác (lượt nghe giả/thật) trong Database.${colors.reset}`);
    const confirm = await question(`Bạn có muốn xóa sạch TOÀN BỘ tương tác này? (y/n): `);

    if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
      await prisma.interaction.deleteMany();
      console.log(`🎉 ${colors.green}${colors.bold}HOÀN TẤT!${colors.reset} Đã xóa sạch toàn bộ bảng tương tác.`);
    } else {
      console.log(`⏩ ${colors.yellow}Đã hủy thao tác.${colors.reset}`);
    }
  } catch (error) {
    console.log(`❌ ${colors.red}Lỗi khi xóa tương tác: ${error.message}${colors.reset}`);
  }
}

/**
 * Xóa các bài hát nháp / chờ duyệt (Mock)
 */
async function clearUnapprovedSongs() {
  try {
    const songs = await prisma.song.findMany({
      where: {
        status: {
          in: ['pending', 'draft']
        }
      }
    });

    if (songs.length === 0) {
      console.log(`\nℹ️  Không có bài hát nào ở trạng thái "pending" hoặc "draft" (nháp/chờ duyệt).`);
      return;
    }

    console.log(`\n⚠️  Tìm thấy ${songs.length} bài hát đang ở trạng thái chờ duyệt hoặc nháp.`);
    const confirm = await question(`Bạn có muốn xóa sạch số bài hát này cùng các liên kết album, playlist tương ứng? (y/n): `);

    if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
      const result = await prisma.song.deleteMany({
        where: {
          status: {
            in: ['pending', 'draft']
          }
        }
      });
      console.log(`🎉 ${colors.green}${colors.bold}HOÀN TẤT!${colors.reset} Đã xóa thành công ${result.count} bài hát.`);
    } else {
      console.log(`⏩ ${colors.yellow}Đã hủy thao tác.${colors.reset}`);
    }
  } catch (error) {
    console.log(`❌ ${colors.red}Lỗi khi xóa bài hát: ${error.message}${colors.reset}`);
  }
}

/**
 * Vòng lặp Menu chính
 */
async function mainMenu() {
  while (true) {
    printHeader();
    await getStats();

    console.log(`${colors.bold}DANH SÁCH CHỨC NĂNG:${colors.reset}`);
    console.log(`  ${colors.green}1.${colors.reset} 📋 Xem danh sách 50 người dùng đầu tiên`);
    console.log(`  ${colors.green}2.${colors.reset} 🔑 Cấp quyền ADMIN cho người dùng (ID hoặc Email)`);
    console.log(`  ${colors.green}3.${colors.reset} 🔓 Hạ quyền ADMIN của người dùng về USER`);
    console.log(`  ${colors.green}4.${colors.reset} 🧹 Dọn dẹp Mock Data (User @example.com, Lượt nghe...)`);
    console.log(`  ${colors.green}5.${colors.reset} 🚪 Thoát chương trình`);
    console.log(`${colors.cyan}------------------------------------------------------------------------${colors.reset}`);

    const choice = await question(`Nhập lựa chọn của bạn (1-5): `);

    if (choice === '1') {
      await listUsers();
      await question(`\nNhấn Enter để quay lại menu...`);
    } else if (choice === '2') {
      await updateAdminStatus(true);
      await question(`\nNhấn Enter để quay lại menu...`);
    } else if (choice === '3') {
      await updateAdminStatus(false);
      await question(`\nNhấn Enter để quay lại menu...`);
    } else if (choice === '4') {
      await cleanMockData();
      await question(`\nNhấn Enter để quay lại menu...`);
    } else if (choice === '5') {
      console.log(`\n👋 ${colors.green}Cảm ơn bạn đã sử dụng công cụ! Tạm biệt.${colors.reset}\n`);
      rl.close();
      await prisma.$disconnect();
      process.exit(0);
    } else {
      console.log(`⚠️ ${colors.yellow}Lựa chọn không hợp lệ! Vui lòng chọn từ 1 đến 5.${colors.reset}`);
      await new Promise(r => setTimeout(r, 1500));
    }
  }
}

// Khởi chạy ứng dụng
mainMenu().catch(async (error) => {
  console.error(`💥 Đã xảy ra lỗi nghiêm trọng:`, error);
  rl.close();
  await prisma.$disconnect();
  process.exit(1);
});
