const {db} = require('../db'); // Koneksi ke database

//FAVORITE LIST

function checkFavoriteExists(userId, musicId) {
  return new Promise((resolve, reject) => {
    const query = "SELECT id_fav FROM music_fav WHERE id_user = ? AND id_music = ?";
    db.query(query, [userId, musicId], (err, results) => {
      if (err) return reject(err);
      resolve(results.length > 0);
    });
  });
}

function addFavoriteMusic(userId, musicId) {
  return new Promise((resolve, reject) => {
    const query = "INSERT INTO music_fav (id_user, id_music) VALUES (?, ?)";
    db.query(query, [userId, musicId], (err, result) => {
      if (err) return reject(err);
      resolve(true);
    });
  });
}

function removeFavoriteMusic(userId, musicId) {
  return new Promise((resolve, reject) => {
    const query = "DELETE FROM music_fav WHERE id_user = ? AND id_music = ?";
    db.query(query, [userId, musicId], (err, result) => {
      if (err) return reject(err);
      resolve(true);
    });
  });
}





//FAVORITE PLAYLIST

function checkPlaylistFav(userId,id_playlist){
 return new Promise((resolve, reject) => {
    const query = "SELECT id_fav FROM playlist_fav WHERE id_user = ? AND id_playlist = ?";
    db.query(query, [userId, id_playlist], (err, results) => {
      if (err) return reject(err);
      resolve(results.length > 0);
    });
  });
}


function removeFavPlaylist(userId,id_playlist){
 return new Promise((resolve, reject) => {
    const query = "DELETE FROM playlist_fav WHERE id_user = ? AND id_playlist = ?";
    db.query(query, [userId, id_playlist], (err, result) => {
      if (err) return reject(err);
      resolve(true);
    });
  });
}


function addFavPlaylist(userId, id_playlist) {
  return new Promise((resolve, reject) => {
    const query = "INSERT INTO playlist_fav (id_user, id_playlist) VALUES (?, ?)";
    db.query(query, [userId, id_playlist], (err, result) => {
      if (err) return reject(err);
      resolve(true);
    });
  });
}


module.exports = {
  checkFavoriteExists,
  addFavoriteMusic,
  removeFavoriteMusic,
  checkPlaylistFav,
  removeFavPlaylist,
  addFavPlaylist
};
