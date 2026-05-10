const express = require('express');
const router = express.Router();
const { isAdminAuthenticated } = require('../../middleware/admin-auth');
const { db, getAudioDuration } = require('../../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');


router.get('/admin/music', isAdminAuthenticated, async (req, res) => {
    try {
        let musicList = [];
        let totalMusic = 0;
        let currentPage = 1;
        let totalPages = 1;
        
        // Get filter parameters from query
        const {
            date = '',
            sort = 'date_desc',
            search = '',
            page = 1
        } = req.query;

        currentPage = parseInt(page) || 1;
        const limit = 20;
        const offset = (currentPage - 1) * limit;

        try {
            // Build base query - FIXED VERSION
            let baseQuery = `
                SELECT m.*, 
                    m.playing as play_count,
                    GROUP_CONCAT(DISTINCT 
                        CONCAT(a.artist_name, 
                            CASE WHEN ma.role IS NOT NULL AND ma.role = 'feat' 
                            THEN ' (ft)' 
                            ELSE '' END
                        ) 
                        ORDER BY 
                            CASE WHEN ma.role = 'main' THEN 1 ELSE 2 END,  -- Main dulu
                            a.artist_name ASC  -- Kemudian urutkan nama
                        SEPARATOR ', ') as artists,
                    GROUP_CONCAT(DISTINCT al.album_name SEPARATOR ', ') as albums,
                    GROUP_CONCAT(DISTINCT g.genre_name SEPARATOR ', ') as genres
                FROM music m
                LEFT JOIN music_artist ma ON m.id_music = ma.id_music
                LEFT JOIN artist a ON ma.id_artist = a.id_artist COLLATE utf8mb4_unicode_ci
                LEFT JOIN music_album mal ON m.id_music = mal.id_music
                LEFT JOIN album al ON mal.id_al = al.id_al COLLATE utf8mb4_unicode_ci
                LEFT JOIN music_genre mg ON m.id_music = mg.id_music
                LEFT JOIN genre g ON mg.id_genre = g.id_genre
                WHERE 1=1
            `;
            const queryParams = [];

            // Date filter
            if (date) {
                let dateCondition = '';
                
                switch (date) {
                    case 'today':
                        dateCondition = 'DATE(m.created_at) = CURDATE()';
                        break;
                    case 'week':
                        dateCondition = 'm.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
                        break;
                    case 'month':
                        dateCondition = 'm.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
                        break;
                    case 'year':
                        dateCondition = 'm.created_at >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)';
                        break;
                }
                
                if (dateCondition) {
                    baseQuery += ` AND ${dateCondition}`;
                }
            }

            // Search filter
            if (search) {
                baseQuery += `
                    AND (m.title_music LIKE ? OR 
                    a.artist_name LIKE ? OR 
                    al.album_name LIKE ? OR 
                    m.lyric LIKE ? OR
                    g.genre_name LIKE ?)
                `;
                const searchTerm = `%${search}%`;
                queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
            }

            // Add GROUP BY
            baseQuery += ' GROUP BY m.id_music';

            // Add ORDER BY based on sort parameter
            switch (sort) {
                case 'date_asc':
                    baseQuery += ' ORDER BY m.created_at ASC';
                    break;
                case 'name_asc':
                    baseQuery += ' ORDER BY m.title_music ASC';
                    break;
                case 'name_desc':
                    baseQuery += ' ORDER BY m.title_music DESC';
                    break;
                case 'plays_desc':
                    baseQuery += ' ORDER BY m.playing DESC';
                    break;
                case 'plays_asc':
                    baseQuery += ' ORDER BY m.playing ASC';
                    break;
                default: // date_desc
                    baseQuery += ' ORDER BY m.created_at DESC';
                    break;
            }

            // Add LIMIT and OFFSET for pagination
            baseQuery += ' LIMIT ? OFFSET ?';
            queryParams.push(limit, offset);

            // Execute query

            const [musicResult] = await db.promise().query(baseQuery, queryParams);
            
            // Process each music to get duration
            musicList = await Promise.all(musicResult.map(async (music) => {
                let duration = '0:00';
                let durationSeconds = 0;
                
                try {
                    if (music.audio_file) {
                        const audioPath = path.join(__dirname, '../../public', music.audio_file);
                        const durationData = await getAudioDuration(audioPath);
                        duration = durationData.formatted;
                        durationSeconds = durationData.seconds;
                    }
                } catch (err) {
                    console.error(`Error getting duration for ${music.title_music}:`, err.message);
                }
                
                // Calculate play count display
                let playCountDisplay = '0';
                const playCount = music.play_count || music.playing || 0;
                
                if (playCount > 0) {
                    if (playCount >= 1000000) {
                        const millions = playCount / 1000000;
                        if (millions >= 10) {
                            playCountDisplay = Math.floor(millions) + 'M';
                        } else {
                            playCountDisplay = millions.toFixed(1) + 'M';
                        }
                    } else if (playCount >= 1000) {
                        const thousands = playCount / 1000;
                        if (thousands >= 100) {
                            playCountDisplay = Math.floor(thousands) + 'K';
                        } else if (thousands >= 10) {
                            playCountDisplay = Math.floor(thousands) + 'K';
                        } else {
                            playCountDisplay = thousands.toFixed(1) + 'K';
                        }
                    } else {
                        playCountDisplay = playCount.toString();
                    }
                }
                
                // Format created_at date
                let formattedDate = 'Unknown';
                if (music.created_at) {
                    try {
                        const date = new Date(music.created_at);
                        formattedDate = date.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                        });
                    } catch (dateErr) {
                        console.error('Error formatting date:', dateErr);
                    }
                }
                
                // Get first genre if multiple
                let primaryGenre = 'Other';
                if (music.genres) {
                    // Split the genres string and get the first one
                    const genreList = music.genres.split(', ');
                    primaryGenre = genreList[0] || 'Other';
                }
                
                return {
                    ...music,
                    duration: duration,
                    duration_seconds: durationSeconds,
                    play_count_display: playCountDisplay,
                    play_count_raw: playCount,
                    formatted_date: formattedDate,
                    genre: primaryGenre,
                    all_genres: music.genres
                };
            }));
            
            // Get total count for pagination
            let countQuery = `
                SELECT COUNT(DISTINCT m.id_music) as total 
                FROM music m
                LEFT JOIN music_artist ma ON m.id_music = ma.id_music
                LEFT JOIN artist a ON ma.id_artist = a.id_artist COLLATE utf8mb4_unicode_ci
                LEFT JOIN music_album mal ON m.id_music = mal.id_music
                LEFT JOIN album al ON mal.id_al = al.id_al COLLATE utf8mb4_unicode_ci
                LEFT JOIN music_genre mg ON m.id_music = mg.id_music
                LEFT JOIN genre g ON mg.id_genre = g.id_genre
                WHERE 1=1
            `;

            const countParams = [];

            // Date filter for count
            if (date) {
                let dateCondition = '';
                
                switch (date) {
                    case 'today':
                        dateCondition = 'DATE(m.created_at) = CURDATE()';
                        break;
                    case 'week':
                        dateCondition = 'm.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
                        break;
                    case 'month':
                        dateCondition = 'm.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
                        break;
                    case 'year':
                        dateCondition = 'm.created_at >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)';
                        break;
                }
                
                if (dateCondition) {
                    countQuery += ` AND ${dateCondition}`;
                }
            }

            // Search filter for count
            if (search) {
                countQuery += `
                    AND (m.title_music LIKE ? OR 
                     a.artist_name LIKE ? OR 
                     al.album_name LIKE ? OR 
                     m.lyric LIKE ? OR
                     g.genre_name LIKE ?)
                `;
                const searchTerm = `%${search}%`;
                countParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
            }

            const [countResult] = await db.promise().query(countQuery, countParams);
            totalMusic = countResult[0]?.total || 0;
            totalPages = Math.ceil(totalMusic / limit);
            
        } catch (err) {
            console.log('Music query error:', err.message);
            console.log('Error stack:', err.stack);
            
            // Fallback to simple query if complex query fails
            try {
                const [musicResult] = await db.promise().query(
                    `SELECT m.*, 
                     m.playing as play_count
                     FROM music m
                     ORDER BY m.created_at DESC
                     LIMIT ? OFFSET ?`,
                    [limit, offset]
                );
                
                // Process music with basic info only
                musicList = await Promise.all(musicResult.map(async (music) => {
                    let duration = '0:00';
                    let durationSeconds = 0;
                    
                    try {
                        if (music.audio_file) {
                            const audioPath = path.join(__dirname, '../../public', music.audio_file);
                            const durationData = await getAudioDuration(audioPath);
                            duration = durationData.formatted;
                            durationSeconds = durationData.seconds;
                        }
                    } catch (err) {
                        console.error(`Error getting duration for ${music.title_music}:`, err.message);
                    }
                    
                    // Calculate play count display
                    let playCountDisplay = '0';
                    const playCount = music.play_count || music.playing || 0;
                    
                    if (playCount > 0) {
                        if (playCount >= 1000000) {
                            const millions = playCount / 1000000;
                            if (millions >= 10) {
                                playCountDisplay = Math.floor(millions) + 'M';
                            } else {
                                playCountDisplay = millions.toFixed(1) + 'M';
                            }
                        } else if (playCount >= 1000) {
                            const thousands = playCount / 1000;
                            if (thousands >= 100) {
                                playCountDisplay = Math.floor(thousands) + 'K';
                            } else if (thousands >= 10) {
                                playCountDisplay = Math.floor(thousands) + 'K';
                            } else {
                                playCountDisplay = thousands.toFixed(1) + 'K';
                            }
                        } else {
                            playCountDisplay = playCount.toString();
                        }
                    }
                    
                    // Format created_at date
                    let formattedDate = 'Unknown';
                    if (music.created_at) {
                        try {
                            const date = new Date(music.created_at);
                            formattedDate = date.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                            });
                        } catch (dateErr) {
                            console.error('Error formatting date:', dateErr);
                        }
                    }
                    
                            // Update fallback query
                    const [artistResult] = await db.promise().query(`
                        SELECT GROUP_CONCAT(DISTINCT 
                            CONCAT(a.artist_name,
                                CASE WHEN ma.role IS NOT NULL AND ma.role = 'feat' 
                                THEN ' (ft)' 
                                ELSE '' END
                            ) 
                            ORDER BY 
                                CASE WHEN ma.role = 'main' THEN 1 ELSE 2 END,
                                a.artist_name ASC
                            SEPARATOR ', ') as artists
                        FROM music_artist ma
                        LEFT JOIN artist a ON ma.id_artist = a.id_artist
                        WHERE ma.id_music = ?
                    `, [music.id_music]);
                    
                    // Get albums separately
                    const [albumResult] = await db.promise().query(`
                        SELECT GROUP_CONCAT(DISTINCT al.album_name SEPARATOR ', ') as albums
                        FROM music_album mal
                        LEFT JOIN album al ON mal.id_al = al.id_al
                        WHERE mal.id_music = ?
                    `, [music.id_music]);
                    
                    // Get genres separately
                    const [genreResult] = await db.promise().query(`
                        SELECT GROUP_CONCAT(DISTINCT g.genre_name SEPARATOR ', ') as genres
                        FROM music_genre mg
                        LEFT JOIN genre g ON mg.id_genre = g.id_genre
                        WHERE mg.id_music = ?
                    `, [music.id_music]);
                    
                    const artists = artistResult[0]?.artists || '';
                    const albums = albumResult[0]?.albums || '';
                    const genres = genreResult[0]?.genres || '';
                    
                    let primaryGenre = 'Other';
                    if (genres) {
                        const genreList = genres.split(', ');
                        primaryGenre = genreList[0] || 'Other';
                    }
                    
                    return {
                        ...music,
                        artists: artists,
                        albums: albums,
                        genres: genres,
                        duration: duration,
                        duration_seconds: durationSeconds,
                        play_count_display: playCountDisplay,
                        play_count_raw: playCount,
                        formatted_date: formattedDate,
                        genre: primaryGenre,
                        all_genres: genres
                    };
                }));
                
                const [countResult] = await db.promise().query('SELECT COUNT(*) as total FROM music');
                totalMusic = countResult[0]?.total || 0;
                totalPages = Math.ceil(totalMusic / limit);
                
            } catch (fallbackErr) {
                console.log('Fallback query error:', fallbackErr.message);
                musicList = [];
                totalMusic = 0;
            }
        }
        
        // Pass filter parameters to EJS template
        res.render('admin/music', {
            admin: req.session.admin,
            musicList: musicList,
            totalMusic: totalMusic,
            currentPage: currentPage,
            totalPages: totalPages,
            // Pass filter values to template
            currentFilters: {
                date: date,
                sort: sort,
                search: search
            },
            error: null,
            success: null
        });
        
    } catch (error) {
        console.error('Music page error:', error);
        res.render('admin/music', {
            admin: req.session.admin,
            musicList: [],
            totalMusic: 0,
            currentPage: 1,
            totalPages: 1,
            currentFilters: {
                date: '',
                sort: 'date_desc',
                search: ''
            },
            error: 'Failed to load music data: ' + error.message,
            success: null
        });
    }
});


