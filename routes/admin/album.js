const express = require('express');
const router = express.Router();
const { isAdminAuthenticated } = require('../../middleware/admin-auth');
const { db } = require('../../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ============================================
// ROUTE: Halaman Album Management
// ============================================
router.get('/admin/album', isAdminAuthenticated, async (req, res) => {
  try {
    let albumList = [];
    let totalAlbums = 0;

    const {
      search = '',
      page = 1,
      artist = ''
    } = req.query;

    const currentPage = Math.max(parseInt(page) || 1, 1);
    const limit = 20;
    const offset = (currentPage - 1) * limit;

    /* =======================
       MAIN ALBUM QUERY
    ======================== */
    let baseQuery = `
      SELECT 
        a.*,
        ar.artist_name
      FROM album a
      LEFT JOIN artist ar
        ON BINARY a.id_artist = BINARY ar.id_artist
    `;

    const where = [];
    const params = [];

    if (search.trim()) {
      where.push('a.album_name LIKE ?');
      params.push(`%${search.trim()}%`);
    }

    if (artist && artist !== 'all') {
      where.push('BINARY a.id_artist = BINARY ?');
      params.push(artist);
    }

    if (where.length) {
      baseQuery += ' WHERE ' + where.join(' AND ');
    }

    baseQuery += `
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `;
    params.push(limit, offset);

    const [albumResult] = await db.promise().query(baseQuery, params);

    /* =======================
       SONG COUNT (BULK)
    ======================== */
    if (albumResult.length) {
      const albumIds = albumResult.map(a => a.id_al);
      const placeholders = albumIds.map(() => '?').join(',');

      const [songCounts] = await db.promise().query(
        `
        SELECT id_al, COUNT(id_music) AS total_songs
        FROM music_album
        WHERE id_al IN (${placeholders})
        GROUP BY id_al
        `,
        albumIds
      );

      const songMap = {};
      songCounts.forEach(s => {
        songMap[s.id_al] = s.total_songs;
      });

      albumList = albumResult.map(album => {
        let formattedDate = 'Unknown';
        if (album.created_at) {
          formattedDate = new Date(album.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });
        }

        return {
          ...album,
          formatted_date: formattedDate,
          artist_name: album.artist_name || 'Unknown Artist',
          total_songs: songMap[album.id_al] || 0
        };
      });
    }

    /* =======================
       COUNT QUERY
    ======================== */
    let countQuery = `SELECT COUNT(*) AS total FROM album a`;
    const countWhere = [];
    const countParams = [];

    if (search.trim()) {
      countWhere.push('a.album_name LIKE ?');
      countParams.push(`%${search.trim()}%`);
    }

    if (artist && artist !== 'all') {
      countWhere.push('BINARY a.id_artist = BINARY ?');
      countParams.push(artist);
    }

    if (countWhere.length) {
      countQuery += ' WHERE ' + countWhere.join(' AND ');
    }

    const [[{ total }]] = await db.promise().query(countQuery, countParams);
    totalAlbums = total;

    /* =======================
       ARTIST LIST (FILTER)
    ======================== */
    const [artists] = await db.promise().query(`
      SELECT * FROM artist
      ORDER BY artist_name ASC
    `);

    res.render('admin/album', {
      admin: req.session.admin,
      albumList,
      totalAlbums,
      currentPage,
      totalPages: Math.ceil(totalAlbums / limit),
      artists,
      currentFilters: { search, artist },
      error: null,
      success: null
    });

  } catch (error) {
    console.error('Album page error:', error);

    const [artists] = await db.promise().query(
      'SELECT * FROM artist ORDER BY artist_name ASC'
    );

    res.render('admin/album', {
      admin: req.session.admin,
      albumList: [],
      totalAlbums: 0,
      currentPage: 1,
      totalPages: 1,
      artists,
      currentFilters: { search: '', artist: '' },
      error: 'Failed to load album data',
      success: null
    });
  }
});


