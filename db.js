const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
  host: process.env.DB_HOST,  
  port: process.env.DB_PORT,  
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_GOOVLIZE
});

db.connect(err => {
  if (err) {
    console.error('Database connection failed:', err.message);
    return;
  }
  console.log('Database connected!');
});




const mm = require('music-metadata');

async function getAudioDuration(filePath) {
  try {
    const metadata = await mm.parseFile(filePath);
    const durationInSeconds = metadata.format.duration || 0;
    
    // Return both formatted string and seconds
    const minutes = Math.floor(durationInSeconds / 60);
    const seconds = Math.floor(durationInSeconds % 60);
    
    return {
      formatted: `${minutes}:${seconds.toString().padStart(2, '0')}`,
      seconds: durationInSeconds
    };
  } catch (err) {
    console.error('Gagal membaca metadata:', err.message);
    return {
      formatted: '0:00',
      seconds: 0
    };
  }
}



function getTrackCovers(playlistId) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT DISTINCT m.cover_music, mc.created_at
      FROM music_cus mc
      JOIN music m ON mc.id_music = m.id_music
      WHERE mc.id_cus = 107
      ORDER BY mc.created_at ASC
      LIMIT 4`;

    db.query(query, [playlistId], (err, results) => {
      if (err) {
        return reject(err);
      }

      const covers = results.map(row => row.cover_music);

      db.query(
        'SELECT COUNT(*) as count FROM music_cus WHERE id_cus = ?', 
        [playlistId], 
        (err, countResult) => {
          if (err) {
            reject(err);
          } else {
            const trackCount = countResult[0].count;
            if (covers.length === 1 && trackCount > 1) {
              resolve([]); // satu cover unik, return kosong
            } else {
              resolve(covers);
            }
          }
        }
      );
    });
  });
}

const getPlaylists = (callback) => {
  const sql = `SELECT 
      p.id_playlist, 
      p.playlist_name, 
      p.playlist_tipe, 
      p.playlist_cover, 
      p.id_tag, 
      COALESCE(t.tag_name, 'Uncategorized') as tag_name,
      CASE 
          WHEN (LENGTH(GROUP_CONCAT(DISTINCT a.artist_name ORDER BY a.id_artist_auto DESC SEPARATOR ', ')) - 
                LENGTH(REPLACE(GROUP_CONCAT(DISTINCT a.artist_name ORDER BY a.id_artist_auto DESC SEPARATOR ', '), ',', ''))) / LENGTH(',') >= 5 
          THEN CONCAT(
              SUBSTRING_INDEX(GROUP_CONCAT(DISTINCT a.artist_name ORDER BY a.id_artist_auto DESC SEPARATOR ', '), ', ', 5), 
              ' and others'
          ) 
          ELSE GROUP_CONCAT(DISTINCT a.artist_name ORDER BY a.id_artist_auto DESC SEPARATOR ', ')
      END AS artist_names
  FROM playlist p
  LEFT JOIN tag_playlist t ON p.id_tag = t.id_tag
  LEFT JOIN music_playlist mp ON p.id_playlist = mp.id_playlist
  LEFT JOIN music m ON mp.id_music = m.id_music
  LEFT JOIN music_artist ma ON m.id_music = ma.id_music
  LEFT JOIN artist a ON ma.id_artist COLLATE utf8mb4_unicode_ci = a.id_artist COLLATE utf8mb4_unicode_ci
  GROUP BY p.id_playlist, p.playlist_name, p.playlist_tipe, p.playlist_cover, p.id_tag, t.tag_name
  ORDER BY COALESCE(p.id_tag, 999999), p.id_playlist`;

  db.query(sql, callback);
};


const getUserProfile = (userId, callback) => {
  const sql = `SELECT name_user, email_user, profile_user FROM users WHERE id_user = ?`;
  db.query(sql, [userId], (err, result) => {
    if (err) return callback(err, null);

    if (result.length === 0) return callback(null, null);

    let user = result[0];

    // Gunakan default profile jika kosong
    if (!user.profile_user || user.profile_user.trim() === '') {
      user.profile_user = "/uploads/profile/default_pp.jpg";
    }

    callback(null, {
      name: user.name_user,
      email: user.email_user,
      profileImage: user.profile_user
    });
  });
};



function getPlaylistById(id, callback) {
    const sql = `
      SELECT p.*, t.tag_name,
        CASE 
          WHEN (LENGTH(GROUP_CONCAT(DISTINCT a.artist_name ORDER BY a.id_artist_auto DESC SEPARATOR ', ')) - 
                LENGTH(REPLACE(GROUP_CONCAT(DISTINCT a.artist_name ORDER BY a.id_artist_auto DESC SEPARATOR ', '), ',', ''))) / LENGTH(',') >= 5 
          THEN CONCAT(
              SUBSTRING_INDEX(GROUP_CONCAT(DISTINCT a.artist_name ORDER BY a.id_artist_auto DESC SEPARATOR ', '), ', ', 5), 
              ' and others'
          ) 
          ELSE GROUP_CONCAT(DISTINCT a.artist_name ORDER BY a.id_artist_auto DESC SEPARATOR ', ')
        END AS artist_names
      FROM playlist p
      JOIN tag_playlist t ON p.id_tag = t.id_tag
      LEFT JOIN music_playlist mp ON p.id_playlist = mp.id_playlist
      LEFT JOIN music m ON mp.id_music = m.id_music
      LEFT JOIN music_artist ma ON m.id_music = ma.id_music
      LEFT JOIN artist a ON ma.id_artist COLLATE utf8mb4_unicode_ci = a.id_artist COLLATE utf8mb4_unicode_ci
      WHERE p.id_playlist = ?
      GROUP BY p.id_playlist
    `;
  
    db.query(sql, [id], callback);
}



  const getFavoriteMusicIdsByUserId = (id_user, callback) => {
    db.query('SELECT id_music FROM music_fav WHERE id_user = ?', [id_user], (err, results) => {
      if (err) return callback(err);
      const favIds = results.map(row => row.id_music);
      callback(null, favIds);
    });
  };
  


  
  function getAvailableCustomPlaylists(userId, musicId) {
    return new Promise((resolve, reject) => {
      const playlists = [];
  
      const queryUserPlaylists = `
        SELECT id_cus, playlist_name, id_user 
        FROM custom_playlist 
        WHERE id_user = ?`;
  
      db.query(queryUserPlaylists, [userId], async (err, userPlaylists) => {
        if (err) return reject(err);
  
        for (const playlist of userPlaylists) {
          const checkQuery = `
            SELECT COUNT(*) as count 
            FROM music_cus 
            WHERE id_cus = ? AND id_music = ?`;
  
          const [check] = await db.promise().query(checkQuery, [playlist.id_cus, musicId]);
          playlist.exists = check[0].count > 0;
          playlists.push(playlist);
        }
  
        const queryFav = `
          SELECT cp.id_cus, cp.playlist_name, cp.id_user
          FROM playlist_fav pf
          JOIN custom_playlist cp ON cp.id_cus = pf.id_playlist
          WHERE pf.id_user = ?
            AND EXISTS (
              SELECT 1 FROM user_follow uf1
              JOIN user_follow uf2
                ON uf1.id_user = ? AND uf1.id_user_follow = cp.id_user
               AND uf2.id_user = cp.id_user AND uf2.id_user_follow = ?
            )`;
  
        db.query(queryFav, [userId, userId, userId], async (err, favPlaylists) => {
          if (err) return reject(err);
  
          for (const playlist of favPlaylists) {
            const checkQuery = `
              SELECT COUNT(*) as count 
              FROM music_cus 
              WHERE id_cus = ? AND id_music = ?`;
  
            const [check] = await db.promise().query(checkQuery, [playlist.id_cus, musicId]);
            playlist.exists = check[0].count > 0;
            playlists.push(playlist);
          }
  
          resolve(playlists);
        });
      });
    });
  }
  

function checkPlaylistFav(userId, playlistId) {
  return new Promise((resolve, reject) => {
    const query = "SELECT id_fav FROM playlist_fav WHERE id_user = ? AND id_playlist = ?";
    db.query(query, [userId, playlistId], (err, results) => {
      if (err) return reject(err);
      resolve(results.length > 0); // true jika ada
    });
  });
}


function getTracksByPlaylist(idPlaylist, callback) {
  const sql = `
    SELECT 
      m.id_music, 
      m.audio_file, 
      m.title_music, 
      m.cover_music, 
      m.lyric, 
      m.line_durations, 
      GROUP_CONCAT(DISTINCT a.artist_name ORDER BY ma.id_ma SEPARATOR ', ') AS artist_names,
      GROUP_CONCAT(DISTINCT a.id_artist ORDER BY ma.id_ma SEPARATOR ',') AS artist_ids,
      MAX(ma.id_ma) as max_ma_id
    FROM 
      music m
    JOIN 
      music_playlist mp ON m.id_music = mp.id_music
    LEFT JOIN 
      music_artist ma ON m.id_music = ma.id_music
    LEFT JOIN 
      artist a ON ma.id_artist COLLATE utf8mb4_unicode_ci = a.id_artist COLLATE utf8mb4_unicode_ci
    WHERE 
      mp.id_playlist = ?
    GROUP BY 
      m.id_music, m.audio_file, m.title_music, m.cover_music, m.lyric, m.line_durations
    ORDER BY 
      max_ma_id
  `;
  db.query(sql, [idPlaylist], callback);
}


function getAlbumsByMusicId(idMusic, callback) {
    const sql = `
        SELECT 
            album.id_al, 
            album.album_name,
            album.id_album_auto  -- Kolom ini penting untuk hashid
        FROM album 
        JOIN music_album ON album.id_al COLLATE utf8mb4_unicode_ci = music_album.id_al COLLATE utf8mb4_unicode_ci
        WHERE music_album.id_music = ?
        LIMIT 1
    `;
    db.query(sql, [idMusic], (err, results) => {
        if (err) {
            console.error('Error in getAlbumsByMusicId:', err);
            callback(err);
        } else {
            callback(null, results);
        }
    });
}


function getLibraryAll(userId, callback) {
  Promise.all([
    // Custom playlists (milik user sendiri)
    new Promise((resolve, reject) => {
      const query = `
        SELECT 
          cp.id_cus AS id, 
          cp.id_auto,
          cp.playlist_name AS name, 
          COALESCE(
            (SELECT m.cover_music 
             FROM music_cus mc
             JOIN music m ON mc.id_music = m.id_music
             WHERE mc.id_cus = cp.id_cus
             LIMIT 1),
            cp.playlist_cover
          ) AS cover,
          cp.created_at,
          'playlist' AS type,
          (SELECT COUNT(*) FROM music_cus WHERE id_cus = cp.id_cus) AS track_count
        FROM custom_playlist cp
        WHERE cp.id_user = ? 
        ORDER BY cp.created_at DESC`;
      db.query(query, [userId], (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    }),
    
    // Followed artists
    new Promise((resolve, reject) => {
      const query = `
        SELECT 
          a.id_af AS id, 
          ar.id_artist_auto,
          ar.artist_name AS name, 
          ar.artist_profile AS cover, 
          a.created_at,
          'artist' AS type 
        FROM artist_follow a
        JOIN artist ar ON a.id_artist COLLATE utf8mb4_unicode_ci = ar.id_artist COLLATE utf8mb4_unicode_ci
        WHERE a.id_user = ? 
        ORDER BY a.created_at DESC`;
      db.query(query, [userId], (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    }),

    // Favorite albums
    new Promise((resolve, reject) => {
      const query = `
        SELECT 
          f.id_fav AS id, 
          al.id_album_auto,
          al.album_name AS name, 
          al.album_cover AS cover, 
          f.created_at,
          'album' AS type,
          (SELECT COUNT(*) FROM music_album WHERE id_al = al.id_al COLLATE utf8mb4_unicode_ci) AS track_count
        FROM album_fav f
        JOIN album al ON f.id_al COLLATE utf8mb4_unicode_ci = al.id_al COLLATE utf8mb4_unicode_ci
        WHERE f.id_user = ? 
        ORDER BY f.created_at DESC`;
      db.query(query, [userId], (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    }),

    // PERBAIKAN: Favorite playlists (BOTH global AND custom) dengan query yang kompatibel
    new Promise((resolve, reject) => {
      const query = `
        SELECT 
          f.id_playlist AS id, 
          COALESCE(p.playlist_name, cp.playlist_name) AS name, 
          COALESCE(p.playlist_cover, cp.playlist_cover) AS cover, 
          f.created_at,
          'fav_playlist' AS type,
          CASE 
            WHEN p.id_playlist IS NOT NULL THEN 
              (SELECT COUNT(*) FROM music_playlist WHERE id_playlist = p.id_playlist)
            WHEN cp.id_cus IS NOT NULL THEN 
              (SELECT COUNT(*) FROM music_cus WHERE id_cus = cp.id_cus)
            ELSE 0
          END AS track_count,
          CASE 
            WHEN p.id_playlist IS NOT NULL THEN 'global'
            WHEN cp.id_cus IS NOT NULL THEN 'custom'
          END AS playlist_type,
          -- PERBAIKAN: Ambil juga id_auto untuk custom playlist yang disimpan
          cp.id_auto as id_auto
        FROM playlist_fav f
        LEFT JOIN playlist p ON f.id_playlist = p.id_playlist
        LEFT JOIN custom_playlist cp ON f.id_playlist = cp.id_cus
        WHERE f.id_user = ? 
        ORDER BY f.created_at DESC`;
      db.query(query, [userId], (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    })
  ])
  .then(async ([customPlaylists, artists, albums, favPlaylists]) => {
    // PERBAIKAN: Ambil track_covers secara terpisah untuk favPlaylists yang custom
    const favPlaylistsWithCovers = await Promise.all(
      favPlaylists.map(async (item) => {
        if (item.playlist_type === 'custom') {
          try {
            // Ambil track_covers untuk custom playlist yang disimpan
            const covers = await new Promise((resolve, reject) => {
              const coverQuery = `
                SELECT DISTINCT m.cover_music
                FROM music_cus mc
                JOIN music m ON mc.id_music = m.id_music
                WHERE mc.id_cus = ?
                LIMIT 4`;
              db.query(coverQuery, [item.id], (err, results) => {
                if (err) reject(err);
                else resolve(results.map(row => row.cover_music));
              });
            });
            
            item.track_covers = covers;
            
            // Jika semua track memiliki cover yang sama dan lebih dari 1 track,
            // gunakan single cover saja
            if (covers.length === 1 && item.track_count > 1) {
              item.cover = covers[0];
              item.track_covers = [];
            }
          } catch (err) {
            console.error('Error getting track covers for custom fav playlist:', err);
            item.track_covers = [];
          }
        } else {
          // Untuk global playlist, track_covers kosong
          item.track_covers = [];
        }
        return item;
      })
    );

    // PERBAIKAN: Ambil track_covers untuk customPlaylists milik sendiri
    const customPlaylistsWithCovers = await Promise.all(
      customPlaylists.map(async (item) => {
        try {
          const covers = await new Promise((resolve, reject) => {
            const coverQuery = `
              SELECT DISTINCT m.cover_music
              FROM music_cus mc
              JOIN music m ON mc.id_music = m.id_music
              WHERE mc.id_cus = ?
              LIMIT 4`;
            db.query(coverQuery, [item.id], (err, results) => {
              if (err) reject(err);
              else resolve(results.map(row => row.cover_music));
            });
          });
          
          item.track_covers = covers;
          
          // Jika semua track memiliki cover yang sama dan lebih dari 1 track,
          // gunakan single cover saja
          if (covers.length === 1 && item.track_count > 1) {
            item.cover = covers[0];
            item.track_covers = [];
          }
        } catch (err) {
          console.error('Error getting track covers for custom playlist:', err);
          item.track_covers = [];
        }
        return item;
      })
    );

    // Gabungkan semua item ke satu array dan urutkan berdasarkan created_at
    const allItems = [
      ...customPlaylistsWithCovers,
      ...artists,
      ...albums,
      ...favPlaylistsWithCovers
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    callback(null, allItems);
  })
  .catch(err => {
    callback(err);
  });
}




  module.exports = {
    db, 
    getPlaylists,
    getUserProfile,
    getPlaylistById,
    getTracksByPlaylist,
    getAlbumsByMusicId,
    getFavoriteMusicIdsByUserId,
    getAvailableCustomPlaylists,
    checkPlaylistFav,
    getLibraryAll,
    getTrackCovers,
    getAudioDuration
  };
