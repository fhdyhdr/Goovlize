const express = require("express");
const router = express.Router();
const { db } = require("../db");
const path = require("path");
const fs = require("fs");
const mm = require("music-metadata");
const Hashids = require("hashids");

// Inisialisasi hashids
const hashids = new Hashids("goovlize-secret", 6);

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

// Fungsi helper untuk generate hashid
function generateHashid(type, id, idAuto = null) {
  switch (type) {
    case "music":
      return "MU" + hashids.encode(id);
    case "artist":
      return "AR" + hashids.encode(idAuto || id);
    case "album":
      return "AL" + hashids.encode(idAuto || id);
    case "user":
      return hashids.encode(id);
    case "playlist":
      return hashids.encode(id);
    case "custom_playlist":
      return "C" + hashids.encode(idAuto || id);
    default:
      return hashids.encode(id);
  }
}

// Fungsi untuk mendapatkan id_artist_auto
async function getArtistAutoId(id_artist, db) {
  try {
    const [rows] = await db
      .promise()
      .query(`SELECT id_artist_auto FROM artist WHERE id_artist = ?`, [
        id_artist,
      ]);
    return rows[0] ? rows[0].id_artist_auto : null;
  } catch (error) {
    console.error("Error getting artist auto id:", error);
    return null;
  }
}

// Fungsi untuk mendapatkan id_album_auto
async function getAlbumAutoId(id_al, db) {
  try {
    const [rows] = await db
      .promise()
      .query(`SELECT id_album_auto FROM album WHERE id_al = ?`, [id_al]);
    return rows[0] ? rows[0].id_album_auto : null;
  } catch (error) {
    console.error("Error getting album auto id:", error);
    return null;
  }
}

// Fungsi untuk mendapatkan id_custom_playlist_auto
async function getCustomPlaylistAutoId(id_cus, db) {
  try {
    const [rows] = await db
      .promise()
      .query(`SELECT id_auto FROM custom_playlist WHERE id_cus = ?`, [id_cus]);
    return rows[0] ? rows[0].id_auto : null;
  } catch (error) {
    console.error("Error getting custom playlist auto id:", error);
    return null;
  }
}

// Fungsi untuk mendapatkan total track dalam playlist
async function getPlaylistTrackCount(playlistId, isCustom = false, db) {
  try {
    let count = 0;
    if (isCustom) {
      const [rows] = await db
        .promise()
        .query(`SELECT COUNT(*) as count FROM music_cus WHERE id_cus = ?`, [
          playlistId,
        ]);
      count = rows[0]?.count || 0;
    } else {
      const [rows] = await db
        .promise()
        .query(
          `SELECT COUNT(*) as count FROM music_playlist WHERE id_playlist = ?`,
          [playlistId]
        );
      count = rows[0]?.count || 0;
    }
    return count;
  } catch (error) {
    console.error("Error getting playlist track count:", error);
    return 0;
  }
}

// Fungsi untuk mendapatkan track covers untuk custom playlist
async function getPlaylistTrackCovers(playlistId, isCustom = false, db) {
  try {
    let covers = [];
    
    if (isCustom) {
      // Ambil maksimal 4 cover yang berbeda untuk custom playlist
      const [rows] = await db.promise().query(
        `SELECT DISTINCT m.cover_music 
         FROM music_cus mc 
         JOIN music m ON mc.id_music = m.id_music 
         WHERE mc.id_cus = ? AND m.cover_music IS NOT NULL
         LIMIT 4`,
        [playlistId]
      );
      covers = rows.map(row => row.cover_music || "uploads/undefine.jpg");
    } else {
      // Untuk global playlist, ambil cover dari tabel playlist
      const [rows] = await db
        .promise()
        .query(`SELECT playlist_cover FROM playlist WHERE id_playlist = ?`, [
          playlistId,
        ]);
      const cover = rows[0]?.playlist_cover || "uploads/undefine.jpg";
      covers = [cover];
    }
    
    return covers;
  } catch (error) {
    console.error("Error getting playlist track covers:", error);
    return ["uploads/undefine.jpg"];
  }
}

// Fungsi untuk mendapatkan cover playlist
async function getPlaylistCover(playlistId, isCustom = false, db) {
  try {
    let cover = "uploads/undefine.jpg";
    
    if (isCustom) {
      // Untuk custom playlist, ambil cover dari track pertama
      const [rows] = await db.promise().query(
        `SELECT m.cover_music 
         FROM music_cus mc 
         JOIN music m ON mc.id_music = m.id_music 
         WHERE mc.id_cus = ? 
         LIMIT 1`,
        [playlistId]
      );
      cover = rows[0]?.cover_music || "uploads/undefine.jpg";
    } else {
      // Untuk playlist global, ambil dari tabel playlist
      const [rows] = await db
        .promise()
        .query(`SELECT playlist_cover FROM playlist WHERE id_playlist = ?`, [
          playlistId,
        ]);
      cover = rows[0]?.playlist_cover || "uploads/undefine.jpg";
    }
    
    return cover;
  } catch (error) {
    console.error("Error getting playlist cover:", error);
    return "uploads/undefine.jpg";
  }
}

// Fungsi untuk generate collage HTML dengan pola yang benar
function generateCollageHTML(covers, size = "medium") {
  if (!covers || covers.length === 0) {
    return "uploads/undefine.jpg";
  }
  
  // Jika hanya 1 cover, kembalikan sebagai single image
  if (covers.length === 1) {
    return covers[0];
  }
  
  // Tentukan ukuran berdasarkan parameter
  let width, height, borderRadius;
  
  switch(size) {
    case "small":
      width = "70px";
      height = "70px";
      borderRadius = "4px";
      break;
    case "carousel":
      width = "100%";
      height = "100%";
      borderRadius = "4px";
      break;
    case "medium":
      width = "110px";
      height = "110px";
      borderRadius = "4px";
      break;
    case "large":
      width = "180px";
      height = "180px";
      borderRadius = "8px";
      break;
    default:
      width = "100%";
      height = "100%";
      borderRadius = "4px";
  }
  
  // Generate grid layout berdasarkan jumlah covers
  let gridStyle = "";
  let collageItems = [];
  
  if (covers.length === 2) {
    gridStyle = "grid-template-columns: repeat(2, 1fr); grid-template-rows: 1fr;";
    covers.forEach((cover, index) => {
      collageItems.push(`
        <div class="collage-item" 
             style="background-image: url('${cover}'); background-size: cover; background-position: center;">
        </div>
      `);
    });
  } else if (covers.length === 3) {
    gridStyle = "grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(2, 1fr);";
    covers.forEach((cover, index) => {
      const spanStyle = index === 2 ? 'grid-column: span 2;' : '';
      collageItems.push(`
        <div class="collage-item" 
             style="${spanStyle} background-image: url('${cover}'); background-size: cover; background-position: center;">
        </div>
      `);
    });
  } else if (covers.length >= 4) {
    gridStyle = "grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(2, 1fr);";
    covers.slice(0, 4).forEach((cover, index) => {
      collageItems.push(`
        <div class="collage-item" 
             style="background-image: url('${cover}'); background-size: cover; background-position: center;">
        </div>
      `);
    });
  }
  
  if (size === "carousel") {
    let collageHTML = `
      <div class="collage-grid" style="${gridStyle} display: grid; width: 100%; height: 100%; gap: 2px; overflow: hidden; border-radius: ${borderRadius};">
        ${collageItems.join('')}
      </div>
    `;
    
    return collageHTML;
  } else {
    let collageHTML = `
      <div class="collage-container" style="width: ${width}; height: ${height};">
        <div class="collage-grid" style="${gridStyle} display: grid; width: 100%; height: 100%; gap: 2px; overflow: hidden; border-radius: ${borderRadius};">
          ${collageItems.join('')}
        </div>
      </div>
    `;
    
    return collageHTML;
  }
}

