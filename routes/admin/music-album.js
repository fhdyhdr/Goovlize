const express = require('express');
const router = express.Router();
const { isAdminAuthenticated } = require('../../middleware/admin-auth');
const { db } = require('../../db');

router.get('/admin/music-album', isAdminAuthenticated, async (req, res) => {
    try {
        let musicList = [];
        let albumList = [];
        let currentRelations = [];
        let totalRelations = 0;
        let currentPage = 1;
        let totalPages = 1;
        
        const { search_music = '', search_album = '', page = 1 } = req.query;
        currentPage = parseInt(page) || 1;
        const limit = 20;
        const offset = (currentPage - 1) * limit;

        try {
            // Query musik tanpa JOIN untuk menghindari collation issues
            const [musicResult] = await db.promise().query(`
                SELECT m.id_music, m.title_music, m.cover_music
                FROM music m
                ORDER BY m.title_music ASC
            `);
            
            // Untuk setiap musik, ambil artist secara terpisah
            musicList = [];
            for (const music of musicResult) {
                const [artistResult] = await db.promise().query(`
                    SELECT GROUP_CONCAT(DISTINCT a.artist_name SEPARATOR ', ') as artists
                    FROM music_artist ma
                    LEFT JOIN artist a ON ma.id_artist = a.id_artist COLLATE utf8mb4_general_ci
                    WHERE ma.id_music = ?
                `, [music.id_music]);
                
                musicList.push({
                    ...music,
                    artists: artistResult[0]?.artists || 'No artist'
                });
            }

            // Query album tanpa JOIN untuk menghindari collation issues - FIXED
            const [albumResult] = await db.promise().query(`
                SELECT al.id_al, al.album_name, al.album_cover, al.id_artist
                FROM album al
                ORDER BY al.album_name ASC
            `);
            
            // Untuk setiap album, ambil artist dan count songs secara terpisah
            albumList = [];
            for (const album of albumResult) {
                let artistName = 'Unknown Artist';
                let totalSongs = 0;
                
                // Get artist name
                if (album.id_artist) {
                    const [artistResult] = await db.promise().query(
                        'SELECT artist_name FROM artist WHERE id_artist = ? COLLATE utf8mb4_general_ci',
                        [album.id_artist]
                    );
                    artistName = artistResult[0]?.artist_name || 'Unknown Artist';
                }
                
                // Get total songs - FIXED: Hitung dari tabel music_album
                const [countResult] = await db.promise().query(
                    'SELECT COUNT(*) as total FROM music_album WHERE id_al = ?',
                    [album.id_al]
                );
                totalSongs = countResult[0]?.total || 0;
                
                albumList.push({
                    id_al: album.id_al,
                    album_name: album.album_name,
                    album_cover: album.album_cover,
                    id_artist: album.id_artist,
                    artist_name: artistName,
                    total_songs: totalSongs
                });
            }

            // Query relasi dengan filter - menggunakan subquery untuk menghindari JOIN
            let baseQuery = `
                SELECT ma.id_music, ma.id_al, ma.created_at
                FROM music_album ma
                WHERE 1=1
            `;
            
            const queryParams = [];
            
            if (search_music) {
                baseQuery += ' AND EXISTS (SELECT 1 FROM music m WHERE m.id_music = ma.id_music AND m.title_music LIKE ?)';
                queryParams.push(`%${search_music}%`);
            }
            
            if (search_album) {
                baseQuery += ' AND EXISTS (SELECT 1 FROM album al WHERE al.id_al = ma.id_al AND al.album_name LIKE ?)';
                queryParams.push(`%${search_album}%`);
            }
            
            baseQuery += ' ORDER BY ma.created_at DESC LIMIT ? OFFSET ?';
            queryParams.push(limit, offset);
            
            const [relationsResult] = await db.promise().query(baseQuery, queryParams);
            
            // Format data dengan mengambil detail secara terpisah
            currentRelations = [];
            for (const relation of relationsResult) {
                // Get music details
                const [musicResult] = await db.promise().query(
                    'SELECT title_music, cover_music FROM music WHERE id_music = ?',
                    [relation.id_music]
                );
                
                // Get album details
                const [albumResult] = await db.promise().query(
                    'SELECT album_name, album_cover, id_artist FROM album WHERE id_al = ?',
                    [relation.id_al]
                );
                
                // Get music artists
                const [musicArtistsResult] = await db.promise().query(`
                    SELECT GROUP_CONCAT(DISTINCT a.artist_name SEPARATOR ', ') as artists
                    FROM music_artist ma2
                    LEFT JOIN artist a ON ma2.id_artist = a.id_artist COLLATE utf8mb4_general_ci
                    WHERE ma2.id_music = ?
                `, [relation.id_music]);
                
                // Get album artist
                let albumArtist = 'Unknown Artist';
                if (albumResult[0]?.id_artist) {
                    const [artistResult] = await db.promise().query(
                        'SELECT artist_name FROM artist WHERE id_artist = ? COLLATE utf8mb4_general_ci',
                        [albumResult[0].id_artist]
                    );
                    albumArtist = artistResult[0]?.artist_name || 'Unknown Artist';
                }
                
                // Get artist profile
                let artistProfile = null;
                if (albumResult[0]?.id_artist) {
                    const [profileResult] = await db.promise().query(
                        'SELECT artist_profile FROM artist WHERE id_artist = ? COLLATE utf8mb4_general_ci',
                        [albumResult[0].id_artist]
                    );
                    artistProfile = profileResult[0]?.artist_profile || null;
                }
                
                // Get total songs for this album
                const [totalSongsResult] = await db.promise().query(
                    'SELECT COUNT(*) as total FROM music_album WHERE id_al = ?',
                    [relation.id_al]
                );
                const totalSongs = totalSongsResult[0]?.total || 0;
                
                // Format date
                let formattedDate = 'Unknown';
                if (relation.created_at) {
                    const date = new Date(relation.created_at);
                    formattedDate = date.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    });
                }
                
                currentRelations.push({
                    id_music: relation.id_music,
                    id_al: relation.id_al,
                    created_at: relation.created_at,
                    formatted_date: formattedDate,
                    title_music: musicResult[0]?.title_music || 'Unknown',
                    music_cover: musicResult[0]?.cover_music || null,
                    album_name: albumResult[0]?.album_name || 'Unknown',
                    album_cover: albumResult[0]?.album_cover || null,
                    album_artist: albumArtist,
                    artist_profile: artistProfile,
                    music_artists: musicArtistsResult[0]?.artists || 'No artist',
                    total_songs: totalSongs  // Add total songs to each relation
                });
            }
            
            // Hitung total
            let countQuery = `SELECT COUNT(*) as total FROM music_album ma WHERE 1=1`;
            const countParams = [];
            
            if (search_music) {
                countQuery += ' AND EXISTS (SELECT 1 FROM music m WHERE m.id_music = ma.id_music AND m.title_music LIKE ?)';
                countParams.push(`%${search_music}%`);
            }
            
            if (search_album) {
                countQuery += ' AND EXISTS (SELECT 1 FROM album al WHERE al.id_al = ma.id_al AND al.album_name LIKE ?)';
                countParams.push(`%${search_album}%`);
            }
            
            const [countResult] = await db.promise().query(countQuery, countParams);
            totalRelations = countResult[0]?.total || 0;
            totalPages = Math.ceil(totalRelations / limit);
            
            res.render('admin/music-album', {
                admin: req.session.admin,
                musicList: musicList,
                albumList: albumList,
                relationsList: currentRelations,
                totalRelations: totalRelations,
                currentPage: currentPage,
                totalPages: totalPages,
                currentFilters: { search_music, search_album },
                error: null,
                success: null
            });
            
        } catch (err) {
            console.error('Query error details:', err);
            
            // Coba load data minimal tanpa JOIN
            try {
                const [musicSimple] = await db.promise().query('SELECT id_music, title_music FROM music ORDER BY title_music ASC LIMIT 50');
                const [albumSimple] = await db.promise().query('SELECT id_al, album_name FROM album ORDER BY album_name ASC LIMIT 50');
                const [relationsSimple] = await db.promise().query('SELECT id_music, id_al, created_at FROM music_album ORDER BY created_at DESC LIMIT ? OFFSET ?', [limit, offset]);
                const [totalCount] = await db.promise().query('SELECT COUNT(*) as total FROM music_album');
                
                res.render('admin/music-album', {
                    admin: req.session.admin,
                    musicList: musicSimple.map(m => ({...m, artists: 'Unknown'})),
                    albumList: albumSimple.map(a => ({...a, artist_name: 'Unknown Artist', total_songs: 0})),
                    relationsList: relationsSimple.map(r => ({
                        ...r,
                        formatted_date: 'Unknown',
                        title_music: 'Unknown',
                        album_name: 'Unknown',
                        album_artist: 'Unknown Artist',
                        music_artists: 'No artist'
                    })),
                    totalRelations: totalCount[0]?.total || 0,
                    currentPage: currentPage,
                    totalPages: Math.ceil((totalCount[0]?.total || 0) / limit),
                    currentFilters: { search_music: '', search_album: '' },
                    error: 'Data loaded in simplified mode due to collation issues',
                    success: null
                });
            } catch (fallbackErr) {
                console.error('Fallback also failed:', fallbackErr);
                res.render('admin/music-album', {
                    admin: req.session.admin,
                    musicList: [],
                    albumList: [],
                    relationsList: [],
                    totalRelations: 0,
                    currentPage: 1,
                    totalPages: 1,
                    currentFilters: { search_music: '', search_album: '' },
                    error: 'Database error: ' + err.message,
                    success: null
                });
            }
        }
        
    } catch (error) {
        console.error('Music-Album page error:', error);
        res.render('admin/music-album', {
            admin: req.session.admin,
            musicList: [],
            albumList: [],
            relationsList: [],
            totalRelations: 0,
            currentPage: 1,
            totalPages: 1,
            currentFilters: { search_music: '', search_album: '' },
            error: 'System error: ' + error.message,
            success: null
        });
    }
});

