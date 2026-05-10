const express = require('express');
const cookieParser = require('cookie-parser');
const sessionMiddleware = require('./config/session');
const {db,getPlaylists, getUserProfile, getPlaylistById, getTracksByPlaylist,getAlbumsByMusicId,getFavoriteMusicIdsByUserId,getAvailableCustomPlaylists,getLibraryAll, getTrackCovers} = require('./db');
const path = require('path');
const Hashids = require('hashids');
const hashids = new Hashids('goovlize-secret', 6); // salt & min length 6
const authRoutes = require('./routes/auth');
const playlistRoutes = require('./routes/playlist');
const searchRoutes = require('./routes/search');
const customRoutes = require('./routes/custom');
const profileRoutes = require('./routes/profile');
const adminAuthRoutes = require('./routes/admin/auth');
const adminDashboardRoutes = require('./routes/admin/dashboard');
const adminMusicRoutes = require('./routes/admin/music');
// Di app.js atau routes.js utama, tambahkan:
const adminplaylistRouter = require('./routes/admin/playlist');
const musicPlaylistRouter = require('./routes/admin/music-playlist');
const albumRoutes = require('./routes/admin/album');
const artistRoutes = require('./routes/admin/artist');
const musicAlbumRoutes = require('./routes/admin/music-album');
const genreRoutes = require('./routes/admin/genre');
const statsRoutes = require('./routes/admin/statistics');


require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use(sessionMiddleware);

// Middleware untuk menjaga session admin saat operasi passport
app.use((req, res, next) => {
  // Simpan session admin sebelum operasi passport
  if (!req._adminSessionSaved && req.session.admin) {
    req._savedAdminSession = req.session.admin;
    req._adminSessionSaved = true;
  }
  next();
});

// Middleware untuk memisahkan session user dan admin
app.use((req, res, next) => {
  // Jika ada admin session, jangan overwrite dengan user session
  if (req.session.admin && !req.session.user_id) {
    // Admin sedang login, biarkan user session kosong
    // req.session.user_id = null; // Tidak perlu set null
  }
  next();
});

// Set engine
app.set('view engine', 'ejs');

// Routes
app.use('/', authRoutes);
app.use('/', playlistRoutes);
app.use('/', searchRoutes);
app.use('/', adminAuthRoutes);
app.use('/', adminDashboardRoutes);
app.use('/', adminMusicRoutes);
app.use('/', adminplaylistRouter);
app.use(musicPlaylistRouter);
app.use(albumRoutes);
app.use('/', artistRoutes);
app.use('/custom', customRoutes);
app.use('/profile', profileRoutes);
app.use('/', musicAlbumRoutes);
app.use('/', genreRoutes);
app.use('/admin', statsRoutes);
const chatbotRoutes = require('./routes/chatbot');
const personalizationRoutes = require('./routes/personalization');

app.use('/chatbot', chatbotRoutes);
app.use('/personalization', personalizationRoutes);

app.get('/', (req, res) => {
  const userId = req.session.user_id;

  // Gunakan fungsi baru untuk mendapatkan playlist dengan rekomendasi
  getRecommendedPlaylists(userId, (err, results) => {
    if (err) {
      console.error('Error getting recommended playlists:', err);
      return res.status(500).send('Gagal mengambil data playlist.');
    }

    // Encode hashid untuk semua playlist global
    results.forEach(row => {
      row.hashid = hashids.encode(row.id_playlist);
    });

    // Ambil semua tag yang ada
    db.query('SELECT * FROM tag_playlist ORDER BY id_tag', (err, tags) => {
      if (err) {
        console.error('Error getting tags:', err);
        return res.status(500).send('Gagal mengambil data tag.');
      }

      // Distribusikan playlist ke dalam 2 tag
      const playlistsByTag = {};
      const tagNames = {};
      
      // Inisialisasi struktur untuk 2 tag
      tags.forEach(tag => {
        playlistsByTag[tag.id_tag] = [];
        tagNames[tag.id_tag] = tag.tag_name;
      });

      // Distribusikan playlist secara merata ke 2 tag
      // Setiap tag minimal 13 playlist (total 16 playlist)
      const totalPlaylists = results.length;
      const playlistsPerTag = Math.ceil(totalPlaylists / tags.length);
      
      tags.forEach((tag, tagIndex) => {
        const startIdx = tagIndex * playlistsPerTag;
        const endIdx = Math.min(startIdx + playlistsPerTag, totalPlaylists);
        
        // Ambil playlist untuk tag ini
        const tagPlaylists = results.slice(startIdx, endIdx);
        playlistsByTag[tag.id_tag] = tagPlaylists;
        
        console.log(`Tag ${tag.tag_name}: ${tagPlaylists.length} playlists`);
      });

      if (userId) {
        Promise.all([
          // Ambil profil user
          new Promise((resolve, reject) => {
            getUserProfile(userId, (err, userProfile) => {
              if (err) reject(err);
              else {
                userProfile.hashid = hashids.encode(userId);
                resolve(userProfile);
              }
            });
          }),

          // Ambil library dan proses playlist dengan track_count & cover
          new Promise((resolve, reject) => {
            getLibraryAll(userId, async (err, libraryItems) => {
              if (err) return reject(err);

              // Fungsi untuk mendapatkan covers
              const getCovers = async (id_cus) => {
                return new Promise((resolve, reject) => {
                  db.query(
                    `SELECT DISTINCT m.cover_music 
                     FROM music_cus mc 
                     JOIN music m ON mc.id_music = m.id_music 
                     WHERE mc.id_cus = ? 
                     LIMIT 4`,
                    [id_cus],
                    (err, results) => {
                      if (err) reject(err);
                      else resolve(results.map(row => row.cover_music));
                    }
                  );
                });
              };

              // Fungsi untuk mendapatkan track count
              const getTrackCount = async (id_cus) => {
                return new Promise((resolve, reject) => {
                  db.query(
                    'SELECT COUNT(*) as count FROM music_cus WHERE id_cus = ?',
                    [id_cus],
                    (err, result) => {
                      if (err) reject(err);
                      else resolve(result[0].count);
                    }
                  );
                });
              };

              for (let item of libraryItems) {
                if (item.type === 'playlist') {
                  try {
                    item.track_count = await getTrackCount(item.id);
                    const covers = await getCovers(item.id);

                    if (covers.length === 1 && item.track_count > 1) {
                      item.cover = covers[0];
                      item.track_covers = [];
                    } else {
                      item.track_covers = covers;
                    }
                  } catch (err) {
                    console.error('Error getting track covers or count:', err);
                    item.track_covers = [];
                  }
                }
              }

              resolve(libraryItems);
            });
          }),

          // Ambil musik favorit user (top 3) - BISA KOSONG
          new Promise((resolve, reject) => {
            db.query(`
              SELECT mf.id_music, 
                     m.title_music, 
                     m.cover_music,
                     (SELECT a.artist_name 
                      FROM music_artist ma 
                      JOIN artist a ON ma.id_artist = a.id_artist 
                      WHERE ma.id_music = mf.id_music 
                      LIMIT 1) as artist_name,
                     COUNT(mf.id_fav) as play_count
              FROM music_fav mf
              JOIN music m ON mf.id_music = m.id_music
              WHERE mf.id_user = ?
              GROUP BY mf.id_music, m.title_music, m.cover_music
              ORDER BY COUNT(mf.id_fav) DESC
              LIMIT 3
            `, [userId], (err, results) => {
              if (err) {
                console.error('Error getting favorite songs:', err);
                // JANGAN reject, berikan array kosong
                resolve([]);
              } else {
                resolve(results || []);
              }
            });
          }),

          // Ambil 4 musik terakhir yang diputar dari recent_activity - TANPA DUPLIKASI
          new Promise((resolve, reject) => {
            db.query(`
              SELECT 
                latest.id_music,
                m.title_music, 
                m.cover_music,
                (SELECT a.artist_name 
                 FROM music_artist ma 
                 JOIN artist a ON ma.id_artist = a.id_artist 
                 WHERE ma.id_music = latest.id_music 
                 LIMIT 1) as artist_name,
                latest.last_played
              FROM (
                SELECT 
                  ra.id_music,
                  MAX(ra.played_at) as last_played
                FROM recent_activity ra
                WHERE ra.id_user = ?
                GROUP BY ra.id_music
                ORDER BY last_played DESC
                LIMIT 4
              ) latest
              JOIN music m ON latest.id_music = m.id_music
              ORDER BY latest.last_played DESC
            `, [userId], (err, results) => {
              if (err) {
                console.error('Error getting recent plays:', err);
                // JANGAN reject, berikan array kosong
                resolve([]);
              } else {
                resolve(results || []);
              }
            });
          }),

          // Ambil 2 playlist terakhir yang diputar
          new Promise((resolve, reject) => {
            db.query(`
              SELECT 
                ra.item_id,
                p.playlist_name,
                p.playlist_cover,
                p.id_tag,
                MAX(ra.played_at) as last_played
              FROM recent_activity ra
              JOIN playlist p ON ra.item_id = p.id_playlist
              WHERE ra.id_user = ? 
                AND ra.item_type = 'playlist'
              GROUP BY ra.item_id, p.playlist_name, p.playlist_cover, p.id_tag
              ORDER BY last_played DESC
              LIMIT 2
            `, [userId], (err, results) => {
              if (err) {
                console.error('Error getting recent playlists:', err);
                // JANGAN reject, berikan array kosong
                resolve([]);
              } else {
                resolve(results || []);
              }
            });
          }),

          // Ambil 2 custom playlist terakhir yang diputar
          new Promise((resolve, reject) => {
            db.query(`
              SELECT 
                ra.item_id,
                cp.playlist_name,
                cp.id_user as creator_id,
                u.name_user as creator_name,
                cp.id_auto,
                cp.id_cus,
                (SELECT m.cover_music 
                 FROM music_cus mc 
                 JOIN music m ON mc.id_music = m.id_music 
                 WHERE mc.id_cus = cp.id_cus 
                 LIMIT 1) as playlist_cover,
                (SELECT COUNT(*) FROM music_cus WHERE id_cus = cp.id_cus) as track_count,
                MAX(ra.played_at) as last_played
              FROM recent_activity ra
              JOIN custom_playlist cp ON ra.item_id = cp.id_cus
              LEFT JOIN users u ON cp.id_user = u.id_user
              WHERE ra.id_user = ? 
                AND ra.item_type = 'custom_playlist'
              GROUP BY ra.item_id, cp.playlist_name, cp.id_user, u.name_user, cp.id_auto, cp.id_cus
              ORDER BY last_played DESC
              LIMIT 2
            `, [userId], async (err, results) => {
              if (err) {
                console.error('Error getting recent custom playlists:', err);
                // JANGAN reject, berikan array kosong
                resolve([]);
              } else {
                // Ambil track_covers untuk setiap custom playlist
                const playlistsWithCovers = await Promise.all(
                  results.map(async (playlist) => {
                    try {
                      const covers = await new Promise((resolve, reject) => {
                        db.query(
                          `SELECT DISTINCT m.cover_music 
                           FROM music_cus mc 
                           JOIN music m ON mc.id_music = m.id_music 
                           WHERE mc.id_cus = ? 
                           LIMIT 4`,
                          [playlist.id_cus],
                          (err, coverResults) => {
                            if (err) reject(err);
                            else resolve(coverResults.map(row => row.cover_music));
                          }
                        );
                      });
                      
                      playlist.track_covers = covers;
                      
                      if (covers.length === 1 && playlist.track_count > 1) {
                        playlist.playlist_cover = covers[0];
                        playlist.track_covers = [];
                      }
                      
                      return playlist;
                    } catch (coverErr) {
                      console.error('Error getting covers for recent custom playlist:', coverErr);
                      playlist.track_covers = [];
                      return playlist;
                    }
                  })
                );
                
                resolve(playlistsWithCovers || []);
              }
            });
          }),

          // Ambil 2 artist terakhir yang diputar
          new Promise((resolve, reject) => {
            db.query(`
              SELECT 
                a.id_artist,
                a.id_artist_auto,
                a.artist_name,
                a.artist_profile,
                MAX(ra.played_at) as last_played
              FROM recent_activity ra
              JOIN music m ON ra.id_music = m.id_music
              JOIN music_artist ma ON m.id_music = ma.id_music
              JOIN artist a ON ma.id_artist = a.id_artist
              WHERE ra.id_user = ?
                AND ra.item_type = 'artist'
              GROUP BY a.id_artist, a.id_artist_auto, a.artist_name, a.artist_profile
              ORDER BY last_played DESC
              LIMIT 2
            `, [userId], (err, results) => {
              if (err) {
                console.error('Error getting recent artists:', err);
                // JANGAN reject, berikan array kosong
                resolve([]);
              } else {
                resolve(results || []);
              }
            });
          })
        ])
          .then(([userProfile, libraryItems, favoriteSongs, recentPlays, recentPlaylists, recentCustomPlaylists, recentArtists]) => {
            const navbarPlaylists = libraryItems.filter(item => item.type === 'playlist');
            const favPlaylists = libraryItems.filter(item => item.type === 'fav_playlist');
            const albums = libraryItems.filter(item => item.type === 'album');
            const artists = libraryItems.filter(item => item.type === 'artist');

            // Encode hashid untuk semua item library
            [...navbarPlaylists, ...favPlaylists, ...albums, ...artists].forEach(item => {
              if (item.type === 'playlist' && item.id_auto) {
                item.hashid = 'C' + hashids.encode(item.id_auto);
              } else if (item.type === 'fav_playlist') {
                if (item.playlist_type === 'custom' && item.id_auto) {
                  item.hashid = 'C' + hashids.encode(item.id_auto);
                } else {
                  item.hashid = hashids.encode(item.id);
                }
              } else if (item.type === 'album' && item.id_album_auto) {
                item.hashid = 'AL' + hashids.encode(item.id_album_auto);
              } else if (item.type === 'artist' && item.id_artist_auto) {
                item.hashid = 'AR' + hashids.encode(item.id_artist_auto);
              }
            });

            // Tambahkan hashid untuk favorite songs (jika ada)
            const favoriteSongsWithHashid = favoriteSongs.map(song => ({
              ...song,
              hashid: hashids.encode(song.id_music)
            }));

            // Tambahkan hashid untuk recent plays (jika ada)
            const recentPlaysWithHashid = recentPlays.map(song => ({
              ...song,
              hashid: hashids.encode(song.id_music)
            }));

            // Tambahkan hashid untuk recent playlists (jika ada)
            const recentPlaylistsWithHashid = recentPlaylists.map(playlist => ({
              ...playlist,
              hashid: hashids.encode(playlist.item_id),
              type: 'playlist'
            }));

            // Tambahkan hashid untuk recent custom playlists (jika ada)
            const recentCustomPlaylistsWithHashid = recentCustomPlaylists.map(playlist => {
              const idToEncode = playlist.id_auto || parseInt(playlist.item_id.replace('CUS', ''));
              return {
                ...playlist,
                hashid: 'C' + hashids.encode(idToEncode),
                type: 'custom_playlist',
                track_covers: playlist.track_covers || [],
                track_count: playlist.track_count || 0
              };
            });

            // Tambahkan hashid untuk recent artists (jika ada)
            const recentArtistsWithHashid = recentArtists.map(artist => {
              const idToEncode = artist.id_artist_auto || artist.id_artist;
              return {
                ...artist,
                hashid: 'AR' + hashids.encode(idToEncode),
                type: 'artist'
              };
            });

            console.log('User activity stats:', {
              favoriteSongsCount: favoriteSongsWithHashid.length,
              recentPlaysCount: recentPlaysWithHashid.length,
              recentPlaylistsCount: recentPlaylistsWithHashid.length,
              recentCustomPlaylistsCount: recentCustomPlaylistsWithHashid.length,
              recentArtistsCount: recentArtistsWithHashid.length
            });

            res.render('index', {
              playlistsByTag,
              tagNames,
              customPlaylists: navbarPlaylists,
              libraryData: {
                playlists: navbarPlaylists,
                artists: artists,
                albums: albums,
                favPlaylists: favPlaylists
              },
              profileImage: userProfile,
              isPlaylistPage: false,
              isArtistPage: false,
              isAlbumPage: false,
              isMusicPage: false,
              isFavMusicPage: false,
              isSearchPage: false,
              isLyricPage: false,
              isProfilePage: false,
              isCategoryPage: false,
              isTop50Page: false,
              isMostPlayedPage: false,
              playlist: null,
              artist: null,
              album: null,
              music: null,
              favMusic: null,
              userProfile: userProfile,
              userId,
              // SEMUA recent activity DITAMPILKAN TERLEPAS ADA FAVORITE ATAU TIDAK
              favoriteSongs: favoriteSongsWithHashid,
              recentPlays: recentPlaysWithHashid,
              recentPlaylists: recentPlaylistsWithHashid,
              recentCustomPlaylists: recentCustomPlaylistsWithHashid,
              recentArtists: recentArtistsWithHashid,
              debugInfo: {
                totalPlaylists: results.length,
                tagsCount: tags.length,
                tags: tags.map(t => ({ id: t.id_tag, name: t.tag_name, count: playlistsByTag[t.id_tag]?.length || 0 }))
              }
            });
          })
          .catch(err => {
            console.error('Gagal mengambil data pengguna:', err);
            res.status(500).send('Gagal mengambil data pengguna.');
          });
      } else {
        // Tanpa login - tetap distribusikan playlist ke 2 tag
        res.render('index', {
          playlistsByTag,
          tagNames,
          customPlaylists: [],
          libraryData: {
            playlists: [],
            artists: [],
            albums: [],
            favPlaylists: []
          },
          profileImage: null,
          isPlaylistPage: false,
          isArtistPage: false,
          isAlbumPage: false,
          isMusicPage: false,
          isFavMusicPage: false,
          isSearchPage: false,
          isLyricPage: false,
          isProfilePage: false,
          isCategoryPage: false,
          isTop50Page: false,
          isMostPlayedPage: false,
          playlist: null,
          artist: null,
          album: null,
          music: null,
          favMusic: null,
          userId: null,
          favoriteSongs: null,
          recentPlays: null,
          recentPlaylists: null,
          recentCustomPlaylists: null,
          recentArtists: null,
          debugInfo: {
            totalPlaylists: results.length,
            tagsCount: tags.length,
            tags: tags.map(t => ({ id: t.id_tag, name: t.tag_name, count: playlistsByTag[t.id_tag]?.length || 0 }))
          }
        });
      }
    });
  });
});


