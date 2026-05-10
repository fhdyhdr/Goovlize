const express = require('express');
const router = express.Router();
const { db } = require('../db');

// Middleware untuk cek login
const requireAuth = (req, res, next) => {
    if (!req.session.user_id) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
};

// Endpoint untuk mendapatkan info user yang login
router.get('/user-info', requireAuth, (req, res) => {
    const userId = req.session.user_id;
    
    const sql = `
        SELECT 
            id_user,
            name_user,
            email_user,
            user_followers,
            profile_user,
            created_at
        FROM users 
        WHERE id_user = ?
    `;
    
    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ 
            success: true,
            user: results[0]
        });
    });
});

// Endpoint untuk mendapatkan lagu favorit user
router.get('/favorite-music', requireAuth, (req, res) => {
    const userId = req.session.user_id;
    let { limit = 10 } = req.query;
    
    // Jika limit sangat besar, anggap sebagai "semua"
    if (limit > 1000) {
        limit = 10000; // Batas maksimal untuk "semua"
    }
    
    // Query untuk menghitung total lagu favorit
    const countSql = `SELECT COUNT(*) as total FROM music_fav WHERE id_user = ?`;
    
    db.query(countSql, [userId], (countErr, countResults) => {
        if (countErr) {
            console.error('Count error:', countErr);
            return res.status(500).json({ error: 'Database error' });
        }
        
        const totalCount = countResults[0].total;
        
        const sql = `
            SELECT 
                m.id_music, 
                m.title_music, 
                m.audio_file, 
                m.cover_music, 
                m.lyric, 
                m.playing,
                mf.created_at as favorited_at,
                GROUP_CONCAT(DISTINCT a.artist_name) as artists,
                GROUP_CONCAT(DISTINCT a.id_artist) as artist_ids
            FROM music_fav mf
            JOIN music m ON mf.id_music = m.id_music
            LEFT JOIN music_artist ma ON m.id_music = ma.id_music
            LEFT JOIN artist a ON ma.id_artist = a.id_artist
            WHERE mf.id_user = ?
            GROUP BY m.id_music, mf.created_at
            ORDER BY mf.created_at DESC
            LIMIT ?
        `;
        
        db.query(sql, [userId, parseInt(limit)], (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            console.log(`Favorite music results: ${results.length} of ${totalCount} total`);
            res.json({ 
                success: true,
                favorite_music: results,
                count: totalCount, // Total keseluruhan
                returned_count: results.length // Yang dikembalikan sekarang
            });
        });
    });
});
// Endpoint untuk mendapatkan rekomendasi personal berdasarkan riwayat aktivitas
router.get('/personalized-recommendations', requireAuth, (req, res) => {
    const userId = req.session.user_id;
    const { limit = 8, type = 'music' } = req.query;
    
    if (type === 'music') {
        getPersonalizedMusicRecommendations(userId, limit, res);
    } else if (type === 'playlist') {
        getPersonalizedPlaylistRecommendations(userId, limit, res);
    } else {
        res.status(400).json({ error: 'Invalid type parameter' });
    }
});