router.get('/admin/music-album/get-data', isAdminAuthenticated, async (req, res) => {
    try {
        // Query untuk mendapatkan semua musik dengan artist
        const [musicResult] = await db.promise().query(`
            SELECT m.id_music, m.title_music, m.cover_music
            FROM music m
            ORDER BY m.title_music ASC
        `);
        
        // Untuk setiap musik, ambil artist
        const musicWithArtists = [];
        for (const music of musicResult) {
            const [artistResult] = await db.promise().query(`
                SELECT GROUP_CONCAT(DISTINCT a.artist_name SEPARATOR ', ') as artists
                FROM music_artist ma
                LEFT JOIN artist a ON ma.id_artist = a.id_artist COLLATE utf8mb4_general_ci
                WHERE ma.id_music = ?
            `, [music.id_music]);
            
            musicWithArtists.push({
                ...music,
                artists: artistResult[0]?.artists || 'No artist'
            });
        }
        
        // Query untuk mendapatkan semua album
        const [albumResult] = await db.promise().query(`
            SELECT al.id_al, al.album_name, al.album_cover, al.id_artist, al.created_at
            FROM album al
            ORDER BY al.album_name ASC
        `);
        
        // Untuk setiap album, ambil artist dan hitung songs
        const albumsWithInfo = [];
        for (const album of albumResult) {
            let artistName = 'Unknown Artist';
            let artistProfile = null;
            let totalSongs = 0;
            
            // Get artist info
            if (album.id_artist) {
                const [artistResult] = await db.promise().query(
                    'SELECT artist_name, artist_profile FROM artist WHERE id_artist = ? COLLATE utf8mb4_general_ci',
                    [album.id_artist]
                );
                if (artistResult[0]) {
                    artistName = artistResult[0].artist_name || 'Unknown Artist';
                    artistProfile = artistResult[0].artist_profile || null;
                }
            }
            
            // Count songs in this album - FIXED
            const [countResult] = await db.promise().query(
                'SELECT COUNT(*) as total FROM music_album WHERE id_al = ?',
                [album.id_al]
            );
            totalSongs = countResult[0]?.total || 0;
            
            albumsWithInfo.push({
                id_al: album.id_al,
                album_name: album.album_name,
                album_cover: album.album_cover,
                album_created: album.created_at,
                artist_name: artistName,
                artist_profile: artistProfile,
                total_songs: totalSongs
            });
        }
        
        res.json({
            success: true,
            music: musicWithArtists,
            albums: albumsWithInfo
        });
        
    } catch (error) {
        console.error('Error fetching data:', error);
        // Return basic data
        try {
            const [musicSimple] = await db.promise().query(`SELECT id_music, title_music, cover_music FROM music ORDER BY title_music ASC`);
            const [albumSimple] = await db.promise().query(`SELECT id_al, album_name, album_cover FROM album ORDER BY album_name ASC`);
            
            const musicWithArtists = musicSimple.map(music => ({
                ...music,
                artists: 'Unknown'
            }));
            
            const albumsWithArtists = albumSimple.map(album => ({
                ...album,
                artist_name: 'Unknown Artist',
                artist_profile: null,
                total_songs: 0,
                album_created: new Date().toISOString()
            }));
            
            res.json({
                success: true,
                music: musicWithArtists || [],
                albums: albumsWithArtists || []
            });
        } catch (simpleErr) {
            res.status(500).json({
                success: false,
                message: 'Failed to load data',
                error: error.message
            });
        }
    }
});

