const express = require('express');
const router = express.Router();
const { isAdminAuthenticated } = require('../../middleware/admin-auth');
const { db } = require('../../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for profile image upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const profileDir = 'public/uploads/artists/';
        if (!fs.existsSync(profileDir)) {
            fs.mkdirSync(profileDir, { recursive: true });
        }
        cb(null, profileDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const filename = 'artist-' + uniqueSuffix + ext;
        cb(null, filename);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid image file type. Only JPG, JPEG, PNG, GIF, WEBP are allowed.'));
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max
    },
    fileFilter: fileFilter
});

// Helper function untuk format tanggal
function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    } catch (dateErr) {
        console.error('Error formatting date:', dateErr);
        return 'Unknown';
    }
}

router.get('/admin/artist', isAdminAuthenticated, async (req, res) => {
  const {
    search = '',
    page = 1
  } = req.query;

  const currentPage = Math.max(parseInt(page) || 1, 1);
  const limit = 20;
  const offset = (currentPage - 1) * limit;

  try {
    /* =======================
       MAIN QUERY (ARTIST LIST)
    ======================== */
    let baseQuery = `
      SELECT 
        a.id_artist,
        a.id_artist_auto,
        a.artist_name,
        a.artist_profile,
        a.created_at,
        COALESCE((
          SELECT COUNT(DISTINCT ma.id_music)
          FROM music_artist ma
          WHERE ma.id_artist = a.id_artist
        ), 0) AS total_songs,
        COALESCE((
          SELECT COUNT(DISTINCT mp.id_playlist)
          FROM music_artist ma
          LEFT JOIN music_playlist mp ON ma.id_music = mp.id_music
          WHERE ma.id_artist = a.id_artist
        ), 0) AS total_playlists
      FROM artist a
    `;

    const whereConditions = [];
    const queryParams = [];

    if (search.trim()) {
      whereConditions.push('a.artist_name LIKE ?');
      queryParams.push(`%${search.trim()}%`);
    }

    if (whereConditions.length) {
      baseQuery += ' WHERE ' + whereConditions.join(' AND ');
    }

    // ORDER BY aman (jika created_at null)
    baseQuery += `
      ORDER BY 
        a.created_at DESC,
        a.id_artist DESC
      LIMIT ? OFFSET ?
    `;

    queryParams.push(limit, offset);

    const [artistResult] = await db.promise().query(baseQuery, queryParams);

    const artistList = artistResult.map(a => {
      let formattedDate = 'Unknown';

      if (a.created_at) {
        const date = new Date(a.created_at);
        formattedDate = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      }

      return {
        id_artist: a.id_artist,
        id_artist_auto: a.id_artist_auto,
        artist_name: a.artist_name || 'Unknown Artist',
        artist_profile: a.artist_profile || '/uploads/undefine.jpg',
        created_at: a.created_at,
        formatted_date: formattedDate,
        total_songs: Number(a.total_songs),
        total_playlists: Number(a.total_playlists)
      };
    });

    /* =======================
       COUNT QUERY (PAGINATION)
    ======================== */
    let countQuery = `SELECT COUNT(*) AS total FROM artist a`;
    const countParams = [];

    if (search.trim()) {
      countQuery += ' WHERE a.artist_name LIKE ?';
      countParams.push(`%${search.trim()}%`);
    }

    const [countResult] = await db.promise().query(countQuery, countParams);
    const totalArtists = countResult[0].total;
    const totalPages = Math.ceil(totalArtists / limit);

    /* =======================
       RENDER
    ======================== */
    res.render('admin/artist', {
      admin: req.session.admin,
      artistList,
      totalArtists,
      currentPage,
      totalPages,
      currentFilters: { search },
      error: null,
      success: null
    });

  } catch (err) {
    console.error('Artist page error:', err);

    res.render('admin/artist', {
      admin: req.session.admin,
      artistList: [],
      totalArtists: 0,
      currentPage: 1,
      totalPages: 1,
      currentFilters: { search: '' },
      error: 'Failed to load artist data',
      success: null
    });
  }
});