const getPersonalizedMusicRecommendations = (userId, limit, res) => {
    // 1. Ambil genre dari lagu yang baru diputar
    const recentGenresSql = `
        SELECT 
            g.id_genre,
            g.genre_name,
            COUNT(ra.id_music) as play_count
        FROM recent_activity ra
        JOIN music_genre mg ON ra.id_music = mg.id_music
        JOIN genre g ON mg.id_genre = g.id_genre
        WHERE ra.id_user = ? 
        AND ra.played_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY g.id_genre, g.genre_name
        ORDER BY play_count DESC
        LIMIT 8
    `;
    
    // 2. Ambil lagu yang baru diputar untuk referensi
    const recentMusicSql = `
        SELECT 
            m.id_music,
            m.title_music,
            GROUP_CONCAT(DISTINCT g.genre_name) as recent_genres
        FROM recent_activity ra
        JOIN music m ON ra.id_music = m.id_music
        LEFT JOIN music_genre mg ON m.id_music = mg.id_music
        LEFT JOIN genre g ON mg.id_genre = g.id_genre
        WHERE ra.id_user = ? 
        AND ra.played_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY m.id_music, m.title_music
        ORDER BY ra.played_at DESC
        LIMIT 10
    `;
    
    db.query(recentGenresSql, [userId], (err, genreResults) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        db.query(recentMusicSql, [userId], (err, recentMusicResults) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            const favoriteGenres = genreResults.map(g => g.genre_name);
            const favoriteGenreIds = genreResults.map(g => g.id_genre);
            
            console.log('Favorite genres from recent activity:', favoriteGenres);
            console.log('Recent music:', recentMusicResults.length, 'songs');
            
            // Jika tidak ada genre favorit, coba ambil genre dari lagu yang baru diputar
            if (favoriteGenres.length === 0 && recentMusicResults.length > 0) {
                // Extract genre dari lagu terbaru
                const recentGenres = [];
                recentMusicResults.forEach(song => {
                    if (song.recent_genres) {
                        const genres = song.recent_genres.split(',');
                        genres.forEach(genre => {
                            if (genre.trim() && !recentGenres.includes(genre.trim())) {
                                recentGenres.push(genre.trim());
                            }
                        });
                    }
                });
                
                if (recentGenres.length > 0) {
                    favoriteGenres.push(...recentGenres.slice(0, 5));
                    console.log('Extracted genres from recent music:', favoriteGenres);
                }
            }
            
            // Jika masih tidak ada genre, gunakan genre populer
            if (favoriteGenres.length === 0) {
                console.log('No favorite genres found, using popular genres');
                const popularGenresSql = `
                    SELECT g.genre_name
                    FROM music_genre mg
                    JOIN genre g ON mg.id_genre = g.id_genre
                    JOIN music m ON mg.id_music = m.id_music
                    GROUP BY g.genre_name
                    ORDER BY COUNT(mg.id_music) DESC
                    LIMIT 5
                `;
                
                db.query(popularGenresSql, (err, popularGenreResults) => {
                    if (err) {
                        console.error('Database error:', err);
                        return res.status(500).json({ error: 'Database error' });
                    }
                    
                    favoriteGenres.push(...popularGenreResults.map(g => g.genre_name));
                    console.log('Using popular genres:', favoriteGenres);
                    getRecommendationsByGenres(favoriteGenres, userId, limit, res);
                });
            } else {
                getRecommendationsByGenres(favoriteGenres, userId, limit, res);
            }
        });
    });
};


// Helper function untuk mendapatkan rekomendasi berdasarkan genre
const getRecommendationsByGenres = (favoriteGenres, userId, limit, res) => {
    console.log(`Getting recommendations for genres: ${favoriteGenres.join(', ')}`);
    
    // Pertama, cari lagu dengan genre yang sama TAPI belum pernah diputar
    const sql1 = `
        SELECT DISTINCT
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
        WHERE g.genre_name IN (${favoriteGenres.map(() => '?').join(',')})
        AND m.id_music NOT IN (
            SELECT DISTINCT id_music FROM recent_activity 
            WHERE id_user = ?
        )
        GROUP BY m.id_music, m.title_music, m.audio_file, m.cover_music, m.lyric, m.playing
        ORDER BY m.playing DESC
        LIMIT ?
    `;
    
    const params1 = [...favoriteGenres, userId, parseInt(limit)];
    
    db.query(sql1, params1, (err, results1) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        console.log(`Found ${results1.length} songs with favorite genres (not played before)`);
        
        // Jika masih kurang dari limit, tambahkan lagu populer dengan genre yang sama
        if (results1.length < limit) {
            const remaining = limit - results1.length;
            
            const sql2 = `
                SELECT DISTINCT
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
                WHERE g.genre_name IN (${favoriteGenres.map(() => '?').join(',')})
                GROUP BY m.id_music, m.title_music, m.audio_file, m.cover_music, m.lyric, m.playing
                ORDER BY m.playing DESC
                LIMIT ?
            `;
            
            const params2 = [...favoriteGenres, remaining];
            
            db.query(sql2, params2, (err, results2) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Database error' });
                }
                
                console.log(`Adding ${results2.length} popular songs with same genres`);
                
                // Gabungkan hasil, hindari duplikat
                const combinedResults = [...results1];
                const existingIds = new Set(results1.map(r => r.id_music));
                
                for (const song of results2) {
                    if (!existingIds.has(song.id_music)) {
                        combinedResults.push(song);
                        existingIds.add(song.id_music);
                    }
                    if (combinedResults.length >= limit) break;
                }
                
                res.json({ 
                    success: true,
                    recommendations: combinedResults.slice(0, limit),
                    count: combinedResults.length,
                    based_on: {
                        genres: favoriteGenres,
                        source: 'personalized_with_fallback'
                    }
                });
            });
        } else {
            res.json({ 
                success: true,
                recommendations: results1,
                count: results1.length,
                based_on: {
                    genres: favoriteGenres,
                    source: 'personalized'
                }
            });
        }
    });
};


