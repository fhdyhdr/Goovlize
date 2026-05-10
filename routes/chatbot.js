const express = require('express');
const router = express.Router();
const { db } = require('../db');

// Endpoint untuk mendapatkan semua musik dengan artist
router.get('/music/all', (req, res) => {
    const { limit = 200 } = req.query;
    
    const sql = `
        SELECT 
            m.id_music, 
            m.title_music, 
            m.audio_file, 
            m.cover_music, 
            m.lyric, 
            m.playing,
            GROUP_CONCAT(DISTINCT a.artist_name) as artists,
            GROUP_CONCAT(DISTINCT a.id_artist) as artist_ids
        FROM music m
        LEFT JOIN music_artist ma ON m.id_music = ma.id_music
        LEFT JOIN artist a ON ma.id_artist = a.id_artist
        GROUP BY m.id_music
        ORDER BY m.playing DESC, m.title_music ASC 
        LIMIT ?
    `;
    
    db.query(sql, [parseInt(limit)], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        res.json({ 
            success: true,
            music: results,
            count: results.length 
        });
    });
});

// Endpoint untuk mencari lagu oleh artist tertentu
router.get('/music/by-artist', (req, res) => {
    const { artist } = req.query;
    
    console.log('Music by artist request:', artist);
    
    if (!artist || artist.trim() === '') {
        return res.status(400).json({ error: 'Artist parameter required' });
    }

    const searchTerm = artist.trim();
    
    const sql = `
        SELECT 
            m.id_music, 
            m.title_music, 
            m.audio_file, 
            m.cover_music, 
            m.lyric, 
            m.playing,
            GROUP_CONCAT(DISTINCT a.artist_name) as artists,
            GROUP_CONCAT(DISTINCT a.id_artist) as artist_ids
        FROM music m
        LEFT JOIN music_artist ma ON m.id_music = ma.id_music
        LEFT JOIN artist a ON ma.id_artist = a.id_artist
        WHERE EXISTS (
            SELECT 1 FROM music_artist ma2 
            JOIN artist a2 ON ma2.id_artist = a2.id_artist 
            WHERE ma2.id_music = m.id_music 
            AND (
                LOWER(a2.artist_name) LIKE LOWER(CONCAT('%', ?, '%'))
                OR LOWER(REPLACE(a2.artist_name, ' ', '')) LIKE LOWER(CONCAT('%', REPLACE(?, ' ', ''), '%'))
            )
        )
        GROUP BY m.id_music
        ORDER BY m.playing DESC, m.title_music ASC
        LIMIT 20
    `;
    
    db.query(sql, [searchTerm, searchTerm], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        console.log('Music by artist results:', results.length);
        res.json({ 
            success: true,
            music: results,
            count: results.length,
            artist: artist
        });
    });
});

// Endpoint untuk mencari lagu dengan fuzzy matching
router.get('/music/find', (req, res) => {
    const { title } = req.query;
    
    console.log('Find music request:', title);
    
    if (!title || title.trim() === '') {
        return res.status(400).json({ error: 'Title parameter required' });
    }

    const searchTerm = title.trim();
    
    const sql = `
        SELECT 
            m.id_music, 
            m.title_music, 
            m.audio_file, 
            m.cover_music, 
            m.lyric, 
            m.playing,
            GROUP_CONCAT(DISTINCT a.artist_name) as artists,
            GROUP_CONCAT(DISTINCT a.id_artist) as artist_ids
        FROM music m
        LEFT JOIN music_artist ma ON m.id_music = ma.id_music
        LEFT JOIN artist a ON ma.id_artist = a.id_artist
        WHERE 
            LOWER(m.title_music) LIKE LOWER(CONCAT('%', ?, '%'))
            OR LOWER(REPLACE(m.title_music, ' ', '')) LIKE LOWER(CONCAT('%', REPLACE(?, ' ', ''), '%'))
        GROUP BY m.id_music
        ORDER BY m.playing DESC, m.title_music ASC
        LIMIT 10
    `;
    
    db.query(sql, [searchTerm, searchTerm], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }
        
        console.log('Find music results:', results.length);
        res.json({ 
            success: true,
            music: results,
            count: results.length,
            search_term: searchTerm
        });
    });
});

