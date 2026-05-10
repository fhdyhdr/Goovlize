const express = require('express');
const router = express.Router();
const {db,getPlaylists,getAlbumsByMusicId,getAvailableCustomPlaylists,getLibraryAll,getUserProfile,getFavoriteMusicIdsByUserId,getTrackCovers,getAudioDuration} = require('../db');
const Hashids = require('hashids');
const hashids = new Hashids('goovlize-secret', 6); // Sama seperti di app.js

const path = require('path');



router.use(express.static(path.join(__dirname, 'public')));
router.use('/uploads', express.static(path.join(__dirname, 'uploads')));



router.post('/newPlaylist', async (req, res) => {
  const id_user = req.session.user_id;
  if (!id_user) return res.status(401).json({ success: false, message: "Unauthorized" });

  const { name, description } = req.body;
  const playlist_name = name?.trim();
  const playlist_description = description?.trim() || '';
  const playlist_cover = '/uploads/undefine.jpg';

  if (!playlist_name) {
    return res.status(400).json({ success: false, message: "Playlist name is required" });
  }

  try {
    const insertQuery = `
      INSERT INTO custom_playlist (playlist_name, playlist_cover, description, id_user)
      VALUES (?, ?, ?, ?)
    `;
    const [result] = await db.promise().query(insertQuery, [
      playlist_name,
      playlist_cover,
      playlist_description,
      id_user
    ]);

    // Ambil data playlist yang baru dibuat
    const [playlistRows] = await db.promise().query(
      `SELECT * FROM custom_playlist WHERE id_auto = ?`,
      [result.insertId]
    );

    if (!playlistRows.length) {
      return res.status(500).json({ success: false, message: "Failed to retrieve created playlist" });
    }

    const playlist = playlistRows[0];
    
    // Hashid dengan komponen 'C' di depan (menggunakan id_auto)
    const hashid = 'C' + hashids.encode(playlist.id_auto);

    return res.json({
      success: true,
      hashid,
      playlistData: {
        id_cus: playlist.id_cus, // Ini akan berisi C1, C2, dst
        id_auto: playlist.id_auto, // ID auto increment
        hashid,
        playlist_name: playlist.playlist_name,
        playlist_cover: playlist.playlist_cover,
        description: playlist.description,
        id_user: playlist.id_user,
        created_at: playlist.created_at,
        contentType: 'custom-playlist',
        type: 'custom'
      }
    });
  } catch (error) {
    console.error('Gagal insert playlist:', error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});


router.put('/updatePlaylist/:id', async (req, res) => {
  const id_user = req.session.user_id;
  const playlistId = req.params.id;
  
  if (!id_user) return res.status(401).json({ success: false, message: "Unauthorized" });

  const { name, description } = req.body;
  const playlist_name = name?.trim();
  const playlist_description = description?.trim() || '';

  if (!playlist_name) {
    return res.status(400).json({ success: false, message: "Playlist name is required" });
  }

  try {
    // Verifikasi kepemilikan playlist
    const [ownershipRows] = await db.promise().query(
      'SELECT id_user FROM custom_playlist WHERE id_cus = ?',
      [playlistId]
    );
    
    if (!ownershipRows.length || ownershipRows[0].id_user !== id_user) {
      return res.status(403).json({ success: false, message: "Not authorized to update this playlist" });
    }

    const updateQuery = `
      UPDATE custom_playlist 
      SET playlist_name = ?, description = ?
      WHERE id_cus = ?
    `;
    
    await db.promise().query(updateQuery, [
      playlist_name,
      playlist_description,
      playlistId
    ]);

    // Ambil data playlist yang diperbarui termasuk track_covers
    const [updatedRows] = await db.promise().query(
      `SELECT * FROM custom_playlist WHERE id_cus = ?`,
      [playlistId]
    );
    
    if (!updatedRows.length) {
      return res.status(404).json({ success: false, message: "Playlist not found after update" });
    }

    const updatedPlaylist = updatedRows[0];
    
    // PERBAIKAN: Ambil track_covers untuk dikembalikan ke frontend
    const [coverRows] = await db.promise().query(`
      SELECT DISTINCT m.cover_music
      FROM music_cus mc
      JOIN music m ON mc.id_music = m.id_music
      WHERE mc.id_cus = ?
      LIMIT 4
    `, [playlistId]);

    const track_covers = coverRows.map(row => row.cover_music);
    
    // Hitung jumlah track
    const [countRow] = await db.promise().query(
      'SELECT COUNT(*) as count FROM music_cus WHERE id_cus = ?', 
      [playlistId]
    );
    
    const track_count = countRow[0].count;

    updatedPlaylist.hashid = 'C' + hashids.encode(updatedPlaylist.id_auto);
    updatedPlaylist.track_covers = track_covers;
    updatedPlaylist.track_count = track_count;

    return res.json({
      success: true,
      playlistData: updatedPlaylist
    });
  } catch (error) {
    console.error('Gagal update playlist:', error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});




router.delete("/deletePlaylist/:id", async (req, res) => {
  const id_user = req.session.user_id;
  const playlistId = req.params.id;

  if (!id_user) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    // Verify playlist ownership
    const [verifyRows] = await db.promise().query(
      "SELECT id_cus FROM custom_playlist WHERE id_cus = ? AND id_user = ?",
      [playlistId, id_user]
    );

    if (verifyRows.length === 0) {
      return res.status(403).json({ 
        success: false, 
        message: "Not authorized to delete this playlist" 
      });
    }

    // Start transaction to ensure atomic operation
    await db.promise().query("START TRANSACTION");

    try {
      // First delete all tracks associated with this playlist
      await db.promise().query(
        "DELETE FROM music_cus WHERE id_cus = ?",
        [playlistId]
      );

      // Then delete the playlist itself
      await db.promise().query(
        "DELETE FROM custom_playlist WHERE id_cus = ?",
        [playlistId]
      );

      // Commit the transaction if both operations succeed
      await db.promise().query("COMMIT");

      return res.json({ 
        success: true,
        message: "Playlist and all its tracks deleted successfully",
        playlistId: playlistId,
        hashid: hashids.encode(playlistId) // Return encoded hashid for client-side use
      });

    } catch (error) {
      // Rollback if any operation fails
      await db.promise().query("ROLLBACK");
      throw error; // Re-throw to be caught by outer catch
    }

  } catch (error) {
    console.error("Failed to delete playlist:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error while deleting playlist",
      error: error.message 
    });
  }
});


function getTracksByCustomPlaylist(idPlaylist, callback) {
  const sql = `
    SELECT 
      m.id_music, 
      m.audio_file, 
      m.title_music, 
      m.cover_music, 
      m.lyric, 
      m.line_durations, 
      COALESCE(GROUP_CONCAT(DISTINCT a.artist_name SEPARATOR ', '), 'Unknown Artist') AS artist_names,
      COALESCE(GROUP_CONCAT(DISTINCT a.id_artist SEPARATOR ','), '') AS artist_ids
    FROM 
      music m
    JOIN 
      music_cus mc ON m.id_music = mc.id_music
    LEFT JOIN 
      music_artist ma ON m.id_music = ma.id_music
    LEFT JOIN 
      artist a ON ma.id_artist COLLATE utf8mb4_unicode_ci = a.id_artist COLLATE utf8mb4_unicode_ci
    WHERE 
      mc.id_cus = ?
    GROUP BY 
      m.id_music
    ORDER BY 
      MIN(mc.created_at) ASC
  `;
  db.query(sql, [idPlaylist], callback);
}


router.get('/:hashid', async (req, res) => { 
  const hashid = req.params.hashid;
  // Ekstrak ID numerik dari hashid (hapus prefix 'C' jika ada)
  const numericHash = hashid.startsWith('C') ? hashid.substring(1) : hashid;
  const id_auto = hashids.decode(numericHash)[0];
  
  const id_user = req.session.user_id || null;

  if (!id_auto) return res.status(404).send('Invalid custom playlist ID');

  try {
    const [playlistRows] = await db.promise().query(
      `SELECT cp.*, u.name_user, u.profile_user 
       FROM custom_playlist cp
       JOIN users u ON cp.id_user = u.id_user
       WHERE cp.id_auto = ?`,
      [id_auto]
    );

    if (!playlistRows.length) return res.status(404).send('Custom playlist tidak ditemukan');

    const playlist = playlistRows[0];
    // Tambahkan hashid yang benar dengan prefix 'C'
    playlist.hashid = 'C' + hashids.encode(playlist.id_auto);
    playlist.original_id = playlist.id_cus; // Simpan original ID (id_cus)
    
    // TAMBAHAN: Tambahkan user_hashid untuk link ke profil
    playlist.user_hashid = hashids.encode(playlist.id_user);
    
    const isOwner = id_user && playlist.id_user === id_user;

    const trackResult = await new Promise((resolve, reject) =>
      getTracksByCustomPlaylist(playlist.id_cus, (err, result) =>
        err ? reject('Gagal mengambil track') : resolve(result)
      )
    );

    const processedTracks = trackResult.map(track => ({
      ...track,
      playlist_hashid: playlist.hashid, // hashid playlist
      playlist_original_id: playlist.id_cus, // original ID playlist (id_cus)
      track_hashid: 'MU' + hashids.encode(track.id_music),
      cover_music: track.cover_music || playlist.playlist_cover || '/images/default-music.png'
    }));


    let fav_music_ids = [];
    let isPlaylistFavorite = false;
    let libraryData = {
      playlists: [],
      artists: [],
      albums: [],
      favPlaylists: []
    };
    let profileImage = null;
    let userProfile = null;

    // Ambil playlistsByTag dan tagNames untuk navbar
    let playlistsByTag = {};
    let tagNames = {};

    if (id_user) {
      try {
        // Ambil data profil user
        try {
          userProfile = await new Promise((resolve, reject) =>
            getUserProfile(id_user, (err, profile) => {
              if (err) reject(err);
              else {
                // Tambahkan hashid ke userProfile
                profile.hashid = hashids.encode(id_user);
                resolve(profile);
              }
            })
          );
          profileImage = userProfile;
        } catch (e) {
          console.error('Failed to get user profile:', e);
        }

        // Favorite music
        fav_music_ids = await new Promise((resolve, reject) =>
          getFavoriteMusicIdsByUserId(id_user, (e, ids) => e ? reject(e) : resolve(ids))
        );

        // Playlist favorite (jika bukan pemilik) - gunakan id_cus untuk custom playlist
        if (!isOwner) {
          isPlaylistFavorite = await new Promise((resolve, reject) =>
            db.query(
              'SELECT id_fav FROM playlist_fav WHERE id_user = ? AND id_playlist = ?',
              [id_user, playlist.id_cus],
              (e, rows) => e ? reject(e) : resolve(rows.length > 0)
            )
          );
        }

        // Get all library items dengan proses track_covers yang benar
        const libraryItems = await new Promise((resolve, reject) =>
          getLibraryAll(id_user, async (err, items) => {
            if (err) return reject(err);
            
            // Proses track_covers untuk setiap playlist
            for (let item of items) {
              if (item.type === 'playlist') {
                try {
                  // Ambil cover unik untuk playlist ini
                  const covers = await new Promise((resolve, reject) => {
                    db.query(
                      `SELECT DISTINCT m.cover_music 
                       FROM music_cus mc 
                       JOIN music m ON mc.id_music = m.id_music 
                       WHERE mc.id_cus = ? 
                       LIMIT 4`,
                      [item.id],
                      (err, results) => {
                        if (err) reject(err);
                        else resolve(results.map(row => row.cover_music));
                      }
                    );
                  });

                  // Jika semua track memiliki cover yang sama dan lebih dari 1 track,
                  // gunakan single cover saja
                  if (covers.length === 1 && item.track_count > 1) {
                    item.cover = covers[0];
                    item.track_covers = [];
                  } else {
                    item.track_covers = covers;
                  }
                } catch (err) {
                  console.error('Error getting track covers:', err);
                  item.track_covers = [];
                }
              }
            }
            resolve(items);
          })
        );

        const playlists = libraryItems.filter(i => i.type === 'playlist');
        const favPlaylists = libraryItems.filter(i => i.type === 'fav_playlist');
        const albums = libraryItems.filter(i => i.type === 'album');
        const artists = libraryItems.filter(i => i.type === 'artist');

        // Tambahkan hashid untuk SEMUA item library (album dan artist juga)
        [...playlists, ...favPlaylists, ...albums, ...artists].forEach(item => {
          // Untuk custom playlist, gunakan id_auto untuk encode
          if (item.type === 'playlist' && item.id_auto) {
            item.hashid = 'C' + hashids.encode(item.id_auto);
          } 
          // Untuk fav playlist, bedakan antara global dan custom
          else if (item.type === 'fav_playlist') {
            // Jika ini custom playlist yang disimpan
            if (item.playlist_type === 'custom' && item.id_auto) {
              item.hashid = 'C' + hashids.encode(item.id_auto);
            } 
            // Jika ini global playlist yang disimpan
            else {
              item.hashid = hashids.encode(item.id);
            }
          }
          // Untuk album, gunakan id_album_auto untuk encode
          else if (item.type === 'album' && item.id_album_auto) {
            item.hashid = 'AL' + hashids.encode(item.id_album_auto);
          }
          // Untuk artist, gunakan id_artist_auto untuk encode
          else if (item.type === 'artist' && item.id_artist_auto) {
            item.hashid = 'AR' + hashids.encode(item.id_artist_auto);
          }
        });

        libraryData = {
          playlists,
          artists: artists,
          albums: albums,
          favPlaylists
        };
      } catch (e) {
        console.error('Gagal prepare data:', e);
      }
    }

    // Ambil playlistsByTag dan tagNames untuk navbar
    try {
      const playlistResults = await new Promise((resolve, reject) => 
        getPlaylists((err, results) => err ? reject(err) : resolve(results))
      );
      
      // Encode hashid untuk semua playlist global
      playlistResults.forEach(row => {
        row.hashid = hashids.encode(row.id_playlist);
      });

      playlistResults.forEach(row => {
        if (!playlistsByTag[row.id_tag]) {
          playlistsByTag[row.id_tag] = [];
          tagNames[row.id_tag] = row.tag_name;
        }
        playlistsByTag[row.id_tag].push(row);
      });
    } catch (error) {
      console.error('Error getting playlists:', error);
    }

    // Process tracks
    const tracksWithExtras = await Promise.all(
      processedTracks.map(async t => {
        const albums = await new Promise((r, x) =>
          getAlbumsByMusicId(t.id_music, (e, res) => e ? x(e) : r(res))
        );

        // Beri hashid untuk setiap album
        const albumsWithHashid = albums.map(album => {
          const idToEncode = album.id_album_auto || album.id_al;
          const hashid = idToEncode ? 'AL' + hashids.encode(idToEncode) : 'AL0';
          return {
            ...album,
            hashid: hashid
          };
        });

        // Buat array artist dengan hashid yang UNIK
        const artistNames = t.artist_names ? t.artist_names.split(',').map(name => name.trim()) : ['Unknown Artist'];
        const artistIds = t.artist_ids ? t.artist_ids.split(',').map(id => id.trim()) : [];
        
        // Buat array artist dengan hashid yang UNIK
        const artistsWithHashid = artistNames.map((name, index) => {
          const artistId = artistIds[index];
          
          // Gunakan ID yang unik untuk setiap artist
          let idToEncode;
          
          if (artistId && artistId.startsWith('AR')) {
            // Jika artistId sudah dalam format AR1, AR2, ekstrak angka nya
            const numericId = parseInt(artistId.substring(2)) || 0;
            idToEncode = numericId;
          } else if (artistId) {
            // Jika artistId adalah angka biasa
            idToEncode = parseInt(artistId) || 0;
          } else {
            // Jika tidak ada artistId, gunakan index + track id untuk membuat ID unik
            idToEncode = (t.id_music * 1000) + index;
          }
          
          const hashid = 'AR' + hashids.encode(idToEncode);
          
          return {
            name: name,
            id: artistId,
            hashid: hashid
          };
        });

        let duration = { formatted: '0:00', seconds: 0 };
        try {
          duration = await getAudioDuration(
            path.join(__dirname, '../public', t.audio_file)
          );
        } catch (e) {
          console.error('Error getting audio duration:', e);
        }

        const custom_playlists = id_user
          ? await getAvailableCustomPlaylists(id_user, t.id_music)
          : [];

        return {
          ...t,
          albums: albumsWithHashid,
          artists: artistsWithHashid,
          duration: duration.formatted,
          durationSeconds: duration.seconds,
          isFavorite: fav_music_ids.includes(t.id_music),
          custom_playlists,
          hashid: t.track_hashid
        };
      })
    );

    playlist.tracks = tracksWithExtras;
    playlist.totalDuration = tracksWithExtras.reduce(
      (sum, t) => sum + (t.durationSeconds || 0),
      0
    );

    const totalHours = Math.floor(playlist.totalDuration / 3600);
    const totalMinutes = Math.floor((playlist.totalDuration % 3600) / 60);
    playlist.formattedDuration = `${totalHours > 0 ? `${totalHours} hr ` : ''}${totalMinutes} min`;

    const resourceVersion = Date.now();

    // Render options yang LENGKAP
    const renderOptions = {
      playlist,
      isPlaylistPage: true,
      isArtistPage: false,
      isAlbumPage: false,
      isFavMusicPage: false,
      isMusicPage: false,
      isSearchPage: false,
      isLyricPage: false,
      isProfilePage: false,
      isCategoryPage : false,
      playlistsByTag,
      tagNames,
      customPlaylists: libraryData.playlists,
      libraryData,
      profileImage,
      userProfile,
      isPlaylistFavorite,
      userId: id_user,
      isOwner,
      resourceVersion,
      artist: null,
      album: null,
      music: null,
      favMusic: null
    };

    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    res.render(req.xhr ? 'partials/custom_playlist' : 'index', renderOptions);
  } catch (error) {
    console.error('Gagal memuat custom playlist:', error);
    res.status(500).send('Terjadi kesalahan server');
  }
});

router.get("/editcustom/:id", async (req, res) => {
  const id_user = req.session.user_id;
  const playlistIdentifier = req.params.id;

  console.log("Edit custom requested:", { id_user, playlistIdentifier });

  if (!id_user) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    let query;
    let params;

    // Gunakan query yang SAMA dengan route utama untuk konsistensi
    if (playlistIdentifier.startsWith('C')) {
      query = `
        SELECT cp.*, u.name_user, u.profile_user 
        FROM custom_playlist cp
        JOIN users u ON cp.id_user = u.id_user
        WHERE cp.id_cus = ? AND cp.id_user = ?
      `;
      params = [playlistIdentifier, id_user];
    } else {
      const id_auto = parseInt(playlistIdentifier);
      query = `
        SELECT cp.*, u.name_user, u.profile_user 
        FROM custom_playlist cp
        JOIN users u ON cp.id_user = u.id_user
        WHERE cp.id_auto = ? AND cp.id_user = ?
      `;
      params = [id_auto, id_user];
    }

    console.log("Executing query:", query, "with params:", params);

    const [playlistRows] = await db.promise().query(query, params);

    console.log("Playlist rows found:", playlistRows.length);

    if (playlistRows.length === 0) {
      return res.status(404).json({ success: false, message: "Playlist not found or access denied" });
    }

    const playlist = playlistRows[0];
    console.log("Raw playlist data from DB:", playlist);
    
    // 2. Ambil cover tracks - Gunakan query yang SAMA dengan route utama
    let trackCovers = [];
    let trackCount = 0;
    
    try {
      // Query yang sama dengan route utama untuk consistency
      const [coverRows] = await db.promise().query(
        `SELECT DISTINCT m.cover_music 
         FROM music_cus mc 
         JOIN music m ON mc.id_music = m.id_music 
         WHERE mc.id_cus = ? 
         LIMIT 4`,
        [playlist.id_cus]
      );

      trackCovers = coverRows.map(row => row.cover_music);
      console.log("Cover tracks found:", trackCovers);

      // Hitung jumlah track
      const [countRow] = await db.promise().query(
        'SELECT COUNT(*) as count FROM music_cus WHERE id_cus = ?', 
        [playlist.id_cus]
      );
      trackCount = countRow[0].count;
      console.log("Track count:", trackCount);

    } catch (coverError) {
      console.error("Error getting track covers:", coverError);
    }

    // 3. Format response data - SAMA dengan logic route utama
    const useCollage = trackCount > 1 && trackCovers.length > 1;
    const covers = trackCovers.length > 0 ? trackCovers : [playlist.playlist_cover];

    const responseData = {
      id_auto: playlist.id_auto,
      id_cus: playlist.id_cus,
      playlist_name: playlist.playlist_name,
      playlist_cover: playlist.playlist_cover,
      description: playlist.description,
      id_user: playlist.id_user,
      created_at: playlist.created_at,
      name_user: playlist.name_user,
      profile_user: playlist.profile_user,
      track_covers: trackCovers,
      track_count: trackCount,
      use_collage: useCollage,
      covers: covers,
      // Cover utama untuk display
      display_cover: useCollage ? covers[0] : (covers.length > 0 ? covers[0] : '/uploads/undefine.jpg')
    };

    console.log("Final response data:", responseData);

    return res.json({ 
      success: true, 
      playlist: responseData
    });

  } catch (error) {
    console.error("Error in /editcustom route:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error: " + error.message 
    });
  }
});


