const express = require('express');
const router = express.Router();
const { isAdminAuthenticated } = require('../../middleware/admin-auth');
const { db } = require('../../db');

// Route untuk halaman music-playlist management
router.get('/admin/music-playlist', isAdminAuthenticated, async (req, res) => {
    try {
        let musicList = [];
        let playlistList = [];
        let currentRelations = [];
        let totalRelations = 0;
        let currentPage = 1;
        let totalPages = 1;
        
        // Get filter parameters from query
        const {
            search_music = '',
            search_playlist = '',
            page = 1
        } = req.query;

        currentPage = parseInt(page) || 1;
        const limit = 20;
        const offset = (currentPage - 1) * limit;

        try {
            // Query untuk mendapatkan semua musik
            const [musicResult] = await db.promise().query(`
                SELECT m.id_music, m.title_music, m.cover_music,
                       GROUP_CONCAT(DISTINCT a.artist_name SEPARATOR ', ') as artists
                FROM music m
                LEFT JOIN music_artist ma ON m.id_music = ma.id_music
                LEFT JOIN artist a ON ma.id_artist = a.id_artist COLLATE utf8mb4_unicode_ci
                GROUP BY m.id_music, m.title_music, m.cover_music
                ORDER BY m.title_music ASC
            `);
            
            musicList = musicResult.map(music => ({
                ...music,
                artists: music.artists || 'No artist'
            }));

            // Query untuk mendapatkan semua playlist
            const [playlistResult] = await db.promise().query(`
                SELECT p.id_playlist, p.playlist_name, p.playlist_cover,
                       tp.tag_name,
                       COUNT(mp.id_music) as total_songs
                FROM playlist p
                LEFT JOIN tag_playlist tp ON p.id_tag = tp.id_tag
                LEFT JOIN music_playlist mp ON p.id_playlist = mp.id_playlist
                GROUP BY p.id_playlist, p.playlist_name, p.playlist_cover, tp.tag_name
                ORDER BY p.playlist_name ASC
            `);
            
            playlistList = playlistResult.map(playlist => ({
                ...playlist,
                tag_name: playlist.tag_name || 'Uncategorized',
                total_songs: playlist.total_songs || 0
            }));

            // Build base query untuk relasi - FIXED GROUP BY
            let baseQuery = `
                SELECT 
                    mp.id_music,
                    mp.id_playlist,
                    mp.created_at,
                    m.title_music,
                    m.cover_music as music_cover,
                    p.playlist_name,
                    p.playlist_cover,
                    tp.tag_name,
                    GROUP_CONCAT(DISTINCT a.artist_name SEPARATOR ', ') as artists
                FROM music_playlist mp
                JOIN music m ON mp.id_music = m.id_music
                JOIN playlist p ON mp.id_playlist = p.id_playlist
                LEFT JOIN tag_playlist tp ON p.id_tag = tp.id_tag
                LEFT JOIN music_artist ma ON m.id_music = ma.id_music
                LEFT JOIN artist a ON ma.id_artist = a.id_artist COLLATE utf8mb4_unicode_ci
            `;

            // Add WHERE conditions
            const whereConditions = [];
            const queryParams = [];

            // Search filter for music
            if (search_music) {
                whereConditions.push('m.title_music LIKE ?');
                queryParams.push(`%${search_music}%`);
            }

            // Search filter for playlist
            if (search_playlist) {
                whereConditions.push('p.playlist_name LIKE ?');
                queryParams.push(`%${search_playlist}%`);
            }

            // Add WHERE clause if there are conditions
            if (whereConditions.length > 0) {
                baseQuery += ' WHERE ' + whereConditions.join(' AND ');
            }

            // Add GROUP BY dengan semua kolom non-aggregated
            baseQuery += ' GROUP BY mp.id_music, mp.id_playlist, mp.created_at, m.title_music, m.cover_music, p.playlist_name, p.playlist_cover, tp.tag_name';

            // Add ORDER BY
            baseQuery += ' ORDER BY mp.created_at DESC';

            // Add LIMIT and OFFSET for pagination
            baseQuery += ' LIMIT ? OFFSET ?';
            queryParams.push(limit, offset);

            // Execute query untuk relasi
            const [relationsResult] = await db.promise().query(baseQuery, queryParams);
            
            // Process relations data
            currentRelations = relationsResult.map(relation => {
                // Format created_at date
                let formattedDate = 'Unknown';
                if (relation.created_at) {
                    try {
                        const date = new Date(relation.created_at);
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
                    ...relation,
                    formatted_date: formattedDate,
                    tag_name: relation.tag_name || 'Uncategorized',
                    artists: relation.artists || 'No artist'
                };
            });
            
            // Get total count for pagination
            let countQuery = `
                SELECT COUNT(*) as total 
                FROM music_playlist mp
                JOIN music m ON mp.id_music = m.id_music
                JOIN playlist p ON mp.id_playlist = p.id_playlist
            `;

            const countWhereConditions = [];
            const countParams = [];

            // Search filter for count
            if (search_music) {
                countWhereConditions.push('m.title_music LIKE ?');
                countParams.push(`%${search_music}%`);
            }

            if (search_playlist) {
                countWhereConditions.push('p.playlist_name LIKE ?');
                countParams.push(`%${search_playlist}%`);
            }

            // Add WHERE clause if there are conditions
            if (countWhereConditions.length > 0) {
                countQuery += ' WHERE ' + countWhereConditions.join(' AND ');
            }

            const [countResult] = await db.promise().query(countQuery, countParams);
            totalRelations = countResult[0]?.total || 0;
            totalPages = Math.ceil(totalRelations / limit);
            
            res.render('admin/music-playlist', {
                admin: req.session.admin,
                musicList: musicList,
                playlistList: playlistList,
                relationsList: currentRelations,
                totalRelations: totalRelations,
                currentPage: currentPage,
                totalPages: totalPages,
                currentFilters: {
                    search_music: search_music,
                    search_playlist: search_playlist
                },
                error: null,
                success: null
            });
            
        } catch (err) {
            console.log('Music-Playlist query error:', err.message);
            res.render('admin/music-playlist', {
                admin: req.session.admin,
                musicList: [],
                playlistList: [],
                relationsList: [],
                totalRelations: 0,
                currentPage: 1,
                totalPages: 1,
                currentFilters: {
                    search_music: '',
                    search_playlist: ''
                },
                error: 'Failed to load data: ' + err.message,
                success: null
            });
        }
        
    } catch (error) {
        console.error('Music-Playlist page error:', error);
        res.render('admin/music-playlist', {
            admin: req.session.admin,
            musicList: [],
            playlistList: [],
            relationsList: [],
            totalRelations: 0,
            currentPage: 1,
            totalPages: 1,
            currentFilters: {
                search_music: '',
                search_playlist: ''
            },
            error: 'Failed to load data: ' + error.message,
            success: null
        });
    }
});

// Route untuk menambahkan relasi musik-playlist baru
router.post('/admin/music-playlist/add', isAdminAuthenticated, async (req, res) => {
    try {
        const { music_ids, playlist_ids } = req.body;
        
        // Validasi required fields
        if (!music_ids || !Array.isArray(music_ids) || music_ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please select at least one music'
            });
        }
        
        if (!playlist_ids || !Array.isArray(playlist_ids) || playlist_ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please select at least one playlist'
            });
        }
        
        // Mulai transaction
        await db.promise().beginTransaction();
        
        try {
            const addedRelations = [];
            
            // Loop melalui semua kombinasi musik dan playlist
            for (const musicId of music_ids) {
                for (const playlistId of playlist_ids) {
                    // Cek apakah relasi sudah ada
                    const [existingRelation] = await db.promise().query(
                        'SELECT * FROM music_playlist WHERE id_music = ? AND id_playlist = ?',
                        [musicId, playlistId]
                    );
                    
                    if (existingRelation.length === 0) {
                        // Tambahkan relasi baru
                        await db.promise().query(
                            'INSERT INTO music_playlist (id_music, id_playlist) VALUES (?, ?)',
                            [musicId, playlistId]
                        );
                        
                        // Ambil data relasi yang baru ditambahkan - FIXED QUERY
                        const [relationData] = await db.promise().query(`
                            SELECT 
                                mp.id_music,
                                mp.id_playlist,
                                mp.created_at,
                                m.title_music,
                                m.cover_music as music_cover,
                                p.playlist_name,
                                p.playlist_cover,
                                GROUP_CONCAT(DISTINCT a.artist_name SEPARATOR ', ') as artists
                            FROM music_playlist mp
                            JOIN music m ON mp.id_music = m.id_music
                            JOIN playlist p ON mp.id_playlist = p.id_playlist
                            LEFT JOIN music_artist ma ON m.id_music = ma.id_music
                            LEFT JOIN artist a ON ma.id_artist = a.id_artist COLLATE utf8mb4_unicode_ci
                            WHERE mp.id_music = ? AND mp.id_playlist = ?
                            GROUP BY mp.id_music, mp.id_playlist, mp.created_at, m.title_music, m.cover_music, p.playlist_name, p.playlist_cover
                        `, [musicId, playlistId]);
                        
                        if (relationData[0]) {
                            // Format date
                            if (relationData[0].created_at) {
                                const date = new Date(relationData[0].created_at);
                                relationData[0].formatted_date = date.toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                });
                            }
                            relationData[0].artists = relationData[0].artists || 'No artist';
                            addedRelations.push(relationData[0]);
                        }
                    }
                }
            }
            
            // Commit transaction
            await db.promise().commit();
            
            if (addedRelations.length > 0) {
                res.json({
                    success: true,
                    message: `Added ${addedRelations.length} relation(s) successfully`,
                    relations: addedRelations
                });
            } else {
                res.json({
                    success: true,
                    message: 'All selected relations already exist',
                    relations: []
                });
            }
            
        } catch (dbError) {
            // Rollback transaction jika ada error
            await db.promise().rollback();
            console.error('Database error:', dbError);
            throw dbError;
        }
        
    } catch (error) {
        console.error('Error adding music-playlist relation:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add relation: ' + error.message
        });
    }
});

