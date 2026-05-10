const express = require('express');
const router = express.Router();
const { isAdminAuthenticated } = require('../../middleware/admin-auth');
const { db } = require('../../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Route untuk halaman playlist
router.get('/admin/playlist', isAdminAuthenticated, async (req, res) => {
    try {
        let playlistList = [];
        let totalPlaylists = 0;
        let currentPage = 1;
        let totalPages = 1;
        
        // Get filter parameters from query
        const {
            search = '',
            page = 1,
            tag = ''
        } = req.query;

        currentPage = parseInt(page) || 1;
        const limit = 20;
        const offset = (currentPage - 1) * limit;

        try {
            // Build base query
            let baseQuery = `
                SELECT p.*, 
                       tp.tag_name,
                       COUNT(DISTINCT mp.id_music) as total_songs
                FROM playlist p
                LEFT JOIN tag_playlist tp ON p.id_tag = tp.id_tag
                LEFT JOIN music_playlist mp ON p.id_playlist = mp.id_playlist
            `;

            // Add WHERE conditions
            const whereConditions = [];
            const queryParams = [];

            // Search filter
            if (search) {
                whereConditions.push('p.playlist_name LIKE ?');
                queryParams.push(`%${search}%`);
            }

            // Tag filter
            if (tag && tag !== 'all') {
                whereConditions.push('p.id_tag = ?');
                queryParams.push(tag);
            }

            // Add WHERE clause if there are conditions
            if (whereConditions.length > 0) {
                baseQuery += ' WHERE ' + whereConditions.join(' AND ');
            }

            // Add GROUP BY
            baseQuery += ' GROUP BY p.id_playlist';

            // Add ORDER BY
            baseQuery += ' ORDER BY p.created_at DESC';

            // Add LIMIT and OFFSET for pagination
            baseQuery += ' LIMIT ? OFFSET ?';
            queryParams.push(limit, offset);

            // Execute query
            const [playlistResult] = await db.promise().query(baseQuery, queryParams);
            
            // Process playlist data
            playlistList = playlistResult.map(playlist => {
                // Format created_at date
                let formattedDate = 'Unknown';
                if (playlist.created_at) {
                    try {
                        const date = new Date(playlist.created_at);
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
                    ...playlist,
                    formatted_date: formattedDate,
                    tag_name: playlist.tag_name || 'Uncategorized',
                    total_songs: playlist.total_songs || 0
                };
            });
            
            // Get total count for pagination
            let countQuery = `
                SELECT COUNT(DISTINCT p.id_playlist) as total 
                FROM playlist p
                LEFT JOIN tag_playlist tp ON p.id_tag = tp.id_tag
            `;

            const countWhereConditions = [];
            const countParams = [];

            // Search filter for count
            if (search) {
                countWhereConditions.push('p.playlist_name LIKE ?');
                countParams.push(`%${search}%`);
            }

            // Tag filter for count
            if (tag && tag !== 'all') {
                countWhereConditions.push('p.id_tag = ?');
                countParams.push(tag);
            }

            // Add WHERE clause if there are conditions
            if (countWhereConditions.length > 0) {
                countQuery += ' WHERE ' + countWhereConditions.join(' AND ');
            }

            const [countResult] = await db.promise().query(countQuery, countParams);
            totalPlaylists = countResult[0]?.total || 0;
            totalPages = Math.ceil(totalPlaylists / limit);

            // Get all tags for filter dropdown
            const [tagsResult] = await db.promise().query('SELECT * FROM tag_playlist ORDER BY tag_name ASC');
            
            res.render('admin/playlist', {
                admin: req.session.admin,
                playlistList: playlistList,
                totalPlaylists: totalPlaylists,
                currentPage: currentPage,
                totalPages: totalPages,
                tags: tagsResult,
                currentFilters: {
                    search: search,
                    tag: tag
                },
                error: null,
                success: null
            });
            
        } catch (err) {
            console.log('Playlist query error:', err.message);
            res.render('admin/playlist', {
                admin: req.session.admin,
                playlistList: [],
                totalPlaylists: 0,
                currentPage: 1,
                totalPages: 1,
                tags: [],
                currentFilters: {
                    search: '',
                    tag: ''
                },
                error: 'Failed to load playlist data: ' + err.message,
                success: null
            });
        }
        
    } catch (error) {
        console.error('Playlist page error:', error);
        res.render('admin/playlist', {
            admin: req.session.admin,
            playlistList: [],
            totalPlaylists: 0,
            currentPage: 1,
            totalPages: 1,
            tags: [],
            currentFilters: {
                search: '',
                tag: ''
            },
            error: 'Failed to load playlist data: ' + error.message,
            success: null
        });
    }
});

// Route untuk menambahkan playlist baru
router.post('/admin/playlist/add', isAdminAuthenticated, async (req, res) => {
    try {
        // Gunakan multer untuk handle file upload
        const upload = multer({
            storage: multer.diskStorage({
                destination: function (req, file, cb) {
                    const coverDir = 'public/uploads/playlistcover/';
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
                const { playlist_name, id_tag } = req.body;
                
                // Validasi required fields
                if (!playlist_name || playlist_name.trim() === '') {
                    return res.status(400).json({
                        success: false,
                        message: 'Playlist name is required'
                    });
                }

                // Ambil ID playlist terakhir
                const [lastPlaylist] = await db.promise().query(
                    'SELECT id_playlist FROM playlist ORDER BY id_playlist DESC LIMIT 1'
                );
                
                let newPlaylistId = 1;
                
                if (lastPlaylist.length > 0) {
                    const lastId = lastPlaylist[0].id_playlist;
                    
                    if (typeof lastId === 'string' && lastId.startsWith('PL')) {
                        const lastNumber = parseInt(lastId.replace('PL', '')) || 0;
                        newPlaylistId = `PL${lastNumber + 1}`;
                    } else if (typeof lastId === 'number') {
                        newPlaylistId = lastId + 1;
                    } else if (typeof lastId === 'string' && !isNaN(lastId)) {
                        newPlaylistId = parseInt(lastId) + 1;
                    }
                }

                // Path untuk file cover
                let coverPath = '/uploads/undefine.jpg';
                if (req.file) {
                    coverPath = `/uploads/playlistcover/${req.file.filename}`;
                }

                // Insert ke tabel playlist
                const [result] = await db.promise().query(
                    'INSERT INTO playlist (id_playlist, playlist_name, playlist_cover, id_tag) VALUES (?, ?, ?, ?)',
                    [newPlaylistId, playlist_name.trim(), coverPath, id_tag || null]
                );

                // Ambil data playlist yang baru dibuat dengan nama tag
                const [playlistResult] = await db.promise().query(`
                    SELECT p.*, tp.tag_name 
                    FROM playlist p
                    LEFT JOIN tag_playlist tp ON p.id_tag = tp.id_tag
                    WHERE p.id_playlist = ?
                `, [newPlaylistId]);

                console.log('Playlist added successfully:', playlistResult[0]);

                res.json({
                    success: true,
                    message: 'Playlist added successfully',
                    playlist: playlistResult[0]
                });

            } catch (error) {
                console.error('Error adding playlist:', error);
                
                // Hapus file yang sudah diupload jika ada error
                if (req.file && req.file.path) {
                    if (fs.existsSync(req.file.path)) {
                        fs.unlinkSync(req.file.path);
                    }
                }
                
                res.status(500).json({
                    success: false,
                    message: 'Failed to add playlist: ' + error.message
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

// Route untuk mendapatkan data tags (AJAX)
router.get('/admin/playlist/get-tags', isAdminAuthenticated, async (req, res) => {
    try {
        // Query untuk mendapatkan semua tags
        const [tagsResult] = await db.promise().query(
            'SELECT id_tag, tag_name FROM tag_playlist ORDER BY tag_name ASC'
        );
        
        console.log('Tags found:', tagsResult.length);
        
        res.json({
            success: true,
            tags: tagsResult || []
        });
        
    } catch (error) {
        console.error('Error fetching tags:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load tags',
            error: error.message
        });
    }
});

// Route untuk filter playlist
router.get('/admin/playlist/filter', isAdminAuthenticated, async (req, res) => {
    try {
        const {
            search = '',
            tag = '',
            page = 1
        } = req.query;

        const currentPage = parseInt(page);
        const limit = 20;
        const offset = (currentPage - 1) * limit;

        // Build base query
        let baseQuery = `
            SELECT p.*, 
                   tp.tag_name,
                   COUNT(DISTINCT mp.id_music) as total_songs
            FROM playlist p
            LEFT JOIN tag_playlist tp ON p.id_tag = tp.id_tag
            LEFT JOIN music_playlist mp ON p.id_playlist = mp.id_playlist
        `;

        // Add WHERE conditions
        const whereConditions = [];
        const queryParams = [];

        // Search filter
        if (search) {
            whereConditions.push('p.playlist_name LIKE ?');
            queryParams.push(`%${search}%`);
        }

        // Tag filter
        if (tag && tag !== 'all') {
            whereConditions.push('p.id_tag = ?');
            queryParams.push(tag);
        }

        // Add WHERE clause if there are conditions
        if (whereConditions.length > 0) {
            baseQuery += ' WHERE ' + whereConditions.join(' AND ');
        }

        // Add GROUP BY
        baseQuery += ' GROUP BY p.id_playlist';

        // Add ORDER BY
        baseQuery += ' ORDER BY p.created_at DESC';

        // Add LIMIT and OFFSET for pagination
        baseQuery += ' LIMIT ? OFFSET ?';
        queryParams.push(limit, offset);

        // Execute query
        const [playlistResult] = await db.promise().query(baseQuery, queryParams);

        // Process playlist data
        const playlistList = playlistResult.map(playlist => {
            // Format date
            let formattedDate = 'Unknown';
            if (playlist.created_at) {
                try {
                    const date = new Date(playlist.created_at);
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
                ...playlist,
                formatted_date: formattedDate,
                tag_name: playlist.tag_name || 'Uncategorized',
                total_songs: playlist.total_songs || 0
            };
        });

        // Get total count for pagination
        let countQuery = `
            SELECT COUNT(DISTINCT p.id_playlist) as total 
            FROM playlist p
            LEFT JOIN tag_playlist tp ON p.id_tag = tp.id_tag
        `;

        const countWhereConditions = [];
        const countParams = [];

        // Search filter for count
        if (search) {
            countWhereConditions.push('p.playlist_name LIKE ?');
            countParams.push(`%${search}%`);
        }

        // Tag filter for count
        if (tag && tag !== 'all') {
            countWhereConditions.push('p.id_tag = ?');
            countParams.push(tag);
        }

        // Add WHERE clause if there are conditions
        if (countWhereConditions.length > 0) {
            countQuery += ' WHERE ' + countWhereConditions.join(' AND ');
        }

        const [countResult] = await db.promise().query(countQuery, countParams);
        const totalPlaylists = countResult[0]?.total || 0;
        const totalPages = Math.ceil(totalPlaylists / limit);

        res.json({
            success: true,
            playlistList: playlistList,
            totalPlaylists: totalPlaylists,
            currentPage: currentPage,
            totalPages: totalPages
        });

    } catch (error) {
        console.error('Filter playlist error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to filter playlist data',
            error: error.message
        });
    }
});

// Route untuk mendapatkan data playlist berdasarkan ID (untuk edit)
router.get('/admin/playlist/get/:id', isAdminAuthenticated, async (req, res) => {
    try {
        const playlistId = req.params.id;
        
        // Query untuk mendapatkan data playlist dengan tag
        const [playlistResult] = await db.promise().query(`
            SELECT p.*, tp.tag_name 
            FROM playlist p
            LEFT JOIN tag_playlist tp ON p.id_tag = tp.id_tag
            WHERE p.id_playlist = ?
        `, [playlistId]);
        
        if (playlistResult.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Playlist not found'
            });
        }
        
        res.json({
            success: true,
            playlist: playlistResult[0]
        });
        
    } catch (error) {
        console.error('Error fetching playlist data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch playlist data',
            error: error.message
        });
    }
});

// Route untuk update playlist
router.post('/admin/playlist/update', isAdminAuthenticated, async (req, res) => {
    try {
        // Gunakan multer untuk handle file upload
        const upload = multer({
            storage: multer.diskStorage({
                destination: function (req, file, cb) {
                    const coverDir = 'public/uploads/playlistcover/';
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
                const { playlist_id, playlist_name, id_tag } = req.body;
                
                // Validasi required fields
                if (!playlist_id) {
                    return res.status(400).json({
                        success: false,
                        message: 'Playlist ID is required'
                    });
                }

                if (!playlist_name || playlist_name.trim() === '') {
                    return res.status(400).json({
                        success: false,
                        message: 'Playlist name is required'
                    });
                }

                // Cek apakah playlist ada dan ambil data file lama
                const [existingPlaylist] = await db.promise().query(
                    'SELECT * FROM playlist WHERE id_playlist = ?',
                    [playlist_id]
                );
                
                if (existingPlaylist.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: 'Playlist not found'
                    });
                }

                const oldPlaylist = existingPlaylist[0];
                let coverPath = oldPlaylist.playlist_cover;
                
                // Jika ada file cover baru, update path dan hapus file lama
                if (req.file) {
                    coverPath = `/uploads/playlistcover/${req.file.filename}`;
                    
                    // Hapus file lama jika bukan default
                    if (oldPlaylist.playlist_cover && 
                        !oldPlaylist.playlist_cover.includes('/uploads/undefine.jpg')) {
                        const oldFilePath = path.join(__dirname, '../../public', oldPlaylist.playlist_cover);
                        if (fs.existsSync(oldFilePath)) {
                            fs.unlinkSync(oldFilePath);
                        }
                    }
                }

                // Update ke tabel playlist
                await db.promise().query(
                    'UPDATE playlist SET playlist_name = ?, playlist_cover = ?, id_tag = ? WHERE id_playlist = ?',
                    [playlist_name.trim(), coverPath, id_tag || null, playlist_id]
                );

                // Ambil data playlist yang sudah diupdate
                const [updatedPlaylist] = await db.promise().query(`
                    SELECT p.*, tp.tag_name 
                    FROM playlist p
                    LEFT JOIN tag_playlist tp ON p.id_tag = tp.id_tag
                    WHERE p.id_playlist = ?
                `, [playlist_id]);

                console.log('Playlist updated successfully:', updatedPlaylist[0]);

                res.json({
                    success: true,
                    message: 'Playlist updated successfully',
                    playlist: updatedPlaylist[0]
                });

            } catch (error) {
                console.error('Error updating playlist:', error);
                
                // Hapus file baru yang sudah diupload jika ada error
                if (req.file && req.file.path) {
                    if (fs.existsSync(req.file.path)) {
                        fs.unlinkSync(req.file.path);
                    }
                }
                
                res.status(500).json({
                    success: false,
                    message: 'Failed to update playlist: ' + error.message
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

// Route untuk menghapus playlist
router.delete('/admin/playlist/delete/:id', isAdminAuthenticated, async (req, res) => {
    try {
        const playlistId = req.params.id;
        
        // Cek apakah playlist ada
        const [playlistResult] = await db.promise().query(
            'SELECT * FROM playlist WHERE id_playlist = ?',
            [playlistId]
        );
        
        if (playlistResult.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Playlist not found'
            });
        }
        
        const playlist = playlistResult[0];
        
        // Mulai transaction
        await db.promise().beginTransaction();
        
        try {
            // Hapus relasi di tabel music_playlist
            await db.promise().query(
                'DELETE FROM music_playlist WHERE id_playlist = ?',
                [playlistId]
            );
            
            // Hapus playlist itu sendiri
            await db.promise().query(
                'DELETE FROM playlist WHERE id_playlist = ?',
                [playlistId]
            );
            
            // Commit transaction
            await db.promise().commit();
            
            // Hapus file cover jika bukan default
            if (playlist.playlist_cover && 
                !playlist.playlist_cover.includes('/uploads/undefine.jpg')) {
                const coverPath = path.join(__dirname, '../../public', playlist.playlist_cover);
                if (fs.existsSync(coverPath)) {
                    fs.unlinkSync(coverPath);
                }
            }
            
            console.log(`Playlist ${playlistId} deleted successfully`);
            
            res.json({
                success: true,
                message: 'Playlist deleted successfully'
            });
            
        } catch (dbError) {
            // Rollback transaction jika ada error
            await db.promise().rollback();
            console.error('Database error during delete:', dbError);
            throw dbError;
        }
        
    } catch (error) {
        console.error('Error deleting playlist:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete playlist: ' + error.message
        });
    }
});
// POST add new tag
router.post('/admin/playlist/add-tag', isAdminAuthenticated, async (req, res) => {
    try {
        const { tag_name } = req.body;
        
        console.log('Received tag data:', { tag_name });
        
        if (!tag_name || tag_name.trim() === '') {
            return res.status(400).json({ 
                success: false, 
                message: 'Tag name is required' 
            });
        }
        
        const trimmedName = tag_name.trim();
        
        // Check if tag already exists (case-insensitive)
        const [existingTag] = await db.promise().query(
            'SELECT * FROM tag_playlist WHERE LOWER(tag_name) = LOWER(?)',
            [trimmedName]
        );
        
        if (existingTag && existingTag.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Tag already exists' 
            });
        }
        
        // Insert new tag
        const [result] = await db.promise().query(
            'INSERT INTO tag_playlist (tag_name) VALUES (?)',
            [trimmedName]
        );
        
        // Get the inserted tag
        const [newTag] = await db.promise().query(
            'SELECT * FROM tag_playlist WHERE id_tag = ?',
            [result.insertId]
        );
        
        res.json({ 
            success: true, 
            message: 'Tag added successfully',
            tag: newTag[0]
        });
        
    } catch (error) {
        console.error('Error adding tag:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to add tag',
            error: error.message 
        });
    }
});

module.exports = router;