router.get('/:hashid/tracks', async (req, res) => {
  const hashid = req.params.hashid;
  const id = hashids.decode(hashid)[0];
  const id_user = req.session.user_id || null;

  if (!id) return res.status(400).send("Invalid hashid");

  try {
    const [playlistRows] = await db.promise().query(
      `SELECT cp.*, u.name_user, u.profile_user 
       FROM custom_playlist cp
       JOIN users u ON cp.id_user = u.id_user
       WHERE cp.id_cus = ?`,
      [id]
    );

    if (!playlistRows.length) return res.status(404).json({ error: 'Playlist not found' });

    const playlist = playlistRows[0];
    playlist.hashid = hashid;

    let fav_music_ids = [];
    if (id_user) {
      fav_music_ids = await new Promise((resolve, reject) =>
        getFavoriteMusicIdsByUserId(id_user, (e, ids) => e ? reject(e) : resolve(ids))
      );
    }

    getTracksByCustomPlaylist(id, async (err, tracks) => {
      if (err) return res.status(500).json({ error: "Failed to get tracks" });

      const tracksWithExtras = await Promise.all(tracks.map(async t => {
        const albums = await new Promise((r, x) =>
          getAlbumsByMusicId(t.id_music, (e, res) => e ? x(e) : r(res))
        );

        const duration = await getAudioDuration(path.join(__dirname, '../public', t.audio_file));

        const custom_playlists = id_user
          ? await getAvailableCustomPlaylists(id_user, t.id_music)
          : [];

        return {
          ...t,
          hashid,
          albums,
          duration: duration.formatted,
          durationSeconds: duration.seconds,
          isFavorite: fav_music_ids.includes(t.id_music),
          cover_music: t.cover_music || playlist.playlist_cover,
          custom_playlists
        };
      }));

      playlist.tracks = tracksWithExtras;
      playlist.totalTracks = tracksWithExtras.length;
      
      // Calculate total duration
      playlist.totalDuration = tracksWithExtras.reduce((sum, track) => sum + (track.durationSeconds || 0), 0);
      const totalHours = Math.floor(playlist.totalDuration / 3600);
      const totalMinutes = Math.floor((playlist.totalDuration % 3600) / 60);
      playlist.formattedDuration = 
        `${totalHours > 0 ? `${totalHours} hr ` : ''}${totalMinutes} min`;

      // Render all partials
      const [playlistInfoHTML, tracksHTML, playButtonHTML] = await Promise.all([
        new Promise((resolve, reject) => {
          res.render("partials/loadcustom/playlist_info", { playlist }, (err, html) => {
            if (err) reject(err);
            else resolve(html);
          });
        }),
        new Promise((resolve, reject) => {
          res.render("partials/loadcustom/playlist_tracks_only", { playlist, tracks: tracksWithExtras }, (err, html) => {
            if (err) reject(err);
            else resolve(html);
          });
        }),
        new Promise((resolve, reject) => {
          res.render("partials/loadcustom/play_button", { playlist }, (err, html) => {
            if (err) reject(err);
            else resolve(html);
          });
        })
      ]);

      res.json({
        playlistInfoHTML,
        tracksHTML,
        playButtonHTML: playlist.totalTracks > 0 ? playButtonHTML : '',
        totalTracks: playlist.totalTracks,
        formattedDuration: playlist.formattedDuration
      });
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});


module.exports = router;