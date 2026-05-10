const express = require('express');
const router = express.Router();
const { isAdminAuthenticated } = require('../../middleware/admin-auth');
const { db } = require('../../db');

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

router.get('/admin/music-genre', isAdminAuthenticated, async (req, res) => {
    const {
        search = '',
        page = 1
    } = req.query;

    const currentPage = Math.max(parseInt(page) || 1, 1);
    const limit = 20;
    const offset = (currentPage - 1) * limit;

    try {
        /* =======================
           MAIN QUERY (GENRE LIST)
        ======================== */
        let baseQuery = `
            SELECT 
                g.id_genre,
                g.genre_name,
                g.created_at,
                COALESCE((
                    SELECT COUNT(DISTINCT mg.id_music)
                    FROM music_genre mg
                    WHERE mg.id_genre = g.id_genre
                ), 0) AS total_songs,
                COALESCE((
                    SELECT COUNT(DISTINCT mp.id_playlist)
                    FROM music_genre mg
                    LEFT JOIN music m ON mg.id_music = m.id_music
                    LEFT JOIN music_playlist mp ON m.id_music = mp.id_music
                    WHERE mg.id_genre = g.id_genre
                ), 0) AS total_playlists
            FROM genre g
        `;

        const whereConditions = [];
        const queryParams = [];

        if (search.trim()) {
            whereConditions.push('g.genre_name LIKE ?');
            queryParams.push(`%${search.trim()}%`);
        }

        if (whereConditions.length) {
            baseQuery += ' WHERE ' + whereConditions.join(' AND ');
        }

        baseQuery += `
            ORDER BY 
                g.created_at DESC,
                g.id_genre DESC
            LIMIT ? OFFSET ?
        `;

        queryParams.push(limit, offset);

        const [genreResult] = await db.promise().query(baseQuery, queryParams);

        const genreList = genreResult.map(g => {
            let formattedDate = 'Unknown';

            if (g.created_at) {
                const date = new Date(g.created_at);
                formattedDate = date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });
            }

            return {
                id_genre: g.id_genre,
                genre_name: g.genre_name || 'Unknown Genre',
                created_at: g.created_at,
                formatted_date: formattedDate,
                total_songs: Number(g.total_songs),
                total_playlists: Number(g.total_playlists)
            };
        });

        /* =======================
           COUNT QUERY (PAGINATION)
        ======================== */
        let countQuery = `SELECT COUNT(*) AS total FROM genre g`;
        const countParams = [];

        if (search.trim()) {
            countQuery += ' WHERE g.genre_name LIKE ?';
            countParams.push(`%${search.trim()}%`);
        }

        const [countResult] = await db.promise().query(countQuery, countParams);
        const totalGenres = countResult[0].total;
        const totalPages = Math.ceil(totalGenres / limit);

        /* =======================
           RENDER
        ======================== */
        res.render('admin/genre', {
            admin: req.session.admin,
            genreList,
            totalGenres,
            currentPage,
            totalPages,
            currentFilters: { search },
            error: null,
            success: null
        });

    } catch (err) {
        console.error('Genre page error:', err);

        res.render('admin/genre', {
            admin: req.session.admin,
            genreList: [],
            totalGenres: 0,
            currentPage: 1,
            totalPages: 1,
            currentFilters: { search: '' },
            error: 'Failed to load genre data',
            success: null
        });
    }
});

// Route untuk menambahkan genre baru
router.post('/admin/genre/add', isAdminAuthenticated, async (req, res) => {
    try {
        const { genre_name } = req.body;
        
        // Validasi required fields
        if (!genre_name || genre_name.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Genre name is required'
            });
        }

        // Cek apakah genre sudah ada
        const [existingGenre] = await db.promise().query(
            'SELECT id_genre FROM genre WHERE genre_name = ?',
            [genre_name.trim()]
        );
        
        if (existingGenre.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Genre already exists'
            });
        }

        // Insert ke tabel genre
        const [result] = await db.promise().query(
            'INSERT INTO genre (genre_name) VALUES (?)',
            [genre_name.trim()]
        );

        // Ambil data genre yang baru dibuat
        const [genreResult] = await db.promise().query(
            'SELECT * FROM genre WHERE id_genre = ?',
            [result.insertId]
        );

        res.json({
            success: true,
            message: 'Genre added successfully',
            genre: genreResult[0]
        });

    } catch (error) {
        console.error('Error adding genre:', error);
        
        res.status(500).json({
            success: false,
            message: 'Failed to add genre: ' + error.message
        });
    }
});