function getRecommendedPlaylists(userId, callback) {
  if (!userId) {
    db.query(
      `SELECT p.*, COALESCE(tp.tag_name, 'Uncategorized') as tag_name 
       FROM playlist p 
       LEFT JOIN tag_playlist tp ON p.id_tag = tp.id_tag 
       ORDER BY RAND()`,
      (err, results) => {
        if (err) return callback(err);
        callback(null, results);
      }
    );
    return;
  }

  db.query(
    `SELECT p.*, COALESCE(tp.tag_name, 'Uncategorized') as tag_name 
     FROM playlist p 
     LEFT JOIN tag_playlist tp ON p.id_tag = tp.id_tag`,
    (err, allPlaylists) => {
      if (err) return callback(err);

      db.query(`
        SELECT DISTINCT mg.id_genre, g.genre_name, COUNT(*) as play_count
        FROM recent_activity ra
        JOIN music m ON ra.id_music = m.id_music
        JOIN music_genre mg ON m.id_music = mg.id_music
        JOIN genre g ON mg.id_genre = g.id_genre
        WHERE ra.id_user = ?
        GROUP BY mg.id_genre, g.genre_name
        ORDER BY play_count DESC
        LIMIT 5
      `, [userId], (err, userGenres) => {
        if (err) return callback(err);

        if (userGenres && userGenres.length > 0) {
          const favoriteGenreIds = userGenres.map(g => g.id_genre);
          
          db.query(`
            SELECT DISTINCT p.*, COALESCE(tp.tag_name, 'Uncategorized') as tag_name,
                   COUNT(DISTINCT mg.id_genre) as matching_genres,
                   SUM(
                     CASE WHEN mg.id_genre IN (?) THEN 1 ELSE 0 END
                   ) as priority_score
            FROM playlist p
            LEFT JOIN tag_playlist tp ON p.id_tag = tp.id_tag
            LEFT JOIN music_playlist mp ON p.id_playlist = mp.id_playlist
            LEFT JOIN music_genre mg ON mp.id_music = mg.id_music
            WHERE mg.id_genre IN (?) OR mg.id_genre IS NULL
            GROUP BY p.id_playlist, p.playlist_name, p.playlist_cover, p.id_tag, tp.tag_name
            ORDER BY 
              priority_score DESC,
              matching_genres DESC,
              p.created_at DESC
          `, [favoriteGenreIds, favoriteGenreIds], (err, recommendedPlaylists) => {
            if (err) return callback(err);
            
            const allPlaylistIds = new Set(allPlaylists.map(p => p.id_playlist));
            const recommendedPlaylistIds = new Set(recommendedPlaylists.map(p => p.id_playlist));
            
            recommendedPlaylists.forEach(p => allPlaylistIds.add(p.id_playlist));
            
            const remainingPlaylists = allPlaylists.filter(p => !recommendedPlaylistIds.has(p.id_playlist));
            const shuffledRemaining = [...remainingPlaylists].sort(() => Math.random() - 0.5);
            
            const finalPlaylists = [...recommendedPlaylists, ...shuffledRemaining];
            
            callback(null, finalPlaylists);
          });
        } else {
          const shuffledPlaylists = [...allPlaylists].sort(() => Math.random() - 0.5);
          callback(null, shuffledPlaylists);
        }
      });
    }
  );
}


app.get('/partial/home', async (req, res) => {
  const userId = req.session.user_id || null;

  // Gunakan fungsi baru untuk mendapatkan playlist dengan rekomendasi
  getRecommendedPlaylists(userId, (err, results) => {
    if (err) {
      console.error('Error getting recommended playlists in partial:', err);
      return res.status(500).send('Gagal mengambil data playlist.');
    }

    results.forEach(row => {
      row.hashid = hashids.encode(row.id_playlist);
    });

    // Ambil semua tag yang ada
    db.query('SELECT * FROM tag_playlist ORDER BY id_tag', (err, tags) => {
      if (err) {
        console.error('Error getting tags in partial:', err);
        return res.status(500).send('Gagal mengambil data tag.');
      }

      const playlistsByTag = {};
      const tagNames = {};
      
      // Inisialisasi struktur untuk semua tag
      tags.forEach(tag => {
        playlistsByTag[tag.id_tag] = [];
        tagNames[tag.id_tag] = tag.tag_name;
      });

      // Distribusikan playlist secara merata ke semua tag
      const totalPlaylists = results.length;
      const playlistsPerTag = Math.ceil(totalPlaylists / tags.length);
      
      tags.forEach((tag, tagIndex) => {
        const startIdx = tagIndex * playlistsPerTag;
        const endIdx = Math.min(startIdx + playlistsPerTag, totalPlaylists);
        
        const tagPlaylists = results.slice(startIdx, endIdx);
        playlistsByTag[tag.id_tag] = tagPlaylists;
      });

      if (!userId) {
        return res.render('partials/home', {
          playlistsByTag,
          tagNames,
          userId: null,
          libraryData: { playlists: [], artists: [], albums: [], favPlaylists: [] },
          isArtistPage: false,
          favoriteSongs: null,
          recentPlays: null,
          recentPlaylists: null,
          recentCustomPlaylists: null,
          recentArtists: null
        });
      }

      getLibraryAll(userId, async (err, libraryItems) => {
        if (err) return res.status(500).send('Gagal mengambil library data.');

        const navbarPlaylists = libraryItems.filter(item => item.type === 'playlist');
        const favPlaylists = libraryItems.filter(item => item.type === 'fav_playlist');
        const albums = libraryItems.filter(item => item.type === 'album');
        const artists = libraryItems.filter(item => item.type === 'artist');

        // Tambahkan hashid untuk semua item library
        [...navbarPlaylists, ...favPlaylists, ...albums, ...artists].forEach(item => {
          if (item.type === 'playlist' && item.id_auto) {
            item.hashid = 'C' + hashids.encode(item.id_auto);
          } else if (item.type === 'fav_playlist') {
            if (item.playlist_type === 'custom' && item.id_auto) {
              item.hashid = 'C' + hashids.encode(item.id_auto);
            } else {
              item.hashid = hashids.encode(item.id);
            }
          } else if (item.type === 'album' && item.id_album_auto) {
            item.hashid = 'AL' + hashids.encode(item.id_album_auto);
          } else if (item.type === 'artist' && item.id_artist_auto) {
            item.hashid = 'AR' + hashids.encode(item.id_artist_auto);
          }
        });

        // Ambil musik favorit user (top 3)
        let favoriteSongs = [];
        try {
          const favoriteResults = await new Promise((resolve, reject) => {
            db.query(`
              SELECT mf.id_music, 
                     m.title_music, 
                     m.cover_music,
                     (SELECT a.artist_name 
                      FROM music_artist ma 
                      JOIN artist a ON ma.id_artist = a.id_artist 
                      WHERE ma.id_music = mf.id_music 
                      LIMIT 1) as artist_name,
                     COUNT(mf.id_fav) as play_count
              FROM music_fav mf
              JOIN music m ON mf.id_music = m.id_music
              WHERE mf.id_user = ?
              GROUP BY mf.id_music, m.title_music, m.cover_music
              ORDER BY COUNT(mf.id_fav) DESC
              LIMIT 3
            `, [userId], (err, results) => {
              if (err) reject(err);
              else resolve(results || []);
            });
          });
          
          favoriteSongs = favoriteResults.map(song => ({
            ...song,
            hashid: hashids.encode(song.id_music)
          }));
        } catch (error) {
          console.error('Error getting favorite songs in partial:', error);
          favoriteSongs = [];
        }

        // Ambil 4 musik terakhir yang diputar - TANPA DUPLIKASI
        let recentPlays = [];
        try {
          const recentResults = await new Promise((resolve, reject) => {
            db.query(`
              SELECT 
                latest.id_music,
                m.title_music, 
                m.cover_music,
                (SELECT a.artist_name 
                 FROM music_artist ma 
                 JOIN artist a ON ma.id_artist = a.id_artist 
                 WHERE ma.id_music = latest.id_music 
                 LIMIT 1) as artist_name,
                latest.last_played
              FROM (
                SELECT 
                  ra.id_music,
                  MAX(ra.played_at) as last_played
                FROM recent_activity ra
                WHERE ra.id_user = ?
                GROUP BY ra.id_music
                ORDER BY last_played DESC
                LIMIT 4
              ) latest
              JOIN music m ON latest.id_music = m.id_music
              ORDER BY latest.last_played DESC
            `, [userId], (err, results) => {
              if (err) reject(err);
              else resolve(results || []);
            });
          });
          
          recentPlays = recentResults.map(song => ({
            ...song,
            hashid: hashids.encode(song.id_music)
          }));
        } catch (error) {
          console.error('Error getting recent plays in partial:', error);
          recentPlays = [];
        }

        // Ambil 2 playlist terakhir yang diputar
        let recentPlaylists = [];
        try {
          const playlistResults = await new Promise((resolve, reject) => {
            db.query(`
              SELECT 
                ra.item_id,
                p.playlist_name,
                p.playlist_cover,
                p.id_tag,
                MAX(ra.played_at) as last_played
              FROM recent_activity ra
              JOIN playlist p ON ra.item_id = p.id_playlist
              WHERE ra.id_user = ? 
                AND ra.item_type = 'playlist'
              GROUP BY ra.item_id, p.playlist_name, p.playlist_cover, p.id_tag
              ORDER BY last_played DESC
              LIMIT 2
            `, [userId], (err, results) => {
              if (err) reject(err);
              else resolve(results || []);
            });
          });
          
          recentPlaylists = playlistResults.map(playlist => ({
            ...playlist,
            hashid: hashids.encode(playlist.item_id),
            type: 'playlist'
          }));
        } catch (error) {
          console.error('Error getting recent playlists in partial:', error);
          recentPlaylists = [];
        }

        // Ambil 2 custom playlist terakhir yang diputar
        let recentCustomPlaylists = [];
        try {
          const customPlaylistResults = await new Promise((resolve, reject) => {
            db.query(`
              SELECT 
                ra.item_id,
                cp.playlist_name,
                cp.id_user as creator_id,
                u.name_user as creator_name,
                cp.id_auto,
                cp.id_cus,
                (SELECT m.cover_music 
                 FROM music_cus mc 
                 JOIN music m ON mc.id_music = m.id_music 
                 WHERE mc.id_cus = cp.id_cus 
                 LIMIT 1) as playlist_cover,
                (SELECT COUNT(*) FROM music_cus WHERE id_cus = cp.id_cus) as track_count,
                MAX(ra.played_at) as last_played
              FROM recent_activity ra
              JOIN custom_playlist cp ON ra.item_id = cp.id_cus
              LEFT JOIN users u ON cp.id_user = u.id_user
              WHERE ra.id_user = ? 
                AND ra.item_type = 'custom_playlist'
              GROUP BY ra.item_id, cp.playlist_name, cp.id_user, u.name_user, cp.id_auto, cp.id_cus
              ORDER BY last_played DESC
              LIMIT 2
            `, [userId], async (err, results) => {
              if (err) reject(err);
              else {
                const playlistsWithCovers = await Promise.all(
                  results.map(async (playlist) => {
                    try {
                      const covers = await new Promise((resolve, reject) => {
                        db.query(
                          `SELECT DISTINCT m.cover_music 
                           FROM music_cus mc 
                           JOIN music m ON mc.id_music = m.id_music 
                           WHERE mc.id_cus = ? 
                           LIMIT 4`,
                          [playlist.id_cus],
                          (err, coverResults) => {
                            if (err) reject(err);
                            else resolve(coverResults.map(row => row.cover_music));
                          }
                        );
                      });
                      
                      playlist.track_covers = covers;
                      
                      if (covers.length === 1 && playlist.track_count > 1) {
                        playlist.playlist_cover = covers[0];
                        playlist.track_covers = [];
                      }
                      
                      return playlist;
                    } catch (coverErr) {
                      console.error('Error getting covers for recent custom playlist:', coverErr);
                      playlist.track_covers = [];
                      return playlist;
                    }
                  })
                );
                
                resolve(playlistsWithCovers || []);
              }
            });
          });
          
          recentCustomPlaylists = customPlaylistResults.map(playlist => {
            const idToEncode = playlist.id_auto || parseInt(playlist.item_id.replace('CUS', ''));
            return {
              ...playlist,
              hashid: 'C' + hashids.encode(idToEncode),
              type: 'custom_playlist',
              track_covers: playlist.track_covers || [],
              track_count: playlist.track_count || 0
            };
          });
        } catch (error) {
          console.error('Error getting recent custom playlists in partial:', error);
          recentCustomPlaylists = [];
        }

        // Ambil 2 artist terakhir yang diputar
        let recentArtists = [];
        try {
          const artistResults = await new Promise((resolve, reject) => {
            db.query(`
              SELECT 
                a.id_artist,
                a.id_artist_auto,
                a.artist_name,
                a.artist_profile,
                MAX(ra.played_at) as last_played
              FROM recent_activity ra
              JOIN music m ON ra.id_music = m.id_music
              JOIN music_artist ma ON m.id_music = ma.id_music
              JOIN artist a ON ma.id_artist = a.id_artist
              WHERE ra.id_user = ?
                AND ra.item_type = 'artist'
              GROUP BY a.id_artist, a.id_artist_auto, a.artist_name, a.artist_profile
              ORDER BY last_played DESC
              LIMIT 2
            `, [userId], (err, results) => {
              if (err) reject(err);
              else resolve(results || []);
            });
          });
          
          recentArtists = artistResults.map(artist => {
            const idToEncode = artist.id_artist_auto || artist.id_artist;
            return {
              ...artist,
              hashid: 'AR' + hashids.encode(idToEncode),
              type: 'artist'
            };
          });
        } catch (error) {
          console.error('Error getting recent artists in partial:', error);
          recentArtists = [];
        }

        res.render('partials/home', {
          playlistsByTag,
          tagNames,
          userId,
          libraryData: {
            playlists: navbarPlaylists,
            artists: artists,
            albums: albums,
            favPlaylists
          },
          isArtistPage: false,
          favoriteSongs: favoriteSongs.length >= 3 ? favoriteSongs : null,
          recentPlays: recentPlays.length >= 4 ? recentPlays : null,
          recentPlaylists: recentPlaylists.length > 0 ? recentPlaylists : null,
          recentCustomPlaylists: recentCustomPlaylists.length > 0 ? recentCustomPlaylists : null,
          recentArtists: recentArtists.length > 0 ? recentArtists : null
        });
      });
    });
  });
});