// Route untuk menambahkan relasi musik-album baru
router.post('/admin/music-album/add', isAdminAuthenticated, async (req, res) => {
    try {
        const { music_ids, album_ids } = req.body;
        
        // Validasi required fields
        if (!music_ids || !Array.isArray(music_ids) || music_ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please select at least one music'
            });
        }
        
        if (!album_ids || !Array.isArray(album_ids) || album_ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please select at least one album'
            });
        }
        
        // Mulai transaction
        await db.promise().beginTransaction();
        
        try {
            const addedRelations = [];
            
            // Loop melalui semua kombinasi musik dan album
            for (const musicId of music_ids) {
                for (const albumId of album_ids) {
                    // Cek apakah relasi sudah ada
                    const [existingRelation] = await db.promise().query(
                        'SELECT * FROM music_album WHERE id_music = ? AND id_al = ?',
                        [musicId, albumId]
                    );
                    
                    if (existingRelation.length === 0) {
                        // Tambahkan relasi baru
                        await db.promise().query(
                            'INSERT INTO music_album (id_music, id_al) VALUES (?, ?)',
                            [musicId, albumId]
                        );
                        
                        // Ambil data relasi yang baru ditambahkan - FIXED SQL
                        const [relationData] = await db.promise().query(`
                            SELECT 
                                ma.id_music,
                                ma.id_al,
                                ma.created_at,
                                m.title_music,
                                m.cover_music as music_cover,
                                al.album_name,
                                al.album_cover
                            FROM music_album ma
                            JOIN music m ON ma.id_music = m.id_music
                            JOIN album al ON ma.id_al = al.id_al
                            WHERE ma.id_music = ? AND ma.id_al = ?
                            LIMIT 1
                        `, [musicId, albumId]);
                        
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
                            
                            // Get artist info separately to avoid collation issues
                            const [musicArtistResult] = await db.promise().query(
                                `SELECT GROUP_CONCAT(DISTINCT ar.artist_name SEPARATOR ', ') as artists 
                                 FROM music_artist ma2 
                                 JOIN artist ar ON ma2.id_artist = ar.id_artist 
                                 WHERE ma2.id_music = ?`,
                                [musicId]
                            );
                            
                            const [albumArtistResult] = await db.promise().query(
                                `SELECT ar.artist_name 
                                 FROM album al2 
                                 LEFT JOIN artist ar ON al2.id_artist = ar.id_artist 
                                 WHERE al2.id_al = ?`,
                                [albumId]
                            );
                            
                            relationData[0].music_artists = musicArtistResult[0]?.artists || 'No artist';
                            relationData[0].album_artist = albumArtistResult[0]?.artist_name || 'Unknown Artist';
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
        console.error('Error adding music-album relation:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add relation: ' + error.message
        });
    }
});

