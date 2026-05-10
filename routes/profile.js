
const express = require('express');
const router = express.Router();
const {db} = require('../db');
const multer = require('multer');
const path = require('path');
const Hashids = require('hashids');
const hashids = new Hashids('goovlize-secret', 6); 

// Konfigurasi storage untuk upload gambar profile
const profileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../public/uploads/profile'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'profile-' + uniqueSuffix + ext);
  }
});

// Filter hanya gambar
const imageFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (JPEG, PNG, JPG, WebP, GIF)'), false);
  }
};

const upload = multer({
  storage: profileStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

router.post("/update", upload.single('cover'), async (req, res) => {
  try {
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);
    
    const { userId, name, removePhoto } = req.body;
    const shouldRemovePhoto = removePhoto === '1';
    
    // Validasi input
    if (!userId || !userId.trim()) {
      console.log('Error: User ID missing');
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }
    
    if (!name || !name.trim()) {
      console.log('Error: Name missing');
      return res.status(400).json({
        success: false,
        message: 'Username is required'
      });
    }
    
    // Validasi panjang username
    if (name.length > 50) {
      console.log('Error: Name too long');
      return res.status(400).json({
        success: false,
        message: 'Username must be less than 50 characters'
      });
    }
    
    console.log('Updating user:', userId, 'with name:', name, 'removePhoto:', shouldRemovePhoto, 'hasFile:', !!req.file);
    
    // Cek apakah user ada
    const [userCheck] = await db.promise().query(
      'SELECT id_user, profile_user FROM users WHERE id_user = ?',
      [userId]
    );
    
    if (userCheck.length === 0) {
      console.log('Error: User not found');
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Siapkan data untuk update
    const updateData = {
      name_user: name.trim()
    };
    
    const defaultPhotoPath = '/uploads/profile/default/default_pp.jpg';
    const oldProfilePath = userCheck[0].profile_user;
    
    // LOGIKA PRIORITAS: 
    // 1. Jika removePhoto = '1', abaikan file upload dan hapus foto
    // 2. Jika ada file upload DAN removePhoto = '0', upload file baru
    // 3. Jika tidak ada keduanya, tidak ubah foto
    
    if (shouldRemovePhoto) {
      console.log('REMOVE PHOTO PRIORITY: Setting photo to default');
      updateData.profile_user = defaultPhotoPath;
      
      // Hapus gambar lama jika ada dan bukan default
      if (oldProfilePath && !oldProfilePath.includes('default_pp.jpg')) {
        try {
          const fs = require('fs');
          const oldImagePath = path.join(__dirname, '../public', oldProfilePath);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
            console.log('Deleted old image for removal:', oldImagePath);
          }
        } catch (deleteError) {
          console.error('Error deleting old profile image:', deleteError);
        }
      }
    } 
    else if (req.file) {
      console.log('UPLOAD NEW PHOTO: Uploading new file:', req.file.filename);
      const newProfilePath = `/uploads/profile/${req.file.filename}`;
      updateData.profile_user = newProfilePath;
      
      // Hapus gambar lama jika ada dan bukan default
      if (oldProfilePath && !oldProfilePath.includes('default_pp.jpg')) {
        try {
          const fs = require('fs');
          const oldImagePath = path.join(__dirname, '../public', oldProfilePath);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
            console.log('Deleted old image for new upload:', oldImagePath);
          }
        } catch (deleteError) {
          console.error('Error deleting old profile image:', deleteError);
        }
      }
    } 
    else {
      console.log('NO PHOTO CHANGES: Keeping existing photo');
      // Tidak ubah kolom profile_user (biarkan seperti semula)
    }
    
    // Update data di database
    const updateResult = await db.promise().query(
      'UPDATE users SET ? WHERE id_user = ?',
      [updateData, userId]
    );
    
    console.log('Database update result:', updateResult);
    
    // Ambil data user yang telah diupdate
    const [updatedUser] = await db.promise().query(
      'SELECT id_user, name_user, profile_user FROM users WHERE id_user = ?',
      [userId]
    );
    
    console.log('Updated user data:', updatedUser[0]);
    
    // Tentukan foto yang akan dikembalikan
    const finalProfileImage = updatedUser[0].profile_user || defaultPhotoPath;
    
    // Kirim response sukses
    res.json({
      success: true,
      message: shouldRemovePhoto ? 'Profile photo removed successfully' : 'Profile updated successfully',
      data: {
        id: updatedUser[0].id_user,
        name: updatedUser[0].name_user,
        profile_image: finalProfileImage,
        profileImage: finalProfileImage
      }
    });
    
  } catch (error) {
    console.error('Error updating profile:', error);
    
    // Handle error khusus dari multer
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'Image size too large (max 5MB)'
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Error uploading image: ' + error.message
      });
    }
    
    // Handle error validasi tipe file
    if (error.message && error.message.includes('Only image files are allowed')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while updating profile'
    });
  }
});