// Fungsi untuk menentukan apakah playlist perlu collage
async function shouldShowCollage(playlistId, isCustom, db) {
  if (!isCustom) return false;
  
  try {
    const trackCount = await getPlaylistTrackCount(playlistId, true, db);
    if (trackCount <= 1) return false;
    
    const covers = await getPlaylistTrackCovers(playlistId, true, db);
    return covers.length > 1;
  } catch (error) {
    console.error("Error checking collage condition:", error);
    return false;
  }
}

// Fungsi untuk mendapatkan nama user yang membuat custom playlist
async function getCustomPlaylistOwner(id_cus, db) {
  try {
    const [rows] = await db.promise().query(
      `SELECT u.id_user, u.name_user, u.profile_user 
       FROM custom_playlist cp
       JOIN users u ON cp.id_user = u.id_user
       WHERE cp.id_cus = ?`,
      [id_cus]
    );
    return rows[0] || null;
  } catch (error) {
    console.error("Error getting custom playlist owner:", error);
    return null;
  }
}

async function getArtistNames(id_music, db) {
  const [rows] = await db.promise().query(
    `
    SELECT a.id_artist, a.artist_name 
    FROM music_artist ma
    JOIN artist a ON ma.id_artist = a.id_artist
    WHERE ma.id_music = ?
    `,
    [id_music]
  );

  return rows.map((row) => `${row.artist_name} - ${row.id_artist}`);
}

async function getArtistNameByAlbum(id_album, db) {
  const [rows] = await db.promise().query(
    `
    SELECT artist.id_artist, artist.artist_name 
    FROM album 
    JOIN artist ON album.id_artist = artist.id_artist
    WHERE album.id_al = ?
    `,
    [id_album]
  );
  return rows[0] ? `${rows[0].artist_name} - ${rows[0].id_artist}` : "";
}

// Helper function untuk check playlist favorite
async function checkPlaylistFav(userId, playlistId) {
  try {
    const [rows] = await db
      .promise()
      .query(
        "SELECT id_fav FROM playlist_fav WHERE id_user = ? AND id_playlist = ?",
        [userId, playlistId]
      );
    return rows.length > 0;
  } catch (error) {
    console.error("Error checking playlist favorite:", error);
    throw error;
  }
}

// Helper function untuk remove playlist favorite
async function removeFavPlaylist(userId, playlistId) {
  try {
    await db
      .promise()
      .query("DELETE FROM playlist_fav WHERE id_user = ? AND id_playlist = ?", [
        userId,
        playlistId,
      ]);
    return true;
  } catch (error) {
    console.error("Error removing playlist favorite:", error);
    throw error;
  }
}

// Helper function untuk add playlist favorite
async function addFavPlaylist(userId, playlistId) {
  try {
    await db
      .promise()
      .query("INSERT INTO playlist_fav (id_user, id_playlist) VALUES (?, ?)", [
        userId,
        playlistId,
      ]);
    return true;
  } catch (error) {
    console.error("Error adding playlist favorite:", error);
    throw error;
  }
}