// ============================================
// ROUTE: Add New Album
// ============================================
router.post('/admin/album/add', isAdminAuthenticated, async (req, res) => {
    try {
        // Configure multer for file upload
        const upload = multer({
            storage: multer.diskStorage({
                destination: function (req, file, cb) {
                    const coverDir = 'public/uploads/albumcover/';
                    if (!fs.existsSync(coverDir)) {
                        fs.mkdirSync(coverDir, { recursive: true });
                    }
                    cb(null, coverDir);
                },
                filename: function (req, file, cb) {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                    const ext = path.extname(file.originalname);
                    const filename = uniqueSuffix + ext;
                    cb(null, filename);
                }
            }),
            limits: {
                fileSize: 10 * 1024 * 1024 // 10MB max
            },
            fileFilter: function (req, file, cb) {
                const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
                const ext = path.extname(file.originalname).toLowerCase();
                if (allowedTypes.includes(ext)) {
                    cb(null, true);
                } else {
                    cb(new Error('Invalid image file type. Only JPG, JPEG, PNG, GIF, WEBP are allowed.'));
                }
            }
        });

        // Handle upload dengan middleware multer
        upload.single('cover')(req, res, async function(err) {
            if (err) {
                console.error('File upload error:', err.message);
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }

            try {
                // Parse form data
                const { album_name, id_artist } = req.body;
                
                // Validasi required fields
                if (!album_name || album_name.trim() === '') {
                    return res.status(400).json({
                        success: false,
                        message: 'Album name is required'
                    });
                }

                if (!id_artist || id_artist === '') {
                    return res.status(400).json({
                        success: false,
                        message: 'Artist is required'
                    });
                }

                // Ambil ID album terakhir
                const [lastAlbum] = await db.promise().query(
                    'SELECT id_al FROM album ORDER BY id_al DESC LIMIT 1'
                );
                
                let newAlbumId = 'AL1'; // Default untuk string ID
                
                if (lastAlbum.length > 0) {
                    const lastId = lastAlbum[0].id_al;
                    
                    if (typeof lastId === 'string' && lastId.startsWith('AL')) {
                        const lastNumber = parseInt(lastId.replace('AL', '')) || 0;
                        newAlbumId = `AL${lastNumber + 1}`;
                    } else if (typeof lastId === 'number') {
                        newAlbumId = `AL${lastId + 1}`;
                    } else if (typeof lastId === 'string' && !isNaN(lastId)) {
                        newAlbumId = `AL${parseInt(lastId) + 1}`;
                    }
                }

                // Path untuk file cover
                let coverPath = '/uploads/undefine.jpg';
                if (req.file) {
                    coverPath = `/uploads/albumcover/${req.file.filename}`;
                }

                // Insert ke tabel album
                const [result] = await db.promise().query(
                    'INSERT INTO album (id_al, album_name, album_cover, id_artist) VALUES (?, ?, ?, ?)',
                    [newAlbumId, album_name.trim(), coverPath, id_artist]
                );

                // Ambil data album yang baru dibuat
                const [albumData] = await db.promise().query(
                    'SELECT * FROM album WHERE id_al = ?',
                    [newAlbumId]
                );
                
                let artistName = 'Unknown Artist';
                if (albumData.length > 0 && albumData[0].id_artist) {
                    const [artistData] = await db.promise().query(
                        'SELECT artist_name FROM artist WHERE id_artist = ?',
                        [albumData[0].id_artist]
                    );
                    if (artistData.length > 0) {
                        artistName = artistData[0].artist_name;
                    }
                }

                // Format date
                let formattedDate = 'Unknown';
                if (albumData[0].created_at) {
                    try {
                        const date = new Date(albumData[0].created_at);
                        formattedDate = date.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                        });
                    } catch (dateErr) {
                        console.error('Error formatting date:', dateErr);
                    }
                }

                const albumResult = {
                    ...albumData[0],
                    artist_name: artistName,
                    formatted_date: formattedDate,
                    total_songs: 0
                };

                console.log('Album added successfully:', albumResult);

                res.json({
                    success: true,
                    message: 'Album added successfully',
                    album: albumResult
                });

            } catch (error) {
                console.error('Error adding album:', error);
                
                // Hapus file yang sudah diupload jika ada error
                if (req.file && req.file.path) {
                    if (fs.existsSync(req.file.path)) {
                        fs.unlinkSync(req.file.path);
                    }
                }
                
                res.status(500).json({
                    success: false,
                    message: 'Failed to add album: ' + error.message
                });
            }
        });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
});