// Route untuk menambahkan music baru - FIXED VERSION
router.post('/admin/music/add', isAdminAuthenticated, async (req, res) => {
    try {
        console.log('Adding new music...');
        
        // Gunakan multer untuk handle file upload
        const upload = multer({
            storage: multer.diskStorage({
                destination: function (req, file, cb) {
                    if (file.fieldname === 'audio') {
                        const audioDir = 'public/uploads/audio/';
                        if (!fs.existsSync(audioDir)) {
                            fs.mkdirSync(audioDir, { recursive: true });
                        }
                        cb(null, audioDir);
                    } else if (file.fieldname === 'cover') {
                        const coverDir = 'public/uploads/musiccover/';
                        if (!fs.existsSync(coverDir)) {
                            fs.mkdirSync(coverDir, { recursive: true });
                        }
                        cb(null, coverDir);
                    } else {
                        cb(new Error('Invalid fieldname'));
                    }
                },
                filename: function (req, file, cb) {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                    const ext = path.extname(file.originalname);
                    const filename = uniqueSuffix + ext;
                    cb(null, filename);
                }
            }),
            limits: {
                fileSize: 50 * 1024 * 1024
            },
            fileFilter: function (req, file, cb) {
                if (file.fieldname === 'audio') {
                    const allowedTypes = ['.mp3', '.wav', '.flac', '.aac', '.m4a'];
                    const ext = path.extname(file.originalname).toLowerCase();
                    if (allowedTypes.includes(ext)) {
                        cb(null, true);
                    } else {
                        cb(new Error('Invalid audio file type. Only MP3, WAV, FLAC, AAC, M4A are allowed.'));
                    }
                } else if (file.fieldname === 'cover') {
                    const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
                    const ext = path.extname(file.originalname).toLowerCase();
                    if (allowedTypes.includes(ext)) {
                        cb(null, true);
                    } else {
                        cb(new Error('Invalid image file type. Only JPG, JPEG, PNG, GIF, WEBP are allowed.'));
                    }
                } else {
                    cb(new Error('Invalid fieldname'));
                }
            }
        });

        // Handle upload dengan middleware multer
        upload.fields([
            { name: 'audio', maxCount: 1 },
            { name: 'cover', maxCount: 1 }
        ])(req, res, async function(err) {
            if (err) {
                console.error('File upload error:', err.message);
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }

            try {
                // Parse form data
                const { title, lyrics, album_id, album_name, genre_id, genre_name } = req.body;
                let artists = [];
                let genres = [];

                // Parse artists data
                if (req.body.artists) {
                    try {
                        if (typeof req.body.artists === 'string') {
                            artists = JSON.parse(req.body.artists);
                        } else if (Array.isArray(req.body.artists)) {
                            artists = req.body.artists;
                        }
                    } catch (parseError) {
                        console.error('Error parsing artists:', parseError);
                    }
                }

                if (req.body.genres) {
                    try {
                        if (typeof req.body.genres === 'string') {
                            genres = JSON.parse(req.body.genres);
                        } else if (Array.isArray(req.body.genres)) {
                            genres = req.body.genres;
                        }
                    } catch (parseError) {
                        console.error('Error parsing genres:', parseError);
                    }
                }

                // Validasi required fields
                if (!title || title.trim() === '') {
                    return res.status(400).json({
                        success: false,
                        message: 'Title is required'
                    });
                }

                if (!artists || artists.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'At least one artist is required'
                    });
                }

                if (!genres || genres.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'At least one genre is required'
                    });
                }

                if (!req.files || !req.files.audio || req.files.audio.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Audio file is required'
                    });
                }

                // Path untuk file
                const audioFile = req.files.audio[0];
                const audioPath = `/uploads/audio/${audioFile.filename}`;
                
                let coverPath = '/uploads/undefine.jpg';
                if (req.files.cover && req.files.cover.length > 0) {
                    const coverFile = req.files.cover[0];
                    coverPath = `/uploads/musiccover/${coverFile.filename}`;
                }

                // Mulai transaction
                await db.promise().query('START TRANSACTION');

                try {
                    // Insert ke tabel music - GUNAKAN AUTO_INCREMENT
                    const [insertResult] = await db.promise().query(
                        'INSERT INTO music (title_music, audio_file, cover_music, lyric) VALUES (?, ?, ?, ?)',
                        [title.trim(), audioPath, coverPath, lyrics || '']
                    );
                    
                    // Dapatkan ID yang baru di-insert
                    const newMusicId = insertResult.insertId;
                    
                    // Format untuk display (opsional)
                    const formattedMusicId = `MS${newMusicId}`;

                    // Insert ke tabel music_artist untuk setiap artist dengan role
                    // CEGAH DUPLIKAT DENGAN SET
                    const insertedArtists = new Set();
                    for (const artist of artists) {
                        if (!insertedArtists.has(artist.id)) {
                            // Cek dulu apakah relasi sudah ada
                            const [existingRelation] = await db.promise().query(
                                'SELECT id_music FROM music_artist WHERE id_music = ? AND id_artist = ?',
                                [newMusicId, artist.id]
                            );
                            
                            if (existingRelation.length === 0) {
                                await db.promise().query(
                                    'INSERT INTO music_artist (id_music, id_artist, role) VALUES (?, ?, ?)',
                                    [newMusicId, artist.id, artist.role || 'main'] // Default ke 'main' jika tidak ada role
                                );
                                insertedArtists.add(artist.id);
                            }
                        }
                    }

                    // Insert ke tabel music_album jika album dipilih
                    if (album_id && album_id.trim() !== '') {
                        // Insert album baru
                        await db.promise().query(
                            'INSERT INTO music_album (id_music, id_al) VALUES (?, ?)',
                            [newMusicId, album_id]
                        );
                    }

                    // Insert ke tabel music_genre - CEGAH DUPLIKAT
                    const insertedGenres = new Set();
                    for (const genre of genres) {
                        if (!insertedGenres.has(genre.id)) {
                            const [existingGenreRelation] = await db.promise().query(
                                'SELECT id_music FROM music_genre WHERE id_music = ? AND id_genre = ?',
                                [newMusicId, genre.id]
                            );
                            
                            if (existingGenreRelation.length === 0) {
                                await db.promise().query(
                                    'INSERT INTO music_genre (id_music, id_genre) VALUES (?, ?)',
                                    [newMusicId, genre.id]
                                );
                                insertedGenres.add(genre.id);
                            }
                        }
                    }

                    // Commit transaction
                    await db.promise().query('COMMIT');

                    // Query yang aman dari masalah collation
                    const [musicBasicInfo] = await db.promise().query(
                        'SELECT * FROM music WHERE id_music = ?',
                        [newMusicId]
                    );

                    // Ambil artists secara terpisah dengan role
                    const [artistList] = await db.promise().query(`
                        SELECT DISTINCT a.artist_name, ma.role 
                        FROM music_artist ma
                        JOIN artist a ON ma.id_artist = a.id_artist COLLATE utf8mb4_unicode_ci
                        WHERE ma.id_music = ?
                    `, [newMusicId]);

                    // Ambil album secara terpisah
                    const [albumResult] = await db.promise().query(`
                        SELECT DISTINCT al.album_name 
                        FROM music_album mal
                        JOIN album al ON mal.id_al = al.id_al COLLATE utf8mb4_unicode_ci
                        WHERE mal.id_music = ?
                    `, [newMusicId]);

                    // Ambil genre secara terpisah
                    const [genreResult] = await db.promise().query(`
                        SELECT DISTINCT g.genre_name 
                        FROM music_genre mg
                        JOIN genre g ON mg.id_genre = g.id_genre
                        WHERE mg.id_music = ?
                    `, [newMusicId]);

                    const musicData = musicBasicInfo[0];
                    
                    // Format artists dengan role
                    const formattedArtists = artistList.map(a => {
                        if (a.role && a.role !== 'main') {
                            return `${a.artist_name} (${a.role})`;
                        }
                        return a.artist_name;
                    }).join(', ');
                    
                    musicData.formatted_id = formattedMusicId; // Tambahkan formatted ID
                    musicData.artists = formattedArtists;
                    musicData.albums = albumResult.map(a => a.album_name).join(', ');
                    musicData.genres = genreResult.map(g => g.genre_name).join(', '); 

                    console.log('Music added successfully:', musicData);

                    res.json({
                        success: true,
                        message: 'Music added successfully',
                        music: musicData
                    });

                } catch (dbError) {
                    // Rollback transaction jika ada error
                    await db.promise().query('ROLLBACK');
                    console.error('Database error:', dbError);
                    
                    // Hapus file yang sudah diupload jika ada error
                    if (req.files && req.files.audio) {
                        const audioPath = req.files.audio[0].path;
                        if (fs.existsSync(audioPath)) {
                            fs.unlinkSync(audioPath);
                        }
                    }
                    if (req.files && req.files.cover) {
                        const coverPath = req.files.cover[0].path;
                        if (fs.existsSync(coverPath)) {
                            fs.unlinkSync(coverPath);
                        }
                    }
                    
                    throw dbError;
                }

            } catch (error) {
                console.error('Error adding music:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to add music: ' + error.message
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


// Route untuk mendapatkan data artist dan album (AJAX)
router.get('/admin/music/get-artists-albums', isAdminAuthenticated, async (req, res) => {
    try {
        console.log('Fetching artists and albums data...'); // Debug
        
        // Query untuk mendapatkan semua artist
        const [artistsResult] = await db.promise().query(
            'SELECT id_artist, artist_name, artist_profile FROM artist ORDER BY artist_name ASC'
        );
        
        // Query untuk mendapatkan semua album dengan nama artist
        const [albumsResult] = await db.promise().query(`
            SELECT a.id_al, a.album_name, a.id_artist, ar.artist_name 
            FROM album a
            LEFT JOIN artist ar ON a.id_artist = ar.id_artist
            ORDER BY a.album_name ASC
        `);
        
        console.log('Artists found:', artistsResult.length); // Debug
        console.log('Albums found:', albumsResult.length); // Debug
        
        // Log contoh data untuk debugging
        if (artistsResult.length > 0) {
            console.log('Sample artist:', artistsResult[0]);
        }
        if (albumsResult.length > 0) {
            console.log('Sample album:', albumsResult[0]);
        }
        
        res.json({
            success: true,
            artists: artistsResult || [],
            albums: albumsResult || []
        });
        
    } catch (error) {
        console.error('Error fetching artists/albums:', error);
        console.error('Error stack:', error.stack); // Debug
        
        res.status(500).json({
            success: false,
            message: 'Failed to load data',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

router.post('/admin/music/add-artist', isAdminAuthenticated, async (req, res) => {
    try {
        const { artist_name } = req.body;
        
        if (!artist_name || artist_name.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Artist name is required'
            });
        }
        
        const trimmedName = artist_name.trim();
        
        // Cek apakah artist sudah ada - FIXED: Gunakan BINARY untuk case-sensitive
        const [existingArtist] = await db.promise().query(
            'SELECT id_artist FROM artist WHERE artist_name = ? COLLATE utf8mb4_bin',
            [trimmedName]
        );
        
        if (existingArtist.length > 0) {
            // Return artist yang sudah ada, jangan buat baru
            const [artistData] = await db.promise().query(
                'SELECT id_artist, artist_name, artist_profile FROM artist WHERE id_artist = ?',
                [existingArtist[0].id_artist]
            );
            
            return res.json({
                success: true,
                message: 'Artist already exists',
                artist: artistData[0]
            });
        }
        
        // Generate ID artist baru dengan format yang benar
        const [lastArtist] = await db.promise().query(
            'SELECT id_artist FROM artist WHERE id_artist LIKE "AR%" ORDER BY CAST(SUBSTRING(id_artist, 3) AS UNSIGNED) DESC LIMIT 1'
        );
        
        let newArtistId = 'AR1';
        if (lastArtist.length > 0) {
            const lastId = lastArtist[0].id_artist;
            if (lastId.startsWith('AR')) {
                const lastNumber = parseInt(lastId.substring(2)) || 0;
                newArtistId = `AR${lastNumber + 1}`;
            }
        }
        
        // Tambahkan artist baru dengan default profile
        await db.promise().query(
            'INSERT INTO artist (id_artist, artist_name, artist_profile) VALUES (?, ?, ?)',
            [newArtistId, trimmedName, '/uploads/undefine_artist.png']
        );
        
        res.json({
            success: true,
            artist: {
                id_artist: newArtistId,
                artist_name: trimmedName,
                artist_profile: '/uploads/undefine_artist.png'
            }
        });
        
    } catch (error) {
        console.error('Error adding artist:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add artist',
            error: error.message
        });
    }
});

// Route untuk menambahkan album baru (AJAX)
router.post('/admin/music/add-album', isAdminAuthenticated, async (req, res) => {
    try {
        const { album_name, id_artist } = req.body;
        
        console.log('Received album data:', { album_name, id_artist }); // Debug
        
        if (!album_name || album_name.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Album name is required'
            });
        }
        
        if (!id_artist) {
            return res.status(400).json({
                success: false,
                message: 'Artist ID is required'
            });
        }
        
        const trimmedName = album_name.trim();
        const artistId = id_artist;
        
        // Cek apakah artist ada
        const [artistExists] = await db.promise().query(
            'SELECT id_artist FROM artist WHERE id_artist = ?',
            [artistId]
        );
        
        if (artistExists.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Selected artist does not exist'
            });
        }
        
        // Cek apakah album sudah ada untuk artist ini
        const [existingAlbum] = await db.promise().query(
            'SELECT id_al FROM album WHERE LOWER(album_name) = LOWER(?) AND id_artist = ?',
            [trimmedName, artistId]
        );
        
        if (existingAlbum.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Album already exists for this artist'
            });
        }
        
        // Generate ID album baru (contoh: AL1, AL2, dll)
        const [lastAlbum] = await db.promise().query(
            'SELECT id_al FROM album ORDER BY id_al DESC LIMIT 1'
        );
        
        let newAlbumId = 'AL1';
        if (lastAlbum.length > 0) {
            const lastId = lastAlbum[0].id_al;
            const lastNumber = parseInt(lastId.replace('AL', '')) || 0;
            newAlbumId = `AL${lastNumber + 1}`;
        }
        
        // TAMBAHKAN: Default cover album
        const defaultCover = '/uploads/undefine.jpg';
        
        // Tambahkan album baru DENGAN cover default
        const [result] = await db.promise().query(
            'INSERT INTO album (id_al, album_name, id_artist, album_cover) VALUES (?, ?, ?, ?)',
            [newAlbumId, trimmedName, artistId, defaultCover]
        );
        
        // Ambil data album lengkap dengan nama artist
        const [albumResult] = await db.promise().query(`
            SELECT a.id_al, a.album_name, a.id_artist, a.album_cover, ar.artist_name 
            FROM album a
            LEFT JOIN artist ar ON a.id_artist = ar.id_artist
            WHERE a.id_al = ?
        `, [newAlbumId]);
        
        if (!albumResult[0]) {
            throw new Error('Failed to retrieve created album');
        }
        
        console.log('Album created successfully:', albumResult[0]); // Debug
        
        res.json({
            success: true,
            album: albumResult[0]
        });
        
    } catch (error) {
        console.error('Error adding album:', error);
        console.error('Error details:', error.stack); // Debug
        
        res.status(500).json({
            success: false,
            message: 'Failed to add album: ' + error.message,
            error: error.message
        });
    }
});