// Fungsi untuk rekomendasi playlist personal - HANYA YANG BELUM PERNAH DIPUTAR & HAPUS DUPLIKAT
const getPersonalizedPlaylistRecommendations = (userId, limit, res) => {
    const genreSql = `
        SELECT 
            g.id_genre,
            g.genre_name,
            COUNT(ra.id_music) as play_count
        FROM recent_activity ra
        JOIN music_genre mg ON ra.id_music = mg.id_music
        JOIN genre g ON mg.id_genre = g.id_genre
        WHERE ra.id_user = ? 
        AND ra.played_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY g.id_genre, g.genre_name
        ORDER BY play_count DESC
        LIMIT 5
    `;
    
    db.query(genreSql, [userId], (err, genreResults) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        const favoriteGenres = genreResults.map(g => g.genre_name);
        const favoriteGenreIds = genreResults.map(g => g.id_genre);
        
        console.log('Favorite genres for playlist:', favoriteGenres);
        
        if (favoriteGenres.length === 0) {
            getFallbackPlaylistRecommendations(limit, res);
            return;
        }
        
        // REKOMENDASI HANYA PLAYLIST YANG BELUM PERNAH DIPUTAR USER
        const playlistSql = `
            SELECT DISTINCT
                p.id_playlist,
                p.playlist_name,
                p.playlist_tipe,
                p.playlist_cover,
                COUNT(DISTINCT mp.id_music) as total_songs,
                COUNT(DISTINCT CASE WHEN g.id_genre IN (${favoriteGenreIds.map(() => '?').join(',')}) THEN mp.id_music END) as matching_songs
            FROM playlist p
            JOIN music_playlist mp ON p.id_playlist = mp.id_playlist
            JOIN music_genre mg ON mp.id_music = mg.id_music
            JOIN genre g ON mg.id_genre = g.id_genre
            WHERE p.id_playlist NOT IN (
                SELECT DISTINCT item_id FROM recent_activity 
                WHERE id_user = ? AND item_type = 'playlist'
            )
            AND p.playlist_tipe != 'custom'
            GROUP BY 
                p.id_playlist, 
                p.playlist_name, 
                p.playlist_tipe, 
                p.playlist_cover
            HAVING matching_songs > 0
            ORDER BY 
                (matching_songs * 1.0 / total_songs) DESC,
                total_songs DESC
            LIMIT ?
        `;
        
        const params = [...favoriteGenreIds, userId, parseInt(limit)];
        
        db.query(playlistSql, params, (err, playlistResults) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            console.log(`🎵 Found ${playlistResults.length} personalized playlists`);
            
            if (playlistResults.length < limit) {
                const remaining = limit - playlistResults.length;
                getFallbackPlaylistRecommendations(remaining, res, playlistResults);
            } else {
                res.json({ 
                    success: true,
                    recommendations: playlistResults,
                    count: playlistResults.length,
                    based_on: {
                        genres: favoriteGenres
                    }
                });
            }
        });
    });
};


const getFallbackMusicRecommendations = (limit, res, existingResults = [], userId = null) => {
    let fallbackSql = `
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
    `;
    
    const params = [];
    
    // Filter out songs already in existingResults
    if (existingResults.length > 0) {
        const existingIds = existingResults.map(r => r.id_music);
        fallbackSql += ` WHERE m.id_music NOT IN (${existingIds.map(() => '?').join(',')})`;
        params.push(...existingIds);
    }
    
    // Filter out songs already played by user
    if (userId) {
        if (existingResults.length > 0) {
            fallbackSql += ` AND m.id_music NOT IN (SELECT DISTINCT id_music FROM recent_activity WHERE id_user = ?)`;
        } else {
            fallbackSql += ` WHERE m.id_music NOT IN (SELECT DISTINCT id_music FROM recent_activity WHERE id_user = ?)`;
        }
        params.push(userId);
    }
    
    fallbackSql += `
        GROUP BY m.id_music, m.title_music, m.audio_file, m.cover_music, m.lyric, m.playing
        ORDER BY m.playing DESC
        LIMIT ?
    `;
    
    params.push(parseInt(limit));
    
    db.query(fallbackSql, params, (err, fallbackResults) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        const allResults = [...existingResults, ...fallbackResults].slice(0, limit);
        
        console.log(`Fallback added ${fallbackResults.length} songs, total: ${allResults.length}`);
        
        res.json({ 
            success: true,
            recommendations: allResults,
            count: allResults.length,
            based_on: 'popular'
        });
    });
};