app.get('/library', async (req, res) => {
  const userId = req.session.user_id;

  if (!userId) {
    return res.redirect('/');
  }

  try {
    // Ambil data playlists untuk navbar
    const results = await new Promise((resolve, reject) => {
      getPlaylists((err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

    // Encode hashid untuk playlist global
    results.forEach(row => {
      row.hashid = hashids.encode(row.id_playlist);
    });

    const playlistsByTag = {};
    const tagNames = {};

    results.forEach(row => {
      if (!playlistsByTag[row.id_tag]) {
        playlistsByTag[row.id_tag] = [];
        tagNames[row.id_tag] = row.tag_name;
      }
      playlistsByTag[row.id_tag].push(row);
    });

    // Ambil profile user
    const profileImage = await new Promise((resolve, reject) => {
      getUserProfile(userId, (err, profile) => {
        if (err) reject(err);
        else resolve(profile);
      });
    });

    // Ambil library items dengan cara yang sama seperti di route utama
    const libraryItems = await new Promise((resolve, reject) => {
      getLibraryAll(userId, async (err, items) => {
        if (err) return reject(err);

        // Fungsi untuk mendapatkan covers
        const getCovers = async (id_cus) => {
          return new Promise((resolve, reject) => {
            db.query(
              `SELECT DISTINCT m.cover_music 
               FROM music_cus mc 
               JOIN music m ON mc.id_music = m.id_music 
               WHERE mc.id_cus = ? 
               LIMIT 4`,
              [id_cus],
              (err, results) => {
                if (err) reject(err);
                else resolve(results.map(row => row.cover_music));
              }
            );
          });
        };

        // Fungsi untuk mendapatkan track count
        const getTrackCount = async (id_cus) => {
          return new Promise((resolve, reject) => {
            db.query(
              'SELECT COUNT(*) as count FROM music_cus WHERE id_cus = ?',
              [id_cus],
              (err, result) => {
                if (err) reject(err);
                else resolve(result[0].count);
              }
            );
          });
        };

        for (let item of items) {
          if (item.type === 'playlist') {
            try {
              // Hitung jumlah track
              item.track_count = await getTrackCount(item.id);
              
              // Ambil cover unik
              const covers = await getCovers(item.id);

              // Jika semua track memiliki cover yang sama dan lebih dari 1 track,
              // gunakan single cover saja
              if (covers.length === 1 && item.track_count > 1) {
                item.cover = covers[0];
                item.track_covers = [];
              } else {
                item.track_covers = covers;
              }
            } catch (err) {
              console.error('Error getting track covers or count:', err);
              item.track_covers = [];
            }
          }
        }

        resolve(items);
      });
    });

    // Kelompokkan library items
    const navbarPlaylists = libraryItems.filter(item => item.type === 'playlist');
    const favPlaylists = libraryItems.filter(item => item.type === 'fav_playlist');
    const albums = libraryItems.filter(item => item.type === 'album');
    const artists = libraryItems.filter(item => item.type === 'artist');

    // PERBAIKAN: Encode hashid dengan cara yang SAMA PERSIS seperti di route utama
    [...navbarPlaylists, ...favPlaylists, ...albums, ...artists].forEach(item => {
      // Untuk custom playlist (milik sendiri), gunakan id_auto untuk encode
      if (item.type === 'playlist' && item.id_auto) {
        item.hashid = 'C' + hashids.encode(item.id_auto);
      } 
      // Untuk fav playlist, bedakan antara global dan custom
      else if (item.type === 'fav_playlist') {
        // Jika ini custom playlist yang disimpan (bukan milik sendiri)
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

    const libraryData = {
      playlists: navbarPlaylists,
      artists: artists,
      albums: albums,
      favPlaylists: favPlaylists
    };

    // Render halaman library dengan struktur yang sama
    res.render('index', {
      playlistsByTag,
      tagNames,
      customPlaylists: navbarPlaylists,
      libraryData,
      profileImage,
      isPlaylistPage: false,
      isArtistPage: false,
      isAlbumPage: false,
      isMusicPage: false,
      isFavMusicPage: false,
      isSearchPage: false,
      isLyricPage: false,
      isCategoryPage : false,
      isTop50Page : false,
      isMostPlayedPage : false,
      playlist: null,
      artist: null,
      album: null,
      music: null,
      favMusic: null,
      userId
    });

  } catch (err) {
    console.error('Error /library:', err);
    res.status(500).send('Error loading library');
  }
});

// PERBAIKAN: Partial library yang konsisten
app.get('/partial/library', async (req, res) => {
  const userId = req.session.user_id;

  if (!userId) {
    return res.render('partials/library', {
      libraryData: {
        playlists: [],
        artists: [],
        albums: [],
        favPlaylists: []
      }
    });
  }

  try {
    const libraryItems = await new Promise((resolve, reject) => {
      getLibraryAll(userId, async (err, items) => {
        if (err) return reject(err);

        // Fungsi untuk mendapatkan covers
        const getCovers = async (id_cus) => {
          return new Promise((resolve, reject) => {
            db.query(
              `SELECT DISTINCT m.cover_music 
               FROM music_cus mc 
               JOIN music m ON mc.id_music = m.id_music 
               WHERE mc.id_cus = ? 
               LIMIT 4`,
              [id_cus],
              (err, results) => {
                if (err) reject(err);
                else resolve(results.map(row => row.cover_music));
              }
            );
          });
        };

        // Fungsi untuk mendapatkan track count
        const getTrackCount = async (id_cus) => {
          return new Promise((resolve, reject) => {
            db.query(
              'SELECT COUNT(*) as count FROM music_cus WHERE id_cus = ?',
              [id_cus],
              (err, result) => {
                if (err) reject(err);
                else resolve(result[0].count);
              }
            );
          });
        };

        for (let item of items) {
          if (item.type === 'playlist') {
            try {
              // Hitung jumlah track
              item.track_count = await getTrackCount(item.id);
              
              // Ambil cover unik
              const covers = await getCovers(item.id);

              // Jika semua track memiliki cover yang sama dan lebih dari 1 track,
              // gunakan single cover saja
              if (covers.length === 1 && item.track_count > 1) {
                item.cover = covers[0];
                item.track_covers = [];
              } else {
                item.track_covers = covers;
              }
            } catch (err) {
              console.error('Error getting track covers or count:', err);
              item.track_covers = [];
            }
          }
        }

        resolve(items);
      });
    });

    // Kelompokkan dan encode hashid dengan cara yang SAMA
    const playlists = libraryItems.filter(item => item.type === 'playlist');
    const artists = libraryItems.filter(item => item.type === 'artist');
    const albums = libraryItems.filter(item => item.type === 'album');
    const favPlaylists = libraryItems.filter(item => item.type === 'fav_playlist');

    // PERBAIKAN: Encode hashid dengan cara yang SAMA PERSIS
    [...playlists, ...favPlaylists, ...albums, ...artists].forEach(item => {
      if (item.type === 'playlist' && item.id_auto) {
        item.hashid = 'C' + hashids.encode(item.id_auto);
      } 
      else if (item.type === 'fav_playlist') {
        if (item.playlist_type === 'custom' && item.id_auto) {
          item.hashid = 'C' + hashids.encode(item.id_auto);
        } 
        else {
          item.hashid = hashids.encode(item.id);
        }
      }
      else if (item.type === 'album' && item.id_album_auto) {
        item.hashid = 'AL' + hashids.encode(item.id_album_auto);
      }
      else if (item.type === 'artist' && item.id_artist_auto) {
        item.hashid = 'AR' + hashids.encode(item.id_artist_auto);
      }
    });

    const libraryData = {
      playlists,
      artists,
      albums,
      favPlaylists
    };

    res.render('partials/library', { 
      libraryData,
      // PERBAIKAN: Tambahkan variabel yang diperlukan
      isPlaylistPage: false,
      isArtistPage: false,
      isAlbumPage: false,
      isMusicPage: false,
      isFavMusicPage: false,
      isSearchPage: false,
      isLyricPage: false,
      isCategoryPage : false,
      isTop50Page : false,
      isMostPlayedPage : false,
    });

  } catch (err) {
    console.error('Error fetching library items:', err);
    res.status(500).send('Failed to load library');
  }
});



const mm = require('music-metadata');

// Updated getAudioDuration to return both formatted string and seconds
async function getAudioDuration(filePath) {
  try {
    const metadata = await mm.parseFile(filePath);
    const durationInSeconds = metadata.format.duration || 0;

    const minutes = Math.floor(durationInSeconds / 60);
    const seconds = Math.floor(durationInSeconds % 60);

    return {
      formatted: `${minutes}:${seconds.toString().padStart(2, '0')}`,
      seconds: durationInSeconds
    };
  } catch (err) {
    console.error('Failed to read metadata:', err.message);
    return {
      formatted: '0:00',
      seconds: 0
    };
  }
}
                                                                        
app.get('/playlist/:hashid', async (req, res) => {
  const hashid = req.params.hashid;
  const id = hashids.decode(hashid)[0];
  const id_user = req.session.user_id || null;

  if (!id) return res.status(404).send('Invalid playlist ID');

  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

  // Perbaiki query getPlaylistById untuk handle null tag
  const getPlaylistById = (playlistId, callback) => {
    const sql = `
      SELECT 
        p.*, 
        COALESCE(tp.tag_name, 'Uncategorized') as tag_name,
        COUNT(DISTINCT mp.id_music) as track_count
      FROM playlist p
      LEFT JOIN tag_playlist tp ON p.id_tag = tp.id_tag
      LEFT JOIN music_playlist mp ON p.id_playlist = mp.id_playlist
      WHERE p.id_playlist = ?
      GROUP BY p.id_playlist, p.playlist_name, p.playlist_cover, p.id_tag, tp.tag_name
    `;
    db.query(sql, [playlistId], callback);
  };

  getPlaylistById(id, async (err, playlistResult) => {
    if (err) {
      console.error('Error getting playlist:', err);
      return res.status(500).send('Query error');
    }
    if (!playlistResult.length) return res.status(404).send('Playlist not found');

    getTracksByPlaylist(id, async (err, trackResult) => {
      if (err) {
        console.error('Error getting tracks:', err);
        return res.status(500).send('Failed to get tracks');
      }

      const playlist = playlistResult[0];
      playlist.hashid = hashid;
      playlist.original_id = id;
      playlist.tag_name = playlist.tag_name || 'Uncategorized';
      
      // Process tracks dengan hashid untuk setiap track
      const processedTracks = trackResult.map(track => ({ 
        ...track, 
        playlist_hashid: hashid,
        playlist_original_id: id,
        track_hashid: 'MU' + hashids.encode(track.id_music),
        cover_music: track.cover_music || playlist.playlist_cover || '/images/default-music.png'
      }));

      let fav_music_ids = [], isPlaylistFavorite = false;
      let libraryData = { 
        playlists: [], 
        artists: [], 
        albums: [], 
        favPlaylists: [] 
      };
      let profileImage = null;
      let userProfile = null;

      if (id_user) {
        try {
          // Ambil data profil user
          try {
            userProfile = await new Promise((resolve, reject) => {
              getUserProfile(id_user, (err, profile) => {
                if (err) reject(err);
                else {
                  profile.hashid = hashids.encode(id_user);
                  resolve(profile);
                }
              });
            });
            profileImage = userProfile;
          } catch (e) {
            console.error('Failed to get user profile:', e);
          }

          // Get favorite music IDs
          fav_music_ids = await new Promise((resolve, reject) =>
            getFavoriteMusicIdsByUserId(id_user, (e, ids) =>
              e ? reject(e) : resolve(ids)
            )
          );

          // Check if playlist is favorite
          isPlaylistFavorite = await new Promise((resolve, reject) => {
            db.query(
              'SELECT id_fav FROM playlist_fav WHERE id_user = ? AND id_playlist = ?',
              [id_user, id],
              (e, rows) => e ? reject(e) : resolve(rows.length > 0)
            );
          });

          // Get library data
          const libraryItems = await new Promise((resolve, reject) =>
            getLibraryAll(id_user, async (err, items) => {
              if (err) return reject(err);

              for (let item of items) {
                if (item.type === 'playlist') {
                  try {
                    const trackCount = await new Promise((res, rej) => {
                      db.query('SELECT COUNT(*) as count FROM music_cus WHERE id_cus = ?', [item.id], (err, result) => {
                        if (err) rej(err);
                        else res(result[0].count);
                      });
                    });
                    
                    item.track_count = trackCount;
                    
                    const covers = await new Promise((res, rej) => {
                      db.query(
                        `SELECT DISTINCT m.cover_music 
                         FROM music_cus mc 
                         JOIN music m ON mc.id_music = m.id_music 
                         WHERE mc.id_cus = ? 
                         LIMIT 4`,
                        [item.id],
                        (err, results) => {
                          if (err) rej(err);
                          else res(results.map(row => row.cover_music));
                        }
                      );
                    });
                    
                    item.track_covers = covers;
                    
                    if (covers.length === 1 && item.track_count > 1) {
                      item.cover = covers[0];
                      item.track_covers = [];
                    } else {
                      item.track_covers = covers;
                    }
                  } catch (err) {
                    console.error('Error getting track covers or count:', err);
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

          // Encode hashid untuk semua item library
          [...playlists, ...favPlaylists, ...albums, ...artists].forEach(item => {
            if (item.type === 'playlist' && item.id_auto) {
              item.hashid = 'C' + hashids.encode(item.id_auto);
            } 
            else if (item.type === 'fav_playlist') {
              if (item.playlist_type === 'custom' && item.id_auto) {
                item.hashid = 'C' + hashids.encode(item.id_auto);
              } 
              else {
                item.hashid = hashids.encode(item.id);
              }
            }
            else if (item.type === 'album' && item.id_album_auto) {
              item.hashid = 'AL' + hashids.encode(item.id_album_auto);
            }
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
          console.error('Failed to prepare data:', e);
        }
      }

      // Get playlistsByTag dan tagNames untuk navbar - include uncategorized
      let playlistsByTag = {};
      let tagNames = {};
      try {
        const playlistResults = await new Promise((resolve, reject) => 
          getPlaylists((err, results) => err ? reject(err) : resolve(results))
        );
        
        playlistResults.forEach(row => {
          row.hashid = hashids.encode(row.id_playlist);
          const tagId = row.id_tag || 999999;
          const tagName = row.tag_name || 'Uncategorized';
          
          if (!playlistsByTag[tagId]) {
            playlistsByTag[tagId] = [];
            tagNames[tagId] = tagName;
          }
          playlistsByTag[tagId].push(row);
        });
      } catch (error) {
        console.error('Error getting playlists:', error);
      }

      // Process tracks with additional data
      const tracksWithExtras = await Promise.all(processedTracks.map(async (t, index) => {
        const albums = await new Promise((r, x) =>
          getAlbumsByMusicId(t.id_music, (e, res) => {
            if (e) {
              console.error(`Error getting albums for track ${t.id_music}:`, e);
              x(e);
            } else {
              r(res);
            }
          })
        );

        const albumsWithHashid = albums.map(album => {
          const idToEncode = album.id_album_auto || album.id_al;
          const hashid = idToEncode ? 'AL' + hashids.encode(idToEncode) : 'AL0';
          return {
            ...album,
            hashid: hashid
          };
        });

        let artistsData = [];
        try {
          const [artistRows] = await db.promise().query(
            `SELECT a.id_artist, a.artist_name, a.id_artist_auto 
             FROM artist a
             JOIN music_artist ma ON a.id_artist COLLATE utf8mb4_unicode_ci = ma.id_artist COLLATE utf8mb4_unicode_ci
             WHERE ma.id_music = ?
             ORDER BY ma.id_ma`,
            [t.id_music]
          );

          artistsData = artistRows.map(artist => ({
            id: artist.id_artist,
            name: artist.artist_name,
            hashid: 'AR' + hashids.encode(artist.id_artist_auto || artist.id_artist)
          }));
        } catch (error) {
          console.error(`Error fetching artists for track ${t.id_music}:`, error);
          const artistNames = t.artist_names ? t.artist_names.split(',').map(name => name.trim()) : ['Unknown Artist'];
          const artistIds = t.artist_ids ? t.artist_ids.split(',').map(id => id.trim()) : [];
          
          artistsData = artistNames.map((name, index) => {
            const artistId = artistIds[index] || `temp_${t.id_music}_${index}`;
            const hashid = 'AR' + hashids.encode(artistId);
            return {
              id: artistId,
              name: name,
              hashid: hashid
            };
          });
        }

        let duration = { formatted: '0:00', seconds: 0 };
        try {
          duration = await getAudioDuration(path.join(__dirname, 'public', t.audio_file));
        } catch (e) {
          console.error(`Error getting audio duration for ${t.title_music}:`, e);
        }

        const custom_playlists = id_user
          ? await getAvailableCustomPlaylists(id_user, t.id_music)
          : [];

        const trackResult = {
          ...t, 
          albums: albumsWithHashid,
          artists: artistsData,
          duration: duration.formatted,
          durationSeconds: duration.seconds,
          isFavorite: fav_music_ids.includes(t.id_music),
          custom_playlists,
          hashid: t.track_hashid
        };

        return trackResult;
      }));

      playlist.tracks = tracksWithExtras;

      // Calculate total duration and track count
      playlist.totalTracks = playlist.tracks.length;
      playlist.totalDuration = playlist.tracks.reduce((sum, track) => sum + (track.durationSeconds || 0), 0);

      const totalHours = Math.floor(playlist.totalDuration / 3600);
      const totalMinutes = Math.floor((playlist.totalDuration % 3600) / 60);
      playlist.formattedDuration = 
        `${totalHours > 0 ? `${totalHours} hr ` : ''}${totalMinutes} min`;

      const resourceVersion = Date.now();
      const renderOptions = {
        playlist,
        isPlaylistPage: true,
        isArtistPage: false,
        isAlbumPage: false,
        isMusicPage: false,
        isFavMusicPage: false,
        isSearchPage: false,
        isLyricPage: false,
        isProfilePage: false,
        isCategoryPage: false,
        isTop50Page: false,
        isMostPlayedPage: false,
        playlistsByTag,
        tagNames,
        customPlaylists: libraryData.playlists,
        libraryData,
        profileImage,
        userProfile,
        isPlaylistFavorite,
        userId: id_user,
        resourceVersion,
        artist: null,
        album: null,
        music: null,
        favMusic: null
      };

      res.render(req.xhr ? 'partials/playlist' : 'index', renderOptions);
    });
  });
});


app.get('/search', async (req, res) => {
  const userId = req.session.user_id || null;

  if (!userId) {
    // Tanpa user, render kosong
    return res.render('index', {
      playlistsByTag: null,
      tagNames: null,
      libraryData: { playlists: [], artists: [], albums: [], favPlaylists: [] },
      customPlaylists: [],
      profileImage: null,
      userProfile: null, // Tambahkan ini
      isPlaylistPage: false,
      isArtistPage: false,
      isAlbumPage: false,
      isFavMusicPage: false,
      isMusicPage: false,
      isSearchPage: true,
      favoriteSongs :false,
      isLyricPage: false,
      isProfilePage: false, // Tambahkan ini
      isCategoryPage : false,
      recentPlays : false,
      isTop50Page : false,
      isMostPlayedPage : false,
      playlist: null,
      artist: null,
      album: null,
      favMusic: null,
      userId: null
    });
  }

  try {
    // Ambil data profil user
    const userProfile = await new Promise((resolve, reject) => {
      getUserProfile(userId, (err, profile) => {
        if (err) reject(err);
        else {
          // Tambahkan hashid user ke userProfile
          profile.hashid = hashids.encode(userId);
          resolve(profile);
        }
      });
    });

    // Ambil data library dan proses track_covers dengan benar seperti di route utama
    const libraryItems = await new Promise((resolve, reject) =>
      getLibraryAll(userId, async (err, items) => {
        if (err) return reject(err);

        // Proses track_covers untuk playlist seperti di route utama
        for (let item of items) {
          if (item.type === 'playlist') {
            try {
              const trackCount = await new Promise((res, rej) => {
                db.query('SELECT COUNT(*) as count FROM music_cus WHERE id_cus = ?', [item.id], (err, result) => {
                  if (err) rej(err);
                  else res(result[0].count);
                });
              });
              
              item.track_count = trackCount;
              
              // Ambil cover unik seperti di route utama
              const covers = await new Promise((res, rej) => {
                db.query(
                  `SELECT DISTINCT m.cover_music 
                   FROM music_cus mc 
                   JOIN music m ON mc.id_music = m.id_music 
                   WHERE mc.id_cus = ? 
                   LIMIT 4`,
                  [item.id],
                  (err, results) => {
                    if (err) rej(err);
                    else res(results.map(row => row.cover_music));
                  }
                );
              });
              
              // Jika semua track memiliki cover yang sama dan lebih dari 1 track,
              // gunakan single cover saja (sama seperti di route utama)
              if (covers.length === 1 && item.track_count > 1) {
                item.cover = covers[0];
                item.track_covers = [];
              } else {
                item.track_covers = covers;
              }
            } catch (err) {
              console.error('Error getting track covers or count:', err);
              item.track_covers = [];
            }
          }
        }

        resolve(items);
      })
    );

    // Pisahkan berdasarkan tipe dan encode hashid
    const playlists = libraryItems.filter(i => i.type === 'playlist');
    const artists = libraryItems.filter(i => i.type === 'artist');
    const albums = libraryItems.filter(i => i.type === 'album');
    const favPlaylists = libraryItems.filter(i => i.type === 'fav_playlist');

    // Encode hashid untuk SEMUA item library dengan memperhatikan playlist_type
    [...playlists, ...favPlaylists, ...albums, ...artists].forEach(item => {
      // Untuk custom playlist (milik sendiri), gunakan id_auto untuk encode
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

    const libraryData = {
      playlists,
      artists,
      albums,
      favPlaylists
    };

    // Ambil playlistsByTag dan tagNames untuk navbar
    let playlistsByTag = {};
    let tagNames = {};
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

    // Render halaman
    res.render('index', {
      playlistsByTag,
      tagNames,
      libraryData,
      customPlaylists: libraryData.playlists,
      profileImage: userProfile, // Ini sudah benar
      userProfile: userProfile, // Tambahkan ini untuk konsistensi dengan route lain
      isPlaylistPage: false,
      isArtistPage: false,
      isAlbumPage: false,
      isFavMusicPage: false,
      isMusicPage: false,
      isSearchPage: true,
      isLyricPage: false,
      favoriteSongs :false,
      isProfilePage: false, // Tambahkan ini
      isCategoryPage : false,
      recentPlaylists:false,
      recentCustomPlaylists : false,
      recentArtists : false,
      recentPlays : false,
      isTop50Page : false,
      isMostPlayedPage : false,
      playlist: null,
      artist: null,
      album: null,
      favMusic: null,
      userId
    });
  } catch (err) {
    console.error('Error /search:', err);
    res.status(500).send('Gagal mengambil data pengguna.');
  }
});



app.get('/lyric', async (req, res) => {
  const userId = req.session.user_id || null;

  if (!userId) {
    // Tanpa user, render kosong
    return res.render('index', {
      playlistsByTag: null,
      tagNames: null,
      libraryData: {
        playlists: [],
        artists: [],
        albums: [],
        favPlaylists: []
      },
      customPlaylists: [],
      profileImage: null,
      userProfile: null, // Tambahkan ini
      isPlaylistPage: false,
      isArtistPage: false,
      isAlbumPage: false,
      isFavMusicPage: false,
      isMusicPage: false,
      isSearchPage: false,
      isLyricPage: true,
      isProfilePage: false, // Tambahkan ini
      isCategoryPage : false,
      isTop50Page : false,
      isMostPlayedPage : false,
      playlist: null,
      artist: null,
      album: null,
      favMusic: null,
      userId: null
    });
  }

  try {
    // Ambil profil pengguna
    const userProfile = await new Promise((resolve, reject) => {
      getUserProfile(userId, (err, user) => {
        if (err) reject(err);
        else {
          // Tambahkan hashid ke userProfile
          user.hashid = hashids.encode(userId);
          resolve(user);
        }
      });
    });

    // Ambil data library dan proses track_covers dengan benar seperti di route utama
    const libraryItems = await new Promise((resolve, reject) =>
      getLibraryAll(userId, async (err, items) => {
        if (err) return reject(err);

        // Proses track_covers untuk playlist seperti di route utama
        for (let item of items) {
          if (item.type === 'playlist') {
            try {
              const trackCount = await new Promise((res, rej) => {
                db.query('SELECT COUNT(*) as count FROM music_cus WHERE id_cus = ?', [item.id], (err, result) => {
                  if (err) rej(err);
                  else res(result[0].count);
                });
              });
              
              item.track_count = trackCount;
              
              // Ambil cover unik seperti di route utama
              const covers = await new Promise((res, rej) => {
                db.query(
                  `SELECT DISTINCT m.cover_music 
                   FROM music_cus mc 
                   JOIN music m ON mc.id_music = m.id_music 
                   WHERE mc.id_cus = ? 
                   LIMIT 4`,
                  [item.id],
                  (err, results) => {
                    if (err) rej(err);
                    else res(results.map(row => row.cover_music));
                  }
                );
              });
              
              // Jika semua track memiliki cover yang sama dan lebih dari 1 track,
              // gunakan single cover saja (sama seperti di route utama)
              if (covers.length === 1 && item.track_count > 1) {
                item.cover = covers[0];
                item.track_covers = [];
              } else {
                item.track_covers = covers;
              }
            } catch (err) {
              console.error('Error getting track covers or count:', err);
              item.track_covers = [];
            }
          }
        }

        resolve(items);
      })
    );

    // Strukturkan dan encode hashid
    const playlists = libraryItems.filter(i => i.type === 'playlist');
    const artists = libraryItems.filter(i => i.type === 'artist');
    const albums = libraryItems.filter(i => i.type === 'album');
    const favPlaylists = libraryItems.filter(i => i.type === 'fav_playlist');

    // Encode hashid untuk SEMUA item library dengan memperhatikan playlist_type
    [...playlists, ...favPlaylists, ...albums, ...artists].forEach(item => {
      // Untuk custom playlist (milik sendiri), gunakan id_auto untuk encode
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

    const libraryData = {
      playlists,
      artists,
      albums,
      favPlaylists
    };

    // Ambil playlistsByTag dan tagNames untuk navbar
    let playlistsByTag = {};
    let tagNames = {};
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

    // Render halaman
    res.render('index', {
      playlistsByTag,
      tagNames,
      libraryData,
      customPlaylists: libraryData.playlists,
      profileImage: userProfile, // Ganti dari profileImage ke userProfile
      userProfile: userProfile, // Tambahkan ini
      isPlaylistPage: false,
      isArtistPage: false,
      isAlbumPage: false,
      isFavMusicPage: false,
      isMusicPage: false,
      isSearchPage: false,
      isLyricPage: true,
      isProfilePage: false, // Tambahkan ini
      isCategoryPage : false,
      isTop50Page : false,
      isMostPlayedPage : false,
      playlist: null,
      artist: null,
      album: null,
      favMusic: null,
      userId
    });

  } catch (err) {
    console.error('Error /lyric:', err);
    res.status(500).send('Gagal mengambil data pengguna.');
  }
});

app.get('/artist/:hashid', async (req, res) => {
  const hashid = req.params.hashid;
  
  // Ekstrak ID numerik dari hashid
  const numericHash = hashid.startsWith('AR') ? hashid.substring(2) : hashid;
  let decodedId;
  
  try {
    decodedId = hashids.decode(numericHash)[0];
  } catch (error) {
    return res.status(400).send('Invalid artist hashid');
  }
  
  const id_user = req.session.user_id || null;

  if (!decodedId) return res.status(404).send('Invalid artist ID');

  try {
    // PERBAIKAN: Coba cari berdasarkan id_artist_auto terlebih dahulu
    let artist;
    let [artistRows] = await db.promise().query(
      `SELECT * FROM artist WHERE id_artist_auto = ?`,
      [decodedId]
    );

    // Jika tidak ditemukan, coba decode sebagai id_artist langsung
    if (!artistRows.length) {
      [artistRows] = await db.promise().query(
        `SELECT * FROM artist WHERE id_artist = ?`,
        [decodedId]
      );
    }

    if (!artistRows.length) return res.status(404).send('Artist tidak ditemukan');

    artist = artistRows[0];
    artist.hashid = 'AR' + hashids.encode(artist.id_artist_auto || artist.id_artist);
    artist.original_id = artist.id_artist;

    // Cek jika user follow artist ini
    let isArtistFollowed = false;
    if (id_user) {
      const [followRows] = await db.promise().query(
        'SELECT id_af FROM artist_follow WHERE id_user = ? AND id_artist = ?',
        [id_user, artist.id_artist]
      );
      isArtistFollowed = followRows.length > 0;
    }

    // Ambil tracks dari artist dengan query yang lebih sederhana
    const [trackRows] = await db.promise().query(
      `SELECT DISTINCT
        m.id_music, 
        m.audio_file, 
        m.title_music, 
        m.cover_music, 
        m.lyric, 
        m.line_durations
       FROM music m
       JOIN music_artist ma ON m.id_music = ma.id_music
       WHERE ma.id_artist = ?
       ORDER BY m.id_music DESC`,
      [artist.id_artist]
    );

    // Process tracks
    const tracksWithExtras = await Promise.all(
      trackRows.map(async (track) => {
        // Ambil artists untuk track ini
        const [artistRows] = await db.promise().query(
          `SELECT a.id_artist, a.artist_name, a.id_artist_auto 
           FROM artist a
           JOIN music_artist ma ON a.id_artist COLLATE utf8mb4_unicode_ci = ma.id_artist COLLATE utf8mb4_unicode_ci
           WHERE ma.id_music = ?
           ORDER BY ma.id_ma`,
          [track.id_music]
        );

        const artistsWithHashid = artistRows.map(artist => ({
          id: artist.id_artist,
          name: artist.artist_name,
          hashid: 'AR' + hashids.encode(artist.id_artist_auto || artist.id_artist)
        }));

        // Ambil albums untuk track ini
        const albums = await new Promise((r, x) =>
          getAlbumsByMusicId(track.id_music, (e, res) => e ? x(e) : r(res))
        );

        const albumsWithHashid = albums.map(album => {
          const idToEncode = album.id_album_auto || album.id_al;
          const hashid = idToEncode ? 'AL' + hashids.encode(idToEncode) : 'AL0';
          return {
            ...album,
            hashid: hashid,
            album_name: album.album_name || album.name || 'Unknown Album',
            name: album.album_name || album.name || 'Unknown Album'
          };
        });

        let duration = { formatted: '0:00', seconds: 0 };
        try {
          duration = await getAudioDuration(path.join(__dirname, 'public', track.audio_file));
        } catch (e) {
          console.error(`Error getting audio duration for ${track.title_music}:`, e);
        }

        const custom_playlists = id_user
          ? await getAvailableCustomPlaylists(id_user, track.id_music)
          : [];

        let fav_music_ids = [];
        if (id_user) {
          fav_music_ids = await new Promise((resolve, reject) =>
            getFavoriteMusicIdsByUserId(id_user, (e, ids) => e ? reject(e) : resolve(ids))
          );
        }

        return {
          ...track,
          track_hashid: 'MU' + hashids.encode(track.id_music),
          artists: artistsWithHashid,
          albums: albumsWithHashid,
          duration: duration.formatted,
          durationSeconds: duration.seconds,
          isFavorite: fav_music_ids.includes(track.id_music),
          custom_playlists,
          hashid: 'MU' + hashids.encode(track.id_music)
        };
      })
    );

    artist.tracks = tracksWithExtras;
    artist.totalTracks = artist.tracks.length;
    artist.totalDuration = artist.tracks.reduce((sum, track) => sum + (track.durationSeconds || 0), 0);

    const totalHours = Math.floor(artist.totalDuration / 3600);
    const totalMinutes = Math.floor((artist.totalDuration % 3600) / 60);
    artist.formattedDuration = `${totalHours > 0 ? `${totalHours} hr ` : ''}${totalMinutes} min`;

    // Get library data untuk navbar
    let libraryData = { playlists: [], artists: [], albums: [], favPlaylists: [] };
    let playlistsByTag = {};
    let tagNames = {};
    let profileImage = null;
    let userProfile = null; // Tambahkan variabel userProfile
    
    if (id_user) {
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
        profileImage = userProfile; // Untuk kompatibilitas
      } catch (e) {
        console.error('Failed to get user profile:', e);
      }

      const libraryItems = await new Promise((resolve, reject) =>
        getLibraryAll(id_user, async (err, items) => {
          if (err) return reject(err);

          for (let item of items) {
            if (item.type === 'playlist') {
              try {
                const trackCount = await new Promise((res, rej) => {
                  db.query('SELECT COUNT(*) as count FROM music_cus WHERE id_cus = ?', [item.id], (err, result) => {
                    if (err) rej(err);
                    else res(result[0].count);
                  });
                });
                
                item.track_count = trackCount;
                
                const covers = await new Promise((res, rej) => {
                  db.query(
                    `SELECT DISTINCT m.cover_music 
                     FROM music_cus mc 
                     JOIN music m ON mc.id_music = m.id_music 
                     WHERE mc.id_cus = ? 
                     LIMIT 4`,
                    [item.id],
                    (err, results) => {
                      if (err) rej(err);
                      else res(results.map(row => row.cover_music));
                    }
                  );
                });
                
                item.track_covers = covers;
                
                if (covers.length === 1 && item.track_count > 1) {
                  item.cover = covers[0];
                  item.track_covers = [];
                } else {
                  item.track_covers = covers;
                }
              } catch (err) {
                console.error('Error getting track covers or count:', err);
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

      // Encode hashid untuk SEMUA item library
      [...playlists, ...favPlaylists, ...albums, ...artists].forEach(item => {
        if (item.type === 'playlist' && item.id_auto) {
          item.hashid = 'C' + hashids.encode(item.id_auto);
        } 
        else if (item.type === 'fav_playlist') {
          if (item.playlist_type === 'custom' && item.id_auto) {
            item.hashid = 'C' + hashids.encode(item.id_auto);
          } 
          else {
            item.hashid = hashids.encode(item.id);
          }
        }
        else if (item.type === 'album' && item.id_album_auto) {
          item.hashid = 'AL' + hashids.encode(item.id_album_auto);
        }
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
    }

    // Ambil playlistsByTag dan tagNames untuk navbar
    try {
      const playlistResults = await new Promise((resolve, reject) => 
        getPlaylists((err, results) => err ? reject(err) : resolve(results))
      );
      
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

    const resourceVersion = Date.now();
    
    const renderOptions = {
      artist,
      isArtistPage: true,
      isPlaylistPage: false,
      isAlbumPage: false,
      isFavMusicPage: false,
      isMusicPage: false, // Tambahkan ini
      isSearchPage: false,
      isLyricPage: false,
      isProfilePage: false, // Tambahkan ini
      isCategoryPage : false,
      isTop50Page : false,
      isMostPlayedPage : false,
      playlistsByTag,
      tagNames,
      customPlaylists: libraryData.playlists,
      libraryData,
      profileImage,
      userProfile, // Tambahkan ini
      isArtistFollowed, // Status follow artist
      userId: id_user,
      resourceVersion,
      playlist: null, // Tambahkan ini untuk konsistensi
      album: null, // Tambahkan ini untuk konsistensi
      music: null, // Tambahkan ini untuk konsistensi
      favMusic: null // Tambahkan ini untuk konsistensi
    };

    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    res.render(req.xhr ? 'partials/artist' : 'index', renderOptions);
  } catch (error) {
    console.error('Gagal memuat artist:', error);
    res.status(500).send('Terjadi kesalahan server');
  }
});



app.get('/album/:hashid', async (req, res) => {
  const hashid = req.params.hashid;
  
  // Ekstrak ID numerik dari hashid (hapus prefix 'AL' jika ada)
  const numericHash = hashid.startsWith('AL') ? hashid.substring(2) : hashid;
  const id_album_auto = hashids.decode(numericHash)[0];
  
  const id_user = req.session.user_id || null;

  if (!id_album_auto) return res.status(404).send('Invalid album ID');

  try {
    // Ambil data album
    const [albumRows] = await db.promise().query(
      `SELECT * FROM album WHERE id_album_auto = ?`,
      [id_album_auto]
    );

    if (!albumRows.length) return res.status(404).send('Album tidak ditemukan');

    const album = albumRows[0];
    album.hashid = 'AL' + hashids.encode(album.id_album_auto);
    album.original_id = album.id_al;

    let isAlbumFavorite = false;
    if (id_user) {
      const [favRows] = await db.promise().query(
        'SELECT id_fav FROM album_fav WHERE id_user = ? AND id_al = ?',
        [id_user, album.id_al]
      );
      isAlbumFavorite = favRows.length > 0;
    }

    // Ambil tracks dari album
    const [trackRows] = await db.promise().query(
      `SELECT 
        m.id_music, 
        m.audio_file, 
        m.title_music, 
        m.cover_music, 
        m.lyric, 
        m.line_durations
       FROM music m
       JOIN music_album ma ON m.id_music = ma.id_music
       WHERE ma.id_al = ?
       ORDER BY m.id_music ASC`,
      [album.id_al]
    );

    // Ambil artist untuk setiap track secara terpisah
    for (let track of trackRows) {
      const [artistRows] = await db.promise().query(
        `SELECT 
          a.artist_name,
          a.id_artist
         FROM music_artist ma
         JOIN artist a ON ma.id_artist COLLATE utf8mb4_unicode_ci = a.id_artist COLLATE utf8mb4_unicode_ci
         WHERE ma.id_music = ?`,
        [track.id_music]
      );
      
      track.artist_names = artistRows.map(artist => artist.artist_name).join(', ');
      track.artist_ids = artistRows.map(artist => artist.id_artist).join(',');
    }

    // **PERUBAHAN: Process tracks dengan track_hashid dan playlist_hashid**
    const processedTracks = trackRows.map(track => ({
      ...track,
      track_hashid: 'MU' + hashids.encode(track.id_music), // **TAMBAH: hashid untuk track**
      playlist_hashid: album.hashid,
      playlist_original_id: album.id_al
    }));

    // Process tracks dengan artists
    const tracksWithExtras = await Promise.all(
      processedTracks.map(async (track) => {
        // Process artists untuk track
        const artistNames = track.artist_names ? track.artist_names.split(',').map(name => name.trim()) : ['Unknown Artist'];
        const artistIds = track.artist_ids ? track.artist_ids.split(',').map(id => id.trim()) : [];
        
        const artistsWithHashid = artistNames.map((name, index) => {
          const artistId = artistIds[index];
          let idToEncode;
          
          if (artistId && artistId.startsWith('AR')) {
            const numericId = parseInt(artistId.substring(2)) || 0;
            idToEncode = numericId;
          } else if (artistId) {
            idToEncode = parseInt(artistId) || 0;
          } else {
            idToEncode = (track.id_music * 1000) + index;
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
          duration = await getAudioDuration(path.join(__dirname, 'public', track.audio_file));
        } catch (e) {
          console.error(`Error getting audio duration for ${track.title_music}:`, e);
        }

        const custom_playlists = id_user
          ? await getAvailableCustomPlaylists(id_user, track.id_music)
          : [];

        let fav_music_ids = [];
        if (id_user) {
          fav_music_ids = await new Promise((resolve, reject) =>
            getFavoriteMusicIdsByUserId(id_user, (e, ids) => e ? reject(e) : resolve(ids))
          );
        }

        return {
          ...track,
          artists: artistsWithHashid,
          duration: duration.formatted,
          durationSeconds: duration.seconds,
          isFavorite: fav_music_ids.includes(track.id_music),
          custom_playlists,
          // **PERUBAHAN: Tambahkan album_hashid untuk mobile**
          album_hashid: album.hashid, // Album hashid sudah tersedia
          // **PERUBAHAN: Gunakan track_hashid untuk showMusic**
          hashid: track.track_hashid
        };
      })
    );

    album.tracks = tracksWithExtras;
    album.totalTracks = album.tracks.length;
    album.totalDuration = album.tracks.reduce((sum, track) => sum + (track.durationSeconds || 0), 0);

    const totalHours = Math.floor(album.totalDuration / 3600);
    const totalMinutes = Math.floor((album.totalDuration % 3600) / 60);
    album.formattedDuration = `${totalHours > 0 ? `${totalHours} hr ` : ''}${totalMinutes} min`;

    // Get library data untuk navbar dengan processing yang sama seperti route utama
    let libraryData = { playlists: [], artists: [], albums: [], favPlaylists: [] };
    let playlistsByTag = {};
    let tagNames = {};
    let profileImage = null;
    let userProfile = null; // Tambahkan variabel userProfile
    
    if (id_user) {
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
        profileImage = userProfile; // Untuk kompatibilitas
      } catch (e) {
        console.error('Failed to get user profile:', e);
      }

      const libraryItems = await new Promise((resolve, reject) =>
        getLibraryAll(id_user, async (err, items) => {
          if (err) return reject(err);

          // Proses track_covers untuk playlist seperti di route utama
          for (let item of items) {
            if (item.type === 'playlist') {
              try {
                const trackCount = await new Promise((res, rej) => {
                  db.query('SELECT COUNT(*) as count FROM music_cus WHERE id_cus = ?', [item.id], (err, result) => {
                    if (err) rej(err);
                    else res(result[0].count);
                  });
                });
                
                item.track_count = trackCount;
                
                // Ambil cover unik seperti di route utama
                const covers = await new Promise((res, rej) => {
                  db.query(
                    `SELECT DISTINCT m.cover_music 
                     FROM music_cus mc 
                     JOIN music m ON mc.id_music = m.id_music 
                     WHERE mc.id_cus = ? 
                     LIMIT 4`,
                    [item.id],
                    (err, results) => {
                      if (err) rej(err);
                      else res(results.map(row => row.cover_music));
                    }
                  );
                });
                
                item.track_covers = covers;
                
                // Jika semua track memiliki cover yang sama dan lebih dari 1 track,
                // gunakan single cover saja (sama seperti di route utama)
                if (covers.length === 1 && item.track_count > 1) {
                  item.cover = covers[0];
                  item.track_covers = [];
                } else {
                  item.track_covers = covers;
                }
              } catch (err) {
                console.error('Error getting track covers or count:', err);
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

      // Encode hashid untuk SEMUA item library dengan memperhatikan playlist_type
      [...playlists, ...favPlaylists, ...albums, ...artists].forEach(item => {
        // Untuk custom playlist (milik sendiri), gunakan id_auto untuk encode
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
    }

    // Get playlistsByTag dan tagNames untuk navbar
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

    const resourceVersion = Date.now();
    
    // Render options yang LENGKAP
    const renderOptions = {
      album,
      isAlbumPage: true,
      isPlaylistPage: false,
      isArtistPage: false,
      isFavMusicPage: false,
      isMusicPage: false, // Tambahkan ini
      isSearchPage: false,
      isLyricPage: false,
      isProfilePage: false, // Tambahkan ini
      isCategoryPage : false,
      isTop50Page : false,
      isMostPlayedPage : false,
      playlistsByTag,
      tagNames,
      customPlaylists: libraryData.playlists,
      libraryData,
      profileImage,
      userProfile, // Tambahkan ini
      userId: id_user,
      resourceVersion,
      isAlbumFavorite,
      playlist: null, // Tambahkan ini untuk konsistensi
      artist: null, // Tambahkan ini untuk konsistensi
      music: null, // Tambahkan ini untuk konsistensi
      favMusic: null // Tambahkan ini untuk konsistensi
    };

    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    res.render(req.xhr ? 'partials/album' : 'index', renderOptions);
  } catch (error) {
    console.error('Gagal memuat album:', error);
    res.status(500).send('Terjadi kesalahan server');
  }
});


app.get('/favoritemusic', async (req, res) => {
  const id_user = req.session.user_id;
  
  if (!id_user) {
    // Return proper HTML response instead of JSON
    return res.render('index', {
      playlistsByTag: null,
      tagNames: null,
      libraryData: { playlists: [], artists: [], albums: [], favPlaylists: [] },
      customPlaylists: [],
      profileImage: null,
      userProfile: null, // Tambahkan ini
      isPlaylistPage: false,
      isArtistPage: false,
      isAlbumPage: false,
      isFavMusicPage: false,
      isMusicPage: false,
      isSearchPage: false,
      isLyricPage: false,
      isProfilePage: false, // Tambahkan ini
      isCategoryPage : false,
      isTop50Page : false,
      isMostPlayedPage : false,
      playlist: null,
      artist: null,
      album: null,
      music: null,
      favMusic: null,
      userId: null
    });
  }

  try {
    const [favMusicRows] = await db.promise().query(
      `SELECT 
        m.id_music, 
        m.audio_file, 
        m.title_music, 
        m.cover_music, 
        m.lyric, 
        m.line_durations,
        mf.created_at,
        GROUP_CONCAT(DISTINCT a.artist_name SEPARATOR ', ') AS artist_names,
        GROUP_CONCAT(DISTINCT a.id_artist SEPARATOR ',') AS artist_ids
       FROM (
         SELECT id_music, created_at 
         FROM music_fav 
         WHERE id_user = ?
         ORDER BY created_at DESC
       ) AS mf
       JOIN music m ON mf.id_music = m.id_music
       LEFT JOIN music_artist ma ON m.id_music = ma.id_music
       LEFT JOIN artist a ON ma.id_artist COLLATE utf8mb4_unicode_ci = a.id_artist COLLATE utf8mb4_unicode_ci
       GROUP BY m.id_music, mf.created_at
       ORDER BY mf.created_at DESC`,
      [id_user]
    );

    // PERBAIKAN: Gunakan numeric ID untuk favorite music
    const favMusicId = 999999; // ID khusus untuk favorite music

    // **PERUBAHAN: Process tracks dengan track_hashid**
    const processedTracks = favMusicRows.map(track => ({
      ...track,
      track_hashid: 'MU' + hashids.encode(track.id_music) // **TAMBAH: hashid untuk track**
    }));

    // Process tracks dengan artists dan albums
    const tracksWithExtras = await Promise.all(
      processedTracks.map(async (track) => {
        const albums = await new Promise((r, x) =>
          getAlbumsByMusicId(track.id_music, (e, res) => e ? x(e) : r(res))
        );

        const albumsWithHashid = albums.map(album => {
          const idToEncode = album.id_album_auto || album.id_al;
          const hashid = idToEncode ? 'AL' + hashids.encode(idToEncode) : 'AL0';
          return {
            ...album,
            hashid: hashid
          };
        });

        // Process artists untuk track
        const artistNames = track.artist_names ? track.artist_names.split(',').map(name => name.trim()) : ['Unknown Artist'];
        const artistIds = track.artist_ids ? track.artist_ids.split(',').map(id => id.trim()) : [];
        
        const artistsWithHashid = artistNames.map((name, index) => {
          const artistId = artistIds[index];
          let idToEncode;
          
          if (artistId && artistId.startsWith('AR')) {
            const numericId = parseInt(artistId.substring(2)) || 0;
            idToEncode = numericId;
          } else if (artistId) {
            idToEncode = parseInt(artistId) || 0;
          } else {
            idToEncode = (track.id_music * 1000) + index;
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
          duration = await getAudioDuration(path.join(__dirname, 'public', track.audio_file));
        } catch (e) {
          console.error(`Error getting audio duration for ${track.title_music}:`, e);
        }

        const custom_playlists = await getAvailableCustomPlaylists(id_user, track.id_music);

        return {
          ...track,
          albums: albumsWithHashid,
          artists: artistsWithHashid,
          duration: duration.formatted,
          durationSeconds: duration.seconds,
          isFavorite: true,
          custom_playlists,
          // **PERUBAHAN: Gunakan track_hashid untuk showMusic**
          hashid: track.track_hashid // **UBAH: dari 'FAV' + hashids.encode(favMusicId) ke track.track_hashid**
        };
      })
    );

    // PERBAIKAN: Get library data untuk navbar dengan processing yang sama seperti route utama
    let libraryData = { playlists: [], artists: [], albums: [], favPlaylists: [] };
    let playlistsByTag = {};
    let tagNames = {};
    
    const libraryItems = await new Promise((resolve, reject) =>
      getLibraryAll(id_user, async (err, items) => {
        if (err) return reject(err);

        // PERBAIKAN: Proses track_covers untuk playlist seperti di route utama
        for (let item of items) {
          if (item.type === 'playlist') {
            try {
              const trackCount = await new Promise((res, rej) => {
                db.query('SELECT COUNT(*) as count FROM music_cus WHERE id_cus = ?', [item.id], (err, result) => {
                  if (err) rej(err);
                  else res(result[0].count);
                });
              });
              
              item.track_count = trackCount;
              
              // Ambil cover unik seperti di route utama
              const covers = await new Promise((res, rej) => {
                db.query(
                  `SELECT DISTINCT m.cover_music 
                   FROM music_cus mc 
                   JOIN music m ON mc.id_music = m.id_music 
                   WHERE mc.id_cus = ? 
                   LIMIT 4`,
                  [item.id],
                  (err, results) => {
                    if (err) rej(err);
                    else res(results.map(row => row.cover_music));
                  }
                );
              });
              
              item.track_covers = covers;
              
              // Jika semua track memiliki cover yang sama dan lebih dari 1 track,
              // gunakan single cover saja (sama seperti di route utama)
              if (covers.length === 1 && item.track_count > 1) {
                item.cover = covers[0];
                item.track_covers = [];
              } else {
                item.track_covers = covers;
              }
            } catch (err) {
              console.error('Error getting track covers or count:', err);
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

    // PERBAIKAN: Encode hashid untuk SEMUA item library dengan memperhatikan playlist_type
    [...playlists, ...favPlaylists, ...albums, ...artists].forEach(item => {
      // Untuk custom playlist (milik sendiri), gunakan id_auto untuk encode
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

    // PERBAIKAN: Ambil playlistsByTag dan tagNames untuk navbar
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

    // PERBAIKAN: Ambil profil user
    let profileImage = null;
    let userProfile = null; // Tambahkan variabel userProfile
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
      profileImage = userProfile; // Untuk kompatibilitas
    } catch (e) {
      console.error('Failed to get user profile:', e);
    }

    const resourceVersion = Date.now();
    
    const renderOptions = {
      favMusic: {
        tracks: tracksWithExtras,
        totalTracks: tracksWithExtras.length,
        totalDuration: tracksWithExtras.reduce((sum, track) => sum + (track.durationSeconds || 0), 0),
        name: 'Favorite Music',
        description: 'Your favorite tracks',
        hashid: 'FAV' + hashids.encode(favMusicId)
      },
      isFavMusicPage: true,
      isPlaylistPage: false,
      isArtistPage: false,
      isAlbumPage: false,
      isMusicPage: false,
      isSearchPage: false,
      isLyricPage: false,
      isProfilePage: false, // Tambahkan ini
      isCategoryPage : false,
      isTop50Page : false,
      isMostPlayedPage : false,
      playlistsByTag,
      tagNames,
      customPlaylists: libraryData.playlists,
      libraryData,
      profileImage,
      userProfile, // Tambahkan ini
      userId: id_user,
      resourceVersion,
      playlist: null, // Tambahkan ini untuk konsistensi
      artist: null, // Tambahkan ini untuk konsistensi
      album: null, // Tambahkan ini untuk konsistensi
      music: null // Tambahkan ini untuk konsistensi
    };

    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    if (req.xhr) {
      res.render('partials/fav_music', renderOptions);
    } else {
      res.render('index', renderOptions);
    }

  } catch (error) {
    console.error('Gagal memuat musik favorit:', error);
    if (req.xhr) {
      res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
    } else {
      res.status(500).send('Terjadi kesalahan server');
    }
  }
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});



// Route untuk toggle follow artist
app.post("/artistFollow", async (req, res) => {
  const { id_artist, is_follow } = req.body;
  const id_user = req.session.user_id;

  if (!id_user || !id_artist) {
    return res.status(400).json({ success: false, message: "Data tidak lengkap" });
  }

  try {
    // Cek apakah artist ada - ambil SEMUA identifier
    const [artistCheck] = await db.promise().query(
      'SELECT id_artist, id_artist_auto, artist_name, artist_profile FROM artist WHERE id_artist = ?',
      [id_artist]
    );
    
    if (artistCheck.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Artist tidak ditemukan" 
      });
    }

    const artistInfo = artistCheck[0];
    const exists = await checkArtistFollow(id_user, id_artist);

    if (!exists && is_follow) {
      // Follow artist
      await addArtistFollow(id_user, id_artist);

      // Siapkan data artist dengan SEMUA identifier
      const artistData = {
        id: id_artist, // id_artist biasa
        id_artist_auto: artistInfo.id_artist_auto, // id_artist_auto
        name: artistInfo.artist_name,
        cover: artistInfo.artist_profile || '/images/default-artist.png',
        created_at: new Date(),
        type: 'artist',
        contentType: 'artist',
        hashid: 'AR' + hashids.encode(artistInfo.id_artist_auto) // hashid
      };

      return res.json({
        success: true,
        is_follow: true,
        artistData: artistData,
        message: "Artist ditambahkan ke library"
      });
    }

    if (exists && !is_follow) {
      // Unfollow artist
      await removeArtistFollow(id_user, id_artist);
      
      // Return SEMUA identifier untuk keperluan removal
      const artistData = {
        id: id_artist,
        id_artist_auto: artistInfo.id_artist_auto,
        hashid: 'AR' + hashids.encode(artistInfo.id_artist_auto),
        name: artistInfo.artist_name // tambahkan nama untuk fallback
      };

      return res.json({ 
        success: true, 
        is_follow: false,
        artistData: artistData,
        message: "Artist dihapus dari library" 
      });
    }

    return res.json({ 
      success: true, 
      is_follow: exists, 
      message: "Tidak ada perubahan" 
    });
  } catch (error) {
    console.error("Gagal mengubah status follow artist:", error);
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
});

// Helper functions untuk artist follow
function checkArtistFollow(userId, id_artist) {
  return new Promise((resolve, reject) => {
    const query = "SELECT id_af FROM artist_follow WHERE id_user = ? AND id_artist = ?";
    db.query(query, [userId, id_artist], (err, results) => {
      if (err) return reject(err);
      resolve(results.length > 0);
    });
  });
}

function removeArtistFollow(userId, id_artist) {
  return new Promise((resolve, reject) => {
    const query = "DELETE FROM artist_follow WHERE id_user = ? AND id_artist = ?";
    db.query(query, [userId, id_artist], (err, result) => {
      if (err) return reject(err);
      resolve(true);
    });
  });
}

function addArtistFollow(userId, id_artist) {
  return new Promise((resolve, reject) => {
    const query = "INSERT INTO artist_follow (id_user, id_artist, created_at) VALUES (?, ?, NOW())";
    db.query(query, [userId, id_artist], (err, result) => {
      if (err) return reject(err);
      resolve(true);
    });
  });
}

















// Route untuk toggle favorite album
app.post("/albumFav", async (req, res) => {
  const { id_al, is_favorite } = req.body;
  const id_user = req.session.user_id;

  if (!id_user || !id_al) {
    return res.status(400).json({ success: false, message: "Data tidak lengkap" });
  }

  try {
    // Cek apakah album ada - ambil SEMUA identifier
    const [albumCheck] = await db.promise().query(
      'SELECT id_al, id_album_auto, album_name, album_cover FROM album WHERE id_al = ?',
      [id_al]
    );
    
    if (albumCheck.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Album tidak ditemukan" 
      });
    }

    const albumInfo = albumCheck[0];
    const exists = await checkAlbumFav(id_user, id_al);

    if (!exists && is_favorite) {
      // Favorite album
      await addAlbumFav(id_user, id_al);

      // Siapkan data album dengan SEMUA identifier
      const albumData = {
        id: id_al, // id_al biasa
        id_album_auto: albumInfo.id_album_auto, // id_album_auto
        name: albumInfo.album_name,
        cover: albumInfo.album_cover || '/images/default-album.png',
        created_at: new Date(),
        type: 'album',
        contentType: 'album',
        hashid: 'AL' + hashids.encode(albumInfo.id_album_auto), // hashid
        track_count: await getAlbumTrackCount(id_al)
      };

      return res.json({
        success: true,
        is_favorite: true,
        albumData: albumData,
        message: "Album ditambahkan ke library"
      });
    }

    if (exists && !is_favorite) {
      // Unfavorite album
      await removeAlbumFav(id_user, id_al);
      
      // Return SEMUA identifier untuk keperluan removal
      const albumData = {
        id: id_al,
        id_album_auto: albumInfo.id_album_auto,
        hashid: 'AL' + hashids.encode(albumInfo.id_album_auto),
        name: albumInfo.album_name // tambahkan nama untuk fallback
      };

      return res.json({ 
        success: true, 
        is_favorite: false,
        albumData: albumData,
        message: "Album dihapus dari library" 
      });
    }

    return res.json({ 
      success: true, 
      is_favorite: exists, 
      message: "Tidak ada perubahan" 
    });
  } catch (error) {
    console.error("Gagal mengubah status favorite album:", error);
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
});

// Helper function untuk mendapatkan jumlah track album
function getAlbumTrackCount(id_al) {
  return new Promise((resolve, reject) => {
    const query = "SELECT COUNT(*) as count FROM music_album WHERE id_al = ?";
    db.query(query, [id_al], (err, results) => {
      if (err) return reject(err);
      resolve(results[0].count);
    });
  });
}

// Helper functions untuk album favorite
function checkAlbumFav(userId, id_al) {
  return new Promise((resolve, reject) => {
    const query = "SELECT id_fav FROM album_fav WHERE id_user = ? AND id_al = ?";
    db.query(query, [userId, id_al], (err, results) => {
      if (err) return reject(err);
      resolve(results.length > 0);
    });
  });
}

function removeAlbumFav(userId, id_al) {
  return new Promise((resolve, reject) => {
    const query = "DELETE FROM album_fav WHERE id_user = ? AND id_al = ?";
    db.query(query, [userId, id_al], (err, result) => {
      if (err) return reject(err);
      resolve(true);
    });
  });
}

function addAlbumFav(userId, id_al) {
  return new Promise((resolve, reject) => {
    const query = "INSERT INTO album_fav (id_user, id_al, created_at) VALUES (?, ?, NOW())";
    db.query(query, [userId, id_al], (err, result) => {
      if (err) return reject(err);
      resolve(true);
    });
  });
}


// Route untuk halaman detail music (track tanpa album)
app.get('/music/:hashid', async (req, res) => {
  const hashid = req.params.hashid;
  
  // Ekstrak ID numerik dari hashid
  const numericHash = hashid.startsWith('MU') ? hashid.substring(2) : hashid;
  const id_music = hashids.decode(numericHash)[0];
  
  const id_user = req.session.user_id || null;

  if (!id_music) return res.status(404).send('Invalid music ID');

  try {
    // Ambil data music
    const [musicRows] = await db.promise().query(
      `SELECT * FROM music WHERE id_music = ?`,
      [id_music]
    );

    if (!musicRows.length) return res.status(404).send('Music tidak ditemukan');

    const music = musicRows[0];
    music.hashid = 'MU' + hashids.encode(music.id_music);

    // Ambil artist untuk music - TAMBAHKAN COLLATE
    const [artistRows] = await db.promise().query(
      `SELECT 
        a.artist_name,
        a.id_artist,
        a.id_artist_auto,
        a.artist_profile
       FROM music_artist ma
       JOIN artist a ON ma.id_artist COLLATE utf8mb4_unicode_ci = a.id_artist COLLATE utf8mb4_unicode_ci
       WHERE ma.id_music = ?`,
      [id_music]
    );

    // Process artists dengan hashid
    const artistsWithHashid = artistRows.map(artist => {
      return {
        name: artist.artist_name,
        id: artist.id_artist,
        id_artist_auto: artist.id_artist_auto,
        cover: artist.artist_profile || '/images/default-artist.png',
        hashid: 'AR' + hashids.encode(artist.id_artist_auto)
      };
    });

    // Ambil album untuk music (jika ada) - TAMBAHKAN COLLATE
    const [albumRows] = await db.promise().query(
      `SELECT 
        al.album_name,
        al.id_al,
        al.id_album_auto,
        al.album_cover
       FROM music_album ma
       JOIN album al ON ma.id_al COLLATE utf8mb4_unicode_ci = al.id_al COLLATE utf8mb4_unicode_ci
       WHERE ma.id_music = ?`,
      [id_music]
    );

    // Process albums dengan hashid
    const albumsWithHashid = albumRows.map(album => {
      return {
        name: album.album_name,
        id: album.id_al,
        id_album_auto: album.id_album_auto,
        cover: album.album_cover || '/images/default-album.png',
        hashid: 'AL' + hashids.encode(album.id_album_auto)
      };
    });

    // Get duration
    let duration = { formatted: '0:00', seconds: 0 };
    try {
      duration = await getAudioDuration(path.join(__dirname, 'public', music.audio_file));
    } catch (e) {
      console.error(`Error getting audio duration for ${music.title_music}:`, e);
    }

    // Check if music is favorite
    let isFavorite = false;
    if (id_user) {
      const fav_music_ids = await new Promise((resolve, reject) =>
        getFavoriteMusicIdsByUserId(id_user, (e, ids) => e ? reject(e) : resolve(ids))
      );
      isFavorite = fav_music_ids.includes(music.id_music);
    }

    // Get custom playlists for add to playlist functionality
    const custom_playlists = id_user
      ? await getAvailableCustomPlaylists(id_user, music.id_music)
      : [];

    // Prepare music data for the page
    const musicData = {
      ...music,
      artists: artistsWithHashid,
      albums: albumsWithHashid,
      duration: duration.formatted,
      durationSeconds: duration.seconds,
      isFavorite: isFavorite,
      custom_playlists: custom_playlists,
      totalTracks: 1, // Single track
      formattedDuration: duration.formatted
    };

    // Get library data untuk navbar
    let libraryData = { playlists: [], artists: [], albums: [], favPlaylists: [] };
    let playlistsByTag = {};
    let tagNames = {};
    let profileImage = null;
    let userProfile = null; // Tambahkan variabel userProfile
    
    if (id_user) {
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
        profileImage = userProfile; // Untuk kompatibilitas
      } catch (e) {
        console.error('Failed to get user profile:', e);
      }

      const libraryItems = await new Promise((resolve, reject) =>
        getLibraryAll(id_user, async (err, items) => {
          if (err) return reject(err);

          for (let item of items) {
            if (item.type === 'playlist') {
              try {
                const trackCount = await new Promise((res, rej) => {
                  db.query('SELECT COUNT(*) as count FROM music_cus WHERE id_cus = ?', [item.id], (err, result) => {
                    if (err) rej(err);
                    else res(result[0].count);
                  });
                });
                
                item.track_count = trackCount;
                
                const covers = await new Promise((res, rej) => {
                  db.query(
                    `SELECT DISTINCT m.cover_music 
                     FROM music_cus mc 
                     JOIN music m ON mc.id_music = m.id_music 
                     WHERE mc.id_cus = ? 
                     LIMIT 4`,
                    [item.id],
                    (err, results) => {
                      if (err) rej(err);
                      else res(results.map(row => row.cover_music));
                    }
                  );
                });
                
                item.track_covers = covers;
                
                if (covers.length === 1 && item.track_count > 1) {
                  item.cover = covers[0];
                  item.track_covers = [];
                } else {
                  item.track_covers = covers;
                }
              } catch (err) {
                console.error('Error getting track covers or count:', err);
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

      // Encode hashid untuk SEMUA item library
      [...playlists, ...favPlaylists, ...albums, ...artists].forEach(item => {
        if (item.type === 'playlist' && item.id_auto) {
          item.hashid = 'C' + hashids.encode(item.id_auto);
        } 
        else if (item.type === 'fav_playlist') {
          if (item.playlist_type === 'custom' && item.id_auto) {
            item.hashid = 'C' + hashids.encode(item.id_auto);
          } 
          else {
            item.hashid = hashids.encode(item.id);
          }
        }
        else if (item.type === 'album' && item.id_album_auto) {
          item.hashid = 'AL' + hashids.encode(item.id_album_auto);
        }
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
    }

    // Ambil playlistsByTag dan tagNames untuk navbar
    try {
      const playlistResults = await new Promise((resolve, reject) => 
        getPlaylists((err, results) => err ? reject(err) : resolve(results))
      );
      
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

    const resourceVersion = Date.now();
    
    const renderOptions = {
      music: musicData,
      isMusicPage: true,
      isPlaylistPage: false,
      isArtistPage: false,
      isAlbumPage: false,
      isFavMusicPage: false,
      isSearchPage: false,
      isLyricPage: false,
      isProfilePage: false, // Tambahkan ini
      isCategoryPage : false,
      isTop50Page : false,
      isMostPlayedPage : false,
      playlistsByTag,
      tagNames,
      customPlaylists: libraryData.playlists,
      libraryData,
      profileImage,
      userProfile, // Tambahkan ini
      userId: id_user,
      resourceVersion,
      playlist: null, // Tambahkan ini untuk konsistensi
      artist: null, // Tambahkan ini untuk konsistensi
      album: null, // Tambahkan ini untuk konsistensi
      favMusic: null // Tambahkan ini untuk konsistensi
    };

    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    res.render(req.xhr ? 'partials/music' : 'index', renderOptions);
  } catch (error) {
    console.error('Gagal memuat music:', error);
    res.status(500).send('Terjadi kesalahan server');
  }
});
















// Fungsi untuk mengubah ukuran gambar Google
function getGoogleProfilePic(profileUrl, size = 400) {
    if (!profileUrl || !profileUrl.includes('googleusercontent.com')) {
        return profileUrl || '/uploads/profile/default/default_pp.jpg';
    }
    
    // Ekstrak ID unik dari URL Google (handle berbagai format parameter)
    const match = profileUrl.match(/lh3\.googleusercontent\.com\/a\/([^?&=]+)/);
    if (!match || !match[1]) return profileUrl;
    
    const googleId = match[1];
    // Hapus parameter sizing lama dan ganti dengan size baru
    return `https://lh3.googleusercontent.com/a/${googleId}=s${size}`;
}

app.get('/profile/:hashid', async (req, res) => {
  const hashid = req.params.hashid;
  const id = hashids.decode(hashid)[0];
  const currentUserId = req.session.user_id || null;

  if (!id) return res.status(404).send('Invalid user ID');

  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

  try {
    // Get user profile data
    const userProfile = await new Promise((resolve, reject) => {
      db.query(
        `SELECT id_user, name_user, email_user, profile_user, user_followers, created_at 
         FROM users WHERE id_user = ?`,
        [id],
        (err, results) => {
          if (err) reject(err);
          else if (!results.length) reject(new Error('User not found'));
          else resolve(results[0]);
        }
      );
    });

    // PERBAIKAN UTAMA: Normalisasi URL gambar Google
    userProfile.profile_user = getGoogleProfilePic(userProfile.profile_user, 400);

    // Ambil total FOLLOWING
    const [followingResult] = await db.promise().query(
      'SELECT COUNT(*) as total_following FROM user_follow WHERE id_user = ?',
      [id]
    );
    
    const totalFollowing = followingResult[0].total_following;

    // Ambil total FOLLOWER
    const [followerResult] = await db.promise().query(
      'SELECT COUNT(*) as total_followers FROM user_follow WHERE id_user_follow = ?',
      [id]
    );
    
    const totalFollowers = followerResult[0].total_followers;

    // Update kolom user_followers di tabel users untuk konsistensi
    if (userProfile.user_followers !== totalFollowers) {
      await db.promise().query(
        'UPDATE users SET user_followers = ? WHERE id_user = ?',
        [totalFollowers, id]
      );
      userProfile.user_followers = totalFollowers;
    }

    // Ambil custom playlist user yang sedang dilihat
    const userCustomPlaylists = await new Promise((resolve, reject) => {
      const query = `
        SELECT 
          cp.id_cus AS id, 
          cp.id_auto,
          cp.playlist_name AS name, 
          cp.playlist_cover AS cover,
          cp.created_at,
          'playlist' AS type,
          (SELECT COUNT(*) FROM music_cus WHERE id_cus = cp.id_cus) AS track_count
        FROM custom_playlist cp
        WHERE cp.id_user = ? 
        ORDER BY cp.created_at DESC`;
      db.query(query, [id], (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    // Ambil track_covers untuk setiap custom playlist
    const userCustomPlaylistsWithCovers = await Promise.all(
      userCustomPlaylists.map(async (playlist) => {
        try {
          const covers = await new Promise((resolve, reject) => {
            const coverQuery = `
              SELECT DISTINCT m.cover_music
              FROM music_cus mc
              JOIN music m ON mc.id_music = m.id_music
              WHERE mc.id_cus = ?
              LIMIT 4`;
            db.query(coverQuery, [playlist.id], (err, results) => {
              if (err) reject(err);
              else resolve(results.map(row => row.cover_music));
            });
          });
          
          playlist.track_covers = covers;
          
          // Jika semua track memiliki cover yang sama dan lebih dari 1 track,
          // gunakan single cover saja
          if (covers.length === 1 && playlist.track_count > 1) {
            playlist.cover = covers[0];
            playlist.track_covers = [];
          }

          // Encode hashid untuk custom playlist
          playlist.hashid = 'C' + hashids.encode(playlist.id_auto);

        } catch (err) {
          console.error('Error getting track covers for user custom playlist:', err);
          playlist.track_covers = [];
        }
        return playlist;
      })
    );

    // Encode hashid untuk profile
    userProfile.hashid = hashid;
    userProfile.original_id = id;
    userProfile.total_following = totalFollowing;

    // Check if current user is following this profile
    let isFollowing = false;
    if (currentUserId && currentUserId !== id) {
      isFollowing = await new Promise((resolve, reject) => {
        db.query(
          'SELECT id_uf FROM user_follow WHERE id_user = ? AND id_user_follow = ?',
          [currentUserId, id],
          (err, results) => {
            if (err) reject(err);
            else resolve(results.length > 0);
          }
        );
      });
    }

    // Check if this is current user's own profile
    const isOwnProfile = currentUserId === parseInt(id);

    // Get library data for current user (jika ada)
    let libraryData = { 
      playlists: [], 
      artists: [], 
      albums: [], 
      favPlaylists: [] 
    };

    if (currentUserId) {
      try {
        const libraryItems = await new Promise((resolve, reject) =>
          getLibraryAll(currentUserId, async (err, items) => {
            if (err) return reject(err);

            for (let item of items) {
              if (item.type === 'playlist') {
                try {
                  const trackCount = await new Promise((res, rej) => {
                    db.query('SELECT COUNT(*) as count FROM music_cus WHERE id_cus = ?', [item.id], (err, result) => {
                      if (err) rej(err);
                      else res(result[0].count);
                    });
                  });
                  
                  item.track_count = trackCount;
                  
                  const covers = await new Promise((res, rej) => {
                    db.query(
                      `SELECT DISTINCT m.cover_music 
                       FROM music_cus mc 
                       JOIN music m ON mc.id_music = m.id_music 
                       WHERE mc.id_cus = ? 
                       LIMIT 4`,
                      [item.id],
                      (err, results) => {
                        if (err) rej(err);
                        else res(results.map(row => row.cover_music));
                      }
                    );
                  });
                  
                  item.track_covers = covers;
                  
                  if (covers.length === 1 && item.track_count > 1) {
                    item.cover = covers[0];
                    item.track_covers = [];
                  } else {
                    item.track_covers = covers;
                  }
                } catch (err) {
                  console.error('Error getting track covers or count:', err);
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

        // Encode hashid untuk semua item library
        [...playlists, ...favPlaylists, ...albums, ...artists].forEach(item => {
          if (item.type === 'playlist' && item.id_auto) {
            item.hashid = 'C' + hashids.encode(item.id_auto);
          } 
          else if (item.type === 'fav_playlist') {
            if (item.playlist_type === 'custom' && item.id_auto) {
              item.hashid = 'C' + hashids.encode(item.id_auto);
            } 
            else {
              item.hashid = hashids.encode(item.id);
            }
          }
          else if (item.type === 'album' && item.id_album_auto) {
            item.hashid = 'AL' + hashids.encode(item.id_album_auto);
          }
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
        console.error('Failed to prepare library data:', e);
      }
    }

    // Get playlistsByTag dan tagNames untuk navbar
    let playlistsByTag = {};
    let tagNames = {};
    try {
      const playlistResults = await new Promise((resolve, reject) => 
        getPlaylists((err, results) => err ? reject(err) : resolve(results))
      );
      
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

    // Get current user profile image (jika ada)
    let profileImage = null;
    if (currentUserId) {
      try {
        profileImage = await new Promise((resolve, reject) => {
          getUserProfile(currentUserId, (err, profile) => {
            if (err) reject(err);
            else resolve(profile);
          });
        });
        
        // PERBAIKAN TAMBAHAN: Normalisasi juga gambar profil user yang sedang login
        if (profileImage && profileImage.profileImage) {
          profileImage.profileImage = getGoogleProfilePic(profileImage.profileImage, 50);
        }
      } catch (e) {
        console.error('Failed to get current user profile:', e);
      }
    }

    const resourceVersion = Date.now();
    const renderOptions = {
      userProfile,
      isProfilePage: true,
      isPlaylistPage: false,
      isArtistPage: false,
      isAlbumPage: false,
      isMusicPage: false,
      isFavMusicPage: false,
      isSearchPage: false,
      isLyricPage: false,
      isCategoryPage : false,
      isTop50Page : false,
      isMostPlayedPage : false,
      playlistsByTag,
      tagNames,
      customPlaylists: libraryData.playlists,
      libraryData,
      profileImage,
      isFollowing,
      isOwnProfile,
      userId: currentUserId,
      resourceVersion,
      userCustomPlaylists: userCustomPlaylistsWithCovers
    };

    res.render(req.xhr ? 'partials/profile' : 'index', renderOptions);

  } catch (error) {
    console.error('Error loading user profile:', error);
    res.status(500).send('Failed to load user profile');
  }
});
app.post("/removeFollower", async (req, res) => {
  const { id_user_follower } = req.body; // ID orang yang mengikuti kita
  const current_user_id = req.session.user_id;

  if (!current_user_id || !id_user_follower) {
    return res.status(400).json({ 
      success: false, 
      message: "Data tidak lengkap" 
    });
  }

  try {
    // Cek apakah user ini benar-benar follower kita
    const [check] = await db.promise().query(
      'SELECT id_uf FROM user_follow WHERE id_user = ? AND id_user_follow = ?',
      [id_user_follower, current_user_id] // id_user_follower mengikuti current_user_id
    );
    
    if (check.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Follower tidak ditemukan" 
      });
    }

    // Hapus follower
    await db.promise().query(
      'DELETE FROM user_follow WHERE id_user = ? AND id_user_follow = ?',
      [id_user_follower, current_user_id]
    );

    // Update count
    const [followerResult] = await db.promise().query(
      'SELECT COUNT(*) as total_followers FROM user_follow WHERE id_user_follow = ?',
      [current_user_id]
    );
    
    const newFollowerCount = followerResult[0].total_followers;

    await db.promise().query(
      'UPDATE users SET user_followers = ? WHERE id_user = ?',
      [newFollowerCount, current_user_id]
    );

    return res.json({ 
      success: true,
      is_follow: false,
      new_follower_count: newFollowerCount,
      message: "Follower berhasil dihapus" 
    });

  } catch (error) {
    console.error("Gagal menghapus follower:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Terjadi kesalahan server" 
    });
  }
});


// app.js - di route /userFollow

app.post("/userFollow", async (req, res) => {
  const { id_user_follow } = req.body;
  const current_user_id = req.session.user_id;

  if (!current_user_id || !id_user_follow) {
    return res.status(400).json({ 
      success: false, 
      message: "Data tidak lengkap" 
    });
  }

  // Cek jika mencoba follow diri sendiri
  if (parseInt(current_user_id) === parseInt(id_user_follow)) {
    return res.status(400).json({ 
      success: false, 
      message: "Tidak bisa follow/unfollow diri sendiri" 
    });
  }

  try {
    // Cek apakah user target ada
    const [userCheck] = await db.promise().query(
      'SELECT id_user FROM users WHERE id_user = ?',
      [id_user_follow]
    );
    
    if (userCheck.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "User tidak ditemukan" 
      });
    }

    // Cek status follow saat ini
    const [followCheck] = await db.promise().query(
      'SELECT id_uf FROM user_follow WHERE id_user = ? AND id_user_follow = ?',
      [current_user_id, id_user_follow]
    );
    
    const isCurrentlyFollowing = followCheck.length > 0;
    
    if (!isCurrentlyFollowing) {
      // FOLLOW: Tambahkan follow
      await db.promise().query(
        'INSERT INTO user_follow (id_user, id_user_follow, created_at) VALUES (?, ?, NOW())',
        [current_user_id, id_user_follow]
      );
      
      // Update follower count untuk user yang di-follow
      const [followerResult] = await db.promise().query(
        'SELECT COUNT(*) as total_followers FROM user_follow WHERE id_user_follow = ?',
        [id_user_follow]
      );
      
      const newFollowerCount = followerResult[0].total_followers;
      
      await db.promise().query(
        'UPDATE users SET user_followers = ? WHERE id_user = ?',
        [newFollowerCount, id_user_follow]
      );
      
      // Update following count untuk user yang melakukan follow
      const [followingResult] = await db.promise().query(
        'SELECT COUNT(*) as total_following FROM user_follow WHERE id_user = ?',
        [current_user_id]
      );
      
      const newFollowingCount = followingResult[0].total_following;
      
      return res.json({
        success: true,
        is_follow: true,
        action: 'follow',
        // Siapa yang follower countnya berubah?
        follower_count_changed_for: id_user_follow, // User yang di-follow
        new_follower_count: newFollowerCount,
        // Siapa yang following countnya berubah?
        following_count_changed_for: current_user_id, // User yang melakukan follow
        new_following_count: newFollowingCount,
        message: "Berhasil follow user"
      });
      
    } else {
      // UNFOLLOW: Hapus follow
      await db.promise().query(
        'DELETE FROM user_follow WHERE id_user = ? AND id_user_follow = ?',
        [current_user_id, id_user_follow]
      );
      
      // Update follower count untuk user yang di-unfollow
      const [followerResult] = await db.promise().query(
        'SELECT COUNT(*) as total_followers FROM user_follow WHERE id_user_follow = ?',
        [id_user_follow]
      );
      
      const newFollowerCount = followerResult[0].total_followers;
      
      await db.promise().query(
        'UPDATE users SET user_followers = ? WHERE id_user = ?',
        [newFollowerCount, id_user_follow]
      );
      
      // Update following count untuk user yang melakukan unfollow
      const [followingResult] = await db.promise().query(
        'SELECT COUNT(*) as total_following FROM user_follow WHERE id_user = ?',
        [current_user_id]
      );
      
      const newFollowingCount = followingResult[0].total_following;
      
      return res.json({ 
        success: true, 
        is_follow: false,
        action: 'unfollow',
        // Siapa yang follower countnya berubah?
        follower_count_changed_for: id_user_follow, // User yang di-unfollow
        new_follower_count: newFollowerCount,
        // Siapa yang following countnya berubah?
        following_count_changed_for: current_user_id, // User yang melakukan unfollow
        new_following_count: newFollowingCount,
        message: "Berhasil unfollow user" 
      });
    }

  } catch (error) {
    console.error("Gagal mengubah status follow user:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Terjadi kesalahan server" 
    });
  }
});



const GenreMatcher = require('./helpers/genreMatcher');

// app.js - Update route untuk handle Top Playlist
app.get('/category/:categoryName', async (req, res) => {
  const userId = req.session.user_id;
  const categoryName = decodeURIComponent(req.params.categoryName);
  
  console.log(`\n=== Server-side rendering category: ${categoryName} ===`);
  
  // SPECIAL CASE: Top Playlist menggunakan query berbeda
  if (categoryName === 'Top Playlist') {
    return await handleTopPlaylist(req, res, userId);
  }
  
  // Query untuk kategori biasa
  const sql = `
      SELECT 
          p.id_playlist,
          p.playlist_name,
          p.playlist_cover,
          p.playlist_tipe,
          p.playing, 
          GROUP_CONCAT(DISTINCT g.genre_name ORDER BY g.genre_name) as genres,
          COUNT(DISTINCT g.id_genre) as genre_count,
          GROUP_CONCAT(DISTINCT a.artist_name SEPARATOR ', ') as artist_names,
          COUNT(DISTINCT mp.id_music) as total_tracks
      FROM playlist p
      JOIN music_playlist mp ON p.id_playlist = mp.id_playlist
      JOIN music m ON mp.id_music = m.id_music
      LEFT JOIN music_genre mg ON m.id_music = mg.id_music
      LEFT JOIN genre g ON mg.id_genre = g.id_genre
      LEFT JOIN music_artist ma ON m.id_music = ma.id_music
      LEFT JOIN artist a ON ma.id_artist = a.id_artist
      WHERE p.id_playlist IS NOT NULL
      GROUP BY p.id_playlist, p.playlist_name, p.playlist_cover, p.playlist_tipe, p.playing
      HAVING COUNT(DISTINCT mp.id_music) >= 3  -- Kurangi menjadi minimal 3 track
      ORDER BY COUNT(DISTINCT mp.id_music) DESC
  `;

  db.query(sql, async (err, playlists) => {
    if (err) {
      console.error("Error fetching playlists:", err);
      return res.status(500).send('Gagal mengambil data playlist.');
    }

    console.log(`Total playlists from DB: ${playlists.length}`);
    
    // Proses playlist
    const processedPlaylists = playlists.map(playlist => {
      const genres = playlist.genres ? 
          playlist.genres.split(',').map(g => g.trim()) : [];
      
      return {
        ...playlist,
        hashid: hashids.encode(playlist.id_playlist),
        genres: genres,
        total_tracks: playlist.total_tracks || 0,
        genre_count: playlist.genre_count || 0,
        play_count: playlist.playing || 0  // Tambahkan play count
      };
    });

    // Gunakan recommender system
    const recommendedPlaylists = await GenreMatcher.recommendPlaylists(
      processedPlaylists, 
      categoryName,
      db,
      20
    );

    console.log(`Final recommended playlists: ${recommendedPlaylists.length}`);
    
    // Render template
    await renderCategoryTemplate(res, userId, categoryName, recommendedPlaylists);
  });
});

// Fungsi khusus untuk handle Top Playlist
async function handleTopPlaylist(req, res, userId) {
  console.log(`\n=== Handling Top Playlist ===`);
  
  try {
    // Gunakan method khusus dari GenreMatcher
    const topPlaylists = await GenreMatcher.getTopPlaylists(db, 50);
    
    console.log(`Top playlists found: ${topPlaylists.length}`);
    
    // Render template
    await renderCategoryTemplate(res, userId, 'Top Playlist', topPlaylists, true);
    
  } catch (error) {
    console.error('Error handling top playlist:', error);
    res.status(500).send('Gagal mengambil data top playlist.');
  }
}

// Fungsi helper untuk render template
async function renderCategoryTemplate(res, userId, categoryName, playlists, isTopPlaylist = false) {
  // Jika user tidak login
  if (!userId) {
    return res.render('index', {
      isCategoryPage: true,
      categoryName: categoryName,
      playlists: playlists,
      userId: null,
      libraryData: {
        playlists: [],
        artists: [],
        albums: [],
        favPlaylists: []
      },
      profileImage: null,
      isPlaylistPage: false,
      isArtistPage: false,
      isAlbumPage: false,
      isMusicPage: false,
      isFavMusicPage: false,
      isSearchPage: false,
      isLyricPage: false,
      isProfilePage: false,
      isTop50Page: false,
      isMostPlayedPage: false,
      isTopPlaylistPage: isTopPlaylist,  // Flag khusus untuk Top Playlist
      playlist: null,
      artist: null,
      album: null,
      music: null,
      favMusic: null,
      userProfile: null,
      customPlaylists: [],
      playlistsByTag: {},
      tagNames: {}
    });
  }

  // User login - ambil data tambahan
  getLibraryAll(userId, (err, libraryItems) => {
    if (err) {
      console.error('Error getting library data:', err);
      const libraryData = {
        playlists: [],
        artists: [],
        albums: [],
        favPlaylists: []
      };
      
      getUserProfile(userId, (err, userProfile) => {
        if (err) {
          console.error('Error getting user profile:', err);
          userProfile = null;
        } else {
          userProfile.hashid = hashids.encode(userId);
        }
        
        res.render('index', {
          isCategoryPage: true,
          categoryName: categoryName,
          playlists: playlists,
          userId: userId,
          libraryData: libraryData,
          userProfile: userProfile,
          profileImage: userProfile,
          isPlaylistPage: false,
          isArtistPage: false,
          isAlbumPage: false,
          isMusicPage: false,
          isFavMusicPage: false,
          isSearchPage: false,
          isLyricPage: false,
          isProfilePage: false,
          isTop50Page: false,
          isMostPlayedPage: false,
          isTopPlaylistPage: isTopPlaylist,
          playlist: null,
          artist: null,
          album: null,
          music: null,
          favMusic: null,
          customPlaylists: [],
          playlistsByTag: {},
          tagNames: {}
        });
      });
    } else {
      // Proses library items
      const navbarPlaylists = libraryItems.filter(item => item.type === 'playlist');
      const favPlaylists = libraryItems.filter(item => item.type === 'fav_playlist');
      const albums = libraryItems.filter(item => item.type === 'album');
      const artists = libraryItems.filter(item => item.type === 'artist');

      // Tambahkan hashid untuk library items
      [...navbarPlaylists, ...favPlaylists, ...albums, ...artists].forEach(item => {
        if (item.type === 'playlist' && item.id_auto) {
          item.hashid = 'C' + hashids.encode(item.id_auto);
        } else if (item.type === 'fav_playlist') {
          if (item.playlist_type === 'custom' && item.id_auto) {
            item.hashid = 'C' + hashids.encode(item.id_auto);
          } else {
            item.hashid = hashids.encode(item.id);
          }
        } else if (item.type === 'album' && item.id_album_auto) {
          item.hashid = 'AL' + hashids.encode(item.id_album_auto);
        } else if (item.type === 'artist' && item.id_artist_auto) {
          item.hashid = 'AR' + hashids.encode(item.id_artist_auto);
        }
      });

      const libraryData = {
        playlists: navbarPlaylists,
        artists: artists,
        albums: albums,
        favPlaylists: favPlaylists
      };

      // Ambil profil user
      getUserProfile(userId, (err, userProfile) => {
        if (err) {
          console.error('Error getting user profile:', err);
          userProfile = null;
        } else {
          userProfile.hashid = hashids.encode(userId);
        }

        res.render('index', {
          isCategoryPage: true,
          categoryName: categoryName,
          playlists: playlists,
          userId: userId,
          libraryData: libraryData,
          userProfile: userProfile,
          profileImage: userProfile,
          isPlaylistPage: false,
          isArtistPage: false,
          isAlbumPage: false,
          isMusicPage: false,
          isFavMusicPage: false,
          isSearchPage: false,
          isLyricPage: false,
          isProfilePage: false,
          isTop50Page: false,
          isMostPlayedPage: false,
          isTopPlaylistPage: isTopPlaylist,
          playlist: null,
          artist: null,
          album: null,
          music: null,
          favMusic: null,
          customPlaylists: navbarPlaylists,
          playlistsByTag: {},
          tagNames: {}
        });
      });
    }
  });
}

// Update route AJAX untuk partials
app.get('/partial/category/:categoryName', async (req, res) => {
    const userId = req.session.user_id;
    const categoryName = decodeURIComponent(req.params.categoryName);
    
    console.log(`\n=== Processing category (AJAX): ${categoryName} ===`);
    
    // SPECIAL CASE: Top Playlist
    if (categoryName === 'Top Playlist') {
        try {
            const topPlaylists = await GenreMatcher.getTopPlaylists(db, 50);
            return renderCategoryPartial(res, userId, categoryName, topPlaylists, true);
        } catch (error) {
            console.error('Error fetching top playlists for AJAX:', error);
            return res.status(500).send('Gagal mengambil data top playlist.');
        }
    }

    // Query untuk kategori biasa
    const sql = `
        SELECT 
            p.id_playlist,
            p.playlist_name,
            p.playlist_cover,
            p.playlist_tipe,
            p.playing,
            GROUP_CONCAT(DISTINCT g.genre_name ORDER BY g.genre_name) as genres,
            COUNT(DISTINCT g.id_genre) as genre_count,
            GROUP_CONCAT(DISTINCT a.artist_name SEPARATOR ', ') as artist_names,
            COUNT(DISTINCT mp.id_music) as total_tracks
        FROM playlist p
        JOIN music_playlist mp ON p.id_playlist = mp.id_playlist
        JOIN music m ON mp.id_music = m.id_music
        LEFT JOIN music_genre mg ON m.id_music = mg.id_music
        LEFT JOIN genre g ON mg.id_genre = g.id_genre
        LEFT JOIN music_artist ma ON m.id_music = ma.id_music
        LEFT JOIN artist a ON ma.id_artist = a.id_artist
        WHERE p.id_playlist IS NOT NULL
        GROUP BY p.id_playlist, p.playlist_name, p.playlist_cover, p.playlist_tipe, p.playing
        HAVING COUNT(DISTINCT mp.id_music) >= 3
        ORDER BY COUNT(DISTINCT mp.id_music) DESC
    `;

    db.query(sql, async (err, playlists) => {
        if (err) {
            console.error("Error fetching playlists:", err);
            return res.status(500).send('Gagal mengambil data playlist.');
        }

        console.log(`Total playlists from DB: ${playlists.length}`);

        // Proses playlist
        const processedPlaylists = playlists.map(playlist => {
          const genres = playlist.genres ? 
              playlist.genres.split(',').map(g => g.trim()) : [];
          
          return {
            ...playlist,
            hashid: hashids.encode(playlist.id_playlist),
            genres: genres,
            total_tracks: playlist.total_tracks || 0,
            genre_count: playlist.genre_count || 0,
            play_count: playlist.playing || 0
          };
        });

        // Gunakan recommender system
        const recommendedPlaylists = await GenreMatcher.recommendPlaylists(
          processedPlaylists, 
          categoryName,
          db,
          20
        );

        console.log(`Recommended playlists for AJAX: ${recommendedPlaylists.length}`);
        
        // Render partial
        await renderCategoryPartial(res, userId, categoryName, recommendedPlaylists);
    });
});

// Fungsi helper untuk render partial
async function renderCategoryPartial(res, userId, categoryName, playlists, isTopPlaylist = false) {
    // Jika user tidak login
    if (!userId) {
        return res.render('partials/categoryplaylist', {
            categoryName: categoryName,
            playlists: playlists,
            userId: null,
            libraryData: { playlists: [], artists: [], albums: [], favPlaylists: [] },
            isArtistPage: false,
            isTopPlaylistPage: isTopPlaylist
        });
    }

    // User login - ambil data library
    getLibraryAll(userId, (err, libraryItems) => {
        if (err) {
            console.error('Error getting library data for AJAX:', err);
            return res.render('partials/categoryplaylist', {
                categoryName: categoryName,
                playlists: playlists,
                userId: userId,
                libraryData: { playlists: [], artists: [], albums: [], favPlaylists: [] },
                isArtistPage: false,
                isTopPlaylistPage: isTopPlaylist
            });
        }

        const navbarPlaylists = libraryItems.filter(item => item.type === 'playlist');
        const favPlaylists = libraryItems.filter(item => item.type === 'fav_playlist');
        const albums = libraryItems.filter(item => item.type === 'album');
        const artists = libraryItems.filter(item => item.type === 'artist');

        // Tambahkan hashid untuk library items
        [...navbarPlaylists, ...favPlaylists, ...albums, ...artists].forEach(item => {
            if (item.type === 'playlist' && item.id_auto) {
                item.hashid = 'C' + hashids.encode(item.id_auto);
            } else if (item.type === 'fav_playlist') {
                if (item.playlist_type === 'custom' && item.id_auto) {
                    item.hashid = 'C' + hashids.encode(item.id_auto);
                } else {
                    item.hashid = hashids.encode(item.id);
                }
            } else if (item.type === 'album' && item.id_album_auto) {
                item.hashid = 'AL' + hashids.encode(item.id_album_auto);
            } else if (item.type === 'artist' && item.id_artist_auto) {
                item.hashid = 'AR' + hashids.encode(item.id_artist_auto);
            }
        });

        res.render('partials/categoryplaylist', {
            categoryName: categoryName,
            playlists: playlists,
            userId,
            libraryData: {
                playlists: navbarPlaylists,
                artists: artists,
                albums: albums,
                favPlaylists
            },
            isArtistPage: false,
            isTopPlaylistPage: isTopPlaylist
        });
    });
}






// Route untuk top 50 tracks (1 bulan terakhir) - PERBAIKAN QUERY
app.get('/top50tracks', async (req, res) => {
  const id_user = req.session.user_id || null;
  
  try {
    // Hitung tanggal 1 bulan yang lalu
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    // PERBAIKAN: Query yang benar untuk mendapatkan top 50 tracks
    const sql = `
      SELECT 
        m.id_music,
        m.audio_file,
        m.title_music,
        m.cover_music,
        m.lyric,
        m.line_durations,
        COUNT(ra.id_music) as play_count,
        MAX(ra.played_at) as last_played_at,
        GROUP_CONCAT(DISTINCT a.artist_name ORDER BY ma.id_ma SEPARATOR ', ') AS artist_names,
        GROUP_CONCAT(DISTINCT a.id_artist ORDER BY ma.id_ma SEPARATOR ',') AS artist_ids
      FROM 
        recent_activity ra
      JOIN 
        music m ON ra.id_music = m.id_music
      LEFT JOIN 
        music_artist ma ON m.id_music = ma.id_music
      LEFT JOIN 
        artist a ON ma.id_artist COLLATE utf8mb4_unicode_ci = a.id_artist COLLATE utf8mb4_unicode_ci
      WHERE 
        ra.played_at >= ?
        AND ra.id_music IS NOT NULL
      GROUP BY 
        m.id_music
      ORDER BY 
        play_count DESC,
        last_played_at DESC
      LIMIT 50
    `;
    
    const [topTracks] = await db.promise().query(sql, [oneMonthAgo]);
    
    // PERBAIKAN: Jika tidak ada data dari 1 bulan terakhir, ambil data dari semua waktu
    let finalTracks = topTracks;
    
    if (topTracks.length === 0) {
      const fallbackSql = `
        SELECT 
          m.id_music,
          m.audio_file,
          m.title_music,
          m.cover_music,
          m.lyric,
          m.line_durations,
          COUNT(ra.id_music) as play_count,
          MAX(ra.played_at) as last_played_at,
          GROUP_CONCAT(DISTINCT a.artist_name ORDER BY ma.id_ma SEPARATOR ', ') AS artist_names,
          GROUP_CONCAT(DISTINCT a.id_artist ORDER BY ma.id_ma SEPARATOR ',') AS artist_ids
        FROM 
          recent_activity ra
        JOIN 
          music m ON ra.id_music = m.id_music
        LEFT JOIN 
          music_artist ma ON m.id_music = ma.id_music
        LEFT JOIN 
          artist a ON ma.id_artist COLLATE utf8mb4_unicode_ci = a.id_artist COLLATE utf8mb4_unicode_ci
        WHERE 
          ra.id_music IS NOT NULL
        GROUP BY 
          m.id_music
        ORDER BY 
          play_count DESC,
          last_played_at DESC
        LIMIT 50
      `;
      
      const [fallbackTracks] = await db.promise().query(fallbackSql);
      finalTracks = fallbackTracks;
    }
    
    // PERBAIKAN: Jika masih tidak ada data dari recent_activity, ambil musik secara acak dari database
    if (finalTracks.length === 0) {
      const randomSql = `
        SELECT 
          m.id_music,
          m.audio_file,
          m.title_music,
          m.cover_music,
          m.lyric,
          m.line_durations,
          0 as play_count,
          NULL as last_played_at,
          GROUP_CONCAT(DISTINCT a.artist_name ORDER BY ma.id_ma SEPARATOR ', ') AS artist_names,
          GROUP_CONCAT(DISTINCT a.id_artist ORDER BY ma.id_ma SEPARATOR ',') AS artist_ids
        FROM 
          music m
        LEFT JOIN 
          music_artist ma ON m.id_music = ma.id_music
        LEFT JOIN 
          artist a ON ma.id_artist COLLATE utf8mb4_unicode_ci = a.id_artist COLLATE utf8mb4_unicode_ci
        GROUP BY 
          m.id_music
        ORDER BY 
          RAND()
        LIMIT 30
      `;
      
      const [randomTracks] = await db.promise().query(randomSql);
      finalTracks = randomTracks;
    }
    
    // Process tracks seperti di playlist
    const tracksWithExtras = await Promise.all(finalTracks.map(async (track, index) => {
      const id = track.id_music;
      
      // Get albums
      const [albums] = await db.promise().query(
        `SELECT al.*, al.id_album_auto FROM album al 
         JOIN music_album ma ON al.id_al = ma.id_al
         WHERE ma.id_music = ?`,
        [id]
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
      
      // Get artists
      let artistsData = [];
      const [artistRows] = await db.promise().query(
        `SELECT a.id_artist, a.artist_name, a.id_artist_auto 
         FROM artist a
         JOIN music_artist ma ON a.id_artist COLLATE utf8mb4_unicode_ci = ma.id_artist COLLATE utf8mb4_unicode_ci
         WHERE ma.id_music = ?
         ORDER BY ma.id_ma`,
        [id]
      );
      
      artistsData = artistRows.map(artist => ({
        id: artist.id_artist,
        name: artist.artist_name,
        hashid: 'AR' + hashids.encode(artist.id_artist_auto || artist.id_artist)
      }));
      
      // Get audio duration
      let duration = { formatted: '0:00', seconds: 0 };
      try {
        duration = await getAudioDuration(path.join(__dirname, 'public', track.audio_file));
      } catch (e) {
        console.error(`Error getting audio duration for ${track.title_music}:`, e);
      }
      
      // PERBAIKAN: Get favorite status - GANTI TABLE favorite MENJADI music_fav
      let isFavorite = false;
      if (id_user) {
        const [favRows] = await db.promise().query(
          'SELECT id_fav FROM music_fav WHERE id_user = ? AND id_music = ?',
          [id_user, id]
        );
        isFavorite = favRows.length > 0;
      }
      
      // Get custom playlists
      let custom_playlists = [];
      if (id_user) {
        custom_playlists = await getAvailableCustomPlaylists(id_user, id);
      }
      
      return {
        ...track,
        albums: albumsWithHashid,
        artists: artistsData,
        duration: duration.formatted,
        durationSeconds: duration.seconds,
        isFavorite: isFavorite,
        custom_playlists: custom_playlists,
        hashid: 'MU' + hashids.encode(id),
        track_hashid: 'MU' + hashids.encode(id),
        playlist_hashid: 'top50',
        playlist_original_id: 'top50',
        play_count: track.play_count || 0, // Default 0 jika null
        last_played_at: track.last_played_at || null,
        rank: index + 1
      };
    }));
    
    // Prepare playlist-like object
    const playlist = {
      playlist_name: 'Top 50 Tracks',
      playlist_cover: '/images/top50-cover.jpg',
      tag_name: 'Popular',
      id_playlist: 'top50',
      hashid: 'top50',
      original_id: 'top50',
      tracks: tracksWithExtras,
      totalTracks: tracksWithExtras.length,
      totalDuration: tracksWithExtras.reduce((sum, track) => sum + (track.durationSeconds || 0), 0),
      description: 'Most played tracks in the last 30 days'
    };
    
    // Format total duration
    const totalHours = Math.floor(playlist.totalDuration / 3600);
    const totalMinutes = Math.floor((playlist.totalDuration % 3600) / 60);
    playlist.formattedDuration = `${totalHours > 0 ? `${totalHours} hr ` : ''}${totalMinutes} min`;
    
    // Get library data jika user login
    let libraryData = { playlists: [], artists: [], albums: [], favPlaylists: [] };
    let profileImage = null;
    let userProfile = null;
    
    if (id_user) {
      // Ambil data user profile
      try {
        userProfile = await new Promise((resolve, reject) => {
          getUserProfile(id_user, (err, profile) => {
            if (err) reject(err);
            else {
              profile.hashid = hashids.encode(id_user);
              resolve(profile);
            }
          });
        });
        profileImage = userProfile;
      } catch (e) {
        console.error('Failed to get user profile:', e);
      }
      
      // Get library data
      try {
        const libraryItems = await new Promise((resolve, reject) =>
          getLibraryAll(id_user, async (err, items) => {
            if (err) return reject(err);
            
            for (let item of items) {
              if (item.type === 'playlist') {
                try {
                  const trackCount = await new Promise((res, rej) => {
                    db.query('SELECT COUNT(*) as count FROM music_cus WHERE id_cus = ?', [item.id], (err, result) => {
                      if (err) rej(err);
                      else res(result[0].count);
                    });
                  });
                  
                  item.track_count = trackCount;
                  
                  const covers = await new Promise((res, rej) => {
                    db.query(
                      `SELECT DISTINCT m.cover_music 
                       FROM music_cus mc 
                       JOIN music m ON mc.id_music = m.id_music 
                       WHERE mc.id_cus = ? 
                       LIMIT 4`,
                      [item.id],
                      (err, results) => {
                        if (err) rej(err);
                        else res(results.map(row => row.cover_music));
                      }
                    );
                  });
                  
                  item.track_covers = covers;
                  
                  if (covers.length === 1 && item.track_count > 1) {
                    item.cover = covers[0];
                    item.track_covers = [];
                  } else {
                    item.track_covers = covers;
                  }
                } catch (err) {
                  console.error('Error getting track covers or count:', err);
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
        
        // Encode hashid
        [...playlists, ...favPlaylists, ...albums, ...artists].forEach(item => {
          if (item.type === 'playlist' && item.id_auto) {
            item.hashid = 'C' + hashids.encode(item.id_auto);
          } 
          else if (item.type === 'fav_playlist') {
            if (item.playlist_type === 'custom' && item.id_auto) {
              item.hashid = 'C' + hashids.encode(item.id_auto);
            } 
            else {
              item.hashid = hashids.encode(item.id);
            }
          }
          else if (item.type === 'album' && item.id_album_auto) {
            item.hashid = 'AL' + hashids.encode(item.id_album_auto);
          }
          else if (item.type === 'artist' && item.id_artist_auto) {
            item.hashid = 'AR' + hashids.encode(item.id_artist_auto);
          }
        });
        
        libraryData = { playlists, artists, albums, favPlaylists };
      } catch (e) {
        console.error('Failed to get library data:', e);
      }
    }
    
    // Get playlistsByTag dan tagNames untuk navbar
    let playlistsByTag = {};
    let tagNames = {};
    try {
      const playlistResults = await new Promise((resolve, reject) => 
        getPlaylists((err, results) => err ? reject(err) : resolve(results))
      );
      
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
    
    const resourceVersion = Date.now();
    const renderOptions = {
      playlist,
      isTop50Page: true,
      isMostPlayedPage: false,
      isPlaylistPage: false,
      isArtistPage: false,
      isAlbumPage: false,
      isMusicPage: false,
      isFavMusicPage: false,
      isSearchPage: false,
      isLyricPage: false,
      isProfilePage: false,
      isCategoryPage: false,
      playlistsByTag,
      tagNames,
      customPlaylists: libraryData.playlists,
      libraryData,
      profileImage,
      userProfile,
      isPlaylistFavorite: false,
      userId: id_user,
      resourceVersion,
      artist: null,
      album: null,
      music: null,
      favMusic: null
    };
    
    res.render(req.xhr ? 'partials/top50' : 'index', renderOptions);
    
  } catch (error) {
    console.error('Error in /top50tracks:', error);
    res.status(500).send('Internal server error');
  }
});

// Route untuk most played tracks (1 minggu terakhir) - PERBAIKAN QUERY
app.get('/mostplayed', async (req, res) => {
  const id_user = req.session.user_id || null;
  
  try {
    // Hitung tanggal 1 minggu yang lalu
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    // PERBAIKAN: Query yang benar untuk mendapatkan top 30 tracks
    const sql = `
      SELECT 
        m.id_music,
        m.audio_file,
        m.title_music,
        m.cover_music,
        m.lyric,
        m.line_durations,
        COUNT(ra.id_music) as play_count,
        MAX(ra.played_at) as last_played_at,
        GROUP_CONCAT(DISTINCT a.artist_name ORDER BY ma.id_ma SEPARATOR ', ') AS artist_names,
        GROUP_CONCAT(DISTINCT a.id_artist ORDER BY ma.id_ma SEPARATOR ',') AS artist_ids
      FROM 
        recent_activity ra
      JOIN 
        music m ON ra.id_music = m.id_music
      LEFT JOIN 
        music_artist ma ON m.id_music = ma.id_music
      LEFT JOIN 
        artist a ON ma.id_artist COLLATE utf8mb4_unicode_ci = a.id_artist COLLATE utf8mb4_unicode_ci
      WHERE 
        ra.played_at >= ?
        AND ra.id_music IS NOT NULL
      GROUP BY 
        m.id_music
      ORDER BY 
        play_count DESC,
        last_played_at DESC
      LIMIT 30
    `;
    
    const [topTracks] = await db.promise().query(sql, [oneWeekAgo]);
    
    // PERBAIKAN: Jika tidak ada data dari 1 minggu terakhir, ambil data dari 1 bulan terakhir
    let finalTracks = topTracks;
    
    if (topTracks.length === 0) {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      
      const fallbackSql = `
        SELECT 
          m.id_music,
          m.audio_file,
          m.title_music,
          m.cover_music,
          m.lyric,
          m.line_durations,
          COUNT(ra.id_music) as play_count,
          MAX(ra.played_at) as last_played_at,
          GROUP_CONCAT(DISTINCT a.artist_name ORDER BY ma.id_ma SEPARATOR ', ') AS artist_names,
          GROUP_CONCAT(DISTINCT a.id_artist ORDER BY ma.id_ma SEPARATOR ',') AS artist_ids
        FROM 
          recent_activity ra
        JOIN 
          music m ON ra.id_music = m.id_music
        LEFT JOIN 
          music_artist ma ON m.id_music = ma.id_music
        LEFT JOIN 
          artist a ON ma.id_artist COLLATE utf8mb4_unicode_ci = a.id_artist COLLATE utf8mb4_unicode_ci
        WHERE 
          ra.played_at >= ?
          AND ra.id_music IS NOT NULL
        GROUP BY 
          m.id_music
        ORDER BY 
          play_count DESC,
          last_played_at DESC
        LIMIT 30
      `;
      
      const [fallbackTracks] = await db.promise().query(fallbackSql, [oneMonthAgo]);
      finalTracks = fallbackTracks;
    }
    
    // PERBAIKAN: Jika masih tidak ada data, ambil dari semua waktu atau random
    if (finalTracks.length === 0) {
      const randomSql = `
        SELECT 
          m.id_music,
          m.audio_file,
          m.title_music,
          m.cover_music,
          m.lyric,
          m.line_durations,
          0 as play_count,
          NULL as last_played_at,
          GROUP_CONCAT(DISTINCT a.artist_name ORDER BY ma.id_ma SEPARATOR ', ') AS artist_names,
          GROUP_CONCAT(DISTINCT a.id_artist ORDER BY ma.id_ma SEPARATOR ',') AS artist_ids
        FROM 
          music m
        LEFT JOIN 
          music_artist ma ON m.id_music = ma.id_music
        LEFT JOIN 
          artist a ON ma.id_artist COLLATE utf8mb4_unicode_ci = a.id_artist COLLATE utf8mb4_unicode_ci
        GROUP BY 
          m.id_music
        ORDER BY 
          RAND()
        LIMIT 20
      `;
      
      const [randomTracks] = await db.promise().query(randomSql);
      finalTracks = randomTracks;
    }
    
    // Process tracks
    const tracksWithExtras = await Promise.all(finalTracks.map(async (track, index) => {
      const id = track.id_music;
      
      // Get albums
      const [albums] = await db.promise().query(
        `SELECT al.*, al.id_album_auto FROM album al 
         JOIN music_album ma ON al.id_al = ma.id_al 
         WHERE ma.id_music = ?`,
        [id]
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
      
      // Get artists
      let artistsData = [];
      const [artistRows] = await db.promise().query(
        `SELECT a.id_artist, a.artist_name, a.id_artist_auto 
         FROM artist a
         JOIN music_artist ma ON a.id_artist COLLATE utf8mb4_unicode_ci = ma.id_artist COLLATE utf8mb4_unicode_ci
         WHERE ma.id_music = ?
         ORDER BY ma.id_ma`,
        [id]
      );
      
      artistsData = artistRows.map(artist => ({
        id: artist.id_artist,
        name: artist.artist_name,
        hashid: 'AR' + hashids.encode(artist.id_artist_auto || artist.id_artist)
      }));
      
      // Get audio duration
      let duration = { formatted: '0:00', seconds: 0 };
      try {
        duration = await getAudioDuration(path.join(__dirname, 'public', track.audio_file));
      } catch (e) {
        console.error(`Error getting audio duration for ${track.title_music}:`, e);
      }
      
      // PERBAIKAN: Get favorite status - GANTI TABLE favorite MENJADI music_fav
      let isFavorite = false;
      if (id_user) {
        const [favRows] = await db.promise().query(
          'SELECT id_fav FROM music_fav WHERE id_user = ? AND id_music = ?',
          [id_user, id]
        );
        isFavorite = favRows.length > 0;
      }
      
      // Get custom playlists
      let custom_playlists = [];
      if (id_user) {
        custom_playlists = await getAvailableCustomPlaylists(id_user, id);
      }
      
      return {
        ...track,
        albums: albumsWithHashid,
        artists: artistsData,
        duration: duration.formatted,
        durationSeconds: duration.seconds,
        isFavorite: isFavorite,
        custom_playlists: custom_playlists,
        hashid: 'MU' + hashids.encode(id),
        track_hashid: 'MU' + hashids.encode(id),
        playlist_hashid: 'mostplayed',
        playlist_original_id: 'mostplayed',
        play_count: track.play_count || 0, // Default 0 jika null
        last_played_at: track.last_played_at || null,
        rank: index + 1
      };
    }));
    
    // Prepare playlist-like object
    const playlist = {
      playlist_name: 'Most Played',
      playlist_cover: '/images/mostplayed-cover.jpg',
      tag_name: 'Trending',
      id_playlist: 'mostplayed',
      hashid: 'mostplayed',
      original_id: 'mostplayed',
      tracks: tracksWithExtras,
      totalTracks: tracksWithExtras.length,
      totalDuration: tracksWithExtras.reduce((sum, track) => sum + (track.durationSeconds || 0), 0),
      description: 'Top 30 most played tracks in the last 7 days'
    };
    
    // Format total duration
    const totalHours = Math.floor(playlist.totalDuration / 3600);
    const totalMinutes = Math.floor((playlist.totalDuration % 3600) / 60);
    playlist.formattedDuration = `${totalHours > 0 ? `${totalHours} hr ` : ''}${totalMinutes} min`;
    
    // Get library data jika user login
    let libraryData = { playlists: [], artists: [], albums: [], favPlaylists: [] };
    let profileImage = null;
    let userProfile = null;
    
    if (id_user) {
      // Ambil data user profile
      try {
        userProfile = await new Promise((resolve, reject) => {
          getUserProfile(id_user, (err, profile) => {
            if (err) reject(err);
            else {
              profile.hashid = hashids.encode(id_user);
              resolve(profile);
            }
          });
        });
        profileImage = userProfile;
      } catch (e) {
        console.error('Failed to get user profile:', e);
      }
      
      // Get library data
      try {
        const libraryItems = await new Promise((resolve, reject) =>
          getLibraryAll(id_user, async (err, items) => {
            if (err) return reject(err);
            
            for (let item of items) {
              if (item.type === 'playlist') {
                try {
                  const trackCount = await new Promise((res, rej) => {
                    db.query('SELECT COUNT(*) as count FROM music_cus WHERE id_cus = ?', [item.id], (err, result) => {
                      if (err) rej(err);
                      else res(result[0].count);
                    });
                  });
                  
                  item.track_count = trackCount;
                  
                  const covers = await new Promise((res, rej) => {
                    db.query(
                      `SELECT DISTINCT m.cover_music 
                       FROM music_cus mc 
                       JOIN music m ON mc.id_music = m.id_music 
                       WHERE mc.id_cus = ? 
                       LIMIT 4`,
                      [item.id],
                      (err, results) => {
                        if (err) rej(err);
                        else res(results.map(row => row.cover_music));
                      }
                    );
                  });
                  
                  item.track_covers = covers;
                  
                  if (covers.length === 1 && item.track_count > 1) {
                    item.cover = covers[0];
                    item.track_covers = [];
                  } else {
                    item.track_covers = covers;
                  }
                } catch (err) {
                  console.error('Error getting track covers or count:', err);
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
        
        // Encode hashid
        [...playlists, ...favPlaylists, ...albums, ...artists].forEach(item => {
          if (item.type === 'playlist' && item.id_auto) {
            item.hashid = 'C' + hashids.encode(item.id_auto);
          } 
          else if (item.type === 'fav_playlist') {
            if (item.playlist_type === 'custom' && item.id_auto) {
              item.hashid = 'C' + hashids.encode(item.id_auto);
            } 
            else {
              item.hashid = hashids.encode(item.id);
            }
          }
          else if (item.type === 'album' && item.id_album_auto) {
            item.hashid = 'AL' + hashids.encode(item.id_album_auto);
          }
          else if (item.type === 'artist' && item.id_artist_auto) {
            item.hashid = 'AR' + hashids.encode(item.id_artist_auto);
          }
        });
        
        libraryData = { playlists, artists, albums, favPlaylists };
      } catch (e) {
        console.error('Failed to get library data:', e);
      }
    }
    
    // Get playlistsByTag dan tagNames untuk navbar
    let playlistsByTag = {};
    let tagNames = {};
    try {
      const playlistResults = await new Promise((resolve, reject) => 
        getPlaylists((err, results) => err ? reject(err) : resolve(results))
      );
      
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
    
    const resourceVersion = Date.now();
    const renderOptions = {
      playlist,
      isTop50Page: false,
      isMostPlayedPage: true,
      isPlaylistPage: false,
      isArtistPage: false,
      isAlbumPage: false,
      isMusicPage: false,
      isFavMusicPage: false,
      isSearchPage: false,
      isLyricPage: false,
      isProfilePage: false,
      isCategoryPage: false,
      playlistsByTag,
      tagNames,
      customPlaylists: libraryData.playlists,
      libraryData,
      profileImage,
      userProfile,
      isPlaylistFavorite: false,
      userId: id_user,
      resourceVersion,
      artist: null,
      album: null,
      music: null,
      favMusic: null
    };
    
    res.render(req.xhr ? 'partials/mostplayed' : 'index', renderOptions);
    
  } catch (error) {
    console.error('Error in /mostplayed:', error);
    res.status(500).send('Internal server error');
  }
});




app.get('/license', async (req, res) => {
  const userId = req.session.user_id || null;

  if (!userId) {
    return res.render('index', {
      playlistsByTag: null,
      tagNames: null,
      libraryData: {
        playlists: [],
        artists: [],
        albums: [],
        favPlaylists: []
      },
      customPlaylists: [],
      profileImage: null,
      userProfile: null,
      isPlaylistPage: false,
      isArtistPage: false,
      isAlbumPage: false,
      isFavMusicPage: false,
      isMusicPage: false,
      isSearchPage: false,
      isLyricPage: false,
      isLicensePage: true,
      recentPlays : false,
      isProfilePage: false,
      isCategoryPage: false,
      favoriteSongs : false,
      isTop50Page: false,
      isMostPlayedPage: false,
      playlist: null,
      artist: null,
      album: null,
      favMusic: null,
      userId: null
    });
  }

  try {
    // Ambil profil pengguna
    const userProfile = await new Promise((resolve, reject) => {
      getUserProfile(userId, (err, user) => {
        if (err) reject(err);
        else {
          // Tambahkan hashid ke userProfile
          user.hashid = hashids.encode(userId);
          resolve(user);
        }
      });
    });

    // Ambil data library dan proses track_covers dengan benar seperti di route utama
    const libraryItems = await new Promise((resolve, reject) =>
      getLibraryAll(userId, async (err, items) => {
        if (err) return reject(err);

        // Proses track_covers untuk playlist seperti di route utama
        for (let item of items) {
          if (item.type === 'playlist') {
            try {
              const trackCount = await new Promise((res, rej) => {
                db.query('SELECT COUNT(*) as count FROM music_cus WHERE id_cus = ?', [item.id], (err, result) => {
                  if (err) rej(err);
                  else res(result[0].count);
                });
              });
              
              item.track_count = trackCount;
              
              // Ambil cover unik seperti di route utama
              const covers = await new Promise((res, rej) => {
                db.query(
                  `SELECT DISTINCT m.cover_music 
                   FROM music_cus mc 
                   JOIN music m ON mc.id_music = m.id_music 
                   WHERE mc.id_cus = ? 
                   LIMIT 4`,
                  [item.id],
                  (err, results) => {
                    if (err) rej(err);
                    else res(results.map(row => row.cover_music));
                  }
                );
              });
              
              // Jika semua track memiliki cover yang sama dan lebih dari 1 track,
              // gunakan single cover saja (sama seperti di route utama)
              if (covers.length === 1 && item.track_count > 1) {
                item.cover = covers[0];
                item.track_covers = [];
              } else {
                item.track_covers = covers;
              }
            } catch (err) {
              console.error('Error getting track covers or count:', err);
              item.track_covers = [];
            }
          }
        }

        resolve(items);
      })
    );

    // Strukturkan dan encode hashid
    const playlists = libraryItems.filter(i => i.type === 'playlist');
    const artists = libraryItems.filter(i => i.type === 'artist');
    const albums = libraryItems.filter(i => i.type === 'album');
    const favPlaylists = libraryItems.filter(i => i.type === 'fav_playlist');

    // Encode hashid untuk SEMUA item library dengan memperhatikan playlist_type
    [...playlists, ...favPlaylists, ...albums, ...artists].forEach(item => {
      // Untuk custom playlist (milik sendiri), gunakan id_auto untuk encode
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

    const libraryData = {
      playlists,
      artists,
      albums,
      favPlaylists
    };

    // Ambil playlistsByTag dan tagNames untuk navbar
    let playlistsByTag = {};
    let tagNames = {};
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
      playlistsByTag = {};
      tagNames = {};
    }

    // Render halaman license
    res.render('index', {
      playlistsByTag,
      tagNames,
      libraryData,
      customPlaylists: libraryData.playlists,
      profileImage: userProfile,
      userProfile: userProfile,
      isPlaylistPage: false,
      isArtistPage: false,
      isAlbumPage: false,
      isFavMusicPage: false,
      isMusicPage: false,
      isSearchPage: false,
      isLyricPage: false,
      isLicensePage: true,
      recentCustomPlaylists : false,
      recentArtists : false,
      recentPlays : false,
      recentPlaylists : false,
      isProfilePage: false,
      isCategoryPage: false,
      favoriteSongs : false,
      isTop50Page: false,
      isMostPlayedPage: false,
      playlist: null,
      artist: null,
      album: null,
      favMusic: null,
      userId
    });

  } catch (err) {
    console.error('Error /license:', err);
    res.status(500).send('Gagal mengambil data pengguna.');
  }
});

// Route untuk partial license (digunakan oleh AJAX)
app.get('/partial/license', (req, res) => {
  res.render('partials/license');
});