router.get('/admin/music/filter', isAdminAuthenticated, async (req, res) => {
    try {
        const {
            date = '',
            sort = 'date_desc',
            search = '',
            page = 1
        } = req.query;

        const currentPage = parseInt(page);
        const limit = 20;
        const offset = (currentPage - 1) * limit;

        // Gunakan QUERY YANG SAMA PERSIS dengan endpoint utama
        let baseQuery = `
            SELECT m.*, 
                   m.playing as play_count,
                   GROUP_CONCAT(DISTINCT 
                       CONCAT(a.artist_name, 
                           CASE WHEN ma.role IS NOT NULL AND ma.role = 'feat' 
                           THEN ' (ft)' 
                           ELSE '' END
                       ) 
                       ORDER BY 
                           CASE WHEN ma.role = 'main' THEN 1 ELSE 2 END,  -- Main dulu
                           a.artist_name ASC  -- Kemudian urutkan nama
                       SEPARATOR ', ') as artists,
                   GROUP_CONCAT(DISTINCT al.album_name SEPARATOR ', ') as albums,
                   GROUP_CONCAT(DISTINCT g.genre_name SEPARATOR ', ') as genres
            FROM music m
            LEFT JOIN music_artist ma ON m.id_music = ma.id_music
            LEFT JOIN artist a ON ma.id_artist = a.id_artist COLLATE utf8mb4_unicode_ci
            LEFT JOIN music_album mal ON m.id_music = mal.id_music
            LEFT JOIN album al ON mal.id_al = al.id_al COLLATE utf8mb4_unicode_ci
            LEFT JOIN music_genre mg ON m.id_music = mg.id_music
            LEFT JOIN genre g ON mg.id_genre = g.id_genre
            WHERE 1=1
        `;
        const queryParams = [];

        // Date filter - GANTI menjadi seperti endpoint utama
        if (date) {
            let dateCondition = '';
            
            switch (date) {
                case 'today':
                    dateCondition = 'DATE(m.created_at) = CURDATE()';
                    break;
                case 'week':
                    dateCondition = 'm.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
                    break;
                case 'month':
                    dateCondition = 'm.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
                    break;
                case 'year':
                    dateCondition = 'm.created_at >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)';
                    break;
            }
            
            if (dateCondition) {
                baseQuery += ` AND ${dateCondition}`;
            }
        }

        // Search filter - GANTI menjadi seperti endpoint utama
        if (search) {
            baseQuery += `
                AND (m.title_music LIKE ? OR 
                a.artist_name LIKE ? OR 
                al.album_name LIKE ? OR 
                m.lyric LIKE ? OR
                g.genre_name LIKE ?)
            `;
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
        }

        // Add GROUP BY
        baseQuery += ' GROUP BY m.id_music';

        // Add ORDER BY based on sort parameter - HARUS SAMA dengan endpoint utama
        switch (sort) {
            case 'date_asc':
                baseQuery += ' ORDER BY m.created_at ASC';
                break;
            case 'name_asc':
                baseQuery += ' ORDER BY m.title_music ASC';
                break;
            case 'name_desc':
                baseQuery += ' ORDER BY m.title_music DESC';
                break;
            case 'plays_desc':
                baseQuery += ' ORDER BY m.playing DESC';
                break;
            case 'plays_asc':
                baseQuery += ' ORDER BY m.playing ASC';
                break;
            default: // date_desc
                baseQuery += ' ORDER BY m.created_at DESC';
                break;
        }

        // Add LIMIT and OFFSET for pagination
        baseQuery += ' LIMIT ? OFFSET ?';
        queryParams.push(limit, offset);

        // Execute query
        const [musicResult] = await db.promise().query(baseQuery, queryParams);

        // Process each music to get duration - GANTI menjadi seperti endpoint utama
        const musicList = await Promise.all(musicResult.map(async (music) => {
            let duration = '0:00';
            let durationSeconds = 0;

            try {
                if (music.audio_file) {
                    const audioPath = path.join(__dirname, '../../public', music.audio_file);
                    const durationData = await getAudioDuration(audioPath);
                    duration = durationData.formatted;
                    durationSeconds = durationData.seconds;
                }
            } catch (err) {
                console.error(`Error getting duration for ${music.title_music}:`, err.message);
            }
            
            // Calculate play count display - HARUS SAMA dengan endpoint utama
            let playCountDisplay = '0';
            const playCount = music.play_count || music.playing || 0;
            
            if (playCount > 0) {
                if (playCount >= 1000000) {
                    const millions = playCount / 1000000;
                    if (millions >= 10) {
                        playCountDisplay = Math.floor(millions) + 'M';
                    } else {
                        playCountDisplay = millions.toFixed(1) + 'M';
                    }
                } else if (playCount >= 1000) {
                    const thousands = playCount / 1000;
                    if (thousands >= 100) {
                        playCountDisplay = Math.floor(thousands) + 'K';
                    } else if (thousands >= 10) {
                        playCountDisplay = Math.floor(thousands) + 'K';
                    } else {
                        playCountDisplay = thousands.toFixed(1) + 'K';
                    }
                } else {
                    playCountDisplay = playCount.toString();
                }
            }
            
            // Format created_at date
            let formattedDate = 'Unknown';
            if (music.created_at) {
                try {
                    const date = new Date(music.created_at);
                    formattedDate = date.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    });
                } catch (dateErr) {
                    console.error('Error formatting date:', dateErr);
                }
            }
            
            // Get first genre if multiple
            let primaryGenre = 'Other';
            if (music.genres) {
                // Split the genres string and get the first one
                const genreList = music.genres.split(', ');
                primaryGenre = genreList[0] || 'Other';
            }
            
            return {
                ...music,
                duration: duration,
                duration_seconds: durationSeconds,
                play_count_display: playCountDisplay,
                play_count_raw: playCount,
                formatted_date: formattedDate,
                genre: primaryGenre,
                all_genres: music.genres
            };
        }));

        // Get total count for pagination - GANTI seperti endpoint utama
        let countQuery = `
            SELECT COUNT(DISTINCT m.id_music) as total 
            FROM music m
            LEFT JOIN music_artist ma ON m.id_music = ma.id_music
            LEFT JOIN artist a ON ma.id_artist = a.id_artist COLLATE utf8mb4_unicode_ci
            LEFT JOIN music_album mal ON m.id_music = mal.id_music
            LEFT JOIN album al ON mal.id_al = al.id_al COLLATE utf8mb4_unicode_ci
            LEFT JOIN music_genre mg ON m.id_music = mg.id_music
            LEFT JOIN genre g ON mg.id_genre = g.id_genre
            WHERE 1=1
        `;

        const countParams = [];

        // Date filter for count - HARUS SAMA
        if (date) {
            let dateCondition = '';
            
            switch (date) {
                case 'today':
                    dateCondition = 'DATE(m.created_at) = CURDATE()';
                    break;
                case 'week':
                    dateCondition = 'm.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
                    break;
                case 'month':
                    dateCondition = 'm.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
                    break;
                case 'year':
                    dateCondition = 'm.created_at >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)';
                    break;
            }
            
            if (dateCondition) {
                countQuery += ` AND ${dateCondition}`;
            }
        }

        // Search filter for count - HARUS SAMA
        if (search) {
            countQuery += `
                AND (m.title_music LIKE ? OR 
                 a.artist_name LIKE ? OR 
                 al.album_name LIKE ? OR 
                 m.lyric LIKE ? OR
                 g.genre_name LIKE ?)
            `;
            const searchTerm = `%${search}%`;
            countParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
        }

        const [countResult] = await db.promise().query(countQuery, countParams);
        const totalMusic = countResult[0]?.total || 0;
        const totalPages = Math.ceil(totalMusic / limit);

        res.json({
            success: true,
            musicList: musicList,
            totalMusic: totalMusic,
            currentPage: currentPage,
            totalPages: totalPages
        });

    } catch (error) {
        console.error('Filter music error:', error);
        
        // Fallback seperti endpoint utama
        try {
            const currentPage = parseInt(req.query.page) || 1;
            const limit = 20;
            const offset = (currentPage - 1) * limit;
            
            const [musicResult] = await db.promise().query(
                `SELECT m.*, 
                 m.playing as play_count
                 FROM music m
                 ORDER BY m.created_at DESC
                 LIMIT ? OFFSET ?`,
                [limit, offset]
            );
            
            // Process music with basic info only - sama seperti fallback endpoint utama
            const musicList = await Promise.all(musicResult.map(async (music) => {
                let duration = '0:00';
                let durationSeconds = 0;
                
                try {
                    if (music.audio_file) {
                        const audioPath = path.join(__dirname, '../../public', music.audio_file);
                        const durationData = await getAudioDuration(audioPath);
                        duration = durationData.formatted;
                        durationSeconds = durationData.seconds;
                    }
                } catch (err) {
                    console.error(`Error getting duration for ${music.title_music}:`, err.message);
                }
                
                // Calculate play count display
                let playCountDisplay = '0';
                const playCount = music.play_count || music.playing || 0;
                
                if (playCount > 0) {
                    if (playCount >= 1000000) {
                        const millions = playCount / 1000000;
                        if (millions >= 10) {
                            playCountDisplay = Math.floor(millions) + 'M';
                        } else {
                            playCountDisplay = millions.toFixed(1) + 'M';
                        }
                    } else if (playCount >= 1000) {
                        const thousands = playCount / 1000;
                        if (thousands >= 100) {
                            playCountDisplay = Math.floor(thousands) + 'K';
                        } else if (thousands >= 10) {
                            playCountDisplay = Math.floor(thousands) + 'K';
                        } else {
                            playCountDisplay = thousands.toFixed(1) + 'K';
                        }
                    } else {
                        playCountDisplay = playCount.toString();
                    }
                }
                
                // Format created_at date
                let formattedDate = 'Unknown';
                if (music.created_at) {
                    try {
                        const date = new Date(music.created_at);
                        formattedDate = date.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                        });
                    } catch (dateErr) {
                        console.error('Error formatting date:', dateErr);
                    }
                }
                
                // Get artists separately
                const [artistResult] = await db.promise().query(`
                    SELECT GROUP_CONCAT(DISTINCT 
                        CONCAT(a.artist_name,
                            CASE WHEN ma.role IS NOT NULL AND ma.role = 'feat' 
                            THEN ' (ft)' 
                            ELSE '' END
                        ) 
                        ORDER BY 
                            CASE WHEN ma.role = 'main' THEN 1 ELSE 2 END,
                            a.artist_name ASC
                        SEPARATOR ', ') as artists
                    FROM music_artist ma
                    LEFT JOIN artist a ON ma.id_artist = a.id_artist
                    WHERE ma.id_music = ?
                `, [music.id_music]);
                
                // Get albums separately
                const [albumResult] = await db.promise().query(`
                    SELECT GROUP_CONCAT(DISTINCT al.album_name SEPARATOR ', ') as albums
                    FROM music_album mal
                    LEFT JOIN album al ON mal.id_al = al.id_al
                    WHERE mal.id_music = ?
                `, [music.id_music]);
                
                // Get genres separately
                const [genreResult] = await db.promise().query(`
                    SELECT GROUP_CONCAT(DISTINCT g.genre_name SEPARATOR ', ') as genres
                    FROM music_genre mg
                    LEFT JOIN genre g ON mg.id_genre = g.id_genre
                    WHERE mg.id_music = ?
                `, [music.id_music]);
                
                const artists = artistResult[0]?.artists || '';
                const albums = albumResult[0]?.albums || '';
                const genres = genreResult[0]?.genres || '';
                
                let primaryGenre = 'Other';
                if (genres) {
                    const genreList = genres.split(', ');
                    primaryGenre = genreList[0] || 'Other';
                }
                
                return {
                    ...music,
                    artists: artists,
                    albums: albums,
                    genres: genres,
                    duration: duration,
                    duration_seconds: durationSeconds,
                    play_count_display: playCountDisplay,
                    play_count_raw: playCount,
                    formatted_date: formattedDate,
                    genre: primaryGenre,
                    all_genres: genres
                };
            }));
            
            const [countResult] = await db.promise().query('SELECT COUNT(*) as total FROM music');
            const totalMusic = countResult[0]?.total || 0;
            const totalPages = Math.ceil(totalMusic / limit);
            
            res.json({
                success: true,
                musicList: musicList,
                totalMusic: totalMusic,
                currentPage: currentPage,
                totalPages: totalPages
            });
            
        } catch (fallbackErr) {
            console.log('Fallback query error:', fallbackErr.message);
            res.status(500).json({
                success: false,
                message: 'Failed to filter music data',
                error: error.message
            });
        }
    }
});