// Route untuk menambahkan artist baru
router.post('/admin/artist/add', isAdminAuthenticated, upload.single('profile'), async (req, res) => {
    try {
        const { artist_name } = req.body;
        
        // Validasi required fields
        if (!artist_name || artist_name.trim() === '') {
            // Hapus file yang sudah diupload jika ada error
            if (req.file && req.file.path) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({
                success: false,
                message: 'Artist name is required'
            });
        }

        // Generate new artist ID
        const [lastArtist] = await db.promise().query(
            'SELECT id_artist FROM artist ORDER BY id_artist DESC LIMIT 1'
        );
        
        let newArtistId = 'AR001';
        
        if (lastArtist.length > 0) {
            const lastId = lastArtist[0].id_artist;
            if (lastId.startsWith('AR')) {
                const lastNumber = parseInt(lastId.replace('AR', '')) || 0;
                newArtistId = 'AR' + String(lastNumber + 1).padStart(3, '0');
            }
        }

        // Path untuk profile image
        let profilePath = '/uploads/undefine.jpg';
        if (req.file) {
            profilePath = `/uploads/artists/${req.file.filename}`;
        }

        // Insert ke tabel artist
        await db.promise().query(
            'INSERT INTO artist (id_artist, artist_name, artist_profile) VALUES (?, ?, ?)',
            [newArtistId, artist_name.trim(), profilePath]
        );

        // Ambil data artist yang baru dibuat
        const [artistResult] = await db.promise().query(
            'SELECT * FROM artist WHERE id_artist = ?',
            [newArtistId]
        );

        res.json({
            success: true,
            message: 'Artist added successfully',
            artist: artistResult[0]
        });

    } catch (error) {
        console.error('Error adding artist:', error);
        
        // Hapus file yang sudah diupload jika ada error
        if (req.file && req.file.path) {
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to add artist: ' + error.message
        });
    }
});

// Route untuk mendapatkan data artist berdasarkan ID (untuk edit)
router.get('/admin/artist/get/:id', isAdminAuthenticated, async (req, res) => {
    try {
        const artistId = req.params.id;
        
        // Get basic artist data
        const [artistResult] = await db.promise().query(
            'SELECT * FROM artist WHERE id_artist = ?',
            [artistId]
        );
        
        if (artistResult.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Artist not found'
            });
        }
        
        // Get artist statistics menggunakan subquery
        const [statsResult] = await db.promise().query(`
            SELECT 
                COALESCE((
                    SELECT COUNT(DISTINCT ma.id_music) 
                    FROM music_artist ma 
                    WHERE ma.id_artist = ?
                ), 0) as total_songs,
                COALESCE((
                    SELECT COUNT(DISTINCT mp.id_playlist) 
                    FROM music_artist ma 
                    LEFT JOIN music_playlist mp ON ma.id_music = mp.id_music
                    WHERE ma.id_artist = ?
                ), 0) as total_playlists
        `, [artistId, artistId]);
        
        const artist = artistResult[0];
        artist.total_songs = statsResult[0]?.total_songs || 0;
        artist.total_playlists = statsResult[0]?.total_playlists || 0;
        artist.formatted_date = formatDate(artist.created_at);
        
        res.json({
            success: true,
            artist: artist
        });
        
    } catch (error) {
        console.error('Error fetching artist data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch artist data',
            error: error.message
        });
    }
});