// ============================================
// ROUTE: Get Artists (AJAX)
// ============================================
router.get('/admin/album/get-artists', isAdminAuthenticated, async (req, res) => {
    try {
        // Query untuk mendapatkan semua artists
        const [artistsResult] = await db.promise().query(
            'SELECT id_artist, artist_name FROM artist ORDER BY artist_name ASC'
        );
        
        console.log('Artists found:', artistsResult.length);
        
        res.json({
            success: true,
            artists: artistsResult || []
        });
        
    } catch (error) {
        console.error('Error fetching artists:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load artists',
            error: error.message
        });
    }
});

// ============================================
// ROUTE: Filter Albums (AJAX)
// ============================================
router.get('/admin/album/filter', isAdminAuthenticated, async (req, res) => {
    try {
        const { search = '', artist = '', page = 1 } = req.query;
        const currentPage = parseInt(page);
        const limit = 20;
        const offset = (currentPage - 1) * limit;

        try {
            // Build base query dengan subquery
            let baseQuery = `
                SELECT a.*, ar.artist_name,
                (SELECT COUNT(*) FROM music_album ma WHERE ma.id_al = a.id_al) as total_songs
                FROM album a
                LEFT JOIN artist ar ON a.id_artist = ar.id_artist
            `;

            const whereConditions = [];
            const queryParams = [];

            // Search filter
            if (search) {
                whereConditions.push('a.album_name LIKE ?');
                queryParams.push(`%${search}%`);
            }

            // Artist filter
            if (artist && artist !== 'all') {
                whereConditions.push('a.id_artist = ?');
                queryParams.push(artist);
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
            const [albumResult] = await db.promise().query(baseQuery, queryParams);

            // Process album data
            const albumList = albumResult.map(album => {
                let formattedDate = 'Unknown';
                if (album.created_at) {
                    try {
                        const date = new Date(album.created_at);
                        formattedDate = date.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                        });
                    } catch (dateErr) {
                        console.error('Error formatting date:', dateErr);
                    }
                }
                
                return {
                    ...album,
                    formatted_date: formattedDate,
                    artist_name: album.artist_name || 'Unknown Artist',
                    total_songs: album.total_songs || 0
                };
            });

            // Get total count for pagination
            let countQuery = `SELECT COUNT(*) as total FROM album a`;
            const countWhereConditions = [];
            const countParams = [];

            if (search) {
                countWhereConditions.push('a.album_name LIKE ?');
                countParams.push(`%${search}%`);
            }

            if (artist && artist !== 'all') {
                countWhereConditions.push('a.id_artist = ?');
                countParams.push(artist);
            }

            if (countWhereConditions.length > 0) {
                countQuery += ' WHERE ' + countWhereConditions.join(' AND ');
            }

            const [countResult] = await db.promise().query(countQuery, countParams);
            const totalAlbums = countResult[0]?.total || 0;
            const totalPages = Math.ceil(totalAlbums / limit);

            res.json({
                success: true,
                albumList: albumList,
                totalAlbums: totalAlbums,
                currentPage: currentPage,
                totalPages: totalPages
            });

        } catch (queryError) {
            // Jika tabel music_album tidak ada
            if (queryError.code === 'ER_NO_SUCH_TABLE' && queryError.message.includes('music_album')) {
                console.log('Using fallback query without music_album');
                
                let baseQuery = `
                    SELECT a.*, ar.artist_name, 0 as total_songs
                    FROM album a
                    LEFT JOIN artist ar ON a.id_artist = ar.id_artist
                `;

                const whereConditions = [];
                const queryParams = [];

                if (search) {
                    whereConditions.push('a.album_name LIKE ?');
                    queryParams.push(`%${search}%`);
                }

                if (artist && artist !== 'all') {
                    whereConditions.push('a.id_artist = ?');
                    queryParams.push(artist);
                }

                if (whereConditions.length > 0) {
                    baseQuery += ' WHERE ' + whereConditions.join(' AND ');
                }

                baseQuery += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
                queryParams.push(limit, offset);

                const [albumResult] = await db.promise().query(baseQuery, queryParams);

                // Process album data
                const albumList = albumResult.map(album => {
                    let formattedDate = 'Unknown';
                    if (album.created_at) {
                        try {
                            const date = new Date(album.created_at);
                            formattedDate = date.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                            });
                        } catch (dateErr) {
                            console.error('Error formatting date:', dateErr);
                        }
                    }
                    
                    return {
                        ...album,
                        formatted_date: formattedDate,
                        artist_name: album.artist_name || 'Unknown Artist',
                        total_songs: 0
                    };
                });

                // Get total count
                let countQuery = `SELECT COUNT(*) as total FROM album a`;
                const countWhereConditions = [];
                const countParams = [];

                if (search) {
                    countWhereConditions.push('a.album_name LIKE ?');
                    countParams.push(`%${search}%`);
                }

                if (artist && artist !== 'all') {
                    countWhereConditions.push('a.id_artist = ?');
                    countParams.push(artist);
                }

                if (countWhereConditions.length > 0) {
                    countQuery += ' WHERE ' + countWhereConditions.join(' AND ');
                }

                const [countResult] = await db.promise().query(countQuery, countParams);
                const totalAlbums = countResult[0]?.total || 0;
                const totalPages = Math.ceil(totalAlbums / limit);

                res.json({
                    success: true,
                    albumList: albumList,
                    totalAlbums: totalAlbums,
                    currentPage: currentPage,
                    totalPages: totalPages,
                    warning: 'music_album table not found. Songs count may not be accurate.'
                });
                return;
            }
            
            throw queryError;
        }

    } catch (error) {
        console.error('Filter album error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to filter album data',
            error: error.message
        });
    }
});