// Route untuk mendapatkan data musik berdasarkan ID (untuk edit)
// Route untuk mendapatkan data musik berdasarkan ID (untuk edit)
router.get('/admin/music/get/:id', isAdminAuthenticated, async (req, res) => {
    try {
        const musicId = req.params.id;
        
        // Query untuk mendapatkan data musik
        const [musicResult] = await db.promise().query(
            'SELECT * FROM music WHERE id_music = ?',
            [musicId]
        );
        
        if (musicResult.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Music not found'
            });
        }
        
        const music = musicResult[0];
        
        // Query untuk mendapatkan artists dengan role - UPDATE INI
        const [artistResult] = await db.promise().query(`
            SELECT a.id_artist, a.artist_name, ma.role 
            FROM music_artist ma
            JOIN artist a ON ma.id_artist = a.id_artist COLLATE utf8mb4_unicode_ci
            WHERE ma.id_music = ?
        `, [musicId]);
        
        // Query untuk mendapatkan album
        const [albumResult] = await db.promise().query(`
            SELECT al.id_al, al.album_name 
            FROM music_album mal
            JOIN album al ON mal.id_al = al.id_al COLLATE utf8mb4_unicode_ci
            WHERE mal.id_music = ?
        `, [musicId]);
        
        // Query untuk mendapatkan genre
        const [genreResult] = await db.promise().query(`
            SELECT g.id_genre, g.genre_name 
            FROM music_genre mg
            JOIN genre g ON mg.id_genre = g.id_genre
            WHERE mg.id_music = ?
        `, [musicId]);
        
        res.json({
            success: true,
            music: {
                ...music,
                artists: artistResult, // Sekarang termasuk role
                album: albumResult.length > 0 ? albumResult[0] : null,
                genres: genreResult
            }
        });
        
    } catch (error) {
        console.error('Error fetching music data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch music data',
            error: error.message
        });
    }
});