// Route untuk filter relasi musik-album - FIXED SQL
router.get('/admin/music-album/filter', isAdminAuthenticated, async (req, res) => {
    try {
        const {
            search_music = '',
            search_album = '',
            page = 1
        } = req.query;

        const currentPage = parseInt(page);
        const limit = 20;
        const offset = (currentPage - 1) * limit;

        // Build base query - FIXED SQL
        let baseQuery = `
            SELECT 
                ma.id_music,
                ma.id_al,
                ma.created_at,
                m.title_music,
                m.cover_music as music_cover,
                al.album_name,
                al.album_cover
            FROM music_album ma
            JOIN music m ON ma.id_music = m.id_music
            JOIN album al ON ma.id_al = al.id_al
        `;

        // Add WHERE conditions
        const whereConditions = [];
        const queryParams = [];

        // Search filter for music
        if (search_music) {
            whereConditions.push('m.title_music LIKE ?');
            queryParams.push(`%${search_music}%`);
        }

        // Search filter for album
        if (search_album) {
            whereConditions.push('al.album_name LIKE ?');
            queryParams.push(`%${search_album}%`);
        }

        // Add WHERE clause if there are conditions
        if (whereConditions.length > 0) {
            baseQuery += ' WHERE ' + whereConditions.join(' AND ');
        }

        // Add ORDER BY
        baseQuery += ' ORDER BY ma.created_at DESC';

        // Add LIMIT and OFFSET for pagination
        baseQuery += ' LIMIT ? OFFSET ?';
        queryParams.push(limit, offset);

        // Execute query
        const [relationsResult] = await db.promise().query(baseQuery, queryParams);

        // Process relations data
        const relationsList = [];
        for (const relation of relationsResult) {
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
            
            // Get artist info separately
            let musicArtists = 'No artist';
            let albumArtist = 'Unknown Artist';
            
            try {
                const [musicArtistResult] = await db.promise().query(
                    `SELECT GROUP_CONCAT(DISTINCT ar.artist_name SEPARATOR ', ') as artists 
                     FROM music_artist ma2 
                     JOIN artist ar ON ma2.id_artist = ar.id_artist 
                     WHERE ma2.id_music = ?`,
                    [relation.id_music]
                );
                musicArtists = musicArtistResult[0]?.artists || 'No artist';
                
                const [albumArtistResult] = await db.promise().query(
                    `SELECT ar.artist_name 
                     FROM album al2 
                     LEFT JOIN artist ar ON al2.id_artist = ar.id_artist 
                     WHERE al2.id_al = ?`,
                    [relation.id_al]
                );
                albumArtist = albumArtistResult[0]?.artist_name || 'Unknown Artist';
            } catch (artistErr) {
                console.error('Error fetching artist info:', artistErr);
            }
            
            relationsList.push({
                ...relation,
                formatted_date: formattedDate,
                album_artist: albumArtist,
                music_artists: musicArtists
            });
        }

        // Get total count for pagination - FIXED SQL
        let countQuery = `
            SELECT COUNT(*) as total 
            FROM music_album ma
            JOIN music m ON ma.id_music = m.id_music
            JOIN album al ON ma.id_al = al.id_al
        `;

        const countWhereConditions = [];
        const countParams = [];

        // Search filter for count
        if (search_music) {
            countWhereConditions.push('m.title_music LIKE ?');
            countParams.push(`%${search_music}%`);
        }

        if (search_album) {
            countWhereConditions.push('al.album_name LIKE ?');
            countParams.push(`%${search_album}%`);
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
        console.error('Filter music-album error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to filter data',
            error: error.message
        });
    }
});

// Route untuk menghapus relasi musik-album
router.delete('/admin/music-album/delete/:musicId/:albumId', isAdminAuthenticated, async (req, res) => {
    try {
        const { musicId, albumId } = req.params;
        
        // Cek apakah relasi ada
        const [existingRelation] = await db.promise().query(
            'SELECT * FROM music_album WHERE id_music = ? AND id_al = ?',
            [musicId, albumId]
        );
        
        if (existingRelation.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Relation not found'
            });
        }
        
        // Hapus relasi
        await db.promise().query(
            'DELETE FROM music_album WHERE id_music = ? AND id_al = ?',
            [musicId, albumId]
        );
        
        console.log(`Relation deleted: Music ${musicId} - Album ${albumId}`);
        
        res.json({
            success: true,
            message: 'Relation deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting music-album relation:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete relation: ' + error.message
        });
    }
});

// Route untuk menghapus multiple relasi
router.delete('/admin/music-album/delete-multiple', isAdminAuthenticated, async (req, res) => {
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
                const { musicId, albumId } = relation;
                
                // Hapus relasi
                const [result] = await db.promise().query(
                    'DELETE FROM music_album WHERE id_music = ? AND id_al = ?',
                    [musicId, albumId]
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

module.exports = router;