// Route untuk mendapatkan data musik dan playlist (AJAX)
router.get('/admin/music-playlist/get-data', isAdminAuthenticated, async (req, res) => {
    try {
        // Query untuk mendapatkan semua musik dengan artist
        const [musicResult] = await db.promise().query(`
            SELECT m.id_music, m.title_music, m.cover_music,
                   GROUP_CONCAT(DISTINCT a.artist_name SEPARATOR ', ') as artists
            FROM music m
            LEFT JOIN music_artist ma ON m.id_music = ma.id_music
            LEFT JOIN artist a ON ma.id_artist = a.id_artist COLLATE utf8mb4_unicode_ci
            GROUP BY m.id_music, m.title_music, m.cover_music
            ORDER BY m.title_music ASC
        `);
        
        // Query untuk mendapatkan semua playlist dengan tag
        const [playlistResult] = await db.promise().query(`
            SELECT p.id_playlist, p.playlist_name, p.playlist_cover,
                   tp.tag_name,
                   COUNT(mp.id_music) as total_songs
            FROM playlist p
            LEFT JOIN tag_playlist tp ON p.id_tag = tp.id_tag
            LEFT JOIN music_playlist mp ON p.id_playlist = mp.id_playlist
            GROUP BY p.id_playlist, p.playlist_name, p.playlist_cover, tp.tag_name
            ORDER BY p.playlist_name ASC
        `);
        
        res.json({
            success: true,
            music: musicResult || [],
            playlists: playlistResult || []
        });
        
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load data',
            error: error.message
        });
    }
});

