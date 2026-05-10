const express = require('express');
const router = express.Router();
const { addFavoriteMusic, removeFavoriteMusic, checkFavoriteExists,checkPlaylistFav,removeFavPlaylist,addFavPlaylist } = require('../models/playlist');
const {db} = require('../db');
const Hashids = require('hashids');
const hashids = new Hashids('goovlize-secret', 6); 


const path = require('path');



router.use(express.static(path.join(__dirname, 'public')));
router.use('/uploads', express.static(path.join(__dirname, 'uploads')));





const mm = require('music-metadata');

async function getAudioDuration(filePath) {
  try {
    const metadata = await mm.parseFile(filePath);
    const durationInSeconds = metadata.format.duration || 0;

    const minutes = Math.floor(durationInSeconds / 60);
    const seconds = Math.floor(durationInSeconds % 60);

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  } catch (err) {
    console.error('Gagal membaca metadata:', err.message);
    return '0:00';
  }
}



router.post('/check_music_in_playlists', async (req, res) => {
  const { id_music } = req.body;
  const id_user = req.session.user_id;

  if (!id_music || !id_user) {
    return res.status(400).json({ error: 'id_user dan id_music wajib' });
  }

  try {
    const [rows] = await db.promise().query(
      `SELECT id_cus FROM custom_playlist WHERE id_user = ?`,
      [id_user]
    );

    const result = [];

    for (const row of rows) {
      const [[{ count }]] = await db.promise().query(
        `SELECT COUNT(*) as count FROM music_cus WHERE id_cus = ? AND id_music = ?`,
        [row.id_cus, id_music]
      );
      result.push({ id_cus: row.id_cus, exists: count > 0 });
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});



// Di routes/custom.js atau wherever add_musicCus berada
router.post('/add_musicCus', async (req, res) => {
  const { id_playlist, id_music, current_hash } = req.body;
  const id_user = req.session.user_id;

  if (!id_user) {
    return res.json({ status: "forbidden", message: "Unauthorized" });
  }

  try {
    // Verifikasi kepemilikan playlist dengan collation fix
    const [playlistRows] = await db.promise().query(
      'SELECT id_auto, id_cus, id_user FROM custom_playlist WHERE id_cus COLLATE utf8mb4_0900_ai_ci = ? COLLATE utf8mb4_0900_ai_ci',
      [id_playlist]
    );

    if (!playlistRows.length || playlistRows[0].id_user !== id_user) {
      return res.json({ status: "forbidden", message: "Not authorized" });
    }

    const playlist = playlistRows[0];
    
    // Check if music already exists in playlist dengan collation fix
    const [existingRows] = await db.promise().query(
      'SELECT * FROM music_cus WHERE id_cus COLLATE utf8mb4_0900_ai_ci = ? COLLATE utf8mb4_0900_ai_ci AND id_music COLLATE utf8mb4_0900_ai_ci = ? COLLATE utf8mb4_0900_ai_ci',
      [id_playlist, id_music]
    );

    if (existingRows.length > 0) {
      // Remove music from playlist dengan collation fix
      await db.promise().query(
        'DELETE FROM music_cus WHERE id_cus COLLATE utf8mb4_0900_ai_ci = ? COLLATE utf8mb4_0900_ai_ci AND id_music COLLATE utf8mb4_0900_ai_ci = ? COLLATE utf8mb4_0900_ai_ci',
        [id_playlist, id_music]
      );

      // Get updated track covers dengan collation fix
      const [coverRows] = await db.promise().query(
        `SELECT DISTINCT m.cover_music 
         FROM music_cus mc 
         JOIN music m ON mc.id_music COLLATE utf8mb4_0900_ai_ci = m.id_music COLLATE utf8mb4_0900_ai_ci
         WHERE mc.id_cus COLLATE utf8mb4_0900_ai_ci = ? COLLATE utf8mb4_0900_ai_ci
         LIMIT 4`,
        [id_playlist]
      );

      const track_covers = coverRows.map(row => row.cover_music);
      const hasTracks = coverRows.length > 0;

      // Generate hashid untuk response
      const hashid = 'C' + hashids.encode(playlist.id_auto);

      res.json({
        status: "deleted",
        playlist_hash: hashid,
        track_covers: track_covers,
        new_cover: hasTracks ? track_covers[0] : null,
        default_cover: hasTracks ? null : '/uploads/undefine.jpg'
      });
    } else {
      // Add music to playlist
      await db.promise().query(
        'INSERT INTO music_cus (id_cus, id_music, created_at) VALUES (?, ?, NOW())',
        [id_playlist, id_music]
      );

      // Ambil data track yang baru ditambahkan dengan collation fix
      const [newTrackRows] = await db.promise().query(
        `SELECT 
          m.id_music, 
          m.audio_file, 
          m.title_music, 
          m.cover_music, 
          m.lyric, 
          m.line_durations, 
          GROUP_CONCAT(DISTINCT a.artist_name SEPARATOR ', ') AS artist_names,
          GROUP_CONCAT(DISTINCT a.id_artist SEPARATOR ',') AS artist_ids
        FROM 
          music m
        LEFT JOIN 
          music_artist ma ON m.id_music COLLATE utf8mb4_0900_ai_ci = ma.id_music COLLATE utf8mb4_0900_ai_ci
        LEFT JOIN 
          artist a ON ma.id_artist COLLATE utf8mb4_0900_ai_ci = a.id_artist COLLATE utf8mb4_0900_ai_ci
        WHERE 
          m.id_music COLLATE utf8mb4_0900_ai_ci = ? COLLATE utf8mb4_0900_ai_ci
        GROUP BY 
          m.id_music`,
        [id_music]
      );

      const newTrack = newTrackRows[0];

      // FIXED: Get album information dengan collation fix yang komprehensif
      const [albumRows] = await db.promise().query(
        `SELECT al.id_al, al.album_name 
         FROM album al
         JOIN music_album ma ON al.id_al COLLATE utf8mb4_0900_ai_ci = ma.id_al COLLATE utf8mb4_0900_ai_ci
         WHERE ma.id_music COLLATE utf8mb4_0900_ai_ci = ? COLLATE utf8mb4_0900_ai_ci`,
        [id_music]
      );

      // Get updated track covers dengan collation fix
      const [coverRows] = await db.promise().query(
        `SELECT DISTINCT m.cover_music 
         FROM music_cus mc 
         JOIN music m ON mc.id_music COLLATE utf8mb4_0900_ai_ci = m.id_music COLLATE utf8mb4_0900_ai_ci
         WHERE mc.id_cus COLLATE utf8mb4_0900_ai_ci = ? COLLATE utf8mb4_0900_ai_ci
         LIMIT 4`,
        [id_playlist]
      );

      const track_covers = coverRows.map(row => row.cover_music);

      // Generate hashid untuk response
      const hashid = 'C' + hashids.encode(playlist.id_auto);

      res.json({
        status: "added",
        playlist_hash: hashid,
        track_covers: track_covers,
        new_cover: track_covers.length > 0 ? track_covers[0] : '/uploads/undefine.jpg',
        new_track: {
          id_music: newTrack.id_music,
          audio_file: newTrack.audio_file,
          title_music: newTrack.title_music,
          cover_music: newTrack.cover_music || '/uploads/undefine.jpg',
          lyric: newTrack.lyric,
          line_durations: newTrack.line_durations,
          artist_names: newTrack.artist_names || 'Unknown Artist',
          artist_ids: newTrack.artist_ids || '',
          albums: albumRows,
          duration: '0:00',
          isFavorite: false
        }
      });
    }
  } catch (error) {
    console.error('Error in add_musicCus:', error);
    
    if (error.code === 'ER_CANT_AGGREGATE_2COLLATIONS') {
      console.error('Collation mismatch still detected. Please run permanent database fix.');
      return res.json({ 
        status: "error", 
        message: "Database configuration error. Please contact administrator." 
      });
    }
    
    res.json({ status: "error", message: "Server error" });
  }
});

router.post('/favorite_music', async (req, res) => {
  const { id_music, action } = req.body; 
  const id_user = req.session.user_id;

  if (!id_user || !id_music) {
    return res.status(400).json({ 
      success: false, 
      message: "Incomplete data" 
    });
  }

  try {
    const exists = await checkFavoriteExists(id_user, id_music);

    if (action === "remove") {
      if (exists) {
        await removeFavoriteMusic(id_user, id_music);
        return res.json({ 
          success: true,
          action: "removed"
        });
      }
      return res.json({ 
        success: false,
        message: "Favorite not found",
        action: "no_change"
      });
    }

    if (action === "add") {
      if (!exists) {
        await addFavoriteMusic(id_user, id_music);
        return res.json({ 
          success: true,
          action: "added"
        });
      }
      return res.json({ 
        success: false,
        message: "Already favorited",
        action: "no_change"
      });
    }

    return res.status(400).json({ 
      success: false, 
      message: "Invalid action" 
    });
  } catch (err) {
    console.error("Favorite error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Server error processing favorite" 
    });
  }
});


router.post('/check_favorite', (req, res) => {
  const { id_music } = req.body;
  const id_user = req.session.user_id;

  if (!id_user || !id_music) {
    return res.status(400).json({ success: false, message: "Data tidak lengkap" });
  }

  const query = "SELECT COUNT(*) AS count FROM music_fav WHERE id_user = ? AND id_music = ?";
  db.query(query, [id_user, id_music], (err, result) => {
    if (err) {
      console.error("Query error:", err);
      return res.status(500).json({ success: false, message: "Terjadi kesalahan saat memproses favorit" });
    }

    const isFavorite = result[0].count > 0;
    res.json({ success: true, is_favorite: isFavorite });
  });
});


router.post('/checkPopupFav', (req, res) => {
  const { id_music } = req.body;
  const id_user = req.session.user_id;

  if (!id_user || !id_music) {
    return res.status(400).json({ success: false, message: "Invalid data" });
  }

  const query = 'SELECT * FROM music_fav WHERE id_user = ? AND id_music = ? LIMIT 1';
  db.query(query, [id_user, id_music], (err, results) => {
    if (err) {
      console.error("DB Error:", err);
      return res.status(500).json({ success: false, message: "Database error" });
    }

    if (results.length > 0) {
      // Sudah ada di favorit
      res.json({ favorite: true });
    } else {
      res.json({ favorite: false });
    }
  });
});




router.post("/playlistFav", async (req, res) => {
  const { id_playlist, is_favorite, is_custom } = req.body;
  const id_user = req.session.user_id;

  if (!id_user || !id_playlist) {
    return res.status(400).json({ success: false, message: "Data tidak lengkap" });
  }

  try {
    // PERBAIKAN: Cek apakah user adalah owner untuk custom playlist
    if (is_custom) {
      const [ownerCheck] = await db.promise().query(
        'SELECT id_user FROM custom_playlist WHERE id_cus = ?',
        [id_playlist]
      );
      
      if (ownerCheck.length > 0 && ownerCheck[0].id_user === id_user) {
        return res.status(400).json({ 
          success: false, 
          message: "Anda tidak dapat menyimpan playlist milik sendiri" 
        });
      }
    }

    // PERBAIKAN: Cek berdasarkan id_playlist langsung (tanpa id_auto)
    const exists = await checkPlaylistFav(id_user, id_playlist);

    if (!exists && is_favorite) {
      await addFavPlaylist(id_user, id_playlist);

      let playlistInfo;
      
      // PERBAIKAN: Query yang lebih lengkap untuk custom playlist
      if (is_custom) {
        // Custom playlist
        [playlistInfo] = await db.promise().query(`
          SELECT 
            cp.id_cus as id, 
            cp.id_auto,
            cp.playlist_name as name, 
            COALESCE(cp.playlist_cover, '/images/default-playlist.png') as cover, 
            NOW() as created_at,
            'fav_playlist' as type,
            'custom' as playlist_type,
            (SELECT COUNT(*) FROM music_cus WHERE id_cus = cp.id_cus) as track_count
          FROM custom_playlist cp
          WHERE cp.id_cus = ?
        `, [id_playlist]);
      } else {
        // Global playlist
        [playlistInfo] = await db.promise().query(`
          SELECT 
            id_playlist as id, 
            playlist_name as name, 
            playlist_cover as cover, 
            NOW() as created_at,
            'fav_playlist' as type,
            'global' as playlist_type,
            (SELECT COUNT(*) FROM music_playlist WHERE id_playlist = p.id_playlist) as track_count
          FROM playlist p
          WHERE id_playlist = ?
        `, [id_playlist]);
      }

      const playlist = playlistInfo[0];
      
      // PERBAIKAN: Tambahkan pengecekan jika playlist ditemukan
      if (!playlist) {
        return res.status(404).json({ 
          success: false, 
          message: "Playlist tidak ditemukan" 
        });
      }
      
      // PERBAIKAN: Ambil track_covers untuk custom playlist
      if (is_custom) {
        const [coverResults] = await db.promise().query(`
          SELECT DISTINCT m.cover_music
          FROM music_cus mc
          JOIN music m ON mc.id_music = m.id_music
          WHERE mc.id_cus = ?
          LIMIT 4
        `, [id_playlist]);
        
        // PERBAIKAN: Inisialisasi track_covers sebagai array
        playlist.track_covers = [];
        
        if (coverResults.length > 0) {
          playlist.track_covers = coverResults.map(row => row.cover_music);
          
          // Jika semua track memiliki cover yang sama dan lebih dari 1 track,
          // gunakan single cover saja
          if (playlist.track_covers.length === 1 && playlist.track_count > 1) {
            playlist.cover = playlist.track_covers[0];
            playlist.track_covers = [];
          } else if (playlist.track_covers.length === 0) {
            // Jika tidak ada track covers, gunakan cover playlist atau default
            playlist.cover = playlist.cover || '/images/default-playlist.png';
            playlist.track_covers = [];
          }
        }
      } else {
        playlist.track_covers = [];
      }

      // PERBAIKAN: Untuk custom playlist, gunakan hashid dengan prefix 'C'
      if (is_custom) {
        // Gunakan id_auto untuk generate hashid
        playlist.hashid = 'C' + hashids.encode(playlist.id_auto);
        playlist.contentType = 'custom-playlist';
      } else {
        playlist.hashid = hashids.encode(playlist.id);
        playlist.contentType = 'fav-playlist';
      }

      return res.json({
        success: true,
        is_favorite: true,
        playlistData: playlist,
        message: "Playlist ditambahkan ke favorit"
      });
    }

    if (exists && !is_favorite) {
      await removeFavPlaylist(id_user, id_playlist);
      return res.json({ 
        success: true, 
        is_favorite: false, 
        message: "Playlist dihapus dari favorit" 
      });
    }

    return res.json({ 
      success: true, 
      is_favorite: exists, 
      message: "Tidak ada perubahan" 
    });
  } catch (error) {
    console.error("Gagal mengubah status favorit:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Terjadi kesalahan server" 
    });
  }
});