// Route untuk update artist
router.post('/admin/artist/update', isAdminAuthenticated, upload.single('profile'), async (req, res) => {
    try {
        const { artist_id, artist_name } = req.body;
        
        // Validasi required fields
        if (!artist_id) {
            if (req.file && req.file.path) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({
                success: false,
                message: 'Artist ID is required'
            });
        }

        if (!artist_name || artist_name.trim() === '') {
            if (req.file && req.file.path) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({
                success: false,
                message: 'Artist name is required'
            });
        }

        // Cek apakah artist ada dan ambil data file lama
        const [existingArtist] = await db.promise().query(
            'SELECT * FROM artist WHERE id_artist = ?',
            [artist_id]
        );
        
        if (existingArtist.length === 0) {
            if (req.file && req.file.path) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(404).json({
                success: false,
                message: 'Artist not found'
            });
        }

        const oldArtist = existingArtist[0];
        let profilePath = oldArtist.artist_profile;
        
        // Jika ada file profile baru, update path dan hapus file lama
        if (req.file) {
            profilePath = `/uploads/artists/${req.file.filename}`;
            
            // Hapus file lama jika bukan default
            if (oldArtist.artist_profile && 
                !oldArtist.artist_profile.includes('/uploads/undefine.jpg')) {
                const oldFilePath = path.join(__dirname, '../../public', oldArtist.artist_profile);
                if (fs.existsSync(oldFilePath)) {
                    fs.unlinkSync(oldFilePath);
                }
            }
        }

        // Update ke tabel artist
        await db.promise().query(
            'UPDATE artist SET artist_name = ?, artist_profile = ? WHERE id_artist = ?',
            [artist_name.trim(), profilePath, artist_id]
        );

        // Ambil data artist yang sudah diupdate
        const [updatedArtist] = await db.promise().query(
            'SELECT * FROM artist WHERE id_artist = ?',
            [artist_id]
        );

        res.json({
            success: true,
            message: 'Artist updated successfully',
            artist: updatedArtist[0]
        });

    } catch (error) {
        console.error('Error updating artist:', error);
        
        // Hapus file baru yang sudah diupload jika ada error
        if (req.file && req.file.path) {
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to update artist: ' + error.message
        });
    }
});

// Route untuk menghapus artist
router.delete('/admin/artist/delete/:id', isAdminAuthenticated, async (req, res) => {
    try {
        const artistId = req.params.id;
        
        // Cek apakah artist ada
        const [artistResult] = await db.promise().query(
            'SELECT * FROM artist WHERE id_artist = ?',
            [artistId]
        );
        
        if (artistResult.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Artist not found'
            });
        }
        
        const artist = artistResult[0];
        
        // Mulai transaction
        await db.promise().beginTransaction();
        
        try {
            // Cek apakah artist memiliki lagu di tabel music_artist
            const [songsResult] = await db.promise().query(
                'SELECT COUNT(*) as song_count FROM music_artist WHERE id_artist = ?',
                [artistId]
            );
            
            if (songsResult[0].song_count > 0) {
                await db.promise().rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete artist with existing songs. Please remove or reassign songs first.'
                });
            }
            
            // Hapus artist
            await db.promise().query(
                'DELETE FROM artist WHERE id_artist = ?',
                [artistId]
            );
            
            // Commit transaction
            await db.promise().commit();
            
            // Hapus file profile jika bukan default
            if (artist.artist_profile && 
                !artist.artist_profile.includes('/uploads/undefine.jpg')) {
                const profilePath = path.join(__dirname, '../../public', artist.artist_profile);
                if (fs.existsSync(profilePath)) {
                    fs.unlinkSync(profilePath);
                }
            }
            
            res.json({
                success: true,
                message: 'Artist deleted successfully'
            });
            
        } catch (dbError) {
            // Rollback transaction jika ada error
            await db.promise().rollback();
            console.error('Database error during delete:', dbError);
            throw dbError;
        }
        
    } catch (error) {
        console.error('Error deleting artist:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete artist: ' + error.message
        });
    }
});