// Endpoint untuk mendapatkan artist dari lagu tertentu
router.get('/music/:title/artists', (req, res) => {
    const { title } = req.params;
    
    console.log('Get artists for song:', title);
    
    const sql = `
        SELECT DISTINCT
            a.id_artist,
            a.artist_name,
            a.artist_profile,
            a.artist_bio,
            a.artist_followers
        FROM artist a
        JOIN music_artist ma ON a.id_artist = ma.id_artist
        JOIN music m ON ma.id_music = m.id_music
        WHERE LOWER(m.title_music) LIKE LOWER(CONCAT('%', ?, '%'))
        ORDER BY a.artist_followers DESC
        LIMIT 10
    `;
    
    const searchTerm = title.trim();
    
    db.query(sql, [searchTerm], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        console.log('Artists for song results:', results.length);
        res.json({ 
            success: true,
            artists: results,
            count: results.length,
            song_title: title
        });
    });
});

// Endpoint untuk pencarian umum
router.get('/music/search', (req, res) => {
    const { query, limit = 10 } = req.query;
    
    console.log('Search query received:', query);
    
    if (!query || query.trim() === '') {
        return res.status(400).json({ error: 'Query parameter required' });
    }

    const searchTerm = query.trim();
    
    const sql = `
        SELECT 
            m.id_music, 
            m.title_music, 
            m.audio_file, 
            m.cover_music, 
            m.lyric, 
            m.playing,
            (SELECT GROUP_CONCAT(DISTINCT a2.artist_name) 
             FROM music_artist ma2 
             JOIN artist a2 ON ma2.id_artist = a2.id_artist 
             WHERE ma2.id_music = m.id_music) as artists,
            (SELECT GROUP_CONCAT(DISTINCT a3.id_artist) 
             FROM music_artist ma3 
             JOIN artist a3 ON ma3.id_artist = a3.id_artist 
             WHERE ma3.id_music = m.id_music) as artist_ids
        FROM music m
        WHERE 
            LOWER(m.title_music) LIKE LOWER(CONCAT('%', ?, '%'))
            OR LOWER(m.lyric) LIKE LOWER(CONCAT('%', ?, '%'))
            OR EXISTS (
                SELECT 1 FROM music_artist ma6 
                JOIN artist a6 ON ma6.id_artist = a6.id_artist 
                WHERE ma6.id_music = m.id_music 
                AND LOWER(a6.artist_name) LIKE LOWER(CONCAT('%', ?, '%'))
            )
        ORDER BY m.playing DESC
        LIMIT ?
    `;
    
    db.query(sql, [searchTerm, searchTerm, searchTerm, parseInt(limit)], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }
        
        console.log('Search results:', results.length, 'found');
        res.json({ 
            success: true,
            music: results,
            count: results.length,
            query: query
        });
    });
});

// Endpoint untuk mencari artist
router.get('/artist/search', (req, res) => {
    const { query, limit = 8 } = req.query;
    
    console.log('Artist search query:', query);
    
    if (!query || query.trim() === '') {
        return res.status(400).json({ error: 'Query parameter required' });
    }

    const searchTerm = query.trim();
    
    const sql = `
        SELECT 
            id_artist,
            artist_name,
            artist_profile,
            artist_bio,
            artist_followers
        FROM artist 
        WHERE LOWER(artist_name) LIKE LOWER(CONCAT('%', ?, '%'))
        ORDER BY artist_followers DESC 
        LIMIT ?
    `;
    
    db.query(sql, [searchTerm, parseInt(limit)], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        console.log('Artist search results:', results.length);
        res.json({ 
            success: true,
            artists: results,
            count: results.length,
            query: query
        });
    });
});

// Endpoint untuk mengecek apakah artist ada
router.get('/artist/check', (req, res) => {
    const { artist } = req.query;
    
    console.log('Check artist request:', artist);
    
    if (!artist || artist.trim() === '') {
        return res.status(400).json({ error: 'Artist parameter required' });
    }

    const searchTerm = artist.trim();
    
    const sql = `
        SELECT 
            id_artist,
            artist_name,
            artist_profile,
            artist_bio,
            artist_followers
        FROM artist 
        WHERE LOWER(artist_name) LIKE LOWER(CONCAT('%', ?, '%'))
        ORDER BY artist_followers DESC 
        LIMIT 5
    `;
    
    db.query(sql, [searchTerm], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        console.log('Check artist results:', results.length);
        res.json({ 
            success: true,
            artist: results.length > 0 ? results[0] : null,
            exists: results.length > 0,
            count: results.length,
            all_matches: results
        });
    });
});