// Fallback rekomendasi playlist (populer) - BERDASARKAN PLAYING COUNT
const getFallbackPlaylistRecommendations = (limit, res, existingResults = []) => {
    const fallbackSql = `
        SELECT 
            p.id_playlist,
            p.playlist_name,
            p.playlist_tipe,
            p.playlist_cover,
            p.playing as play_count,
            COUNT(mp.id_music) as total_songs
        FROM playlist p
        JOIN music_playlist mp ON p.id_playlist = mp.id_playlist
        WHERE p.playlist_tipe != 'custom'
        GROUP BY 
            p.id_playlist, 
            p.playlist_name, 
            p.playlist_tipe, 
            p.playlist_cover,
            p.playing
        ORDER BY p.playing DESC, total_songs DESC
        LIMIT ?
    `;
    
    db.query(fallbackSql, [parseInt(limit)], (err, fallbackResults) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        const allResults = [...existingResults, ...fallbackResults].slice(0, limit);
        
        res.json({ 
            success: true,
            recommendations: allResults,
            count: allResults.length,
            based_on: 'popular'
        });
    });
};

// Endpoint untuk playlist populer BERDASARKAN PLAYING COUNT - FIXED
router.get('/playlists/popular', (req, res) => {
    const { limit = 5 } = req.query;
    
    const sql = `
        SELECT 
            p.id_playlist,
            p.playlist_name,
            p.playlist_tipe,
            p.playlist_cover,
            p.playing,
            COUNT(DISTINCT mp.id_music) as total_songs
        FROM playlist p
        LEFT JOIN music_playlist mp ON p.id_playlist = mp.id_playlist
        WHERE p.playlist_tipe != 'custom'
        GROUP BY 
            p.id_playlist, 
            p.playlist_name, 
            p.playlist_tipe, 
            p.playlist_cover,
            p.playing
        HAVING total_songs > 0  -- Pastikan playlist punya lagu
        ORDER BY p.playing DESC, p.id_playlist ASC
        LIMIT ?
    `;
    
    db.query(sql, [parseInt(limit)], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        console.log('Popular playlists results:', results.length);
        
        res.json({ 
            success: true,
            playlists: results,
            count: results.length
        });
    });
});

router.get('/listening-history', requireAuth, (req, res) => {
    const userId = req.session.user_id;
    const { limit = 10 } = req.query;
    
    // Jika ada tabel listening_history
    const sql = `
        SELECT 
            m.id_music, 
            m.title_music, 
            m.audio_file, 
            m.cover_music,
            lh.played_at,
            GROUP_CONCAT(DISTINCT a.artist_name) as artists
        FROM listening_history lh
        JOIN music m ON lh.id_music = m.id_music
        LEFT JOIN music_artist ma ON m.id_music = ma.id_music
        LEFT JOIN artist a ON ma.id_artist = a.id_artist
        WHERE lh.id_user = ?
        GROUP BY m.id_music, lh.played_at
        ORDER BY lh.played_at DESC
        LIMIT ?
    `;
    
    db.query(sql, [userId, parseInt(limit)], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        res.json({ 
            success: true,
            history: results,
            count: results.length
        });
    });
});




// GET /personalization/followed-artists
router.get('/followed-artists', requireAuth, (req, res) => {
    const userId = req.session.user_id;
    const { limit = 10 } = req.query;
    
    const sql = `
        SELECT 
            a.id_artist_auto,
            a.id_artist,
            a.artist_name,
            a.artist_bio,
            a.artist_followers,
            af.created_at as followed_at
        FROM artist_follow af
        JOIN artist a ON af.id_artist = a.id_artist
        WHERE af.id_user = ?
        ORDER BY af.created_at DESC
        LIMIT ?
    `;
    
    db.query(sql, [userId, parseInt(limit)], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }
        
        console.log('Followed artists results:', results.length);
        res.json({ 
            success: true,
            followed_artists: results,
            count: results.length
        });
    });
});