// Route utama untuk search
router.post("/searchMusic", async (req, res) => {
  const { keyword, type = "all" } = req.body;
  const userId = req.session.user_id;

  if (!keyword) {
    return res.send("");
  }

  const searchTerm = `%${keyword}%`;
  let results = [];

  try {
if (type === "all" || type === "music") {
  const [musicRows] = await db.promise().query(
    `
    SELECT 
      m.id_music AS id,
      m.title_music AS title,
      m.cover_music AS image,
      m.audio_file AS audio,
      COALESCE(m.lyric, '') as lyric, 
      COALESCE(m.line_durations, '') as line_durations,  
      'music' AS type
    FROM music m
    WHERE m.title_music LIKE ?
    `,
    [searchTerm]
  );
  results.push(...musicRows);
}

    // 2. Search Artist
    if (type === "all" || type === "artist") {
      const [artistRows] = await db.promise().query(
        `
        SELECT 
          a.id_artist AS id,
          a.artist_name AS title,
          a.artist_profile AS image,
          'artist' AS type
        FROM artist a
        WHERE a.artist_name LIKE ?
        `,
        [searchTerm]
      );
      results.push(...artistRows);
    }

    // 3. Search Album
    if (type === "all" || type === "album") {
      const [albumRows] = await db.promise().query(
        `
        SELECT 
          al.id_al AS id,
          al.album_name AS title,
          al.album_cover AS image,
          'album' AS type
        FROM album al
        WHERE al.album_name LIKE ?
        `,
        [searchTerm]
      );
      results.push(...albumRows);
    }

    // 4. Search User
    if (type === "all" || type === "user") {
      const [userRows] = await db.promise().query(
        `
        SELECT 
          u.id_user AS id,
          u.name_user AS title,
          u.profile_user AS image,
          'user' AS type
        FROM users u
        WHERE u.name_user LIKE ?
        `,
        [searchTerm]
      );
      results.push(...userRows);
    }

    // 5. Search Playlist (Global & Custom)
    if (type === "all" || type === "playlist") {
      // Search global playlists
      const [globalPlaylistRows] = await db.promise().query(
        `
        SELECT 
          p.id_playlist AS id,
          p.playlist_name AS title,
          p.playlist_cover AS image,
          'playlist' AS type,
          'global' AS playlist_type,
          tp.tag_name
        FROM playlist p
        LEFT JOIN tag_playlist tp ON p.id_tag = tp.id_tag
        WHERE p.playlist_name LIKE ?
        `,
        [searchTerm]
      );

      // Search custom playlists termasuk milik sendiri
      const [customPlaylistRows] = await db.promise().query(
        `
        SELECT 
          cp.id_cus AS id,
          cp.playlist_name AS title,
          'playlist' AS type,
          'custom' AS playlist_type,
          cp.id_user AS owner_id,
          u.name_user AS owner_name,
          u.profile_user AS owner_image
        FROM custom_playlist cp
        JOIN users u ON cp.id_user = u.id_user
        WHERE cp.playlist_name LIKE ?
        `,
        [searchTerm]
      );

      // Process custom playlists dengan logic collage
      for (let customPlaylist of customPlaylistRows) {
        const trackCount = await getPlaylistTrackCount(customPlaylist.id, true, db);
        const hasMultipleTracks = trackCount > 1;
        
        if (hasMultipleTracks) {
          const trackCovers = await getPlaylistTrackCovers(customPlaylist.id, true, db);
          const hasMultipleCovers = trackCovers.length > 1;
          
          customPlaylist.track_count = trackCount;
          customPlaylist.track_covers = trackCovers;
          customPlaylist.hasMultipleTracks = hasMultipleTracks;
          customPlaylist.hasMultipleCovers = hasMultipleCovers;
          
          if (hasMultipleCovers) {
            customPlaylist.shouldShowCollage = true;
          } else {
            customPlaylist.shouldShowCollage = false;
            customPlaylist.image = await getPlaylistCover(customPlaylist.id, true, db);
          }
        } else {
          customPlaylist.track_count = trackCount;
          customPlaylist.shouldShowCollage = false;
          customPlaylist.image = await getPlaylistCover(customPlaylist.id, true, db);
        }
      }

      results.push(...globalPlaylistRows, ...customPlaylistRows);
    }

    // Filter if specific type
    if (type !== "all") {
      results = results.filter((item) => item.type === type);
    }

    // Limit results if type is all
    if (type === "all") {
      results = results.slice(0, 3);
    }

    let htmlOutput = "";

    // Output for music type (carousel)
    if (type === "music") {
      htmlOutput += `<div class='carousel'><div class='carousel__wrapper'>`;

      if (results.length > 0) {
        htmlOutput += `
        <div class='carousel__header'>
          <div style='margin:10px 0' class='carousel__controls'>
            <button class='carousel__arrow disabled arrow-prev'></button>
            <button class='carousel__arrow arrow-next'></button>
          </div>
        </div>`;
      }

      htmlOutput += `<ul class='carousel__content'>`;

      for (const row of results) {
        const id = row.id;
        const title = row.title;
        const image = row.image || "uploads/undefine.jpg";
        const artistData = await getArtistNames(id, db);
        const musicHashid = generateHashid("music", id);

        const onclickMusic = `onclick="showMusicMobile('${musicHashid}')"`;

        const dataSrc = row.audio || "";
        const dataCover = image;
        const dataTitle = title;
        const dataPlaylist = "SE";

        const artistDisplay = await Promise.all(
          artistData.map(async (artist) => {
            const [name, artistId] = artist.split(" - ");
            const artistAutoId = await getArtistAutoId(artistId, db);
            const artistHashid = generateHashid(
              "artist",
              artistId,
              artistAutoId
            );

            return `
              <span class="artist-name"
                data-artist-id="${artistId}"
                style="cursor:pointer"
                onmouseover="this.style.textDecoration='underline'"
                onmouseout="this.style.textDecoration='none'"
                onclick="event.stopPropagation(); viewArtist('${artistHashid}')">
                ${name}
              </span>
            `;
          })
        );

        const artistDisplayHtml = (await Promise.all(artistDisplay)).join(", ");

        const [artistIdsRows] = await db
          .promise()
          .query(`SELECT id_artist FROM music_artist WHERE id_music = ?`, [id]);
        const artistIds = artistIdsRows.map((row) => row.id_artist).join(",");

        const [genreRows] = await db.promise().query(
          `SELECT g.genre_name 
          FROM music_genre mg
          JOIN genre g ON mg.id_genre = g.id_genre
          WHERE mg.id_music = ?`,
          [id]
        );
        const dataGenre = genreRows.map((genre) => genre.genre_name).join(", ");

        const dataArtist = artistData.map((a) => a.split(" - ")[0]).join(", ");

 // Di bagian carousel music:
const dataAttributes = `
  data-id='${id}'
  data-src='${dataSrc}'
  data-cover='${dataCover}'
  data-title='${dataTitle}'
  data-artist='${dataArtist}'
  data-artist-ids='${artistIds}'
  data-genre='${dataGenre}'
  data-playlist='${dataPlaylist}'
  data-lyric='${escapeHtml(row.lyric || "")}'  
  data-line-durations='${escapeHtml(row.line_durations || "")}' 
`;
        htmlOutput += `
        <li class='carousel__item' ${onclickMusic}>
          <div class="cover">
            <div class="coverImg cardSearch">
              <img src="${image}" alt="">
              <div class="overlay"></div>
            </div>
          </div>

          <div class='card__info'>
            <h3 class='card__title'>${title}</h3>
            <p class='card__description'>${artistDisplayHtml}</p>
          </div>
        </li>`;
      }

      htmlOutput += `</ul></div></div>`;
    }
    
    // Output for artist type (carousel) - DIPERBAIKI: TAMBAHKAN 2 TOMBOL
    else if (type === "artist") {
      htmlOutput += `<div class='carousel'><div class='carousel__wrapper'>`;

      if (results.length > 0) {
        htmlOutput += `
        <div class='carousel__header'>
          <div style='margin:10px 0' class='carousel__controls'>
            <button class='carousel__arrow disabled arrow-prev'></button>
            <button class='carousel__arrow arrow-next'></button>
          </div>
        </div>`;
      }

      htmlOutput += `<ul class='carousel__content'>`;

      for (const row of results) {
        const id = row.id;
        const title = row.title;
        const image = row.image || "uploads/undefine.jpg";
        const id_artist_auto = await getArtistAutoId(id, db);
        const artistHashid = generateHashid("artist", id, id_artist_auto);

        const onclickArtist = `onclick="viewArtist('${artistHashid}')"`;

        htmlOutput += `
        <li class='carousel__item carousel__profile' ${onclickArtist}>
          <div class="cover">
            <div class="coverImg profileSearch">
              <img src="${image}" alt="">
              <div class="overlay"></div>
            </div>
          </div>

          <div class='card__info'>
            <h3 class='profile__title'>${title}</h3>
          </div>
        </li>`;
      }

      htmlOutput += `</ul></div></div>`;
    }

    // Output for user type (carousel) - DIPERBAIKI: TAMBAHKAN 2 TOMBOL
    else if (type === "user") {
      htmlOutput += `<div class='carousel'><div class='carousel__wrapper'>`;

      if (results.length > 0) {
        htmlOutput += `
        <div class='carousel__header'>
          <div style='margin:10px 0' class='carousel__controls'>
            <button class='carousel__arrow disabled arrow-prev'></button>
            <button class='carousel__arrow arrow-next'></button>
          </div>
        </div>`;
      }

      htmlOutput += `<ul class='carousel__content'>`;

      for (const row of results) {
        const id = row.id;
        const title = row.title;
        const image = row.image || "uploads/undefine.jpg";
        const userHashid = generateHashid("user", id);

        const onclickUser = `onclick="showProfile('${userHashid}')"`;

        htmlOutput += `
        <li class='carousel__item carousel__profile' ${onclickUser}>
          <div class="cover">
            <div class="coverImg profileSearch">
              <img src="${image}" alt="">
              <div class="overlay"></div>
            </div>
          </div>

          <div class='card__info'>
            <h3 class='profile__title'>${title}</h3>
          </div>
        </li>`;
      }

      htmlOutput += `</ul></div></div>`;
    }

    // Output for album type (carousel) - DIPERBAIKI: TAMBAHKAN 2 TOMBOL
    else if (type === "album") {
      htmlOutput += `<div class='carousel'><div class='carousel__wrapper'>`;

      if (results.length > 0) {
        htmlOutput += `
        <div class='carousel__header'>
          <div style='margin:10px 0' class='carousel__controls'>
            <button class='carousel__arrow disabled arrow-prev'></button>
            <button class='carousel__arrow arrow-next'></button>
          </div>
        </div>`;
      }

      htmlOutput += `<ul class='carousel__content'>`;

      for (const row of results) {
        const id = row.id;
        const title = row.title;
        const image = row.image || "uploads/undefine.jpg";
        const artistData = await getArtistNameByAlbum(id, db);
        const id_album_auto = await getAlbumAutoId(id, db);
        const albumHashid = generateHashid("album", id, id_album_auto);

        const onclickAlbum = `onclick="showAlbum('${albumHashid}')"`;

        let artistDisplay = "";
        if (artistData) {
          const [name, artistId] = artistData.split(" - ");
          const artistAutoId = await getArtistAutoId(artistId, db);
          const artistHashid = generateHashid("artist", artistId, artistAutoId);

          artistDisplay = `
            <span class="artist-name"
              data-artist-id="${artistId}"
              style="cursor:pointer"
              onmouseover="this.style.textDecoration='underline'"
              onmouseout="this.style.textDecoration='none'"
              onclick="event.stopPropagation(); viewArtist('${artistHashid}')">
              ${name}
            </span>
          `;
        }

        htmlOutput += `
        <li class='carousel__item' ${onclickAlbum}>
          <div class="cover">
            <div class="coverImg cardSearch">
              <img src="${image}" alt="">
              <div class="overlay"></div>
            </div>
          </div>

          <div class='card__info'>
            <h3 class='card__title'>${title}</h3>
            <p class='card__description'>${
              artistDisplay || "Unknown Artist"
            }</p>
          </div>
        </li>`;
      }

      htmlOutput += `</ul></div></div>`;
    }

    // Output for playlist type (carousel) - DIPERBAIKI: TAMBAHKAN 2 TOMBOL
    else if (type === "playlist") {
      htmlOutput += `<div class='carousel'><div class='carousel__wrapper'>`;

      if (results.length > 0) {
        htmlOutput += `
        <div class='carousel__header'>
          <div style='margin:10px 0' class='carousel__controls'>
            <button class='carousel__arrow disabled arrow-prev'></button>
            <button class='carousel__arrow arrow-next'></button>
          </div>
        </div>`;
      }

      htmlOutput += `<ul class='carousel__content'>`;

      for (const row of results) {
        const id = row.id;
        const title = row.title;
        const playlistType = row.playlist_type;
        const isCustom = playlistType === "custom";

        let imageHtml = "";
        let hashid = "";
        let onclickPlaylist = "";
        const isOwner =
          isCustom &&
          row.owner_id &&
          userId &&
          row.owner_id.toString() === userId.toString();

        if (isCustom) {
          // Custom playlist
          const id_auto = await getCustomPlaylistAutoId(id, db);
          hashid = generateHashid("custom_playlist", id, id_auto);
          onclickPlaylist = `onclick="showCustomPlaylist('${hashid}')"`;

          const trackCount = row.track_count || await getPlaylistTrackCount(id, true, db);
          const owner = await getCustomPlaylistOwner(id, db);
          const ownerHashid = owner
            ? generateHashid("user", owner.id_user)
            : "";

          // Handle collage untuk custom playlist
          if (row.shouldShowCollage && row.track_covers && row.track_covers.length > 1) {
            const collageHTML = generateCollageHTML(row.track_covers.slice(0, 4), "carousel");
            imageHtml = `
              <div class="coverImg cardSearch collage-container">
                ${collageHTML}
                <div class="overlay"></div>
              </div>
            `;
          } else {
            const singleCover = row.image || await getPlaylistCover(id, true, db);
            imageHtml = `
              <div class="coverImg cardSearch">
                <img src="${singleCover}" alt="${title}">
                <div class="overlay"></div>
              </div>
            `;
          }

          const subtitle = `
            <span style="color: var(--text-secondary);">
              ${trackCount} track${trackCount !== 1 ? "s" : ""}
            </span>
            ${
              owner
                ? ` • By 
              <span class="hoverText" 
                    onmouseover="this.style.textDecoration='underline'" 
                    onmouseout="this.style.textDecoration='none'" 
                    onclick="event.stopPropagation(); showProfile('${ownerHashid}')"
                    style="cursor: pointer; color: var(--text-color);">
                ${owner.name_user}
              </span>
            `
                : ""
            }
          `;

          htmlOutput += `
          <li class='carousel__item' ${onclickPlaylist}>
            <div class="cover">
              ${imageHtml}
            </div>

            <div class='card__info'>
              <h3 class='card__title'>${title}</h3>
              <p class='card__description'>${subtitle}</p>
            </div>
          </li>`;
        } else {
          // Global playlist
          hashid = generateHashid("playlist", id);
          onclickPlaylist = `onclick="showplaylist('${hashid}')"`;

          const trackCount = await getPlaylistTrackCount(id, false, db);
          const tagName = row.tag_name || "Playlist";
          const image = row.image || "uploads/undefine.jpg";

          const subtitle = `
            <span style="color: var(--text-secondary);">
              ${trackCount} track${trackCount !== 1 ? "s" : ""}
            </span>
            ${tagName ? ` • ${tagName}` : ""}
          `;

          htmlOutput += `
          <li class='carousel__item' ${onclickPlaylist}>
            <div class="cover">
              <div class="coverImg cardSearch">
                <img src="${image}" alt="${title}">
                <div class="overlay"></div>
              </div>
            </div>

            <div class='card__info'>
              <h3 class='card__title'>${title}</h3>
              <p class='card__description'>${subtitle}</p>
            </div>
          </li>`;
        }
      }

      htmlOutput += `</ul></div></div>`;
    }

    // Output for "all" type (list view with top result)
    else if (type === "all") {
      const lastMusicId = req.body.lastMusicId || "";

      // Process each result
      for (const row of results) {
        const id = row.id;
        const title = row.title;
        const typeRow = row.type;
        let subtitle = typeRow.charAt(0).toUpperCase() + typeRow.slice(1);
        const borderStyle =
          typeRow === "artist" || typeRow === "user"
            ? "style='border-radius: 50%;'"
            : "";

        let onclick = "";
        let dataAttributes = "";
        let durationDisplay = "";
        let imageHtml = "";
        const isPlaying =
          typeRow === "music" && id.toString() === lastMusicId.toString();
        const playingSearchClass = isPlaying ? "playingSearch" : "";

        if (typeRow === "artist") {
          const id_artist_auto = await getArtistAutoId(id, db);
          const hashid = generateHashid("artist", id, id_artist_auto);
          onclick = `onclick="viewArtist('${hashid}')"`;
          imageHtml = `<img src='${row.image || "uploads/undefine.jpg"}' alt='Thumbnail' class='album-page__track__image' ${borderStyle} />`;
        } else if (typeRow === "user") {
          const hashid = generateHashid("user", id);
          onclick = `onclick="showProfile('${hashid}')"`;
          imageHtml = `<img src='${row.image || "uploads/undefine.jpg"}' alt='Thumbnail' class='album-page__track__image' ${borderStyle} />`;
        } else if (typeRow === "album") {
          const id_album_auto = await getAlbumAutoId(id, db);
          const hashid = generateHashid("album", id, id_album_auto);
          onclick = `onclick="showAlbum('${hashid}')"`;
          imageHtml = `<img src='${row.image || "uploads/undefine.jpg"}' alt='Thumbnail' class='album-page__track__image' ${borderStyle} />`;
        } else if (typeRow === "playlist") {
          const playlistType = row.playlist_type;
          if (playlistType === "custom") {
            const id_auto = await getCustomPlaylistAutoId(id, db);
            const hashid = generateHashid("custom_playlist", id, id_auto);
            onclick = `onclick="showCustomPlaylist('${hashid}')"`;

            const trackCount = row.track_count || await getPlaylistTrackCount(id, true, db);
            const owner = await getCustomPlaylistOwner(id, db);
            const ownerHashid = owner
              ? generateHashid("user", owner.id_user)
              : "";

            subtitle = `Playlist • ${trackCount} track${
              trackCount !== 1 ? "s" : ""
            } • By 
              <span class="hoverText" 
                    onmouseover="this.style.textDecoration='underline'" 
                    onmouseout="this.style.textDecoration='none'" 
                    onclick="event.stopPropagation(); showProfile('${ownerHashid}')"
                    style="cursor: pointer">
                ${owner?.name_user || "Unknown"}
              </span>
            `;
            
            const shouldCollage = row.shouldShowCollage || await shouldShowCollage(id, true, db);
            
            if (shouldCollage) {
              const trackCovers = row.track_covers || await getPlaylistTrackCovers(id, true, db);
              if (trackCovers && trackCovers.length > 1) {
                const collageHTML = generateCollageHTML(trackCovers.slice(0, 4), "small");
                imageHtml = `
                  <div class="album-page__track__image collage-container" style="width: 70px; height: 70px; border-radius: 4px; overflow: hidden;">
                    ${collageHTML}
                  </div>
                `;
              } else {
                const singleCover = await getPlaylistCover(id, true, db);
                imageHtml = `<img src='${singleCover}' alt='Thumbnail' class='album-page__track__image' />`;
              }
            } else {
              const singleCover = row.image || await getPlaylistCover(id, true, db);
              imageHtml = `<img src='${singleCover}' alt='Thumbnail' class='album-page__track__image' />`;
            }
          } else {
            const hashid = generateHashid("playlist", id);
            onclick = `onclick="showplaylist('${hashid}')"`;

            const trackCount = await getPlaylistTrackCount(id, false, db);
            const tagName = row.tag_name || "Playlist";
            subtitle = `Playlist • ${trackCount} track${
              trackCount !== 1 ? "s" : ""
            } • ${tagName}`;
            
            imageHtml = `<img src='${row.image || "uploads/undefine.jpg"}' alt='Thumbnail' class='album-page__track__image' />`;
          }
        } else if (typeRow === "music") {
          const hashid = generateHashid("music", id);
          onclick = `onclick="searchClicked(this)"`;
          const dataSrc = row.audio || "";
          const dataCover = row.image || "uploads/undefine.jpg";
          const dataTitle = title;
          const dataPlaylist = "SE";

          // Get duration
          const audioPath = path.join(
            __dirname,
            "..",
            "public",
            row.audio || ""
          );
          if (fs.existsSync(audioPath)) {
            try {
              const metadata = await mm.parseFile(audioPath);
              const duration = metadata.format.duration || 0;
              durationDisplay = `<span class="track-duration">${formatDuration(
                duration
              )}</span>`;
            } catch (err) {
              console.error(
                `Gagal membaca durasi file ${row.audio}:`,
                err.message
              );
            }
          }

          // Get artist
          const artistFullList = await getArtistNames(id, db);
          const artistNamesOnly = artistFullList.map((a) => a.split(" - ")[0]);
          const artistDisplay = await Promise.all(
            artistFullList.map(async (artist) => {
              const [name, artistId] = artist.split(" - ");
              const artistHashid = generateHashid(
                "artist",
                artistId,
                await getArtistAutoId(artistId, db)
              );
              return `<span class="artist-name"
                        data-artist-id="${artistId}"
                        onmouseover="this.style.textDecoration='underline'; this.style.cursor='pointer'" 
                        onmouseout="this.style.textDecoration='none'"
                        onclick="event.stopPropagation(); viewArtist('${artistHashid}')">
                      ${name}
                    </span>`;
            })
          ).then((results) => results.join(", "));

          const [artistIdsRows] = await db
            .promise()
            .query(`SELECT id_artist FROM music_artist WHERE id_music = ?`, [
              id,
            ]);
          const artistIds = artistIdsRows.map((row) => row.id_artist).join(",");

          const [genreRows] = await db.promise().query(
            `SELECT g.genre_name 
            FROM music_genre mg
            JOIN genre g ON mg.id_genre = g.id_genre
            WHERE mg.id_music = ?`,
            [id]
          );
          const dataGenre = genreRows
            .map((genre) => genre.genre_name)
            .join(", ");

dataAttributes = `
  data-id='${id}'
  data-src='${dataSrc}'
  data-cover='${dataCover}'
  data-title="${escapeHtml(dataTitle.replace(/"/g, "&quot;"))}"
  data-artist='${artistNamesOnly.join(", ")}'
  data-artist-ids='${artistIds}'
  data-genre='${dataGenre}'
  data-playlist='${dataPlaylist}'
  data-lyric='${escapeHtml(row.lyric || "")}' 
  data-line-durations='${escapeHtml(row.line_durations || "")}'  
`;

          const titleOnclick = `onclick="event.stopPropagation(); showMusicMobile('${hashid}')"`;

          subtitle = `Music • ${artistDisplay}`;
          
          imageHtml = `<img src='${row.image || "uploads/undefine.jpg"}' alt='Thumbnail' class='album-page__track__image' ${borderStyle} />`;

          htmlOutput += `
            <li class='task-list-item' ${onclick} ${dataAttributes}>
              <div class='search_result'>
                ${imageHtml}
                <div class='track-details'>
                  <div class='track-title ${playingSearchClass}' 
                       ${titleOnclick}
                       style="cursor:pointer"
                       onmouseover="this.style.textDecoration='underline'" 
                       onmouseout="this.style.textDecoration='none'">
                    ${title}
                  </div>
                  <div class='track-artist ${playingSearchClass}'>${subtitle}</div>
                </div>
                ${durationDisplay}
              </div>
            </li>`;

          continue;
        }

        // Output untuk non-music types
        htmlOutput += `
          <li class='task-list-item' ${onclick}>
            <div class='search_result' ${dataAttributes}>
              ${imageHtml}
              <div class='track-details'>
                <div class='track-title ${playingSearchClass}'>${title}</div>
                <div class='track-artist ${playingSearchClass}'>${subtitle}</div>
              </div>
              ${durationDisplay}
            </div>
          </li>`;
      }

      // Top result section for "all" type
      if (type === "all" && results.length > 0) {
        const topResult =
          results.find((item) => item.type === "music") || results[0];

        if (topResult) {
          const isArtist = topResult.type === "artist";
          const isUser = topResult.type === "user";
          const isArtistOrUser = isArtist || isUser;
          const isMusic = topResult.type === "music";
          const isAlbum = topResult.type === "album";
          const isPlaylist = topResult.type === "playlist";

          let hashid = "";
          let id_artist_auto = null;
          let id_album_auto = null;
          let id_custom_auto = null;

          if (isMusic) {
            hashid = generateHashid("music", topResult.id);
          } else if (isArtist) {
            id_artist_auto = await getArtistAutoId(topResult.id, db);
            hashid = generateHashid("artist", topResult.id, id_artist_auto);
          } else if (isAlbum) {
            id_album_auto = await getAlbumAutoId(topResult.id, db);
            hashid = generateHashid("album", topResult.id, id_album_auto);
          } else if (isUser) {
            hashid = generateHashid("user", topResult.id);
          } else if (isPlaylist) {
            const playlistType = topResult.playlist_type;
            if (playlistType === "custom") {
              id_custom_auto = await getCustomPlaylistAutoId(topResult.id, db);
              hashid = generateHashid(
                "custom_playlist",
                topResult.id,
                id_custom_auto
              );
            } else {
              hashid = generateHashid("playlist", topResult.id);
            }
          }

          let onclickTopResult = "";
          if (isMusic) {
            onclickTopResult = `onclick="showMusicMobile('${hashid}')"`;
          } else if (isArtist) {
            onclickTopResult = `onclick="viewArtist('${hashid}')"`;
          } else if (isAlbum) {
            onclickTopResult = `onclick="showAlbum('${hashid}')"`;
          } else if (isUser) {
            onclickTopResult = `onclick="showProfile('${hashid}')"`;
          } else if (isPlaylist) {
            const playlistType = topResult.playlist_type;
            if (playlistType === "custom") {
              onclickTopResult = `onclick="showCustomPlaylist('${hashid}')"`;
            } else {
              onclickTopResult = `onclick="showplaylist('${hashid}')"`;
            }
          }

          const imageStyle = isArtistOrUser
            ? "style='border-radius: 50%;'"
            : "";
          const thumbnailClass = isArtistOrUser
            ? "thumbnail rounded"
            : "thumbnail";

          let heartClass = "fa-regular";
          let isFollowing = false;
          let isAlbumSaved = false;
          let isPlaylistSaved = false;
          let isOwner = false;

          if (userId) {
            if (isMusic) {
              try {
                const [rows] = await db.promise().query(
                  `SELECT * FROM music_fav 
                  WHERE id_user = ? AND id_music = ?`,
                  [userId, topResult.id]
                );
                heartClass = rows.length > 0 ? "fa-solid" : "fa-regular";
              } catch (error) {
                console.error("Error checking favorite:", error);
              }
            } else if (isUser) {
              try {
                const [rows] = await db.promise().query(
                  `SELECT * FROM user_follow 
                  WHERE id_user = ? AND id_user_follow = ?`,
                  [userId, topResult.id]
                );
                isFollowing = rows.length > 0;
              } catch (error) {
                console.error("Error checking user follow:", error);
              }
            } else if (isArtist) {
              try {
                const [rows] = await db.promise().query(
                  `SELECT * FROM artist_follow 
                  WHERE id_user = ? AND id_artist = ?`,
                  [userId, topResult.id]
                );
                isFollowing = rows.length > 0;
              } catch (error) {
                console.error("Error checking artist follow:", error);
              }
            } else if (isAlbum) {
              try {
                const [rows] = await db.promise().query(
                  `SELECT * FROM album_fav 
                  WHERE id_user = ? AND id_al = ?`,
                  [userId, topResult.id]
                );
                isAlbumSaved = rows.length > 0;
              } catch (error) {
                console.error("Error checking album favorite:", error);
              }
            } else if (isPlaylist) {
              try {
                const [rows] = await db.promise().query(
                  `SELECT * FROM playlist_fav 
                  WHERE id_user = ? AND id_playlist = ?`,
                  [userId, topResult.id]
                );
                isPlaylistSaved = rows.length > 0;

                // Cek apakah user adalah owner untuk custom playlist
                if (topResult.playlist_type === "custom") {
                  const [ownerCheck] = await db
                    .promise()
                    .query(
                      "SELECT id_user FROM custom_playlist WHERE id_cus = ?",
                      [topResult.id]
                    );
                  isOwner =
                    ownerCheck.length > 0 &&
                    ownerCheck[0].id_user === parseInt(userId);
                }
              } catch (error) {
                console.error("Error checking playlist favorite:", error);
              }
            }
          }

          let playButtonAttrs = "";
          if (isMusic) {
            const artistData = await getArtistNames(topResult.id, db);
            const artistNamesForDisplay = artistData
              .map((artist) => artist.split(" - ")[0])
              .join(", ");
            const artistIds = artistData
              .map((artist) => artist.split(" - ")[1])
              .join(",");

            const [genreRows] = await db.promise().query(
              `SELECT g.genre_name 
              FROM music_genre mg
              JOIN genre g ON mg.id_genre = g.id_genre
              WHERE mg.id_music = ?`,
              [topResult.id]
            );
            const dataGenre = genreRows
              .map((genre) => genre.genre_name)
              .join(", ");
playButtonAttrs = `
  data-id='${topResult.id}'
  data-src='${topResult.audio || ""}'
  data-cover='${topResult.image || "uploads/undefine.jpg"}'
  data-title="${escapeHtml(topResult.title.replace(/"/g, "&quot;"))}"
  data-artist='${artistNamesForDisplay}'
  data-artist-ids='${artistIds}'
  data-genre='${dataGenre}'
  data-playlist='SE'
  data-lyric='${escapeHtml(topResult.lyric || "")}' 
  data-line-durations='${escapeHtml(topResult.line_durations || "")}'  
`;

            const artistDisplay = await Promise.all(
              artistData.map(async (artist) => {
                const [artistName, artistId] = artist.split(" - ");
                const artistHashid = generateHashid(
                  "artist",
                  artistId,
                  await getArtistAutoId(artistId, db)
                );
                return `<span class="hoverText" 
                          onmouseover="this.style.textDecoration='underline'" 
                          onmouseout="this.style.textDecoration='none'" 
                          onclick="event.stopPropagation(); viewArtist('${artistHashid}')"
                          style="cursor: pointer">
                      ${artistName}
                    </span>`;
              })
            ).then((results) => results.join(", "));

            subtitle = `Music • ${artistDisplay}`;
          }

          const followButtonText = isFollowing ? "Following" : "Follow";
          const followButtonClass = isFollowing
            ? "follow-btn following"
            : "follow-btn";
          const saveButtonText = isPlaylistSaved ? "Saved" : "Save";
          const saveButtonClass = isPlaylistSaved
            ? "save-btn saved"
            : "save-btn";

          const infoResultOnclick = isMusic
            ? `onclick="showMusicMobile('${hashid}')"`
            : isArtist
            ? `onclick="viewArtist('${hashid}')"`
            : isAlbum
            ? `onclick="showAlbum('${hashid}')"`
            : isUser
            ? `onclick="showProfile('${hashid}')"`
            : isPlaylist
            ? onclickTopResult
            : "";

          const showUserFollowButton =
            isUser && topResult.id.toString() !== (userId || "").toString();
          const showArtistFollowButton = isArtist;
          const showAlbumFavButton = isAlbum;
          const showMusicMobileFavButton = isMusic;
          const showMusicMobilePlayButton = isMusic;
          const showPlaylistSaveButton =
            isPlaylist && (!isOwner || topResult.playlist_type === "global");
          const showOwnerLabel =
            isPlaylist && topResult.playlist_type === "custom" && isOwner;
          
          let playlistSubtitle = "";
          let topResultImage = "";
          
          if (isPlaylist) {
            const playlistType = topResult.playlist_type;
            if (playlistType === "custom") {
              const trackCount = topResult.track_count || await getPlaylistTrackCount(
                topResult.id,
                true,
                db
              );
              const owner = await getCustomPlaylistOwner(topResult.id, db);
              playlistSubtitle = `Playlist • ${trackCount} track${
                trackCount !== 1 ? "s" : ""
              } • By ${owner?.name_user || "Unknown"}`;
              
              const shouldCollage = topResult.shouldShowCollage || await shouldShowCollage(topResult.id, true, db);
              
              if (shouldCollage) {
                const trackCovers = topResult.track_covers || await getPlaylistTrackCovers(topResult.id, true, db);
                if (trackCovers && trackCovers.length > 1) {
                  const collageHTML = generateCollageHTML(trackCovers.slice(0, 4), "medium");
                  topResultImage = `
                    <div class="collage-container" style="width: 110px; height: 110px; border-radius: ${isArtistOrUser ? '50%' : '4px'}; overflow: hidden;">
                      ${collageHTML}
                    </div>
                  `;
                } else {
                  const singleCover = await getPlaylistCover(topResult.id, true, db);
                  topResultImage = `<img src="${singleCover}" alt="" ${imageStyle} style="cursor:pointer">`;
                }
              } else {
                const singleCover = topResult.image || await getPlaylistCover(topResult.id, true, db);
                topResultImage = `<img src="${singleCover}" alt="" ${imageStyle} style="cursor:pointer">`;
              }
            } else {
              const trackCount = await getPlaylistTrackCount(
                topResult.id,
                false,
                db
              );
              const tagName = topResult.tag_name || "Playlist";
              playlistSubtitle = `Playlist • ${trackCount} track${
                trackCount !== 1 ? "s" : ""
              } • ${tagName}`;
              
              topResultImage = `<img src="${topResult.image || "uploads/undefine.jpg"}" alt="" ${imageStyle} style="cursor:pointer">`;
            }
          } else {
            topResultImage = `<img ${onclickTopResult} src="${topResult.image || "uploads/undefine.jpg"}" alt="" ${imageStyle} style="cursor:pointer">`;
          }

          htmlOutput += `
<div class="resultBottom">
    <div class="titleBottom">
        <h1>Top result</h1>
    </div>
    <div class="card top-result ${isArtistOrUser ? "profile-card" : ""}">
        <div class="card-content">
            <div class="${thumbnailClass}">
                <span>
                  ${
                    isArtistOrUser
                      ? `
                    <i ${onclickTopResult} class="fa-regular fa-user user-hover-icon" style="cursor:pointer"></i>
                  `
                      : isMusic
                      ? `
                    <button class="${
                      isArtistOrUser ? followButtonClass : ""
                    }" ${playButtonAttrs} onclick="searchClicked(this)">
                      ${
                        isArtistOrUser
                          ? followButtonText
                          : `
                      <svg class="svg-icon play-topResult"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24">
                          <path fill-rule="evenodd" d="M5 21V3c0-.79116579.87524596-1.26900738 1.54075759-.84117848L20.5407576 11.1588215c.6123232.3936364.6123232 1.2887206 0 1.682357l-14.00000001 9C5.87524596 22.2690074 5 21.7911658 5 21zm2-1.8316655L18.1507426 12 7 4.8316655v14.336669z"/>
                      </svg>
                      `
                      }
                    </button>
                  `
                      : ""
                  }
                </span>
                ${topResultImage}
            </div>
            <div class="info">
                <h1 ${infoResultOnclick} style="cursor:pointer">${
            topResult.title
          }</h1>
                <p class="infoTitle">
                  ${
                    topResult.type === "music"
                      ? "Music • " +
                        (
                          await Promise.all(
                            (
                              await getArtistNames(topResult.id, db)
                            ).map(async (artist) => {
                              const [artistName, artistId] =
                                artist.split(" - ");
                              const artistHashid = generateHashid(
                                "artist",
                                artistId,
                                await getArtistAutoId(artistId, db)
                              );
                              return `<span class="hoverText" 
                                      onmouseover="this.style.textDecoration='underline'" 
                                      onmouseout="this.style.textDecoration='none'" 
                                      onclick="event.stopPropagation(); viewArtist('${artistHashid}')"
                                      style="cursor: pointer">
                                  ${artistName}
                                </span>`;
                            })
                          )
                        ).join(", ")
                      : topResult.type === "playlist"
                      ? playlistSubtitle
                      : topResult.type.charAt(0).toUpperCase() +
                        topResult.type.slice(1)
                  }
                </p>
            </div>
            <div class="options">
        <div class="btn-grp">
  ${
    showUserFollowButton
      ? `
    <button class="play follow-btn ${isFollowing ? "following" : ""}"
            onclick="toggleFollowUser(this, ${topResult.id})">
      ${isFollowing ? "Following" : "Follow"}
    </button>
  `
      : showArtistFollowButton
      ? `
    <button class="play follow-btn ${isFollowing ? "following" : ""}"
            onclick="toggleFollowArtist(this, '${topResult.id}')">
      ${isFollowing ? "Following" : "Follow"}
    </button>
  `
      : showOwnerLabel
      ? `
    <button class="save fav-button owner-label" 
            onclick="showCustomPlaylist('${hashid}')"
            style="background: transparent; border: 1px solid var(--text-secondary); color: var(--text-secondary); cursor: pointer;">
      Your Playlist
    </button>
  `
      : showPlaylistSaveButton
      ? `
    <button class="save fav-button" 
            data-id="${topResult.id}" 
            data-type="${topResult.playlist_type}"
            onclick="playlistFav(this)">
      <i class="${isPlaylistSaved ? "fas" : "far"} fa-bookmark bookmark-icon" 
        style="color: ${isPlaylistSaved ? "#ffff" : "inherit"}"></i>
    </button>
  `
      : showMusicMobilePlayButton
      ? `
    <button class="play" ${playButtonAttrs} onclick="searchClicked(this)">
      <svg class="svg-icon play-topResult" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path fill-rule="evenodd" d="M5 21V3c0-.79116579.87524596-1.26900738 1.54075759-.84117848L20.5407576 11.1588215c.6123232.3936364.6123232 1.2887206 0 1.682357l-14.00000001 9C5.87524596 22.2690074 5 21.7911658 5 21zm2-1.8316655L18.1507426 12 7 4.8316655v14.336669z"/>
      </svg>
    </button>
  `
      : ""
  }
  
  ${
    showMusicMobileFavButton
      ? `
    <button class="save fav-button" data-music-id="${topResult.id}" onclick="favTopResult(this, ${topResult.id})">
      <i class="${heartClass} fa-heart heart-icon"></i>
    </button>
  `
      : showAlbumFavButton
      ? `
    <button class="save fav-album-button" data-album-id="${
      topResult.id
    }" onclick="albumFav(this, '${topResult.id}')">
      <i class="${
        isAlbumSaved ? "fa-solid" : "fa-regular"
      } fa-bookmark bookmark-icon" style="color: ${
          isAlbumSaved ? "#ffff" : "inherit"
        }"></i>
    </button>
  `
      : ""
  }
</div>
            </div>
        </div>
    </div>
</div>
`;
        }
      }
    }

    htmlOutput += `<script>initializeCarousels();</script>`;
    res.send(htmlOutput);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).send("Error performing search");
  }
});