// Route untuk mendapatkan data genre berdasarkan ID (untuk edit)
router.get('/admin/genre/get/:id', isAdminAuthenticated, async (req, res) => {
    try {
        const genreId = req.params.id;
        
        // Get basic genre data
        const [genreResult] = await db.promise().query(
            'SELECT * FROM genre WHERE id_genre = ?',
            [genreId]
        );
        
        if (genreResult.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Genre not found'
            });
        }
        
        // Get genre statistics
        const [statsResult] = await db.promise().query(`
            SELECT 
                COALESCE((
                    SELECT COUNT(DISTINCT mg.id_music) 
                    FROM music_genre mg 
                    WHERE mg.id_genre = ?
                ), 0) as total_songs,
                COALESCE((
                    SELECT COUNT(DISTINCT mp.id_playlist) 
                    FROM music_genre mg 
                    LEFT JOIN music m ON mg.id_music = m.id_music
                    LEFT JOIN music_playlist mp ON m.id_music = mp.id_music
                    WHERE mg.id_genre = ?
                ), 0) as total_playlists
        `, [genreId, genreId]);
        
        const genre = genreResult[0];
        genre.total_songs = statsResult[0]?.total_songs || 0;
        genre.total_playlists = statsResult[0]?.total_playlists || 0;
        genre.formatted_date = formatDate(genre.created_at);
        
        res.json({
            success: true,
            genre: genre
        });
        
    } catch (error) {
        console.error('Error fetching genre data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch genre data',
            error: error.message
        });
    }
});

// Route untuk update genre
router.post('/admin/genre/update', isAdminAuthenticated, async (req, res) => {
    try {
        const { genre_id, genre_name } = req.body;
        
        // Validasi required fields
        if (!genre_id) {
            return res.status(400).json({
                success: false,
                message: 'Genre ID is required'
            });
        }

        if (!genre_name || genre_name.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Genre name is required'
            });
        }

        // Cek apakah genre ada
        const [existingGenre] = await db.promise().query(
            'SELECT * FROM genre WHERE id_genre = ?',
            [genre_id]
        );
        
        if (existingGenre.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Genre not found'
            });
        }

        // Cek apakah genre dengan nama yang sama sudah ada (kecuali genre ini sendiri)
        const [duplicateGenre] = await db.promise().query(
            'SELECT id_genre FROM genre WHERE genre_name = ? AND id_genre != ?',
            [genre_name.trim(), genre_id]
        );
        
        if (duplicateGenre.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Genre name already exists'
            });
        }

        // Update ke tabel genre
        await db.promise().query(
            'UPDATE genre SET genre_name = ? WHERE id_genre = ?',
            [genre_name.trim(), genre_id]
        );

        // Ambil data genre yang sudah diupdate
        const [updatedGenre] = await db.promise().query(
            'SELECT * FROM genre WHERE id_genre = ?',
            [genre_id]
        );

        res.json({
            success: true,
            message: 'Genre updated successfully',
            genre: updatedGenre[0]
        });

    } catch (error) {
        console.error('Error updating genre:', error);
        
        res.status(500).json({
            success: false,
            message: 'Failed to update genre: ' + error.message
        });
    }
});

// Route untuk menghapus genre
router.delete('/admin/genre/delete/:id', isAdminAuthenticated, async (req, res) => {
    try {
        const genreId = req.params.id;
        
        // Cek apakah genre ada
        const [genreResult] = await db.promise().query(
            'SELECT * FROM genre WHERE id_genre = ?',
            [genreId]
        );
        
        if (genreResult.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Genre not found'
            });
        }
        
        const genre = genreResult[0];
        
        // Mulai transaction
        await db.promise().beginTransaction();
        
        try {
            // Cek apakah genre memiliki lagu di tabel music_genre
            const [songsResult] = await db.promise().query(
                'SELECT COUNT(*) as song_count FROM music_genre WHERE id_genre = ?',
                [genreId]
            );
            
            if (songsResult[0].song_count > 0) {
                await db.promise().rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete genre with existing songs. Please remove or reassign songs first.'
                });
            }
            
            // Hapus genre
            await db.promise().query(
                'DELETE FROM genre WHERE id_genre = ?',
                [genreId]
            );
            
            // Commit transaction
            await db.promise().commit();
            
            res.json({
                success: true,
                message: 'Genre deleted successfully'
            });
            
        } catch (dbError) {
            // Rollback transaction jika ada error
            await db.promise().rollback();
            console.error('Database error during delete:', dbError);
            throw dbError;
        }
        
    } catch (error) {
        console.error('Error deleting genre:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete genre: ' + error.message
        });
    }
});