// Endpoint untuk mengecek apakah user follow artist tertentu - SIMPLIFIED
router.get('/check-follow-artist/:artistId', requireAuth, (req, res) => {
    const userId = req.session.user_id;
    const { artistId } = req.params;
    
    const sql = `
        SELECT 
            af.id_af,
            af.created_at
        FROM artist_follow af
        WHERE af.id_user = ? AND af.id_artist = ?
    `;
    
    db.query(sql, [userId, artistId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }
        
        res.json({ 
            success: true,
            is_following: results.length > 0,
            follow_data: results.length > 0 ? results[0] : null
        });
    });
});


// GET /personalization/saved-playlists
router.get('/saved-playlists', requireAuth, (req, res) => {
    const userId = req.session.user_id;
    const { limit = 10 } = req.query;
    
    // Query untuk playlist reguler (id_playlist adalah integer)
    const regularPlaylistsSql = `
        SELECT 
            p.id_playlist,
            p.playlist_name,
            p.playlist_tipe,
            pf.created_at as saved_at,
            'regular' as playlist_type,
            NULL as creator_name
        FROM playlist_fav pf
        JOIN playlist p ON pf.id_playlist = p.id_playlist
        WHERE pf.id_user = ? 
        AND pf.id_playlist REGEXP '^[0-9]+$'  -- Hanya yang id_playlist berupa angka (playlist reguler)
    `;
    
    // Query untuk custom playlist (id_playlist adalah varchar yang merujuk ke id_cus)
    const customPlaylistsSql = `
        SELECT 
            cp.id_cus as id_playlist,
            cp.playlist_name,
            'custom' as playlist_tipe,
            pf.created_at as saved_at,
            CASE 
                WHEN cp.id_user = ? THEN 'custom_mine'
                ELSE 'custom_others'
            END as playlist_type,
            CASE 
                WHEN cp.id_user = ? THEN NULL 
                ELSE u.name_user 
            END as creator_name
        FROM playlist_fav pf
        JOIN custom_playlist cp ON pf.id_playlist = cp.id_cus
        LEFT JOIN users u ON cp.id_user = u.id_user
        WHERE pf.id_user = ? 
        AND pf.id_playlist NOT REGEXP '^[0-9]+$'  -- Hanya yang id_playlist bukan angka (custom playlist)
    `;
    
    // Eksekusi kedua query
    db.query(regularPlaylistsSql, [userId], (err1, regularResults) => {
        if (err1) {
            console.error('Database error for regular playlists:', err1);
            return res.status(500).json({ error: 'Database error: ' + err1.message });
        }
        
        console.log('Regular playlists found:', regularResults.length);
        
        db.query(customPlaylistsSql, [userId, userId, userId], (err2, customResults) => {
            if (err2) {
                console.error('Database error for custom playlists:', err2);
                return res.status(500).json({ error: 'Database error: ' + err2.message });
            }
            
            console.log('Custom playlists found:', customResults.length);
            
            // Pisahkan custom playlist milik sendiri dan milik orang lain
            const myCustomPlaylists = customResults.filter(p => p.playlist_type === 'custom_mine');
            const othersCustomPlaylists = customResults.filter(p => p.playlist_type === 'custom_others');
            
            // Gabungkan semua hasil
            const allPlaylists = [
                ...regularResults,
                ...customResults
            ];
            
            // Urutkan berdasarkan tanggal
            const sortedPlaylists = allPlaylists.sort((a, b) => 
                new Date(b.saved_at) - new Date(a.saved_at)
            ).slice(0, limit);
            
            console.log('Saved playlists results:', {
                regular: regularResults.length,
                custom_mine: myCustomPlaylists.length,
                custom_others: othersCustomPlaylists.length,
                total: allPlaylists.length
            });
            
            res.json({ 
                success: true,
                playlists: sortedPlaylists,
                counts: {
                    regular_playlists: regularResults.length,
                    custom_playlists_mine: myCustomPlaylists.length,
                    custom_playlists_others: othersCustomPlaylists.length,
                    total: allPlaylists.length
                }
            });
        });
    });
});