// Route untuk playlist favorite
router.post("/playlistFav", async (req, res) => {
  const { id_playlist, is_favorite, is_custom } = req.body;
  const id_user = req.session.user_id;

  if (!id_user || !id_playlist) {
    return res
      .status(400)
      .json({ success: false, message: "Data tidak lengkap" });
  }

  try {
    // Cek apakah user adalah owner untuk custom playlist
    if (is_custom) {
      const [ownerCheck] = await db
        .promise()
        .query("SELECT id_user FROM custom_playlist WHERE id_cus = ?", [
          id_playlist,
        ]);

      if (
        ownerCheck.length > 0 &&
        ownerCheck[0].id_user === parseInt(id_user)
      ) {
        return res.status(400).json({
          success: false,
          message: "Anda tidak dapat menyimpan playlist milik sendiri",
        });
      }
    }

    const exists = await checkPlaylistFav(id_user, id_playlist);

    if (!exists && is_favorite) {
      await addFavPlaylist(id_user, id_playlist);

      let playlistInfo;

      if (is_custom) {
        // Custom playlist
        [playlistInfo] = await db.promise().query(
          `
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
        `,
          [id_playlist]
        );
      } else {
        // Global playlist
        [playlistInfo] = await db.promise().query(
          `
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
        `,
          [id_playlist]
        );
      }

      const playlist = playlistInfo[0];

      if (!playlist) {
        return res.status(404).json({
          success: false,
          message: "Playlist tidak ditemukan",
        });
      }

      playlist.track_covers = [];

      if (is_custom) {
        const [coverResults] = await db.promise().query(
          `
          SELECT DISTINCT m.cover_music
          FROM music_cus mc
          JOIN music m ON mc.id_music = m.id_music
          WHERE mc.id_cus = ?
          LIMIT 4
        `,
          [id_playlist]
        );

        if (coverResults.length > 0) {
          playlist.track_covers = coverResults.map((row) => row.cover_music);

          if (playlist.track_covers.length === 1 && playlist.track_count > 1) {
            playlist.cover = playlist.track_covers[0];
            playlist.track_covers = [];
          }
        }
      }

      if (is_custom) {
        playlist.hashid = "C" + hashids.encode(playlist.id_auto);
        playlist.contentType = "custom-playlist";
      } else {
        playlist.hashid = hashids.encode(playlist.id);
        playlist.contentType = "fav-playlist";
      }

      return res.json({
        success: true,
        is_favorite: true,
        playlistData: playlist,
        message: "Playlist ditambahkan ke favorit",
      });
    }

    if (exists && !is_favorite) {
      await removeFavPlaylist(id_user, id_playlist);
      return res.json({
        success: true,
        is_favorite: false,
        message: "Playlist dihapus dari favorit",
      });
    }

    return res.json({
      success: true,
      is_favorite: exists,
      message: "Tidak ada perubahan",
    });
  } catch (error) {
    console.error("Gagal mengubah status favorit:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
    });
  }
});