// Route untuk update music - FIXED VERSION
// Route untuk update music - FIXED VERSION
router.post('/admin/music/update', isAdminAuthenticated, async (req, res) => {
    try {
        console.log('Updating music...');
        
        // Gunakan multer untuk handle file upload
        const upload = multer({
            storage: multer.diskStorage({
                destination: function (req, file, cb) {
                    if (file.fieldname === 'audio') {
                        const audioDir = 'public/uploads/audio/';
                        if (!fs.existsSync(audioDir)) {
                            fs.mkdirSync(audioDir, { recursive: true });
                        }
                        cb(null, audioDir);
                    } else if (file.fieldname === 'cover') {
                        const coverDir = 'public/uploads/musiccover/';
                        if (!fs.existsSync(coverDir)) {
                            fs.mkdirSync(coverDir, { recursive: true });
                        }
                        cb(null, coverDir);
                    } else {
                        cb(new Error('Invalid fieldname'));
                    }
                },
                filename: function (req, file, cb) {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                    const ext = path.extname(file.originalname);
                    const filename = uniqueSuffix + ext;
                    cb(null, filename);
                }
            }),
            limits: {
                fileSize: 50 * 1024 * 1024
            },
            fileFilter: function (req, file, cb) {
                if (file.fieldname === 'audio') {
                    const allowedTypes = ['.mp3', '.wav', '.flac', '.aac', '.m4a'];
                    const ext = path.extname(file.originalname).toLowerCase();
                    if (allowedTypes.includes(ext)) {
                        cb(null, true);
                    } else {
                        cb(new Error('Invalid audio file type. Only MP3, WAV, FLAC, AAC, M4A are allowed.'));
                    }
                } else if (file.fieldname === 'cover') {
                    const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
                    const ext = path.extname(file.originalname).toLowerCase();
                    if (allowedTypes.includes(ext)) {
                        cb(null, true);
                    } else {
                        cb(new Error('Invalid image file type. Only JPG, JPEG, PNG, GIF, WEBP are allowed.'));
                    }
                } else {
                    cb(new Error('Invalid fieldname'));
                }
            }
        });

        // Handle upload dengan middleware multer
        upload.fields([
            { name: 'audio', maxCount: 1 },
            { name: 'cover', maxCount: 1 }
        ])(req, res, async function(err) {
            if (err) {
                console.error('File upload error:', err.message);
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }

            try {
                // Parse form data
                const { music_id, title, lyrics, album_id, album_name, genre_id, genre_name } = req.body;
                let artists = [];
                let genres = [];
                
                // Parse artists data
                if (req.body.artists) {
                    try {
                        if (typeof req.body.artists === 'string') {
                            artists = JSON.parse(req.body.artists);
                        } else if (Array.isArray(req.body.artists)) {
                            artists = req.body.artists;
                        }
                    } catch (parseError) {
                        console.error('Error parsing artists:', parseError);
                    }
                }

                if (req.body.genres) {
                    try {
                        if (typeof req.body.genres === 'string') {
                            genres = JSON.parse(req.body.genres);
                        } else if (Array.isArray(req.body.genres)) {
                            genres = req.body.genres;
                        }
                    } catch (parseError) {
                        console.error('Error parsing genres:', parseError);
                    }
                }

                // Validasi required fields
                if (!music_id) {
                    return res.status(400).json({
                        success: false,
                        message: 'Music ID is required'
                    });
                }

                if (!title || title.trim() === '') {
                    return res.status(400).json({
                        success: false,
                        message: 'Title is required'
                    });
                }

                if (!artists || artists.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'At least one artist is required'
                    });
                }

                if (!genres || genres.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'At least one genre is required'
                    });
                }

                // Cek apakah musik ada dan ambil data file lama
                const [existingMusic] = await db.promise().query(
                    'SELECT * FROM music WHERE id_music = ?',
                    [music_id]
                );
                
                if (existingMusic.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: 'Music not found'
                    });
                }

                const oldMusic = existingMusic[0];
                const filesToDelete = [];
                
                // Path untuk file baru
                let audioPath = oldMusic.audio_file;
                if (req.files && req.files.audio && req.files.audio.length > 0) {
                    const audioFile = req.files.audio[0];
                    audioPath = `/uploads/audio/${audioFile.filename}`;
                    
                    // Simpan file audio lama untuk dihapus nanti
                    if (oldMusic.audio_file && !oldMusic.audio_file.includes('/uploads/undefine.')) {
                        filesToDelete.push({
                            type: 'audio',
                            path: oldMusic.audio_file
                        });
                    }
                }
                
                let coverPath = oldMusic.cover_music;
                if (req.files && req.files.cover && req.files.cover.length > 0) {
                    const coverFile = req.files.cover[0];
                    coverPath = `/uploads/musiccover/${coverFile.filename}`;
                    
                    // Simpan file cover lama untuk dihapus nanti
                    if (oldMusic.cover_music && oldMusic.cover_music !== '/uploads/undefine.jpg') {
                        filesToDelete.push({
                            type: 'cover',
                            path: oldMusic.cover_music
                        });
                    }
                }

                // Mulai transaction menggunakan pool langsung
                await db.promise().query('START TRANSACTION');

                try {
                    // Update ke tabel music
                    await db.promise().query(
                        'UPDATE music SET title_music = ?, audio_file = ?, cover_music = ?, lyric = ? WHERE id_music = ?',
                        [title.trim(), audioPath, coverPath, lyrics || '', music_id]
                    );

                    // Hapus artist lama
                    await db.promise().query(
                        'DELETE FROM music_artist WHERE id_music = ?',
                        [music_id]
                    );

                    // Insert artist baru dengan role
                    const insertedArtists = new Set();
                    for (const artist of artists) {
                        if (!insertedArtists.has(artist.id)) {
                            // Cek dulu apakah relasi sudah ada (meski sudah dihapus, untuk safety)
                            const [existingRelation] = await db.promise().query(
                                'SELECT id_music FROM music_artist WHERE id_music = ? AND id_artist = ?',
                                [music_id, artist.id]
                            );
                            
                            if (existingRelation.length === 0) {
                                // INSERT dengan role
                                await db.promise().query(
                                    'INSERT INTO music_artist (id_music, id_artist, role) VALUES (?, ?, ?)',
                                    [music_id, artist.id, artist.role || 'main']
                                );
                                insertedArtists.add(artist.id);
                            }
                        }
                    }

                    // Update atau hapus album
                    if (album_id && album_id.trim() !== '') {
                        // Hapus dulu semua album untuk musik ini
                        await db.promise().query(
                            'DELETE FROM music_album WHERE id_music = ?',
                            [music_id]
                        );
                        
                        // Insert album baru
                        await db.promise().query(
                            'INSERT INTO music_album (id_music, id_al) VALUES (?, ?)',
                            [music_id, album_id]
                        );
                    } else {
                        // Jika album_id kosong, hapus album dari musik ini
                        await db.promise().query(
                            'DELETE FROM music_album WHERE id_music = ?',
                            [music_id]
                        );
                    }

                    // Update genre - HAPUS DUPLIKAT
                    if (genres && genres.length > 0) {
                        // Hapus semua genre lama
                        await db.promise().query(
                            'DELETE FROM music_genre WHERE id_music = ?',
                            [music_id]
                        );
                        
                        // Insert genre baru tanpa duplikat
                        const insertedGenres = new Set();
                        for (const genre of genres) {
                            if (!insertedGenres.has(genre.id)) {
                                // Cek dulu apakah relasi sudah ada
                                const [existingGenreRelation] = await db.promise().query(
                                    'SELECT id_music FROM music_genre WHERE id_music = ? AND id_genre = ?',
                                    [music_id, genre.id]
                                );
                                
                                if (existingGenreRelation.length === 0) {
                                    await db.promise().query(
                                        'INSERT INTO music_genre (id_music, id_genre) VALUES (?, ?)',
                                        [music_id, genre.id]
                                    );
                                    insertedGenres.add(genre.id);
                                }
                            }
                        }
                    } else {
                        // Jika tidak ada genre yang dipilih, hapus semua genre
                        await db.promise().query(
                            'DELETE FROM music_genre WHERE id_music = ?',
                            [music_id]
                        );
                    }

                    // Commit transaction
                    await db.promise().query('COMMIT');

                    // Hapus file lama setelah transaction sukses
                    deleteOldFiles(filesToDelete);

                    // Ambil data musik yang sudah diupdate
                    const [updatedMusic] = await db.promise().query(
                        'SELECT * FROM music WHERE id_music = ?',
                        [music_id]
                    );

                    console.log('Music updated successfully:', updatedMusic[0]);

                    res.json({
                        success: true,
                        message: 'Music updated successfully',
                        music: updatedMusic[0]
                    });

                } catch (dbError) {
                    // Rollback transaction jika ada error
                    await db.promise().query('ROLLBACK');
                    console.error('Database error:', dbError);
                    
                    // Hapus file baru yang sudah diupload jika ada error
                    if (req.files && req.files.audio) {
                        const audioPath = req.files.audio[0].path;
                        if (fs.existsSync(audioPath)) {
                            fs.unlinkSync(audioPath);
                        }
                    }
                    if (req.files && req.files.cover) {
                        const coverPath = req.files.cover[0].path;
                        if (fs.existsSync(coverPath)) {
                            fs.unlinkSync(coverPath);
                        }
                    }
                    
                    throw dbError;
                }

            } catch (error) {
                console.error('Error updating music:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to update music: ' + error.message
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

// Helper function untuk menghapus file lama
function deleteOldFiles(filesToDelete) {
    filesToDelete.forEach(file => {
        try {
            const filePath = path.join(__dirname, '../../public', file.path);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`Deleted old ${file.type} file: ${file.path}`);
            } else {
                console.log(`Old ${file.type} file not found: ${file.path}`);
            }
        } catch (err) {
            console.error(`Error deleting old ${file.type} file:`, err.message);
        }
    });
}