// Route untuk filter relasi musik-playlist
router.get('/admin/music-playlist/filter', isAdminAuthenticated, async (req, res) => {
    try {
        const {
            search_music = '',
            search_playlist = '',
            page = 1
        } = req.query;

        const currentPage = parseInt(page);
        const limit = 20;
        const offset = (currentPage - 1) * limit;

        // Build base query - FIXED GROUP BY
        let baseQuery = `
            SELECT 
                mp.id_music,
                mp.id_playlist,
                mp.created_at,
                m.title_music,
                m.cover_music as music_cover,
                p.playlist_name,
                p.playlist_cover,
                tp.tag_name,
                GROUP_CONCAT(DISTINCT a.artist_name SEPARATOR ', ') as artists
            FROM music_playlist mp
            JOIN music m ON mp.id_music = m.id_music
            JOIN playlist p ON mp.id_playlist = p.id_playlist
            LEFT JOIN tag_playlist tp ON p.id_tag = tp.id_tag
            LEFT JOIN music_artist ma ON m.id_music = ma.id_music
            LEFT JOIN artist a ON ma.id_artist = a.id_artist COLLATE utf8mb4_unicode_ci
        `;

        // Add WHERE conditions
        const whereConditions = [];
        const queryParams = [];

        // Search filter for music
        if (search_music) {
            whereConditions.push('m.title_music LIKE ?');
            queryParams.push(`%${search_music}%`);
        }

        // Search filter for playlist
        if (search_playlist) {
            whereConditions.push('p.playlist_name LIKE ?');
            queryParams.push(`%${search_playlist}%`);
        }

        // Add WHERE clause if there are conditions
        if (whereConditions.length > 0) {
            baseQuery += ' WHERE ' + whereConditions.join(' AND ');
        }

        // Add GROUP BY dengan semua kolom non-aggregated
        baseQuery += ' GROUP BY mp.id_music, mp.id_playlist, mp.created_at, m.title_music, m.cover_music, p.playlist_name, p.playlist_cover, tp.tag_name';

        // Add ORDER BY
        baseQuery += ' ORDER BY mp.created_at DESC';

        // Add LIMIT and OFFSET for pagination
        baseQuery += ' LIMIT ? OFFSET ?';
        queryParams.push(limit, offset);

        // Execute query
        const [relationsResult] = await db.promise().query(baseQuery, queryParams);

        // Process relations data
        const relationsList = relationsResult.map(relation => {
            // Format date
            let formattedDate = 'Unknown';
            if (relation.created_at) {
                try {
                    const date = new Date(relation.created_at);
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
                ...relation,
                formatted_date: formattedDate,
                tag_name: relation.tag_name || 'Uncategorized',
                artists: relation.artists || 'No artist'
            };
        });

        // Get total count for pagination
        let countQuery = `
            SELECT COUNT(*) as total 
            FROM music_playlist mp
            JOIN music m ON mp.id_music = m.id_music
            JOIN playlist p ON mp.id_playlist = p.id_playlist
        `;

        const countWhereConditions = [];
        const countParams = [];

        // Search filter for count
        if (search_music) {
            countWhereConditions.push('m.title_music LIKE ?');
            countParams.push(`%${search_music}%`);
        }

        if (search_playlist) {
            countWhereConditions.push('p.playlist_name LIKE ?');
            countParams.push(`%${search_playlist}%`);
        }

        // Add WHERE clause if there are conditions
        if (countWhereConditions.length > 0) {
            countQuery += ' WHERE ' + countWhereConditions.join(' AND ');
        }

        const [countResult] = await db.promise().query(countQuery, countParams);
        const totalRelations = countResult[0]?.total || 0;
        const totalPages = Math.ceil(totalRelations / limit);

        res.json({
            success: true,
            relationsList: relationsList,
            totalRelations: totalRelations,
            currentPage: currentPage,
            totalPages: totalPages
        });

    } catch (error) {
        console.error('Filter music-playlist error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to filter data',
            error: error.message
        });
    }
});