// Route untuk save/unsave playlist (alternatif)
router.post("/playlist/save", async (req, res) => {
  if (!req.session.user_id) {
    return res.status(401).json({ error: "Not logged in" });
  }

  try {
    const { playlist_id, playlist_type } = req.body;
    const userId = req.session.user_id;

    const [existing] = await db
      .promise()
      .query(
        `SELECT * FROM playlist_fav WHERE id_user = ? AND id_playlist = ?`,
        [userId, playlist_id]
      );

    if (existing.length > 0) {
      return res.status(400).json({ error: "Playlist already saved" });
    }

    await db.promise().query(
      `INSERT INTO playlist_fav (id_user, id_playlist) 
             VALUES (?, ?)`,
      [userId, playlist_id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Playlist save error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

router.post("/playlist/unsave", async (req, res) => {
  if (!req.session.user_id) {
    return res.status(401).json({ error: "Not logged in" });
  }

  try {
    const { playlist_id, playlist_type } = req.body;
    const userId = req.session.user_id;

    await db.promise().query(
      `DELETE FROM playlist_fav 
             WHERE id_user = ? AND id_playlist = ?`,
      [userId, playlist_id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Playlist unsave error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// Routes untuk user follow/unfollow
router.post("/user/follow", async (req, res) => {
  if (!req.session.user_id) {
    return res.status(401).json({ error: "Not logged in" });
  }

  try {
    const { id_user_follow } = req.body;

    const [existing] = await db.promise().query(
      `SELECT * FROM user_follow 
             WHERE id_user = ? AND id_user_follow = ?`,
      [req.session.user_id, id_user_follow]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: "Already following this user" });
    }

    await db.promise().query(
      `INSERT INTO user_follow (id_user, id_user_follow) 
             VALUES (?, ?)`,
      [req.session.user_id, id_user_follow]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Follow error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

router.post("/user/unfollow", async (req, res) => {
  if (!req.session.user_id) {
    return res.status(401).json({ error: "Not logged in" });
  }

  try {
    const { id_user_follow } = req.body;

    await db.promise().query(
      `DELETE FROM user_follow 
             WHERE id_user = ? AND id_user_follow = ?`,
      [req.session.user_id, id_user_follow]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Unfollow error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// Routes untuk artist follow/unfollow
router.post("/artist/follow", async (req, res) => {
  if (!req.session.user_id) {
    return res.status(401).json({ error: "Not logged in" });
  }

  try {
    const { id_artist } = req.body;

    const [existing] = await db.promise().query(
      `SELECT * FROM artist_follow 
             WHERE id_user = ? AND id_artist = ?`,
      [req.session.user_id, id_artist]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: "Already following this artist" });
    }

    await db.promise().query(
      `INSERT INTO artist_follow (id_user, id_artist) 
             VALUES (?, ?)`,
      [req.session.user_id, id_artist]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Artist follow error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

router.post("/artist/unfollow", async (req, res) => {
  if (!req.session.user_id) {
    return res.status(401).json({ error: "Not logged in" });
  }

  try {
    const { id_artist } = req.body;

    await db.promise().query(
      `DELETE FROM artist_follow 
             WHERE id_user = ? AND id_artist = ?`,
      [req.session.user_id, id_artist]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Artist unfollow error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// Routes untuk album save/unsave
router.post("/album/save", async (req, res) => {
  if (!req.session.user_id) {
    return res.status(401).json({ error: "Not logged in" });
  }

  try {
    const { album_id } = req.body;

    const [existing] = await db.promise().query(
      `SELECT * FROM album_fav 
             WHERE id_user = ? AND id_al = ?`,
      [req.session.user_id, album_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: "Album already saved" });
    }

    await db.promise().query(
      `INSERT INTO album_fav (id_user, id_al) 
             VALUES (?, ?)`,
      [req.session.user_id, album_id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Album save error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

router.post("/album/unsave", async (req, res) => {
  if (!req.session.user_id) {
    return res.status(401).json({ error: "Not logged in" });
  }

  try {
    const { album_id } = req.body;

    await db.promise().query(
      `DELETE FROM album_fav 
             WHERE id_user = ? AND id_al = ?`,
      [req.session.user_id, album_id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Album unsave error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// Route untuk rekomendasi track berdasarkan genre dengan sorting yang lebih baik
router.post("/recommendTrack", async (req, res) => {
  try {
    const { genres = [], exclude = [], limit = 10 } = req.body;

    const genreList = Array.isArray(genres)
      ? genres.filter(Boolean)
      : [genres].filter(Boolean);
    const excludeList = Array.isArray(exclude)
      ? exclude.filter(Boolean)
      : [exclude].filter(Boolean);

    if (genreList.length === 0) {
      return res.json([]);
    }

    // Query yang lebih kompleks untuk mendapatkan rekomendasi berdasarkan kesamaan genre
    let query = `
      SELECT 
        m.id_music as id,
        m.audio_file as audio,
        m.title_music as title,
        m.cover_music as image,
        GROUP_CONCAT(DISTINCT a.artist_name SEPARATOR ', ') as artist,
        GROUP_CONCAT(DISTINCT a.id_artist SEPARATOR ',') as artist_ids,
        GROUP_CONCAT(DISTINCT g.genre_name SEPARATOR ', ') as genre,
        -- Hitung jumlah genre yang match
        COUNT(DISTINCT CASE WHEN g.genre_name IN (?) THEN g.genre_name END) as match_count,
        -- Total genre count untuk normalisasi
        COUNT(DISTINCT g.genre_name) as total_genres,
        -- Popularity score (playing count)
        m.playing as popularity
      FROM music m
      JOIN music_genre mg ON m.id_music = mg.id_music
      JOIN genre g ON mg.id_genre = g.id_genre
      LEFT JOIN music_artist ma ON m.id_music = ma.id_music
      LEFT JOIN artist a ON ma.id_artist = a.id_artist
      WHERE g.genre_name IN (?)
    `;

    const params = [genreList, genreList];

    if (excludeList.length > 0) {
      query += ` AND m.id_music NOT IN (?)`;
      params.push(excludeList);
    }

    query += `
      GROUP BY m.id_music
      -- Urutkan berdasarkan: 
      -- 1. Jumlah genre yang match (tertinggi)
      -- 2. Rasio match/total (kesamaan terdekat)
      -- 3. Popularity (playing count)
      -- 4. Random untuk variasi
      ORDER BY 
        match_count DESC,
        (match_count / total_genres) DESC,
        popularity DESC,
        RAND()
      LIMIT ?
    `;
    params.push(limit);

    const [tracks] = await db.promise().query(query, params);
    
    // Format response dengan info tambahan
    const formattedTracks = tracks.map(track => ({
      ...track,
      // Tambahkan field untuk debugging
      match_info: {
        match_count: track.match_count,
        total_genres: track.total_genres,
        match_ratio: track.match_count / track.total_genres
      }
    }));
    
    res.json(formattedTracks);
  } catch (error) {
    console.error("Error fetching recommended tracks:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
router.post("/popularTracks", async (req, res) => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const [rows] = await db.promise().query(
      `SELECT 
         m.id_music, 
         m.title_music,
         m.playing as total_plays,
         COUNT(ra.id) as last_24h_plays
       FROM music m
       LEFT JOIN recent_activity ra ON m.id_music = ra.id_music 
         AND ra.played_at >= ?
       WHERE ra.played_at IS NOT NULL
       GROUP BY m.id_music, m.title_music, m.playing
       ORDER BY last_24h_plays DESC, total_plays DESC
       LIMIT 1`,
      [twentyFourHoursAgo]
    );

    if (rows.length === 0) {
      // Fallback ke musik dengan total playing tertinggi
      const [fallbackRows] = await db.promise().query(
        `SELECT id_music, title_music, playing 
         FROM music 
         WHERE playing > 0 
         ORDER BY playing DESC 
         LIMIT 1`
      );
      
      if (fallbackRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Tidak ada data musik yang ditemukan",
        });
      }
      
      const music = fallbackRows[0];
      const hashid = generateHashid("music", music.id_music);
      
      return res.json({
        success: true,
        hashid: hashid,
        music: {
          id: music.id_music,
          title: music.title_music,
          playing: music.playing,
          last_24h_plays: 0,
          is_fallback: true
        },
      });
    }

    const music = rows[0];
    const hashid = generateHashid("music", music.id_music);

    return res.json({
      success: true,
      hashid: hashid,
      music: {
        id: music.id_music,
        title: music.title_music,
        total_plays: music.total_plays,
        last_24h_plays: music.last_24h_plays || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching popular tracks:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
    });
  }
});


// Fungsi untuk escape HTML characters
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
    '\n': '\\n'
  };
  return text.replace(/[&<>"'\n]/g, function(m) { return map[m]; });
}
module.exports = router;