// Route untuk menghapus music
// Route untuk menghapus music
router.delete('/admin/music/delete/:id', isAdminAuthenticated, async (req, res) => {
    try {
        const musicId = req.params.id;
        
        // Cek apakah musik ada
        const [musicResult] = await db.promise().query(
            'SELECT * FROM music WHERE id_music = ?',
            [musicId]
        );
        
        if (musicResult.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Music not found'
            });
        }
        
        const music = musicResult[0];
        const filesToDelete = []; // Array untuk menyimpan file yang akan dihapus
        
        // Simpan file yang akan dihapus
        if (music.audio_file && !music.audio_file.includes('/uploads/undefine.')) {
            filesToDelete.push({
                type: 'audio',
                path: music.audio_file
            });
        }
        
        if (music.cover_music && music.cover_music !== '/uploads/undefine.jpg') {
            filesToDelete.push({
                type: 'cover',
                path: music.cover_music
            });
        }
        
        // Mulai transaction
        await db.promise().beginTransaction();
        
        try {
            // Hapus relasi di tabel music_artist
            await db.promise().query(
                'DELETE FROM music_artist WHERE id_music = ?',
                [musicId]
            );
            
            // Hapus relasi di tabel music_album
            await db.promise().query(
                'DELETE FROM music_album WHERE id_music = ?',
                [musicId]
            );
            
            // Hapus dari playlist_music jika ada
            await db.promise().query(
                'DELETE FROM music_playlist WHERE id_music = ?',
                [musicId]
            );

            // Hapus dari music_artist (duplicate, bisa dihapus salah satu)
            await db.promise().query(
                'DELETE FROM music_artist WHERE id_music = ?',
                [musicId]
            );

            // Hapus dari music_cus
            await db.promise().query(
                'DELETE FROM music_cus WHERE id_music = ?',
                [musicId]
            );

            // Hapus dari music_fav
            await db.promise().query(
                'DELETE FROM music_fav WHERE id_music = ?',
                [musicId]
            );
            
            // Hapus dari music_genre
            await db.promise().query(
                'DELETE FROM music_genre WHERE id_music = ?',
                [musicId]
            );
            
            // Hapus dari music itu sendiri
            await db.promise().query(
                'DELETE FROM music WHERE id_music = ?',
                [musicId]
            );
            
            // Commit transaction
            await db.promise().commit();
            
            // Hapus file fisik setelah transaction sukses
            deleteFiles(filesToDelete);
            
            console.log(`Music ${musicId} deleted successfully`);
            
            res.json({
                success: true,
                message: 'Music deleted successfully'
            });
            
        } catch (dbError) {
            // Rollback transaction jika ada error
            await db.promise().rollback();
            console.error('Database error during delete:', dbError);
            
            // Hapus file yang mungkin sudah terhapus sebagian
            deleteFiles(filesToDelete);
            
            throw dbError;
        }
        
    } catch (error) {
        console.error('Error deleting music:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete music: ' + error.message
        });
    }
});