router.post('/popup_get_artists', (req, res) => {
  const { id_music } = req.body;

  if (!id_music || isNaN(id_music)) {
    return res.status(400).json({ error: 'Invalid request. id_music is required and must be a number.' });
  }

  const query = `
    SELECT DISTINCT a.id_artist_auto, a.id_artist, a.artist_name 
    FROM music_artist ma
    JOIN artist a ON ma.id_artist = a.id_artist
    WHERE ma.id_music = ?
  `;

  db.query(query, [id_music], (err, results) => {
    if (err) {
      console.error('SQL Error:', err);
      return res.status(500).json({ error: 'Database error.' });
    }

    // PERBAIKAN: Generate hashid di server-side
    const artistsWithHashid = results.map(artist => ({
      ...artist,
      hashid: 'AR' + hashids.encode(artist.id_artist_auto)
    }));

    return res.json(artistsWithHashid);
  });
});




router.post('/popup_get_playlists', async (req, res) => {
  const { id_music } = req.body;
  const id_user = req.session.user_id;
  if (!id_music || !id_user) {
    return res.status(400).json({ error: 'id_user dan id_music wajib' });
  }

  function fetchPlaylists(query, params) {
    return new Promise((resolve, reject) => {
      db.query(query, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  try {
    // Query yang diperbaiki untuk mengambil playlist dengan cover yang benar
    const query = `
      SELECT DISTINCT 
        cp.id_cus, 
        cp.playlist_name, 
        cp.playlist_cover,
        COALESCE(
          (SELECT m.cover_music 
           FROM music_cus mc
           JOIN music m ON mc.id_music = m.id_music
           WHERE mc.id_cus = cp.id_cus
           LIMIT 1),
          cp.playlist_cover
        ) AS effective_cover,
        CASE WHEN cp.id_user = ? THEN 'self' ELSE 'fav' END as source
      FROM (
        SELECT id_cus, playlist_name, playlist_cover, id_user 
        FROM custom_playlist 
        WHERE id_user = ?
        
        UNION
        
        SELECT cp.id_cus, cp.playlist_name, cp.playlist_cover, cp.id_user
        FROM playlist_fav pf
        JOIN custom_playlist cp ON cp.id_cus = pf.id_playlist
        WHERE pf.id_user = ?
      ) cp
    `;
    
    const rows = await fetchPlaylists(query, [id_user, id_user, id_user]);

    const result = [];
    const processedIds = new Set();

    for (const row of rows) {
      if (processedIds.has(row.id_cus)) continue;
      processedIds.add(row.id_cus);

      // cek existence
      const [[{ count }]] = await db.promise().query(
        `SELECT COUNT(*) as count FROM music_cus WHERE id_cus = ? AND id_music = ?`,
        [row.id_cus, id_music]
      );
      
      // PERBAIKAN: Ambil track covers dengan query yang benar
      const [coverRows] = await db.promise().query(
        `SELECT DISTINCT m.cover_music 
         FROM music_cus mc 
         JOIN music m ON mc.id_music = m.id_music 
         WHERE mc.id_cus = ? 
         LIMIT 4`,
        [row.id_cus]
      );
      
      const covers = coverRows.map(r => r.cover_music);
      
      result.push({
        id_cus: row.id_cus,
        playlist_name: row.playlist_name,
        playlist_cover: row.playlist_cover,
        effective_cover: row.effective_cover, // Cover yang sudah dihitung oleh query
        exists: count > 0,
        track_covers: covers
      });
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});



router.get("/custom-playlist/count", async (req, res) => {
  const id_user = req.session.user_id;

  if (!id_user) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    const [rows] = await db.promise().query(
      "SELECT COUNT(*) as total FROM custom_playlist WHERE id_user = ?",
      [id_user]
    );

    const total = rows[0].total || 0;

    return res.json({ success: true, total });
  } catch (error) {
    console.error("Gagal menghitung custom playlist:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post('/recent_activity', async (req, res) => {
  try {
    const { id_music, item_type, item_id } = req.body;
    const id_user = req.session.user_id;

    // Validasi data yang diperlukan
    if (!id_user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!id_music || !item_type || !item_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: id_music, item_type, item_id'
      });
    }

    // Validasi item_type
    const validItemTypes = ['playlist', 'artist', 'album', 'custom_playlist', 'music'];
    if (!validItemTypes.includes(item_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid item_type: ${item_type}. Valid types are: ${validItemTypes.join(', ')}`
      });
    }

    console.log('Tracking recent activity:', {
      id_user,
      id_music,
      item_type,
      item_id
    });

    // PERBAIKAN: Decode hashid jika diperlukan
    let numericItemId = item_id;
    
    // Jika item_id adalah hashid, decode ke angka
    if (item_type === 'playlist' && !item_id.startsWith('C') && !/^\d+$/.test(item_id)) {
      // Decode hashid untuk playlist global
      const decoded = hashids.decode(item_id);
      if (decoded && decoded.length > 0) {
        numericItemId = decoded[0];
        console.log(`Decoded playlist hashid ${item_id} to numeric ID: ${numericItemId}`);
      } else {
        console.warn(`Cannot decode playlist hashid: ${item_id}`);
        numericItemId = null;
      }
    } 
    // Untuk custom playlist dengan prefix 'C'
    else if (item_type === 'custom_playlist' && item_id.startsWith('C')) {
      const hashidWithoutPrefix = item_id.substring(1);
      const decoded = hashids.decode(hashidWithoutPrefix);
      if (decoded && decoded.length > 0) {
        numericItemId = decoded[0];
        console.log(`Decoded custom playlist hashid ${item_id} to numeric ID: ${numericItemId}`);
      } else {
        console.warn(`Cannot decode custom playlist hashid: ${item_id}`);
        numericItemId = null;
      }
    }
    // Untuk music, item_id adalah id_music (sudah numerik)
    else if (item_type === 'music') {
      numericItemId = id_music; // Untuk music, item_id sama dengan id_music
    }

    // Query untuk INSERT recent activity
    const insertQuery = `
      INSERT INTO recent_activity (id_user, item_type, item_id, played_at, id_music)
      VALUES (?, ?, ?, NOW(), ?)
    `;

    // Gunakan item_id asli untuk INSERT (bisa string atau angka)
    const insertParams = [id_user, item_type, item_id, id_music];

    // INSERT recent activity
    const insertResult = await new Promise((resolve, reject) => {
      db.query(insertQuery, insertParams, (error, results) => {
        if (error) {
          console.error('Database insert error:', error);
          reject(error);
        } else {
          resolve(results);
        }
      });
    });

    if (insertResult.affectedRows <= 0) {
      return res.status(500).json({
        success: false,
        message: 'Failed to track recent activity'
      });
    }

    // Siapkan semua update queries
    const updateQueries = [];

    // 1. Update music (selalu dilakukan)
    updateQueries.push(
      new Promise((resolve) => {
        db.query(
          'UPDATE music SET playing = COALESCE(playing, 0) + 1 WHERE id_music = ?',
          [id_music],
          (error, results) => {
            if (error) {
              console.error('Error updating music playing:', error);
              resolve({ table: 'music', success: false });
            } else {
              console.log(`Updated music playing count for id_music: ${id_music}`);
              resolve({ table: 'music', success: results.affectedRows > 0 });
            }
          }
        );
      })
    );

    // 2. Update berdasarkan item_type - HANYA JIKA numericItemId ADA
    const itemTypeMap = {
      'playlist': { 
        query: 'UPDATE playlist SET playing = COALESCE(playing, 0) + 1 WHERE id_playlist = ?', 
        param: numericItemId 
      },
      'artist': { 
        query: 'UPDATE artist SET playing = COALESCE(playing, 0) + 1 WHERE id_artist = ?', 
        param: numericItemId 
      },
      'album': { 
        query: 'UPDATE album SET playing = COALESCE(playing, 0) + 1 WHERE id_al = ?', 
        param: numericItemId 
      },
      'custom_playlist': { 
        query: 'UPDATE custom_playlist SET playing = COALESCE(playing, 0) + 1 WHERE id_cus = ?', 
        param: numericItemId 
      },
      'music': { 
        query: 'UPDATE music SET playing = COALESCE(playing, 0) + 1 WHERE id_music = ?', 
        param: numericItemId 
      }
    };

    // PERBAIKAN: Hanya eksekusi update jika numericItemId valid
    if (itemTypeMap[item_type] && numericItemId !== null && numericItemId !== undefined) {
      updateQueries.push(
        new Promise((resolve) => {
          db.query(
            itemTypeMap[item_type].query,
            [itemTypeMap[item_type].param],
            (error, results) => {
              if (error) {
                console.error(`Error updating ${item_type} playing:`, error);
                console.error('Query:', itemTypeMap[item_type].query);
                console.error('Param:', itemTypeMap[item_type].param);
                resolve({ table: item_type, success: false });
              } else {
                console.log(`Updated ${item_type} playing count for id: ${itemTypeMap[item_type].param}`);
                resolve({ table: item_type, success: results.affectedRows > 0 });
              }
            }
          );
        })
      );
    } else {
      console.log(`Skipping ${item_type} update - no valid numeric ID:`, numericItemId);
    }

    // Eksekusi semua update queries secara paralel
    const updateResults = await Promise.all(updateQueries);

    // Format hasil update
    const updates = {};
    updateResults.forEach(result => {
      updates[result.table] = result.success;
    });

    return res.status(200).json({
      success: true,
      message: 'Recent activity tracked successfully',
      activity_id: insertResult.insertId,
      updates: updates,
      decoded_id: numericItemId
    });

  } catch (error) {
    console.error('Error tracking recent activity:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