// Route untuk filter genre
router.get('/admin/genre/filter', isAdminAuthenticated, async (req, res) => {
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
                g.*,
                COALESCE((
                    SELECT COUNT(DISTINCT mg.id_music) 
                    FROM music_genre mg 
                    WHERE mg.id_genre = g.id_genre
                ), 0) as total_songs,
                COALESCE((
                    SELECT COUNT(DISTINCT mp.id_playlist) 
                    FROM music_genre mg 
                    LEFT JOIN music m ON mg.id_music = m.id_music
                    LEFT JOIN music_playlist mp ON m.id_music = mp.id_music
                    WHERE mg.id_genre = g.id_genre
                ), 0) as total_playlists
            FROM genre g
        `;

        // Add WHERE conditions
        const whereConditions = [];
        const queryParams = [];

        // Search filter
        if (search) {
            whereConditions.push('g.genre_name LIKE ?');
            queryParams.push(`%${search}%`);
        }

        // Add WHERE clause if there are conditions
        if (whereConditions.length > 0) {
            baseQuery += ' WHERE ' + whereConditions.join(' AND ');
        }

        // Add ORDER BY
        baseQuery += ' ORDER BY g.created_at DESC';

        // Add LIMIT and OFFSET for pagination
        baseQuery += ' LIMIT ? OFFSET ?';
        queryParams.push(limit, offset);

        // Execute query
        const [genreResult] = await db.promise().query(baseQuery, queryParams);

        // Process genre data
        const genreList = genreResult.map(genre => ({
            ...genre,
            formatted_date: formatDate(genre.created_at),
            total_songs: parseInt(genre.total_songs),
            total_playlists: parseInt(genre.total_playlists)
        }));

        // Get total count for pagination
        let countQuery = `
            SELECT COUNT(*) as total 
            FROM genre g
        `;

        const countWhereConditions = [];
        const countParams = [];

        // Search filter for count
        if (search) {
            countWhereConditions.push('g.genre_name LIKE ?');
            countParams.push(`%${search}%`);
        }

        // Add WHERE clause if there are conditions
        if (countWhereConditions.length > 0) {
            countQuery += ' WHERE ' + countWhereConditions.join(' AND ');
        }

        const [countResult] = await db.promise().query(countQuery, countParams);
        const totalGenres = countResult[0]?.total || 0;
        const totalPages = Math.ceil(totalGenres / limit);

        res.json({
            success: true,
            genreList: genreList,
            totalGenres: totalGenres,
            currentPage: currentPage,
            totalPages: totalPages
        });

    } catch (error) {
        console.error('Filter genre error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to filter genre data',
            error: error.message
        });
    }
});

// Route untuk mendapatkan daftar semua genre (untuk dropdown)
router.get('/admin/genre/list', isAdminAuthenticated, async (req, res) => {
    try {
        const [genres] = await db.promise().query(`
            SELECT id_genre, genre_name 
            FROM genre 
            ORDER BY genre_name ASC
        `);
        
        res.json({
            success: true,
            genres: genres || []
        });
        
    } catch (error) {
        console.error('Error fetching genre list:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch genre list',
            error: error.message
        });
    }
});

// Route untuk mendapatkan lagu-lagu dari genre tertentu
router.get('/admin/genre/songs/:id', isAdminAuthenticated, async (req, res) => {
    try {
        const genreId = req.params.id;
        
        const [songs] = await db.promise().query(`
            SELECT 
                m.*,
                al.album_name,
                al.album_cover
            FROM music_genre mg
            JOIN music m ON mg.id_music = m.id_music
            LEFT JOIN album al ON m.id_album = al.id_album
            WHERE mg.id_genre = ?
            ORDER BY m.music_title ASC
        `, [genreId]);
        
        res.json({
            success: true,
            songs: songs || []
        });
        
    } catch (error) {
        console.error('Error fetching genre songs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch genre songs',
            error: error.message
        });
    }
});

// Route untuk mendapatkan statistik genre
router.get('/admin/genre/stats', isAdminAuthenticated, async (req, res) => {
    try {
        const [stats] = await db.promise().query(`
            SELECT 
                COUNT(*) as total_genres,
                SUM(
                    (SELECT COUNT(DISTINCT mg.id_music) 
                     FROM music_genre mg 
                     WHERE mg.id_genre = g.id_genre)
                ) as total_songs,
                SUM(
                    (SELECT COUNT(DISTINCT mp.id_playlist) 
                     FROM music_genre mg 
                     LEFT JOIN music m ON mg.id_music = m.id_music
                     LEFT JOIN music_playlist mp ON m.id_music = mp.id_music
                     WHERE mg.id_genre = g.id_genre)
                ) as total_playlists
            FROM genre g
        `);
        
        res.json({
            success: true,
            stats: stats[0] || { total_genres: 0, total_songs: 0, total_playlists: 0 }
        });
        
    } catch (error) {
        console.error('Error fetching genre stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch genre statistics',
            error: error.message
        });
    }
});

module.exports = router;