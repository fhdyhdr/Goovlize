const express = require('express');
const router = express.Router();
const { isAdminAuthenticated } = require('../../middleware/admin-auth');
const { db } = require('../../db');

router.get('/admin/dashboard', isAdminAuthenticated, async (req, res) => {
    try {
        console.log('Loading dashboard data...');
        
        // Inisialisasi data awal
        let dashboardData = {
            stats: {
                totalMusic: 0,
                totalArtists: 0,
                totalAlbums: 0,
                totalPlaylists: 0,
                totalUsers: 0,
                totalPlays: 0
            },
            recentUploads: [],
            recentActivity: [],
            popularGenres: [],
            topMusic: [],
            genreDistribution: []
        };
        
        // Function untuk execute query dengan promise
        function executeQuery(sql, params = []) {
            return new Promise((resolve, reject) => {
                db.query(sql, params, (error, results) => {
                    if (error) {
                        console.error('Query error:', error);
                        resolve([]);
                    } else {
                        resolve(results);
                    }
                });
            });
        }
        
        // 1. Total Music
        try {
            const musicResult = await executeQuery('SELECT COUNT(*) as total FROM music');
            dashboardData.stats.totalMusic = musicResult[0]?.total || 0;
        } catch (err) {
            console.log('Music count error:', err.message);
        }
        
        // 2. Total Artists
        try {
            const artistsResult = await executeQuery('SELECT COUNT(*) as total FROM artist');
            dashboardData.stats.totalArtists = artistsResult[0]?.total || 0;
        } catch (err) {
            console.log('Artists count error:', err.message);
        }
        
        // 3. Total Albums
        try {
            const albumsResult = await executeQuery('SELECT COUNT(*) as total FROM album');
            dashboardData.stats.totalAlbums = albumsResult[0]?.total || 0;
        } catch (err) {
            console.log('Albums count error:', err.message);
        }
        
        // 4. Total Playlists
        try {
            const playlistsResult = await executeQuery('SELECT COUNT(*) as total FROM playlist');
            dashboardData.stats.totalPlaylists = playlistsResult[0]?.total || 0;
        } catch (err) {
            console.log('Playlists count error:', err.message);
        }
        
        // 5. Total Users
        try {
            const usersResult = await executeQuery('SELECT COUNT(*) as total FROM users');
            dashboardData.stats.totalUsers = usersResult[0]?.total || 0;
        } catch (err) {
            console.log('Users count error:', err.message);
        }
        
        // 6. Total Plays
        try {
            const playsResult = await executeQuery('SELECT SUM(playing) as total FROM music');
            dashboardData.stats.totalPlays = playsResult[0]?.total || 0;
        } catch (err) {
            console.log('Plays count error:', err.message);
        }
        
        // 7. Recent Uploads
        try {
            const recentUploadsResult = await executeQuery(`
                SELECT 
                    m.id_music,
                    m.title_music as title,
                    m.cover_music as cover,
                    m.playing as plays,
                    m.created_at,
                    GROUP_CONCAT(DISTINCT a.artist_name) as artists
                FROM music m
                LEFT JOIN music_artist ma ON m.id_music = ma.id_music
                LEFT JOIN artist a ON ma.id_artist = a.id_artist
                WHERE m.title_music IS NOT NULL
                GROUP BY m.id_music, m.title_music, m.cover_music, m.playing, m.created_at
                ORDER BY m.created_at DESC
                LIMIT 5
            `);
            
            dashboardData.recentUploads = recentUploadsResult.map(item => ({
                id: item.id_music,
                title: item.title || 'No Title',
                cover: item.cover || '/uploads/undefine.jpg',
                plays: item.plays || 0,
                artists: item.artists || 'Unknown Artist',
                date: formatDate(item.created_at),
                duration: '3:45'
            }));
        } catch (err) {
            console.log('Recent uploads error:', err.message);
        }
        
      try {
    const allActivities = [];
    
    // Activity dari music uploads
    const recentMusic = await executeQuery(`
        SELECT 
            m.id_music,
            m.title_music as title,
            GROUP_CONCAT(DISTINCT a.artist_name) as artists,
            m.created_at,
            'music_upload' as type
        FROM music m
        LEFT JOIN music_artist ma ON m.id_music = ma.id_music
        LEFT JOIN artist a ON ma.id_artist = a.id_artist
        WHERE m.title_music IS NOT NULL
        GROUP BY m.id_music, m.title_music, m.created_at
        ORDER BY m.created_at DESC
        LIMIT 3
    `);
    
    recentMusic.forEach(item => {
        allActivities.push({
            type: 'music_upload',
            title: item.title,
            created_at: item.created_at,
            description: getActivityDescription('music_upload', item.title),
            icon: getActivityIcon('music_upload'),
            status: getActivityStatus('music_upload')
        });
    });
    
    // Activity dari artist additions
    const recentArtists = await executeQuery(`
        SELECT 
            artist_name as title,
            created_at,
            'artist_added' as type
        FROM artist
        ORDER BY created_at DESC
        LIMIT 2
    `);
    
    recentArtists.forEach(item => {
        allActivities.push({
            type: 'artist_added',
            title: item.title,
            created_at: item.created_at,
            description: getActivityDescription('artist_added', item.title),
            icon: getActivityIcon('artist_added'),
            status: getActivityStatus('artist_added')
        });
    });
    
    // Activity dari playlist creations
    const recentPlaylists = await executeQuery(`
        SELECT 
            playlist_name as title,
            created_at,
            'playlist_created' as type
        FROM playlist
        ORDER BY created_at DESC
        LIMIT 2
    `);
    
    recentPlaylists.forEach(item => {
        allActivities.push({
            type: 'playlist_created',
            title: item.title,
            created_at: item.created_at,
            description: getActivityDescription('playlist_created', item.title),
            icon: getActivityIcon('playlist_created'),
            status: getActivityStatus('playlist_created')
        });
    });
    
    // Activity dari album additions
    const recentAlbums = await executeQuery(`
        SELECT 
            album_name as title,
            created_at,
            'album_added' as type
        FROM album
        ORDER BY created_at DESC
        LIMIT 2
    `);
    
    recentAlbums.forEach(item => {
        allActivities.push({
            type: 'album_added',
            title: item.title,
            created_at: item.created_at,
            description: getActivityDescription('album_added', item.title),
            icon: getActivityIcon('album_added'),
            status: getActivityStatus('album_added')
        });
    });
    
    // Activity dari genre additions
    const recentGenres = await executeQuery(`
        SELECT 
            genre_name as title,
            created_at,
            'genre_added' as type
        FROM genre
        ORDER BY created_at DESC
        LIMIT 2
    `);
    
    recentGenres.forEach(item => {
        allActivities.push({
            type: 'genre_added',
            title: item.title,
            created_at: item.created_at,
            description: getActivityDescription('genre_added', item.title),
            icon: getActivityIcon('genre_added'),
            status: getActivityStatus('genre_added')
        });
    });
    
    // Activity dari music-playlist relations (5 terbaru)
    const recentMusicPlaylist = await executeQuery(`
        SELECT 
            CONCAT(m.title_music, ' → ', p.playlist_name) as title,
            mp.created_at,
            'music_playlist_added' as type
        FROM music_playlist mp
        JOIN music m ON mp.id_music = m.id_music
        JOIN playlist p ON mp.id_playlist = p.id_playlist
        ORDER BY mp.created_at DESC
        LIMIT 2
    `);
    
    recentMusicPlaylist.forEach(item => {
        allActivities.push({
            type: 'music_playlist_added',
            title: item.title,
            created_at: item.created_at,
            description: getActivityDescription('music_playlist_added', item.title),
            icon: getActivityIcon('music_playlist_added'),
            status: getActivityStatus('music_playlist_added')
        });
    });
    
    // Activity dari music-album relations
    const recentMusicAlbum = await executeQuery(`
        SELECT 
            CONCAT(m.title_music, ' → ', a.album_name) as title,
            ma.created_at,
            'music_album_added' as type
        FROM music_album ma
        JOIN music m ON ma.id_music = m.id_music
        JOIN album a ON ma.id_al = a.id_al
        ORDER BY ma.created_at DESC
        LIMIT 2
    `);
    
    recentMusicAlbum.forEach(item => {
        allActivities.push({
            type: 'music_album_added',
            title: item.title,
            created_at: item.created_at,
            description: getActivityDescription('music_album_added', item.title),
            icon: getActivityIcon('music_album_added'),
            status: getActivityStatus('music_album_added')
        });
    });
    
    // Activity dari music-genre relations
    const recentMusicGenre = await executeQuery(`
        SELECT 
            CONCAT(m.title_music, ' → ', g.genre_name) as title,
            mg.created_at,
            'music_genre_added' as type
        FROM music_genre mg
        JOIN music m ON mg.id_music = m.id_music
        JOIN genre g ON mg.id_genre = g.id_genre
        ORDER BY mg.created_at DESC
        LIMIT 2
    `);
    
    recentMusicGenre.forEach(item => {
        allActivities.push({
            type: 'music_genre_added',
            title: item.title,
            created_at: item.created_at,
            description: getActivityDescription('music_genre_added', item.title),
            icon: getActivityIcon('music_genre_added'),
            status: getActivityStatus('music_genre_added')
        });
    });
    
    // Sort berdasarkan tanggal terbaru
    allActivities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // Ambil 7 aktivitas terbaru
    dashboardData.recentActivity = allActivities.slice(0, 7).map(item => ({
        title: item.title || 'New item',
        date: formatDate(item.created_at),
        description: item.description,
        icon: item.icon,
        status: item.status
    }));
    
} catch (err) {
    console.log('Recent activity error:', err.message);
}


try {
    const genreResult = await executeQuery(`
        SELECT 
            g.id_genre,
            g.genre_name as name,
            COUNT(mg.id_music) as count
        FROM genre g
        LEFT JOIN music_genre mg ON g.id_genre = mg.id_genre
        GROUP BY g.id_genre, g.genre_name
        ORDER BY count DESC, g.genre_name ASC
    `);
    
    const totalSongs = dashboardData.stats.totalMusic || 1;
    
    // HITUNG PERSENTASE dan GENERATE COLOR
    dashboardData.genreDistribution = genreResult.map((genre, index) => {
        const color = generateBrightGenreColor(genre.name);
        const percentage = Math.round((genre.count / totalSongs) * 100) || 0;
        
        return {
            id: genre.id_genre,
            name: genre.name || 'Unknown Genre',
            count: genre.count || 0,
            percentage: percentage,
            color: color, // Tambahkan color property
            gradient: generateGenreGradient(genre.name) // Alternatif gradient
        };
    });
    
    // Juga buat popularGenres untuk kompatibilitas (top 5)
    dashboardData.popularGenres = dashboardData.genreDistribution.slice(0, 5);
    
} catch (err) {
    console.log('Genre distribution error:', err.message);
}


        
        // 10. Top Music
        try {
            const topMusicResult = await executeQuery(`
                SELECT 
                    m.id_music,
                    m.title_music as title,
                    m.cover_music as cover,
                    m.playing as plays,
                    GROUP_CONCAT(DISTINCT a.artist_name) as artists,
                    COUNT(DISTINCT mg.id_genre) as genre_count
                FROM music m
                LEFT JOIN music_artist ma ON m.id_music = ma.id_music
                LEFT JOIN artist a ON ma.id_artist = a.id_artist
                LEFT JOIN music_genre mg ON m.id_music = mg.id_music
                WHERE m.playing > 0 AND m.title_music IS NOT NULL
                GROUP BY m.id_music, m.title_music, m.cover_music, m.playing
                ORDER BY m.playing DESC
                LIMIT 6
            `);
            
            dashboardData.topMusic = topMusicResult.map((music, index) => ({
                id: music.id_music,
                title: music.title || 'No Title',
                cover: music.cover || '/uploads/undefine.jpg',
                plays: music.plays || 0,
                artists: music.artists || 'Unknown Artist',
                genres: music.genre_count || 0,
                rank: index + 1,
                color: getMusicCardColor(index)
            }));
        } catch (err) {
            console.log('Top music error:', err.message);
        }
        
        console.log('Dashboard data loaded successfully');
        
        res.render('admin/dashboard', {
            admin: req.session.admin,
            dashboard: dashboardData,
            error: null,
            success: null
        });
        
    } catch (error) {
        console.error('Dashboard error:', error);
        res.render('admin/dashboard', {
            admin: req.session.admin,
            dashboard: null,
            error: 'Failed to load dashboard data: ' + error.message,
            success: null
        });
    }
});