// Route untuk menghapus relasi musik-playlist
router.delete('/admin/music-playlist/delete/:musicId/:playlistId', isAdminAuthenticated, async (req, res) => {
    try {
        const { musicId, playlistId } = req.params;
        
        // Cek apakah relasi ada
        const [existingRelation] = await db.promise().query(
            'SELECT * FROM music_playlist WHERE id_music = ? AND id_playlist = ?',
            [musicId, playlistId]
        );
        
        if (existingRelation.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Relation not found'
            });
        }
        
        // Hapus relasi
        await db.promise().query(
            'DELETE FROM music_playlist WHERE id_music = ? AND id_playlist = ?',
            [musicId, playlistId]
        );
        
        console.log(`Relation deleted: Music ${musicId} - Playlist ${playlistId}`);
        
        res.json({
            success: true,
            message: 'Relation deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting music-playlist relation:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete relation: ' + error.message
        });
    }
});

// Route untuk menghapus multiple relasi
router.delete('/admin/music-playlist/delete-multiple', isAdminAuthenticated, async (req, res) => {
    try {
        const { relations } = req.body;
        
        if (!relations || !Array.isArray(relations) || relations.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No relations selected'
            });
        }
        
        // Mulai transaction
        await db.promise().beginTransaction();
        
        try {
            let deletedCount = 0;
            
            // Hapus setiap relasi
            for (const relation of relations) {
                const { musicId, playlistId } = relation;
                
                // Hapus relasi
                const [result] = await db.promise().query(
                    'DELETE FROM music_playlist WHERE id_music = ? AND id_playlist = ?',
                    [musicId, playlistId]
                );
                
                if (result.affectedRows > 0) {
                    deletedCount++;
                }
            }
            
            // Commit transaction
            await db.promise().commit();
            
            res.json({
                success: true,
                message: `Deleted ${deletedCount} relation(s) successfully`
            });
            
        } catch (dbError) {
            // Rollback transaction jika ada error
            await db.promise().rollback();
            console.error('Database error:', dbError);
            throw dbError;
        }
        
    } catch (error) {
        console.error('Error deleting multiple relations:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete relations: ' + error.message
        });
    }
});