// ============================================
// ROUTE: Get Single Album by ID (for Edit)
// ============================================
router.get('/admin/album/get/:id', isAdminAuthenticated, async (req, res) => {
    try {
        const albumId = req.params.id;
        
        // Query untuk mendapatkan data album
        const [albumResult] = await db.promise().query(
            'SELECT * FROM album WHERE id_al = ?',
            [albumId]
        );
        
        if (albumResult.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Album not found'
            });
        }
        
        const album = albumResult[0];
        let artistName = 'Unknown Artist';
        
        // Get artist name separately
        if (album.id_artist) {
            const [artistResult] = await db.promise().query(
                'SELECT artist_name FROM artist WHERE id_artist = ?',
                [album.id_artist]
            );
            
            if (artistResult.length > 0) {
                artistName = artistResult[0].artist_name;
            }
        }
        
        // Get song count for this album - dengan error handling
        let totalSongs = 0;
        try {
            const [songCountResult] = await db.promise().query(
                'SELECT COUNT(id_music) as total_songs FROM music_album WHERE id_al = ?',
                [albumId]
            );
            totalSongs = songCountResult[0]?.total_songs || 0;
        } catch (songError) {
            console.log('Error getting song count, using 0:', songError.message);
            totalSongs = 0;
        }
        
        // Format date
        let formattedDate = 'Unknown';
        if (album.created_at) {
            try {
                const date = new Date(album.created_at);
                formattedDate = date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });
            } catch (dateErr) {
                console.error('Error formatting date:', dateErr);
            }
        }
        
        const albumData = {
            ...album,
            artist_name: artistName,
            formatted_date: formattedDate,
            total_songs: totalSongs
        };
        
        res.json({
            success: true,
            album: albumData
        });
        
    } catch (error) {
        console.error('Error fetching album data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch album data',
            error: error.message
        });
    }
});
// ============================================
// ROUTE: Update Album
// ============================================
router.post('/admin/album/update', isAdminAuthenticated, async (req, res) => {
    try {
        const upload = multer({
            storage: multer.diskStorage({
                destination: function (req, file, cb) {
                    const coverDir = 'public/uploads/albumcover/';
                    if (!fs.existsSync(coverDir)) {
                        fs.mkdirSync(coverDir, { recursive: true });
                    }
                    cb(null, coverDir);
                },
                filename: function (req, file, cb) {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                    const ext = path.extname(file.originalname);
                    const filename = uniqueSuffix + ext;
                    cb(null, filename);
                }
            }),
            limits: { fileSize: 10 * 1024 * 1024 },
            fileFilter: function (req, file, cb) {
                const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
                const ext = path.extname(file.originalname).toLowerCase();
                if (allowedTypes.includes(ext)) {
                    cb(null, true);
                } else {
                    cb(new Error('Invalid image file type.'));
                }
            }
        });

        upload.single('cover')(req, res, async function(err) {
            if (err) {
                console.error('File upload error:', err.message);
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }

            try {
                const { album_id, album_name, id_artist } = req.body;
                
                if (!album_id) {
                    return res.status(400).json({
                        success: false,
                        message: 'Album ID is required'
                    });
                }

                if (!album_name || album_name.trim() === '') {
                    return res.status(400).json({
                        success: false,
                        message: 'Album name is required'
                    });
                }

                if (!id_artist || id_artist === '') {
                    return res.status(400).json({
                        success: false,
                        message: 'Artist is required'
                    });
                }

                // Cek apakah album ada
                const [existingAlbum] = await db.promise().query(
                    'SELECT * FROM album WHERE id_al = ?',
                    [album_id]
                );
                
                if (existingAlbum.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: 'Album not found'
                    });
                }

                const oldAlbum = existingAlbum[0];
                let coverPath = oldAlbum.album_cover;
                
                // Jika ada file cover baru
                if (req.file) {
                    coverPath = `/uploads/albumcover/${req.file.filename}`;
                    
                    // Hapus file lama jika bukan default
                    if (oldAlbum.album_cover && 
                        !oldAlbum.album_cover.includes('/uploads/undefine.jpg')) {
                        const oldFilePath = path.join(__dirname, '../../public', oldAlbum.album_cover);
                        if (fs.existsSync(oldFilePath)) {
                            fs.unlinkSync(oldFilePath);
                        }
                    }
                }

                // Update album
                await db.promise().query(
                    'UPDATE album SET album_name = ?, album_cover = ?, id_artist = ? WHERE id_al = ?',
                    [album_name.trim(), coverPath, id_artist, album_id]
                );

                // Ambil data album yang sudah diupdate
                const [updatedAlbum] = await db.promise().query(
                    'SELECT * FROM album WHERE id_al = ?',
                    [album_id]
                );
                
                let artistName = 'Unknown Artist';
                if (updatedAlbum.length > 0 && updatedAlbum[0].id_artist) {
                    const [artistData] = await db.promise().query(
                        'SELECT artist_name FROM artist WHERE id_artist = ?',
                        [updatedAlbum[0].id_artist]
                    );
                    if (artistData.length > 0) {
                        artistName = artistData[0].artist_name;
                    }
                }

                // Get song count dengan error handling
                let totalSongs = 0;
                try {
                    const [songCountResult] = await db.promise().query(
                        'SELECT COUNT(id_music) as total_songs FROM music_album WHERE id_al = ?',
                        [album_id]
                    );
                    totalSongs = songCountResult[0]?.total_songs || 0;
                } catch (songError) {
                    console.log('Error getting song count:', songError.message);
                }

                // Format date
                let formattedDate = 'Unknown';
                if (updatedAlbum[0].created_at) {
                    try {
                        const date = new Date(updatedAlbum[0].created_at);
                        formattedDate = date.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                        });
                    } catch (dateErr) {
                        console.error('Error formatting date:', dateErr);
                    }
                }

                const albumResult = {
                    ...updatedAlbum[0],
                    artist_name: artistName,
                    formatted_date: formattedDate,
                    total_songs: totalSongs
                };

                res.json({
                    success: true,
                    message: 'Album updated successfully',
                    album: albumResult
                });

            } catch (error) {
                console.error('Error updating album:', error);
                
                if (req.file && req.file.path) {
                    if (fs.existsSync(req.file.path)) {
                        fs.unlinkSync(req.file.path);
                    }
                }
                
                res.status(500).json({
                    success: false,
                    message: 'Failed to update album: ' + error.message
                });
            }
        });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
});