// Helper functions
function formatDate(dateString) {
    if (!dateString) return 'Unknown date';
    
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);
        
        if (diffDay > 7) {
            return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
        } else if (diffDay > 0) {
            return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
        } else if (diffHour > 0) {
            return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
        } else if (diffMin > 0) {
            return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
        } else {
            return 'Just now';
        }
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Unknown date';
    }
}


function getMusicCardColor(index) {
    const colors = [
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)'
    ];
    return colors[index % colors.length];
}


function getActivityIcon(type) {
    const icons = {
        'music_upload': 'fa-cloud-upload-alt',
        'artist_added': 'fa-user-plus',
        'playlist_created': 'fa-list-music',
        'album_added': 'fa-compact-disc',
        'genre_added': 'fa-tags',
        'music_playlist_added': 'fa-link',
        'music_album_added': 'fa-link',
        'music_genre_added': 'fa-tag',
        'default': 'fa-info-circle'
    };
    return icons[type] || icons.default;
}

function getActivityStatus(type) {
    const status = {
        'music_upload': 'success',
        'artist_added': 'info',
        'playlist_created': 'primary',
        'album_added': 'warning',
        'genre_added': 'success',
        'music_playlist_added': 'info',
        'music_album_added': 'primary',
        'music_genre_added': 'warning',
        'default': 'info'
    };
    return status[type] || status.default;
}