// Endpoint untuk mendapatkan detail playlist beserta lagu-lagunya
router.get('/playlist-detail/:playlistId', requireAuth, (req, res) => {
    const userId = req.session.user_id;
    const { playlistId } = req.params;
    const { limit = 15 } = req.query;
    
    // Cek apakah user menyimpan playlist ini
    const checkSql = `
        SELECT 1 FROM playlist_fav 
        WHERE id_user = ? AND id_playlist = ?
    `;
    
    db.query(checkSql, [userId, playlistId], (err, checkResults) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (checkResults.length === 0) {
            return res.status(403).json({ error: 'Playlist not saved by user' });
        }
        
        // Ambil detail playlist dan lagu-lagunya
        const detailSql = `
            SELECT 
                p.id_playlist,
                p.playlist_name,
                p.playlist_tipe,
                m.id_music,
                m.title_music,
                m.audio_file,
                m.cover_music,
                m.playing,
                GROUP_CONCAT(DISTINCT a.artist_name) as artists
            FROM playlist p
            LEFT JOIN music_playlist mp ON p.id_playlist = mp.id_playlist
            LEFT JOIN music m ON mp.id_music = m.id_music
            LEFT JOIN music_artist ma ON m.id_music = ma.id_music
            LEFT JOIN artist a ON ma.id_artist = a.id_artist
            WHERE p.id_playlist = ?
            GROUP BY p.id_playlist, p.playlist_name, p.playlist_tipe, m.id_music, m.title_music, m.audio_file, m.cover_music, m.playing
            ORDER BY m.playing DESC
            LIMIT ?
        `;
        
        db.query(detailSql, [playlistId, parseInt(limit)], (err, detailResults) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            // Format hasil
            const playlistInfo = {
                id_playlist: detailResults[0]?.id_playlist,
                playlist_name: detailResults[0]?.playlist_name,
                playlist_tipe: detailResults[0]?.playlist_tipe,
                total_songs: detailResults.length,
                songs: detailResults.map(song => ({
                    id_music: song.id_music,
                    title_music: song.title_music,
                    audio_file: song.audio_file,
                    cover_music: song.cover_music,
                    playing: song.playing,
                    artists: song.artists ? song.artists.split(',') : []
                }))
            };
            
            res.json({ 
                success: true,
                playlist: playlistInfo
            });
        });
    });
});


// Endpoint untuk mendapatkan info kapan user menyimpan playlist tertentu
router.get('/playlist-save-info/:playlistName', requireAuth, (req, res) => {
    const userId = req.session.user_id;
    const { playlistName } = req.params;
    
    const sql = `
        SELECT 
            p.id_playlist,
            p.playlist_name,
            p.playlist_tipe,
            pf.created_at as saved_at,
            DATEDIFF(NOW(), pf.created_at) as days_since_saved
        FROM playlist_fav pf
        JOIN playlist p ON pf.id_playlist = p.id_playlist
        WHERE pf.id_user = ? 
        AND LOWER(p.playlist_name) LIKE LOWER(CONCAT('%', ?, '%'))
        ORDER BY pf.created_at DESC
        LIMIT 1
    `;
    
    db.query(sql, [userId, playlistName], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Playlist not found in your saved playlists'
            });
        }
        
        console.log('Playlist save info results:', results[0]);
        res.json({ 
            success: true,
            playlist_info: results[0]
        });
    });
});



// GET /personalization/custom-playlists
router.get('/custom-playlists', requireAuth, (req, res) => {
    const userId = req.session.user_id;
    const { limit = 10 } = req.query;
    
    const sql = `
        SELECT 
            cp.id_auto,
            cp.id_cus,
            cp.playlist_name,
            cp.description,
            cp.created_at,
            COUNT(mc.id_ms) as total_songs
        FROM custom_playlist cp
        LEFT JOIN music_cus mc ON cp.id_cus = mc.id_cus
        WHERE cp.id_user = ?
        GROUP BY cp.id_auto, cp.id_cus, cp.playlist_name, cp.description, cp.created_at
        ORDER BY cp.created_at DESC
        LIMIT ?
    `;
    
    db.query(sql, [userId, parseInt(limit)], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }
        
        res.json({ 
            success: true,
            playlists: results,
            count: results.length
        });
    });
});