// Route untuk filter artist
router.get('/admin/artist/filter', isAdminAuthenticated, async (req, res) => {
    try {
        const {
            search = '',
            page = 1
        } = req.query;

        const currentPage = parseInt(page);
        const limit = 20;
        const offset = (currentPage - 1) * limit;

        // Build base query dengan subquery
        let baseQuery = `
            SELECT 
                a.*,
                COALESCE((
                    SELECT COUNT(DISTINCT ma.id_music) 
                    FROM music_artist ma 
                    WHERE ma.id_artist = a.id_artist
                ), 0) as total_songs,
                COALESCE((
                    SELECT COUNT(DISTINCT mp.id_playlist) 
                    FROM music_artist ma 
                    LEFT JOIN music_playlist mp ON ma.id_music = mp.id_music
                    WHERE ma.id_artist = a.id_artist
                ), 0) as total_playlists
            FROM artist a
        `;

        // Add WHERE conditions
        const whereConditions = [];
        const queryParams = [];

        // Search filter
        if (search) {
            whereConditions.push('a.artist_name LIKE ?');
            queryParams.push(`%${search}%`);
        }

        // Add WHERE clause if there are conditions
        if (whereConditions.length > 0) {
            baseQuery += ' WHERE ' + whereConditions.join(' AND ');
        }

        // Add ORDER BY
        baseQuery += ' ORDER BY a.created_at DESC';

        // Add LIMIT and OFFSET for pagination
        baseQuery += ' LIMIT ? OFFSET ?';
        queryParams.push(limit, offset);

        // Execute query
        const [artistResult] = await db.promise().query(baseQuery, queryParams);

        // Process artist data
        const artistList = artistResult.map(artist => ({
            ...artist,
            formatted_date: formatDate(artist.created_at),
            total_songs: parseInt(artist.total_songs),
            total_playlists: parseInt(artist.total_playlists)
        }));

        // Get total count for pagination
        let countQuery = `
            SELECT COUNT(*) as total 
            FROM artist a
        `;

        const countWhereConditions = [];
        const countParams = [];

        // Search filter for count
        if (search) {
            countWhereConditions.push('a.artist_name LIKE ?');
            countParams.push(`%${search}%`);
        }

        // Add WHERE clause if there are conditions
        if (countWhereConditions.length > 0) {
            countQuery += ' WHERE ' + countWhereConditions.join(' AND ');
        }

        const [countResult] = await db.promise().query(countQuery, countParams);
        const totalArtists = countResult[0]?.total || 0;
        const totalPages = Math.ceil(totalArtists / limit);

        res.json({
            success: true,
            artistList: artistList,
            totalArtists: totalArtists,
            currentPage: currentPage,
            totalPages: totalPages
        });

    } catch (error) {
        console.error('Filter artist error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to filter artist data',
            error: error.message
        });
    }
});

// Route untuk mendapatkan daftar semua artist (untuk dropdown)
router.get('/admin/artist/list', isAdminAuthenticated, async (req, res) => {
    try {
        const [artists] = await db.promise().query(`
            SELECT id_artist, artist_name, artist_profile 
            FROM artist 
            ORDER BY artist_name ASC
        `);
        
        res.json({
            success: true,
            artists: artists || []
        });
        
    } catch (error) {
        console.error('Error fetching artist list:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch artist list',
            error: error.message
        });
    }
});

// Route untuk mendapatkan lagu-lagu dari artist tertentu
router.get('/admin/artist/songs/:id', isAdminAuthenticated, async (req, res) => {
    try {
        const artistId = req.params.id;
        
        const [songs] = await db.promise().query(`
            SELECT 
                m.*,
                al.album_name,
                al.album_cover
            FROM music_artist ma
            JOIN music m ON ma.id_music = m.id_music
            LEFT JOIN album al ON m.id_album = al.id_album
            WHERE ma.id_artist = ?
            ORDER BY m.music_title ASC
        `, [artistId]);
        
        res.json({
            success: true,
            songs: songs || []
        });
        
    } catch (error) {
        console.error('Error fetching artist songs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch artist songs',
            error: error.message
        });
    }
});

// Route untuk mendapatkan statistik artist
router.get('/admin/artist/stats', isAdminAuthenticated, async (req, res) => {
    try {
        const [stats] = await db.promise().query(`
            SELECT 
                COUNT(*) as total_artists,
                SUM(
                    (SELECT COUNT(DISTINCT ma.id_music) 
                     FROM music_artist ma 
                     WHERE ma.id_artist = a.id_artist)
                ) as total_songs,
                SUM(
                    (SELECT COUNT(DISTINCT mp.id_playlist) 
                     FROM music_artist ma 
                     LEFT JOIN music_playlist mp ON ma.id_music = mp.id_music
                     WHERE ma.id_artist = a.id_artist)
                ) as total_playlists
            FROM artist a
        `);
        
        res.json({
            success: true,
            stats: stats[0] || { total_artists: 0, total_songs: 0, total_playlists: 0 }
        });
        
    } catch (error) {
        console.error('Error fetching artist stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch artist statistics',
            error: error.message
        });
    }
});

module.exports = router;