function getActivityDescription(type, title = '') {
    const descriptions = {
        'music_upload': `New music uploaded: "${title}"`,
        'artist_added': `New artist registered: "${title}"`,
        'playlist_created': `New playlist created: "${title}"`,
        'album_added': `New album added: "${title}"`,
        'genre_added': `New genre added: "${title}"`,
        'music_playlist_added': `Music added to playlist: "${title}"`,
        'music_album_added': `Music added to album: "${title}"`,
        'music_genre_added': `Music tagged with genre: "${title}"`,
        'default': 'New activity'
    };
    return descriptions[type] || descriptions.default;
}




// Di dalam dashboard route, tambahkan fungsi ini:
function generateGenreColor(genreName) {
    // Gunakan hash untuk menghasilkan angka yang konsisten dari genre name
    let hash = 0;
    for (let i = 0; i < genreName.length; i++) {
        hash = genreName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Generate HSL color dengan hue berdasarkan hash
    const hue = Math.abs(hash % 360);
    
    // Pastikan saturasi dan lightness yang bagus untuk readability
    const saturation = 70 + (hash % 20); // 70-90%
    const lightness = 50 + (hash % 10); // 50-60%
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// Atau alternatif dengan warna yang lebih cerah:
function generateBrightGenreColor(genreName) {
    let hash = 0;
    for (let i = 0; i < genreName.length; i++) {
        hash = genreName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Warna-warna cerah yang bagus untuk UI
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', 
        '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
        '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2',
        '#A9DFBF', '#F9E79F', '#D5DBDB', '#FAD7A0', '#D4E6F1',
        '#F5B7B1', '#AED6F1', '#D2B4DE', '#ABEBC6', '#FDEBD0',
        '#D6EAF8', '#E8DAEF', '#D1F2EB', '#FDEDEC', '#EAEDED'
    ];
    
    return colors[Math.abs(hash) % colors.length];
}

// Versi dengan gradient untuk tampilan lebih menarik:
function generateGenreGradient(genreName) {
    let hash = 0;
    for (let i = 0; i < genreName.length; i++) {
        hash = genreName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const hue1 = Math.abs(hash % 360);
    const hue2 = (hue1 + 30) % 360;
    
    return `linear-gradient(135deg, hsl(${hue1}, 70%, 55%), hsl(${hue2}, 70%, 55%))`;
}


module.exports = router;