// ============================================
// ROUTE: Delete Album
// ============================================
router.delete('/admin/album/delete/:id', isAdminAuthenticated, async (req, res) => {
    try {
        const albumId = req.params.id;
        
        // Cek apakah album ada
        const [albumResult] = await db.promise().query(
            'SELECT * FROM album WHERE id_al = ?',
            [albumId]
        );
        
        if (albumResult.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Album not found'
            });
        }
        
        const album = albumResult[0];
        
        // Cek apakah ada lagu yang terkait - dengan error handling
        try {
            const [musicCount] = await db.promise().query(
                'SELECT COUNT(*) as total FROM music_album WHERE id_al = ?',
                [albumId]
            );
            
            if (musicCount[0].total > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete album because there are songs associated with it'
                });
            }
        } catch (countError) {
            // Jika tabel music_album tidak ada, lanjutkan delete
            console.log('music_album table not found, continuing delete...');
        }
        
        // Mulai transaction
        await db.promise().beginTransaction();
        
        try {
            // Hapus album
            await db.promise().query(
                'DELETE FROM album WHERE id_al = ?',
                [albumId]
            );
            
            // Commit transaction
            await db.promise().commit();
            
            // Hapus file cover jika bukan default
            if (album.album_cover && 
                !album.album_cover.includes('/uploads/undefine.jpg')) {
                const coverPath = path.join(__dirname, '../../public', album.album_cover);
                if (fs.existsSync(coverPath)) {
                    fs.unlinkSync(coverPath);
                }
            }
            
            res.json({
                success: true,
                message: 'Album deleted successfully'
            });
            
        } catch (dbError) {
            // Rollback transaction jika ada error
            await db.promise().rollback();
            console.error('Database error during delete:', dbError);
            throw dbError;
        }
        
    } catch (error) {
        console.error('Error deleting album:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete album: ' + error.message
        });
    }
});
// ============================================
// ROUTE: Add New Artist (Fixed Version)
// ============================================
router.post('/admin/album/add-artist', isAdminAuthenticated, async (req, res) => {
    console.log('=== ADD ARTIST REQUEST START ===');
    console.log('Request body:', req.body);
    
    try {
        const { artist_name } = req.body;
        
        console.log('Artist name received:', artist_name);
        
        if (!artist_name || artist_name.trim() === '') {
            console.log('Validation failed: artist_name is empty');
            return res.status(400).json({ 
                success: false, 
                message: 'Artist name is required' 
            });
        }
        
        const trimmedName = artist_name.trim();
        console.log('Trimmed artist name:', trimmedName);
        
        // Cek koneksi database
        console.log('Checking database connection...');
        try {
            await db.promise().query('SELECT 1');
            console.log('Database connection OK');
        } catch (dbError) {
            console.error('Database connection error:', dbError);
            return res.status(500).json({ 
                success: false, 
                message: 'Database connection error' 
            });
        }
        
        // Cek apakah artist sudah ada (case-insensitive check di JavaScript)
        console.log('Checking if artist exists...');
        try {
            // Ambil semua artist untuk check di JavaScript
            const [allArtists] = await db.promise().query(
                'SELECT id_artist, artist_name FROM artist'
            );
            console.log('Total artists in database:', allArtists.length);
            
            // Cek apakah ada artist dengan nama yang sama (case-insensitive)
            const existingArtist = allArtists.find(artist => 
                artist.artist_name.toLowerCase() === trimmedName.toLowerCase()
            );
            
            if (existingArtist) {
                console.log('Artist already exists:', existingArtist);
                return res.status(400).json({ 
                    success: false, 
                    message: 'Artist "' + trimmedName + '" already exists' 
                });
            }
        } catch (checkError) {
            console.error('Error checking artist:', checkError);
            // Lanjutkan saja jika error check
        }
        
        // Insert artist
        console.log('Inserting new artist...');
        try {
            const [result] = await db.promise().query(
                'INSERT INTO artist (artist_name) VALUES (?)',
                [trimmedName]
            );
            console.log('Insert result:', result);
            console.log('Insert ID:', result.insertId);
            
            // Get inserted artist - gunakan parameterized query yang benar
            console.log('Fetching inserted artist data...');
            const [newArtist] = await db.promise().query(
                'SELECT * FROM artist WHERE id_artist = ?',
                [result.insertId]
            );
            console.log('New artist query result:', newArtist);
            console.log('New artist data length:', newArtist.length);
            
            if (newArtist && newArtist.length > 0) {
                console.log('New artist data:', newArtist[0]);
                
                console.log('=== ADD ARTIST REQUEST SUCCESS ===');
                
                res.json({ 
                    success: true, 
                    message: 'Artist "' + trimmedName + '" added successfully',
                    artist: newArtist[0]
                });
            } else {
                console.log('New artist not found after insert, trying alternative query...');
                
                // Alternatif: cari berdasarkan nama
                const [artistByName] = await db.promise().query(
                    'SELECT * FROM artist WHERE artist_name = ?',
                    [trimmedName]
                );
                
                if (artistByName && artistByName.length > 0) {
                    console.log('Found artist by name:', artistByName[0]);
                    
                    res.json({ 
                        success: true, 
                        message: 'Artist "' + trimmedName + '" added successfully',
                        artist: artistByName[0]
                    });
                } else {
                    console.log('Artist still not found, returning insertId only');
                    
                    // Return minimal data
                    res.json({ 
                        success: true, 
                        message: 'Artist "' + trimmedName + '" added successfully',
                        artist: {
                            id_artist: result.insertId,
                            artist_name: trimmedName
                        }
                    });
                }
            }
            
        } catch (insertError) {
            console.error('Insert error details:', {
                message: insertError.message,
                code: insertError.code,
                errno: insertError.errno,
                sql: insertError.sql,
                sqlMessage: insertError.sqlMessage
            });
            
            if (insertError.code === 'ER_DUP_ENTRY' || insertError.errno === 1062) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Artist "' + trimmedName + '" already exists in database' 
                });
            }
            
            throw insertError;
        }
        
    } catch (error) {
        console.error('=== ADD ARTIST REQUEST ERROR ===');
        console.error('Full error:', error);
        console.error('Error stack:', error.stack);
        
        res.status(500).json({ 
            success: false, 
            message: 'Failed to add artist',
            error: error.message,
            code: error.code,
            sqlMessage: error.sqlMessage
        });
    }
});
module.exports = router;