// Route untuk mendapatkan musik dalam playlist tertentu
router.get('/admin/music-playlist/playlist/:playlistId', isAdminAuthenticated, async (req, res) => {
    try {
        const playlistId = req.params.playlistId;
        
        // Query untuk mendapatkan musik dalam playlist
        const [musicResult] = await db.promise().query(`
            SELECT 
                m.id_music,
                m.title_music,
                m.cover_music,
                m.audio_file,
                m.lyric,
                m.playing,
                m.created_at,
                GROUP_CONCAT(DISTINCT a.artist_name SEPARATOR ', ') as artists
            FROM music_playlist mp
            JOIN music m ON mp.id_music = m.id_music
            LEFT JOIN music_artist ma ON m.id_music = ma.id_music
            LEFT JOIN artist a ON ma.id_artist = a.id_artist COLLATE utf8mb4_unicode_ci
            WHERE mp.id_playlist = ?
            GROUP BY m.id_music, m.title_music, m.cover_music, m.audio_file, m.lyric, m.playing, m.created_at
            ORDER BY m.title_music ASC
        `, [playlistId]);
        
        res.json({
            success: true,
            music: musicResult || []
        });
        
    } catch (error) {
        console.error('Error fetching playlist music:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load playlist music',
            error: error.message
        });
    }
});

// Route untuk mendapatkan playlist yang berisi musik tertentu
router.get('/admin/music-playlist/music/:musicId', isAdminAuthenticated, async (req, res) => {
    try {
        const musicId = req.params.musicId;
        
        // Query untuk mendapatkan playlist yang berisi musik
        const [playlistResult] = await db.promise().query(`
            SELECT 
                p.id_playlist,
                p.playlist_name,
                p.playlist_cover,
                p.created_at,
                tp.tag_name
            FROM music_playlist mp
            JOIN playlist p ON mp.id_playlist = p.id_playlist
            LEFT JOIN tag_playlist tp ON p.id_tag = tp.id_tag
            WHERE mp.id_music = ?
            GROUP BY p.id_playlist, p.playlist_name, p.playlist_cover, p.created_at, tp.tag_name
            ORDER BY p.playlist_name ASC
        `, [musicId]);
        
        res.json({
            success: true,
            playlists: playlistResult || []
        });
        
    } catch (error) {
        console.error('Error fetching music playlists:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load music playlists',
            error: error.message
        });
    }
});

module.exports = router;