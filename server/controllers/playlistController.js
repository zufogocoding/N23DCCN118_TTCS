const prisma = require('../db/index');
const fs = require('fs');
const path = require('path');

// Helper to delete physical files safely
const deleteFile = (relativePath) => {
  if (!relativePath) return;
  const absolutePath = path.resolve(process.cwd(), relativePath.startsWith('/') ? relativePath.substring(1) : relativePath);
  if (fs.existsSync(absolutePath)) {
    try {
      fs.unlinkSync(absolutePath);
    } catch (err) {
      console.error(`[deleteFile] Không thể xóa file ${absolutePath}:`, err.message);
    }
  }
};

const playlistController = {
  // 1. Tạo Playlist mới
  createPlaylist: async (req, res) => {
    try {
      const userId = req.user.id;
      const { title, description } = req.body;

      let coverArtUrl = null;
      if (req.file) {
        coverArtUrl = `/uploads/covers/${req.file.filename}`;
      }

      // Kiểm tra user tồn tại
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res.status(404).json({ error: 'User không tồn tại' });
      }

      // Tạo một URL ngẫu nhiên nhưng đảm bảo không bao giờ trùng (Dùng Date.now)
      const generatedUrl = `playlist-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const newPlaylist = await prisma.playlist.create({
        data: {
          title: title || 'Playlist Mới',
          description: description || null,
          playlistUrl: generatedUrl, // Bắt buộc phải có theo schema
          userId: userId,
          coverArtUrl: coverArtUrl
        }
      });
      res.status(201).json({ message: 'Tạo Playlist thành công!', playlist: newPlaylist });
    } catch (error) {
      console.error("Lỗi createPlaylist:", error);
      res.status(500).json({ error: 'Lỗi server khi tạo Playlist' });
    }
  },

  // 2. Thêm bài hát vào Playlist (Bắn qua bảng trung gian PlaylistSong)
  addSongToPlaylist: async (req, res) => {
    try {
      const playlistId = parseInt(req.params.id);
      const userId = req.user.id;
      const { songId } = req.body;

      if (songId == null || songId === '') {
        return res.status(400).json({ error: 'Thiếu songId' });
      }

      const sid = parseInt(songId, 10);
      if (Number.isNaN(sid)) {
        return res.status(400).json({ error: 'songId không hợp lệ' });
      }

      // Kiểm tra playlist tồn tại
      const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
      if (!playlist) {
        return res.status(404).json({ error: 'Playlist không tồn tại' });
      }

      // Quyền chỉnh sửa: Chủ sở hữu hoặc Collaborator (nếu playlist ở chế độ cộng tác)
      const isOwner = playlist.userId === userId;
      let isCollaborator = false;

      if (!isOwner && playlist.isCollaborative) {
        const collab = await prisma.playlistCollaborator.findUnique({
          where: {
            playlistId_userId: { playlistId, userId }
          }
        });
        isCollaborator = !!collab;
      }

      if (!isOwner && !isCollaborator) {
        return res.status(403).json({ error: 'Bạn không có quyền chỉnh sửa Playlist này' });
      }

      // Kiểm tra bài hát tồn tại và chưa bị xóa
      const song = await prisma.song.findFirst({
        where: { id: sid, isDeleted: false }
      });
      if (!song) {
        return res.status(404).json({ error: 'Bài hát không tồn tại hoặc đã bị xóa' });
      }

      const existing = await prisma.playlistSong.findUnique({
        where: {
          playlistId_songId: { playlistId, songId: sid }
        }
      });

      if (existing) {
        return res.status(200).json({
          message: 'Bài hát đã có trong playlist',
          alreadyInPlaylist: true,
          data: existing
        });
      }

      const newPlaylistSong = await prisma.playlistSong.create({
        data: {
          playlistId,
          songId: sid
        }
      });

      res.status(200).json({ message: 'Đã thêm bài hát vào Playlist!', data: newPlaylistSong });
    } catch (error) {
      console.error("Lỗi addSongToPlaylist:", error);
      res.status(500).json({ error: 'Lỗi server khi thêm bài hát vào playlist' });
    }
  },

  // 3. Xóa bài hát khỏi Playlist
  removeSongFromPlaylist: async (req, res) => {
    try {
      const playlistId = parseInt(req.params.id);
      const songId = parseInt(req.params.songId);
      const userId = req.user.id;

      // Kiểm tra playlist tồn tại
      const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
      if (!playlist) {
        return res.status(404).json({ error: 'Playlist không tồn tại' });
      }

      // Quyền chỉnh sửa: Chủ sở hữu hoặc Collaborator (nếu playlist ở chế độ cộng tác)
      const isOwner = playlist.userId === userId;
      let isCollaborator = false;

      if (!isOwner && playlist.isCollaborative) {
        const collab = await prisma.playlistCollaborator.findUnique({
          where: {
            playlistId_userId: { playlistId, userId }
          }
        });
        isCollaborator = !!collab;
      }

      if (!isOwner && !isCollaborator) {
        return res.status(403).json({ error: 'Bạn không có quyền chỉnh sửa Playlist này' });
      }

      await prisma.playlistSong.delete({
        where: {
          playlistId_songId: {
            playlistId: playlistId,
            songId: songId
          }
        }
      });

      res.status(200).json({ message: 'Đã xóa bài hát khỏi Playlist!' });
    } catch (error) {
      console.error("Lỗi removeSongFromPlaylist:", error);
      res.status(500).json({ error: 'Lỗi khi xóa bài hát khỏi Playlist' });
    }
  },

  // 4. Xem chi tiết Playlist (Phải chui qua bảng trung gian mới lấy được thông tin Song)
  getPlaylistById: async (req, res) => {
    try {
      const playlistId = parseInt(req.params.id);

      const playlist = await prisma.playlist.findUnique({
        where: { id: playlistId },
        include: {
          user: { select: { id: true, username: true, avatarUrl: true } },
          collaborators: {
            include: {
              user: { select: { id: true, username: true, displayName: true, avatarUrl: true } }
            }
          },
          songs: { // Gọi vào bảng trung gian PlaylistSong
            include: {
              song: {
                include: {
                  artists: {
                    include: {
                      artist: {
                        include: { user: { select: { username: true, displayName: true } } }
                      }
                    }
                  }
                }
              }
            },
            orderBy: { addAt: 'asc' }
          }
        }
      });

      if (!playlist) return res.status(404).json({ error: 'Không tìm thấy Playlist này!' });

      // Nếu playlist không public, chỉ chủ playlist, collaborator hoặc admin mới có quyền xem
      const requesterId = req.user ? req.user.id : null;
      let isAdmin = false;
      if (requesterId) {
        const requesterUser = await prisma.user.findUnique({ where: { id: requesterId }, select: { isAdmin: true } });
        isAdmin = requesterUser ? requesterUser.isAdmin : false;
      }

      const isOwner = playlist.userId === requesterId;
      const isCollab = playlist.collaborators.some(c => c.userId === requesterId);

      if (!playlist.isPublic && !isOwner && !isCollab && !isAdmin) {
        return res.status(403).json({ error: 'Playlist này là riêng tư' });
      }

      // Lọc bỏ bài hát đã bị soft delete hoặc chưa được duyệt (trừ khi là chủ sở hữu hoặc admin)
      playlist.songs = playlist.songs.filter(ps => {
        const isSongDeleted = ps.song.isDeleted;
        if (isSongDeleted) return false;

        const isSongApproved = ps.song.status === 'approved';
        if (isSongApproved) return true;

        const isSongOwner = ps.song.uploadedById === requesterId;
        return isSongOwner || isAdmin;
      });

      res.status(200).json(playlist);
    } catch (error) {
      console.error("Lỗi getPlaylistById:", error);
      res.status(500).json({ error: 'Lỗi server' });
    }
  },

  // Lấy danh sách playlist của một user
  getUserPlaylists: async (req, res) => {
    try {
      const targetUserId = parseInt(req.params.userId);
      const requestUserId = req.user.id;

      let playlists;
      if (targetUserId === requestUserId) {
        // Lấy tất cả playlist của bản thân (cả public và private), cộng thêm playlist cộng tác
        const ownPlaylists = await prisma.playlist.findMany({
          where: { userId: targetUserId },
          include: {
            _count: { select: { songs: true } }
          },
          orderBy: { updatedAt: 'desc' }
        });

        const collabPlaylists = await prisma.playlist.findMany({
          where: {
            collaborators: {
              some: { userId: targetUserId }
            }
          },
          include: {
            _count: { select: { songs: true } }
          },
          orderBy: { updatedAt: 'desc' }
        });

        // Kết hợp và xóa bỏ trùng lặp (nếu có)
        const combined = [...ownPlaylists];
        collabPlaylists.forEach(cp => {
          if (!combined.some(p => p.id === cp.id)) {
            combined.push(cp);
          }
        });

        playlists = combined;
      } else {
        // Lấy các playlist public của người khác
        playlists = await prisma.playlist.findMany({
          where: { userId: targetUserId, isPublic: true },
          include: {
            _count: { select: { songs: true } }
          },
          orderBy: { updatedAt: 'desc' }
        });
      }

      res.status(200).json(playlists);
    } catch (error) {
      console.error("Lỗi getUserPlaylists:", error);
      res.status(500).json({ error: 'Lỗi server khi lấy danh sách Playlist' });
    }
  },

  /** Playlist của user nào đang chứa bài songId (để UI hiện trạng thái đã thêm) */
  getPlaylistIdsContainingSong: async (req, res) => {
    try {
      const targetUserId = parseInt(req.params.userId, 10);
      const requestUserId = req.user.id;
      const songId = parseInt(req.params.songId, 10);
      if (Number.isNaN(targetUserId) || Number.isNaN(songId)) {
        return res.status(400).json({ error: 'Tham số không hợp lệ' });
      }

      // Chỉ kiểm tra memberships cho chính user đang đăng nhập
      if (targetUserId !== requestUserId) {
        return res.status(403).json({ error: 'Bạn không có quyền thực hiện thao tác này' });
      }

      const rows = await prisma.playlistSong.findMany({
        where: {
          songId,
          playlist: {
            OR: [
              { userId: requestUserId },
              { collaborators: { some: { userId: requestUserId } } }
            ]
          }
        },
        select: { playlistId: true }
      });

      res.status(200).json({ playlistIds: rows.map((r) => r.playlistId) });
    } catch (error) {
      console.error('Lỗi getPlaylistIdsContainingSong:', error);
      res.status(500).json({ error: 'Lỗi server' });
    }
  },

  // 6. Xóa Playlist
  deletePlaylist: async (req, res) => {
    try {
      const playlistId = parseInt(req.params.id);
      const userId = req.user.id;

      // Kiểm tra playlist tồn tại
      const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
      if (!playlist) {
        return res.status(404).json({ error: 'Playlist không tồn tại' });
      }

      // Kiểm tra quyền sở hữu (hoặc admin)
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
      const isAdmin = user ? user.isAdmin : false;

      if (playlist.userId !== userId && !isAdmin) {
        return res.status(403).json({ error: 'Bạn không có quyền xóa Playlist này' });
      }

      // Xóa playlist (cascade sẽ tự xóa các PlaylistSong liên quan)
      await prisma.playlist.delete({ where: { id: playlistId } });

      // Xóa file coverArtUrl cũ nếu có
      if (playlist.coverArtUrl) {
        deleteFile(playlist.coverArtUrl);
      }

      res.status(200).json({ message: 'Đã xóa Playlist!' });
    } catch (error) {
      console.error("Lỗi deletePlaylist:", error);
      res.status(500).json({ error: 'Lỗi server khi xóa Playlist' });
    }
  },

  // 7. Cập nhật thông tin Playlist (title, description, isPublic, isCollaborative)
  updatePlaylist: async (req, res) => {
    try {
      const playlistId = parseInt(req.params.id);
      const userId = req.user.id;
      const { title, description, isPublic, isCollaborative } = req.body;

      let coverArtUrl;
      if (req.file) {
        coverArtUrl = `/uploads/covers/${req.file.filename}`;
      }

      // Kiểm tra playlist tồn tại
      const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
      if (!playlist) {
        return res.status(404).json({ error: 'Playlist không tồn tại' });
      }

      // Kiểm tra quyền sở hữu
      if (playlist.userId !== userId) {
        return res.status(403).json({ error: 'Bạn không có quyền chỉnh sửa Playlist này' });
      }

      const updateData = {};
      if (title !== undefined && title !== '') updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (isPublic !== undefined) updateData.isPublic = isPublic === 'true' || isPublic === true;
      if (isCollaborative !== undefined) updateData.isCollaborative = isCollaborative === 'true' || isCollaborative === true;
      if (coverArtUrl !== undefined) {
        if (playlist.coverArtUrl) {
          deleteFile(playlist.coverArtUrl);
        }
        updateData.coverArtUrl = coverArtUrl;
      }

      const updatedPlaylist = await prisma.playlist.update({
        where: { id: playlistId },
        data: updateData
      });

      res.status(200).json({ message: 'Cập nhật Playlist thành công!', playlist: updatedPlaylist });
    } catch (error) {
      console.error("Lỗi updatePlaylist:", error);
      res.status(500).json({ error: 'Lỗi server khi cập nhật Playlist' });
    }
  },

  // 8. Thêm người cộng tác vào Playlist
  addCollaborator: async (req, res) => {
    try {
      const playlistId = parseInt(req.params.id, 10);
      const ownerId = req.user.id;
      const { usernameOrEmail } = req.body;

      if (!usernameOrEmail) {
        return res.status(400).json({ error: 'Vui lòng cung cấp username hoặc email.' });
      }

      const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
      if (!playlist) {
        return res.status(404).json({ error: 'Playlist không tồn tại.' });
      }

      if (playlist.userId !== ownerId) {
        return res.status(403).json({ error: 'Chỉ chủ sở hữu mới có quyền thêm người cộng tác.' });
      }

      const collaboratorUser = await prisma.user.findFirst({
        where: {
          OR: [
            { username: usernameOrEmail },
            { email: usernameOrEmail }
          ]
        }
      });

      if (!collaboratorUser) {
        return res.status(404).json({ error: 'Không tìm thấy người dùng này.' });
      }

      if (collaboratorUser.id === ownerId) {
        return res.status(400).json({ error: 'Bạn là chủ sở hữu playlist, không thể tự cộng tác.' });
      }

      // Kiểm tra xem đã là collaborator chưa
      const existing = await prisma.playlistCollaborator.findUnique({
        where: {
          playlistId_userId: {
            playlistId,
            userId: collaboratorUser.id
          }
        }
      });

      if (existing) {
        return res.status(400).json({ error: 'Người dùng này đã tham gia cộng tác rồi.' });
      }

      await prisma.playlistCollaborator.create({
        data: {
          playlistId,
          userId: collaboratorUser.id
        }
      });

      res.status(200).json({ message: 'Đã thêm người cộng tác thành công.' });
    } catch (error) {
      console.error('Lỗi addCollaborator:', error);
      res.status(500).json({ error: 'Lỗi server khi thêm người cộng tác.' });
    }
  },

  // 9. Xóa người cộng tác khỏi Playlist
  removeCollaborator: async (req, res) => {
    try {
      const playlistId = parseInt(req.params.id, 10);
      const targetUserId = parseInt(req.params.userId, 10);
      const ownerId = req.user.id;

      const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
      if (!playlist) {
        return res.status(404).json({ error: 'Playlist không tồn tại.' });
      }

      if (playlist.userId !== ownerId) {
        return res.status(403).json({ error: 'Chỉ chủ sở hữu mới có quyền xóa người cộng tác.' });
      }

      await prisma.playlistCollaborator.delete({
        where: {
          playlistId_userId: {
            playlistId,
            userId: targetUserId
          }
        }
      });

      res.status(200).json({ message: 'Đã xóa người cộng tác thành công.' });
    } catch (error) {
      console.error('Lỗi removeCollaborator:', error);
      res.status(500).json({ error: 'Lỗi server khi xóa người cộng tác.' });
    }
  },

  // 10. Sao chép Playlist công khai (Playlist Cloning)
  clonePlaylist: async (req, res) => {
    try {
      const originalPlaylistId = parseInt(req.params.id, 10);
      const userId = req.user.id;

      const originalPlaylist = await prisma.playlist.findUnique({
        where: { id: originalPlaylistId },
        include: {
          songs: true
        }
      });

      if (!originalPlaylist) {
        return res.status(404).json({ error: 'Không tìm thấy playlist gốc.' });
      }

      if (!originalPlaylist.isPublic) {
        return res.status(403).json({ error: 'Không thể sao chép playlist riêng tư.' });
      }

      // Tạo URL ngẫu nhiên cho playlist mới
      const generatedUrl = `playlist-clone-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Tạo playlist nhân bản
      const clonedPlaylist = await prisma.playlist.create({
        data: {
          title: `Bản sao của ${originalPlaylist.title}`,
          description: originalPlaylist.description || 'Playlist được sao chép',
          playlistUrl: generatedUrl,
          userId: userId,
          coverArtUrl: originalPlaylist.coverArtUrl,
          isPublic: false // Mặc định riêng tư khi sao chép
        }
      });

      // Sao chép tất cả các bài hát sang playlist mới
      if (originalPlaylist.songs.length > 0) {
        const songData = originalPlaylist.songs.map(ps => ({
          playlistId: clonedPlaylist.id,
          songId: ps.songId
        }));
        await prisma.playlistSong.createMany({
          data: songData
        });
      }

      res.status(201).json({
        message: 'Sao chép playlist thành công!',
        playlist: clonedPlaylist
      });
    } catch (error) {
      console.error('Lỗi clonePlaylist:', error);
      res.status(500).json({ error: 'Lỗi server khi sao chép playlist.' });
    }
  }
};

module.exports = playlistController;