// Fungsi untuk mengubah ukuran gambar Google (taruh di atas route)
function getGoogleProfilePic(profileUrl, size = 400) {
    if (!profileUrl || !profileUrl.includes('googleusercontent.com')) {
        return profileUrl || '/uploads/profile/default/default_pp.jpg';
    }
    
    // Ekstrak ID unik dari URL Google (handle berbagai format parameter)
    const match = profileUrl.match(/lh3\.googleusercontent.com\/a\/([^?&=]+)/);
    if (!match || !match[1]) return profileUrl;
    
    const googleId = match[1];
    // Hapus parameter sizing lama dan ganti dengan size baru
    return `https://lh3.googleusercontent.com/a/${googleId}=s${size}`;
}

router.get("/editprofile/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Ambil data user dari database
    const [users] = await db.promise().query(
      `SELECT id_user, name_user, profile_user 
       FROM users 
       WHERE id_user = ?`,
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'User not found'
      });
    }
    
    const user = users[0];
    
    // PERBAIKAN UTAMA: Normalisasi URL gambar Google untuk popup edit
    const normalizedProfileImage = getGoogleProfilePic(user.profile_user, 400);
    
    // Kirim data dalam format JSON dengan gambar yang sudah dinormalisasi
    res.json({
      success: true,
      data: {
        id: user.id_user,
        name: user.name_user,
        profile_image: normalizedProfileImage || '/uploads/profile/default/default_pp.jpg'
      }
    });
    
  } catch (error) {
    console.error('Error in /profile/editprofile/:id:', error);
    res.status(500).json({
      error: true,
      message: 'Server error while fetching profile data'
    });
  }
});


router.get("/followers/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    const currentUserId = req.session.user_id || 0;
    const isOwnProfile = parseInt(userId) === currentUserId;
    
    // Ambil data followers dari database
    const [followers] = await db.promise().query(
      `SELECT 
        u.id_user as id,
        u.name_user as name,
        u.profile_user as profile_image,
        COALESCE(u.bio, '') as bio,
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM user_follow uf2 
            WHERE uf2.id_user = ? AND uf2.id_user_follow = u.id_user
          ) THEN 1
          ELSE 0
        END as is_following,
        ? as is_own_profile
       FROM user_follow uf
       JOIN users u ON uf.id_user = u.id_user
       WHERE uf.id_user_follow = ?
       ORDER BY uf.created_at DESC`,
      [currentUserId, isOwnProfile ? 1 : 0, userId]
    );
    
    // Encode ID untuk setiap follower
    const followersWithHashid = followers.map(follower => ({
      ...follower,
      hashid: hashids.encode(follower.id),
      profile_image: follower.profile_image || '/uploads/profile/default/default_pp.jpg',
      is_own_profile: follower.is_own_profile === 1,
      // Tambahkan field untuk menentukan apakah ini current user
      is_current_user: parseInt(currentUserId) === parseInt(follower.id)
    }));
    
    res.json({
      success: true,
      data: followersWithHashid,
      is_own_profile: isOwnProfile
    });
    
  } catch (error) {
    console.error('Error in /profile/followers/:id:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching followers data'
    });
  }
});

// Route untuk get following
router.get("/following/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    const currentUserId = req.session.user_id || 0;
    const isOwnProfile = parseInt(userId) === currentUserId;
    
    // Ambil data following dari database
    const [following] = await db.promise().query(
      `SELECT 
        u.id_user as id,
        u.name_user as name,
        u.profile_user as profile_image,
        COALESCE(u.bio, '') as bio,
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM user_follow uf2 
            WHERE uf2.id_user = ? AND uf2.id_user_follow = u.id_user
          ) THEN 1
          ELSE 0
        END as is_following,
        ? as is_own_profile
       FROM user_follow uf
       JOIN users u ON uf.id_user_follow = u.id_user
       WHERE uf.id_user = ?
       ORDER BY uf.created_at DESC`,
      [currentUserId, isOwnProfile ? 1 : 0, userId]
    );
    
    // Encode ID untuk setiap following
    const followingWithHashid = following.map(follow => ({
      ...follow,
      hashid: hashids.encode(follow.id),
      profile_image: follow.profile_image || '/uploads/profile/default/default_pp.jpg',
      is_own_profile: follow.is_own_profile === 1,
      // Tambahkan field untuk menentukan apakah ini current user
      is_current_user: parseInt(currentUserId) === parseInt(follow.id)
    }));
    
    res.json({
      success: true,
      data: followingWithHashid,
      is_own_profile: isOwnProfile
    });
    
  } catch (error) {
    console.error('Error in /profile/following/:id:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching following data'
    });
  }
});




module.exports = router;