// GET /chatbot/music/popular
router.get('/music/popular', (req, res) => {
    let { limit = 10 } = req.query;
    
    // Validasi limit
    limit = parseInt(limit);
    if (isNaN(limit) || limit < 1) limit = 10;
    if (limit > 50) limit = 50; // Batasi maksimal 50 untuk keamanan
    
    const sql = `
        SELECT 
            m.id_music, 
            m.title_music, 
            m.audio_file, 
            m.cover_music, 
            m.lyric, 
            m.playing,
            GROUP_CONCAT(DISTINCT a.artist_name) as artists,
            GROUP_CONCAT(DISTINCT a.id_artist) as artist_ids
        FROM music m
        LEFT JOIN music_artist ma ON m.id_music = ma.id_music
        LEFT JOIN artist a ON ma.id_artist = a.id_artist
        GROUP BY m.id_music
        ORDER BY m.playing DESC, m.title_music ASC 
        LIMIT ?
    `;
    
    db.query(sql, [limit], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        res.json({ 
            success: true,
            music: results,
            count: results.length,
            limit: limit
        });
    });
});

// Endpoint untuk statistik musik
router.get('/music/stats', (req, res) => {
    const sql = `
        SELECT 
            COUNT(*) as total_songs,
            SUM(playing) as total_plays,
            AVG(playing) as avg_plays,
            MAX(playing) as max_plays,
            (SELECT title_music FROM music ORDER BY playing DESC LIMIT 1) as most_played_song,
            (SELECT COUNT(*) FROM artist) as total_artists,
            (SELECT COUNT(*) FROM album) as total_albums
        FROM music
    `;
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        res.json({ 
            success: true,
            stats: results[0]
        });
    });
});



router.get('/music/by-mood', (req, res) => {
    const { mood, limit = 10 } = req.query;
    
    console.log('Music by mood request:', mood);
    
    if (!mood || mood.trim() === '') {
        return res.status(400).json({ error: 'Mood parameter required' });
    }

    const searchTerm = mood.trim().toLowerCase();
    
    // Mapping mood ke genre yang sesuai
    const moodToGenres = {
        'santai': ['Acoustic', 'Ambient', 'Lofi', 'Smooth Jazz', 'Meditation Music'],
        'workout': ['Dance', 'EDM', 'House', 'Techno & Trance', 'Rock'],
        'belajar': ['Lofi', 'Classical Piano', 'Ambient', 'Instrumental', 'Acoustic'],
        'senang': ['Pop', 'Upbeat', 'Dance', 'Funk', 'Disco'],
        'sedih': ['Acoustic', 'Solo Piano', 'Ambient', 'Slow', 'Emotional'],
        'romantis': ['Acoustic', 'Smooth Jazz', 'R&B', 'Pop', 'Solo Piano'],
        'energik': ['Rock', 'EDM', 'Dance', 'Techno & Trance', 'Upbeat'],
        'fokus': ['Lofi', 'Classical Piano', 'Ambient', 'Instrumental', 'Meditation Music'],
        'tidur': ['Ambient', 'Lullabies', 'Meditation Music', 'Slow', 'Acoustic']
    };
    
    // Cari genre yang sesuai dengan mood
    let targetGenres = [];
    
    // Cek exact match
    if (moodToGenres[searchTerm]) {
        targetGenres = moodToGenres[searchTerm];
    } else {
        // Cek partial match
        for (const [moodKey, genres] of Object.entries(moodToGenres)) {
            if (searchTerm.includes(moodKey) || moodKey.includes(searchTerm)) {
                targetGenres = [...targetGenres, ...genres];
            }
        }
        
        // Jika masih kosong, gunakan beberapa genre umum
        if (targetGenres.length === 0) {
            targetGenres = ['Pop', 'Acoustic', 'Ambient', 'Instrumental', 'Lofi'];
        }
    }
    
    // Hapus duplikat
    targetGenres = [...new Set(targetGenres)];
    
    console.log(`Mood "${searchTerm}" maps to genres:`, targetGenres);
    
    const sql = `
        SELECT 
            m.id_music, 
            m.title_music, 
            m.audio_file, 
            m.cover_music, 
            m.lyric, 
            m.playing,
            GROUP_CONCAT(DISTINCT a.artist_name) as artists,
            GROUP_CONCAT(DISTINCT g.genre_name) as genres
        FROM music m
        LEFT JOIN music_artist ma ON m.id_music = ma.id_music
        LEFT JOIN artist a ON ma.id_artist = a.id_artist
        LEFT JOIN music_genre mg ON m.id_music = mg.id_music
        LEFT JOIN genre g ON mg.id_genre = g.id_genre
        WHERE g.genre_name IN (${targetGenres.map(() => '?').join(',')})
        GROUP BY m.id_music, m.title_music, m.audio_file, m.cover_music, m.lyric, m.playing
        ORDER BY m.playing DESC
        LIMIT ?
    `;
    
    db.query(sql, [...targetGenres, parseInt(limit)], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }
        
        console.log('Music by mood results:', results.length);
        res.json({ 
            success: true,
            music: results,
            count: results.length,
            mood: mood,
            matched_genres: targetGenres
        });
    });
});


module.exports = router;