// GET /personalization/find-custom-playlist
router.get('/find-custom-playlist', requireAuth, (req, res) => {
    const userId = req.session.user_id;
    const { name } = req.query;
    
    const sql = `
        SELECT 
            cp.id_auto,
            cp.id_cus,
            cp.playlist_name,
            cp.description,
            cp.created_at
        FROM custom_playlist cp
        WHERE cp.id_user = ? AND cp.playlist_name LIKE ?
        LIMIT 1
    `;
    
    db.query(sql, [userId, `%${name}%`], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }
        
        if (results.length > 0) {
            res.json({ 
                success: true,
                playlist: results[0]
            });
        } else {
            res.json({ 
                success: false,
                playlist: null,
                message: 'Playlist not found'
            });
        }
    });
});


// GET /personalization/custom-playlist-detail/:playlistId
router.get('/custom-playlist-detail/:playlistId', requireAuth, (req, res) => {
    const userId = req.session.user_id;
    const { playlistId } = req.params;
    const { limit = 15 } = req.query;
    
    // First verify the playlist belongs to the user
    const verifySql = `
        SELECT id_cus, playlist_name, description, created_at 
        FROM custom_playlist 
        WHERE id_cus = ? AND id_user = ?
    `;
    
    db.query(verifySql, [playlistId, userId], (err, verifyResults) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }
        
        if (verifyResults.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Playlist not found or access denied' 
            });
        }
        
        const playlistInfo = verifyResults[0];
        
        // Get songs in the playlist dengan JOIN ke tabel artist
        const songsSql = `
            SELECT 
                m.id_music,
                m.title_music,
                m.playing,
                GROUP_CONCAT(DISTINCT a.artist_name SEPARATOR ', ') as artists,
                mc.created_at as added_at
            FROM music_cus mc
            JOIN music m ON mc.id_music = m.id_music
            LEFT JOIN music_artist ma ON m.id_music = ma.id_music
            LEFT JOIN artist a ON ma.id_artist = a.id_artist
            WHERE mc.id_cus = ?
            GROUP BY m.id_music, m.title_music, m.playing, mc.created_at
            ORDER BY mc.created_at ASC
            LIMIT ?
        `;
        
        db.query(songsSql, [playlistId, parseInt(limit)], (err, songsResults) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error: ' + err.message });
            }
            
            // Format artists from string to array
            const formattedSongs = songsResults.map(song => ({
                id_music: song.id_music,
                title_music: song.title_music,
                genre: song.genre,
                playing: song.playing,
                added_at: song.added_at,
                artists: song.artists ? song.artists.split(',').map(a => a.trim()) : []
            }));
            
            res.json({ 
                success: true,
                playlist: {
                    ...playlistInfo,
                    songs: formattedSongs,
                    total_songs: formattedSongs.length
                }
            });
        });
    });
});

// Endpoint untuk mengecek riwayat aktivitas user
router.get('/activity-check', requireAuth, (req, res) => {
    const userId = req.session.user_id;
    
    const activitySql = `
        SELECT COUNT(*) as activity_count
        FROM recent_activity 
        WHERE id_user = ? 
        AND played_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `;
    
    const genreSql = `
        SELECT 
            g.genre_name,
            COUNT(ra.id_music) as play_count
        FROM recent_activity ra
        JOIN music_genre mg ON ra.id_music = mg.id_music
        JOIN genre g ON mg.id_genre = g.id_genre
        WHERE ra.id_user = ? 
        AND ra.played_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY g.genre_name
        HAVING play_count >= 3
        ORDER BY play_count DESC
        LIMIT 5
    `;
    
    const artistSql = `
        SELECT 
            a.artist_name,
            COUNT(ra.id_music) as play_count
        FROM recent_activity ra
        JOIN music_artist ma ON ra.id_music = ma.id_music
        JOIN artist a ON ma.id_artist = a.id_artist
        WHERE ra.id_user = ? 
        AND ra.played_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY a.artist_name
        HAVING play_count >= 2
        ORDER BY play_count DESC
        LIMIT 5
    `;
    
    db.query(activitySql, [userId], (err, activityResults) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        const activityCount = activityResults[0]?.activity_count || 0;
        const hasSufficientActivity = activityCount >= 10;
        
        if (!hasSufficientActivity) {
            return res.json({
                success: true,
                has_sufficient_activity: false,
                activity_count: activityCount,
                message: 'Insufficient activity data for personalized recommendations'
            });
        }
        
        db.query(genreSql, [userId], (err, genreResults) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            db.query(artistSql, [userId], (err, artistResults) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Database error' });
                }
                
                res.json({
                    success: true,
                    has_sufficient_activity: true,
                    activity_count: activityCount,
                    recent_genres: genreResults.map(g => g.genre_name),
                    recent_artists: artistResults.map(a => a.artist_name),
                    message: 'Sufficient activity data for personalized recommendations'
                });
            });
        });
    });
});