// Helper function untuk menghapus file
function deleteFiles(filesToDelete) {
    filesToDelete.forEach(file => {
        try {
            const filePath = path.join(__dirname, '../../public', file.path);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`Deleted ${file.type} file: ${file.path}`);
            } else {
                console.log(`${file.type} file not found: ${file.path}`);
            }
        } catch (err) {
            console.error(`Error deleting ${file.type} file:`, err.message);
        }
    });
}







// Route untuk mendapatkan data artist, album, dan genre (AJAX)
router.get('/admin/music/get-data', isAdminAuthenticated, async (req, res) => {
    try {
        console.log('Fetching artists, albums and genres data...');
        
        // Query untuk mendapatkan semua artist
        const [artistsResult] = await db.promise().query(
            'SELECT id_artist, artist_name, artist_profile FROM artist ORDER BY artist_name ASC'
        );
        
        // Query untuk mendapatkan semua album dengan nama artist
        const [albumsResult] = await db.promise().query(`
            SELECT a.id_al, a.album_name, a.id_artist, ar.artist_name 
            FROM album a
            LEFT JOIN artist ar ON a.id_artist = ar.id_artist
            ORDER BY a.album_name ASC
        `);
        
        // Query untuk mendapatkan semua genre - TAMBAH INI
        const [genresResult] = await db.promise().query(
            'SELECT id_genre, genre_name FROM genre ORDER BY genre_name ASC'
        );
        
        console.log('Artists found:', artistsResult.length);
        console.log('Albums found:', albumsResult.length);
        console.log('Genres found:', genresResult.length); // TAMBAH INI
        
        res.json({
            success: true,
            artists: artistsResult || [],
            albums: albumsResult || [],
            genres: genresResult || [] // TAMBAH INI
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
module.exports = router;