// Endpoint untuk mendapatkan recent activity
router.get('/recent-activity', requireAuth, (req, res) => {
    const userId = req.session.user_id;
    const { limit = 10 } = req.query;

    const sql = `
        SELECT 
            ra.item_type,
            ra.item_id,
            ra.id_music,
            ra.played_at,
            m.title_music,
            m.playing,
            GROUP_CONCAT(DISTINCT a.artist_name) as artists
        FROM recent_activity ra
        LEFT JOIN music m ON ra.id_music = m.id_music
        LEFT JOIN music_artist ma ON m.id_music = ma.id_music
        LEFT JOIN artist a ON ma.id_artist = a.id_artist
        WHERE ra.id_user = ?
        GROUP BY ra.item_type, ra.item_id, ra.id_music, ra.played_at, m.title_music, m.playing
        ORDER BY ra.played_at DESC
        LIMIT ?
    `;

    db.query(sql, [userId, parseInt(limit)], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        console.log('Recent activity results:', results.length);
        
        // Format results untuk grouping by item
        const formattedActivities = results.map(activity => ({
            id_activity: activity.id_activity,
            item_type: activity.item_type,
            item_id: activity.item_id,
            id_music: activity.id_music,
            played_at: activity.played_at,
            music_title: activity.title_music,
            artists: activity.artists ? activity.artists.split(',') : [],
            playing_count: activity.playing
        }));

        res.json({ 
            success: true,
            activities: formattedActivities,
            count: results.length
        });
    });
});

// Endpoint untuk mendapatkan detail item activity
router.get('/activity-item-details', requireAuth, (req, res) => {
    const { item_type, item_id, music_id } = req.query;

    let sql = '';
    let params = [];

    switch (item_type) {
        case 'playlist':
        case 'custom_playlist':
            sql = `
                SELECT 
                    p.id_playlist as id,
                    p.playlist_name as name,
                    p.playlist_tipe as type,
                    p.playlist_cover as cover,
                    COUNT(pm.id_music) as total_songs
                FROM playlist p
                LEFT JOIN music_playlist pm ON p.id_playlist = pm.id_playlist
                WHERE p.id_playlist = ?
                GROUP BY p.id_playlist, p.playlist_name, p.playlist_tipe, p.playlist_cover
            `;
            params = [item_id];
            break;

        case 'artist':
            sql = `
                SELECT 
                    id_artist as id,
                    artist_name as name,
                    artist_followers as followers,
                    artist_profile as cover
                FROM artist 
                WHERE id_artist = ?
            `;
            params = [item_id];
            break;

        case 'album':
            sql = `
                SELECT 
                    id_al as id,
                    album_name as name,
                    album_cover as cover,
                    created_at
                FROM album 
                WHERE id_al = ?
            `;
            params = [item_id];
            break;

        case 'search':
            // Untuk search, kita tidak punya item_id spesifik
            // Return info tentang musik yang diputar jika ada
            if (music_id) {
                sql = `
                    SELECT 
                        m.id_music as id,
                        m.title_music as name,
                        m.cover_music as cover,
                        GROUP_CONCAT(DISTINCT a.artist_name) as artists
                    FROM music m
                    LEFT JOIN music_artist ma ON m.id_music = ma.id_music
                    LEFT JOIN artist a ON ma.id_artist = a.id_artist
                    WHERE m.id_music = ?
                    GROUP BY m.id_music, m.title_music, m.cover_music
                `;
                params = [music_id];
            } else {
                return res.json({ 
                    success: true, 
                    item_details: { 
                        type: 'search',
                        name: 'Pencarian',
                        description: 'Aktivitas pencarian'
                    } 
                });
            }
            break;

        default:
            return res.status(400).json({ error: 'Invalid item type' });
    }

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (results.length > 0) {
            const item = results[0];
            res.json({ 
                success: true, 
                item_details: {
                    ...item,
                    type: item_type
                }
            });
        } else {
            res.json({ 
                success: true, 
                item_details: null 
            });
        }
    });
});
module.exports = router;