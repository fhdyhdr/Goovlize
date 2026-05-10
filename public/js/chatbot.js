const messageInput = document.querySelector(".message-input");
const sendMessageButton = document.querySelector("#send-message");
const chatBody = document.querySelector(".chat-body");
const API_KEY = "AIzaSyDIPvRotthsritLSz_ovwYaaSqG77cviTw";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

const chatbotToggle = document.querySelector("#chatbot-toggler");
const closeChatbot = document.querySelector("#close-chatbot");

const userData = {
  message: null,
};
const chatHistory = [];
const initialInputHeight = messageInput.scrollHeight;

let chatbotConfig = {};
let allMusicData = [];
let musicStats = {};

// Helper functions
const createMessageElement = (content, ...clases) => {
  const div = document.createElement("div");
  div.classList.add("message", ...clases);
  div.innerHTML = content;
  return div;
};

// Load config dari file JSON
const loadChatbotConfig = async () => {
  try {
    const response = await fetch("/chatbot-config.json");
    chatbotConfig = await response.json();
    console.log("Chatbot config loaded successfully");
  } catch (error) {
    console.error("Error loading chatbot config:", error);
    chatbotConfig = {
      botName: "GoovAI",
      websiteName: "Goovlize.com",
    };
  }
};


const detectIntentWithAI = async (message) => {
  const intentPrompt = `
Analisis pesan user berikut dan tentukan intent-nya. Pilih salah satu dari intent berikut:

INTENT OPTIONS:
- greeting: Sapaan seperti halo, hai, selamat pagi, dll
- farewell: Perpisahan seperti bye, sampai jumpa, terima kasih
- help: Meminta bantuan atau informasi fitur
- casual_chat: Percakapan sehari-hari, bukan tentang musik
- song_artist: Menanyakan artist dari lagu tertentu
- artist_music: Menanyakan lagu dari artist tertentu  
- artist_info: Menanyakan informasi tentang artist
- artist_followers: Menanyakan jumlah followers artist
- check_song: Mengecek apakah lagu ada di database
- check_artist: Mengecek apakah artist ada di database
- popular: Meminta lagu populer
- stats: Meminta statistik
- all_music: Meminta semua lagu
- recommend_mood: Meminta rekomendasi berdasarkan mood/situasi - CONTOH: "lagu untuk workout", "musik santai", "5 lagu untuk belajar"
- personal_recommendations: Meminta rekomendasi personal berdasarkan favorit
- my_favorites: Meminta lagu favorit user
- my_profile: Meminta info profil user
- followed_artists: Meminta artist yang di-follow user
- followed_artists_music: Meminta musik terbaru dari artist yang di-follow
- check_artist_follow: Mengecek apakah user follow artist tertentu
- saved_playlists: Meminta playlist yang disimpan user
- my_custom_playlists: Meminta custom playlist yang dibuat user
- my_custom_playlists_with_dates: Meminta custom playlist beserta tanggal dibuat
- custom_playlist_detail: Meminta detail custom playlist tertentu
- recent_activity: Meminta aktivitas terbaru yang diputar - CONTOH: "yang baru saya dengar", "baru saja diputar", "recent activity", "aktivitas terbaru"
- recent_music: Meminta musik yang baru saja diputar - CONTOH: "musik yang baru saya dengar", "lagu terbaru yang diputar", "yang baru saya putar", "history musik"
- playlist_detail: Meminta detail playlist tertentu
- recommended_playlists: Meminta rekomendasi playlist untuk user
- general_question: Pertanyaan umum lainnya
- general_search: Pencarian umum

PENTING UNTUK REKOMENDASI:
- Jika user meminta rekomendasi berdasarkan mood/situasi → recommend_mood
- Jika ada angka dalam permintaan, gunakan sebagai jumlah lagu

Pesan user: "${message}"

Format response: JSON saja dengan format:
{
    "intent": "nama_intent",
    "confidence": 0.9,
    "entities": {
        "song_title": "",
        "artist_name": "", 
        "mood": "",
        "playlist_name": "",
        "limit": 10
    }
}

Jika user menyebut angka, masukkan ke field "limit". Default 10.

Berikan confidence score antara 0-1.
`;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: intentPrompt }] }],
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error.message);

    const responseText = data.candidates[0].content.parts[0].text;

    // Extract JSON dari response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const intentData = JSON.parse(jsonMatch[0]);
      console.log("🤖 AI Detected Intent:", intentData);
      return intentData;
    }
  } catch (error) {
    console.error("Error detecting intent with AI:", error);
  }

  // Fallback ke detection sederhana
  return fallbackIntentDetection(message);
};

const fallbackIntentDetection = (message) => {
  const msg = message.toLowerCase().trim();

  // Pattern untuk intent spesifik
  const patterns = {
    greeting: /^(halo|hai|hi|hello|hey|selamat|pagi|siang|sore|malam)/i,
    farewell: /(bye|dadah|sampai|jumpa|terima kasih|makasih|thanks)$/i,
    artist_followers:
      /(berapa|jumlah|banyak).*(follower|pengikut|penggemar).*(artist|penyanyi|artis)|(follower|pengikut).*(berapa|jumlah)/i,
    my_profile:
      /(siapa.*nama.*saya|nama.*saya.*siapa|profil.*saya|info.*akun.*saya|data.*diri.*saya|akun.*saya)/i,
    popular:
      /(lagu.*populer|musik.*populer|top.*hits|terpopuler|lagu.*teratas|chart|trending)/i,
    recommend_mood:
      /(lagu.*untuk|musik.*untuk|rekomendasi.*untuk|untuk.*(belajar|kerja|olahraga|workout|santai|sedih|senang|mood))/i,
    my_custom_playlists:
      /(playlist|daftar putar).*(buatan|buat|custom|saya buat|aku buat|sendiri)|(buatan|custom).*(playlist|daftar putar)/i,
    my_custom_playlists_with_dates:
      /(list|daftar).*(custom|buatan).*(playlist|daftar putar).*(tanggal|dibuat|sekali|sekalian|beserta|dengan)/i,
    custom_playlist_detail:
      /(lihat|isi|detail|lagu).*(playlist|daftar putar).*(buatan|custom|C[0-9])/i,
    my_favorites: /(favorit|suka|saya suka|aku suka).*(lagu|musik)/i,
    followed_artists:
      /(artist|penyanyi|artis).*(saya|aku).*(follow|ikuti|suka)/i,
    followed_artists_music:
      /(musik|lagu).*(baru|terbaru|update).*(artist|penyanyi).*(follow|ikuti)/i,
    check_artist_follow:
      /(apakah|apa).*(saya|aku).*(follow|ikuti).*(artist|penyanyi|artis)/i,
    saved_playlists: /(playlist|daftar putar).*(saya|aku|simpan|favorit)/i,
    playlist_detail: /(isi|lagu|detail).*(playlist|daftar putar)/i,
    recent_activity:
      /(baru.*saja.*dengar|baru.*saja.*putar|yang.*baru.*saya.*dengar|recent.*activity|aktivitas.*terbaru|history.*putar|riwayat.*dengar)/i,
    recent_music: 
    /(musik.*baru.*dengar|lagu.*baru.*dengar|musik.*baru.*putar|lagu.*baru.*putar|yang.*baru.*saya.*putar|history.*musik|riwayat.*lagu|lagu.*terbaru.*dengar)/i,
    recommended_playlists:
      hasRecommendKeyword && hasPlaylistKeyword && hasPersonalKeyword,
  };

  for (const [intent, pattern] of Object.entries(patterns)) {
    if (pattern && pattern.test && pattern.test(msg)) {
      console.log("🎯 Fallback detected intent:", intent);
      return { intent, confidence: 0.7, entities: {} };
    }
  }
  
  return { intent: "general_question", confidence: 0.5, entities: {} };
};

const extractEntitiesWithAI = async (message, intent) => {
  const entityPrompt = `
Extract entities dari pesan user berikut dengan intent: ${intent}

Pesan: "${message}"

Entities yang perlu di-extract:
- song_title: Judul lagu
- artist_name: Nama artist/penyanyi  
- mood: Mood/situasi (happy, sad, belajar, workout, dll)
- playlist_name: Nama playlist
- limit: Jumlah lagu yang diminta (angka)

Format response: JSON saja
{
    "song_title": "",
    "artist_name": "",
    "mood": "",
    "playlist_name": "",
    "limit": 10
}

Jika ada angka dalam pesan untuk jumlah lagu, gunakan angka tersebut. Default 10.

Hanya return JSON, tidak perlu penjelasan lain.
`;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: entityPrompt }] }],
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error.message);

    const responseText = data.candidates[0].content.parts[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const entities = JSON.parse(jsonMatch[0]);
      console.log("🤖 AI Extracted Entities:", entities);
      return entities;
    }
  } catch (error) {
    console.error("Error extracting entities with AI:", error);
  }

  return {
    song_title: "",
    artist_name: "",
    mood: "",
    playlist_name: "",
    limit: 10,
  };
};

const generateBotResponse = async (incomingMessageDiv) => {
  const messageElement = incomingMessageDiv.querySelector(".message-text");
  const userMessage = userData.message;


  // Analisis intent dan entities menggunakan AI
  let intentData;
  try {
    intentData = await detectIntentWithAI(userMessage);
  } catch (error) {
    intentData = fallbackIntentDetection(userMessage);
  }

  const { intent, entities: extractedEntities } = intentData;

  // Jika entities masih kosong, coba extract dengan AI
  let entities = extractedEntities;
  if (
    !entities.song_title &&
    !entities.artist_name &&
    !entities.mood
  ) {
    try {
      entities = await extractEntitiesWithAI(userMessage, intent);
    } catch (error) {
      console.error("Error in AI entity extraction:", error);
    }
  }


  let context = "";
  let data = [];

  try {
    switch (intent) {
      case "greeting":
        context = `User menyapa: "${userMessage}"`;
        break;

      case "farewell":
        context = `User mengucapkan selamat tinggal: "${userMessage}"`;
        break;

      case "help":
        context = `User meminta bantuan: "${userMessage}"`;
        break;

      case "artist_music":
        if (entities.artist_name) {
          data = await getMusicByArtist(entities.artist_name);
          if (data.length > 0) {
            const songsList = data
              .slice(0, 5)
              .map(
                (song, index) =>
                  `${index + 1}. "${song.title_music}"`
              )
              .join("\n");
            context = `Ditemukan ${data.length} lagu dari ${entities.artist_name}:\n${songsList}`;
          } else {
            context = `Tidak ditemukan lagu dari "${entities.artist_name}"`;
          }
        } else {
          context = "Artist mana yang kamu cari?";
        }
        break;

      case "song_artist":
        if (entities.song_title) {
          const artists = await getArtistsForSong(entities.song_title);
          if (artists.length > 0) {
            const artistNames = artists
              .map((artist) => artist.artist_name)
              .join(", ");
            context = `Lagu "${entities.song_title}" dinyanyikan oleh ${artistNames}`;
          } else {
            const songData = await findSpecificSong(entities.song_title);
            if (songData) {
              const songArtists = formatArtists(songData.artists);
              if (songArtists.length > 0) {
                context = `Lagu "${
                  songData.title_music
                }" dinyanyikan oleh ${songArtists.join(", ")}`;
              } else {
                context = `Lagu "${songData.title_music}" ada di Goovlize tapi belum ada info artistnya`;
              }
            } else {
              context = `Tidak ditemukan lagu "${entities.song_title}"`;
            }
          }
        } else {
          context = "Lagu apa yang kamu maksud?";
        }
        break;

      case "check_artist":
        if (entities.artist_name) {
          const artistCheck = await checkArtistExists(entities.artist_name);
          if (artistCheck.exists) {
            const artist = artistCheck.artist;
            context = `Ya, artist ${
              artist.artist_name
            } ada di Goovlize dengan ${artist.artist_followers || 0} followers`;
          } else {
            context = `Tidak ditemukan artist "${entities.artist_name}"`;
          }
        } else {
          context = "Artist mana yang ingin kamu cek?";
        }
        break;

      case "check_song":
        if (entities.song_title) {
          const songData = await findSpecificSong(entities.song_title);
          if (songData) {
            const artists = formatArtists(songData.artists);
            const artistInfo =
              artists.length > 0 ? ` oleh ${artists.join(", ")}` : "";
            context = `Ya, lagu "${songData.title_music}"${artistInfo} ada di Goovlize`;
          } else {
            context = `Tidak ditemukan lagu "${entities.song_title}"`;
          }
        } else {
          context = "Lagu apa yang ingin kamu cek?";
        }
        break;

      case "popular":
        // Tentukan jumlah lagu yang diminta
        let limit = 10; // default
        if (entities.limit && !isNaN(entities.limit)) {
          limit = parseInt(entities.limit);
          // Batasi maksimal 20 lagu untuk performa
          if (limit > 20) limit = 20;
          if (limit < 1) limit = 1;
        }

        // Extract angka dari pesan user sebagai fallback
        if (!entities.limit || isNaN(entities.limit)) {
          const numberMatch = userMessage.match(/\b(\d+)\b/);
          if (numberMatch) {
            limit = parseInt(numberMatch[1]);
            if (limit > 20) limit = 20;
            if (limit < 1) limit = 1;
          }
        }

        console.log(`🎵 Getting ${limit} popular songs`);
        data = await getPopularMusic(limit);

        if (data.length > 0) {
          const topSongs = data
            .map((song, index) => {
              const artists = formatArtists(song.artists);
              const artistStr =
                artists.length > 0 ? ` - ${artists.join(", ")}` : "";
              return `${index + 1}. "${song.title_music}"${artistStr}`;
            })
            .join("\n");

          context = `LAGU POPULER DI GOOVLIZE (${data.length} lagu):\n${topSongs}`;
        } else {
          context = "Belum ada data lagu populer";
        }
        break;

      case "stats":
        if (!musicStats) {
          musicStats = await getMusicStats();
        }

        if (musicStats) {
          context =
            `Statistik Goovlize:\n` +
            `• Total lagu: ${musicStats.total_songs}\n` +
            `• Total artist: ${musicStats.total_artists}\n` +
            `• Total putaran: ${musicStats.total_plays}\n` +
            `• Lagu paling populer: "${musicStats.most_played_song}"`;
        } else {
          context = "Statistik tidak tersedia";
        }
        break;

      case "all_music":
        if (allMusicData.length > 0) {
          const sampleSongs = allMusicData
            .slice(0, 5)
            .map((song, index) => {
              return `${index + 1}. "${song.title_music}"`;
            })
            .join("\n");
          context = `Total ${allMusicData.length} lagu di Goovlize. Contoh:\n${sampleSongs}`;
        } else {
          context = "Koleksi musik masih kosong";
        }
        break;

      case "recommend_mood":
    if (entities.mood) {
        let limit = 10;
        if (entities.limit && !isNaN(entities.limit)) {
            limit = parseInt(entities.limit);
            if (limit > 20) limit = 20;
            if (limit < 1) limit = 1;
        }

        if (!entities.limit || isNaN(entities.limit)) {
            const numberMatch = userMessage.match(/\b(\d+)\b/);
            if (numberMatch) {
                limit = parseInt(numberMatch[1]);
                if (limit > 20) limit = 20;
                if (limit < 1) limit = 1;
            }
        }

        console.log(`🎵 Looking for ${limit} songs for mood: ${entities.mood}`);
        
        // Gunakan endpoint baru untuk rekomendasi berdasarkan mood
        try {
            const response = await fetch(`/chatbot/music/by-mood?mood=${encodeURIComponent(entities.mood)}&limit=${limit}`);
            data = await response.json();
            
            if (data.success && data.music.length > 0) {
                const songsList = data.music
                    .map((song, index) => {
                        const artists = formatArtists(song.artists);
                        const artistStr = artists.length > 0 ? ` - ${artists.join(", ")}` : "";
                        return `${index + 1}. "${song.title_music}"${artistStr}`;
                    })
                    .join("\n");

                context =
                    `REKOMENDASI DARI DATABASE GOOVLIZE - HANYA GUNAKAN INI:\n` +
                    `Permintaan: ${entities.mood}\n` +
                    `Genre yang cocok: ${data.matched_genres ? data.matched_genres.join(', ') : 'Berbagai genre'}\n` +
                    `Jumlah lagu: ${data.music.length}\n` +
                    `Lagu yang tersedia:\n${songsList}\n\n` +
                    `PERINGATAN: JANGAN REKOMENDASIKAN LAGU LAIN. HANYA LAGU DI ATAS YANG BOLEH DISEBUT.`;
            } else {
                // Fallback ke popular songs
                console.log('No mood-based songs found, falling back to popular songs');
                data = await getPopularMusic(limit);
                
                if (data.length > 0) {
                    const songsList = data
                        .map((song, index) => {
                            const artists = formatArtists(song.artists);
                            const artistStr = artists.length > 0 ? ` - ${artists.join(", ")}` : "";
                            return `${index + 1}. "${song.title_music}"${artistStr}`;
                        })
                        .join("\n");

                    context =
                        `REKOMENDASI DARI DATABASE GOOVLIZE - HANYA GUNAKAN INI:\n` +
                        `Permintaan: ${entities.mood}\n` +
                        `Jumlah lagu: ${data.length}\n` +
                        `Lagu yang tersedia:\n${songsList}\n\n` +
                        `PERINGATAN: JANGAN REKOMENDASIKAN LAGU LAIN. HANYA LAGU DI ATAS YANG BOLEH DISEBUT.`;
                } else {
                    context = `TIDAK ADA REKOMENDASI: Tidak ditemukan lagu untuk "${entities.mood}" di database Goovlize.\n\nPERINGATAN: JANGAN BERIKAN REKOMENDASI APAPUN.`;
                }
            }
        } catch (error) {
            console.error('Error getting mood-based recommendations:', error);
            // Fallback
            data = await getPopularMusic(limit);
            // ... fallback code ...
        }
    } else {
        context = "Mood atau situasi apa yang kamu inginkan?";
    }
    break;

      case "casual_chat":
        context = `User mengobrol: "${userMessage}" - Ini adalah percakapan sehari-hari, bukan tentang musik.`;
        break;

      case "personal_recommendations":
    if (!userStatus.isLoggedIn) {
        context = "REKOMENDASI UMUM:\nKamu belum login, jadi saya akan memberikan rekomendasi musik umum. Coba tanya dengan mood tertentu, seperti 'lagu untuk background video' atau 'musik untuk background podcast'";
    } else {
        const activityCheck = await hasSufficientActivity();

        console.log('Activity check result:', activityCheck);

        if (!activityCheck.hasActivity) {
            // Jika belum ada aktivitas yang cukup, rekomendasikan berdasarkan popularitas
            console.log('Insufficient activity, showing popular music');
            const popularData = await getPopularMusic(6);
            
            console.log('Popular music found:', popularData.length);
            
            if (popularData.length > 0) {
                const songsList = popularData
                    .slice(0, 5)
                    .map((song, index) => {
                        const artists = formatArtists(song.artists);
                        const artistStr = artists.length > 0 ? ` - ${artists.join(", ")}` : "";
                        return `${index + 1}. "${song.title_music}"${artistStr}`;
                    })
                    .join("\n");

                context =
                    `REKOMENDASI AWAL UNTUK ${userStatus.user.name_user}:\n` +
                    `Kamu baru saja memulai perjalanan musikmu! 🎵\n` +
                    `Dengarkan lebih banyak lagu untuk mendapatkan rekomendasi yang lebih personal.\n\n` +
                    `Sementara ini, coba dengarkan lagu-lagu populer:\n${songsList}\n\n` +
                    `💡 Tips: Dengarkan berbagai jenis musik untuk membantu saya memahami preferensimu!`;
            } else {
                context =
                    `Selamat datang, ${userStatus.user.name_user}! 🎉\n` +
                    `Kamu belum memiliki riwayat mendengarkan musik.\n` +
                    `Mulai dengarkan beberapa lagu favoritmu, dan saya akan memberikan rekomendasi personal yang lebih akurat!`;
            }
        } else {
            // Jika ada aktivitas, gunakan personalized recommendations
            console.log('Sufficient activity found, getting personalized recommendations');
            const personalizedData = await getPersonalizedRecommendations(8);
            
            console.log('Personalized recommendations result:', {
                success: personalizedData.success,
                count: personalizedData.recommendations?.length,
                based_on: personalizedData.based_on
            });
            
            if (personalizedData.success && personalizedData.recommendations.length > 0) {
                const songsList = personalizedData.recommendations
                    .slice(0, 6)
                    .map((song, index) => {
                        const artists = formatArtists(song.artists);
                        const artistStr = artists.length > 0 ? ` - ${artists.join(", ")}` : "";
                        return `${index + 1}. "${song.title_music}"${artistStr}`;
                    })
                    .join("\n");

                let basedOnInfo = "Berdasarkan ";
                if (personalizedData.based_on && personalizedData.based_on !== "popular") {
                    if (personalizedData.based_on.genres && personalizedData.based_on.genres.length > 0) {
                        basedOnInfo += `genre favoritmu: ${personalizedData.based_on.genres.join(", ")}`;
                    }
                } else {
                    basedOnInfo = "Berdasarkan lagu populer";
                }

                context = `REKOMENDASI PERSONAL UNTUK ${userStatus.user.name_user}:\n${basedOnInfo}\n\nLagu yang direkomendasikan:\n${songsList}`;
            } else {
                console.log('No personalized recommendations, falling back to popular');
                // Fallback ke popular
                const popularData = await getPopularMusic(6);
                if (popularData.length > 0) {
                    const songsList = popularData
                        .slice(0, 5)
                        .map((song, index) => {
                            const artists = formatArtists(song.artists);
                            const artistStr = artists.length > 0 ? ` - ${artists.join(", ")}` : "";
                            return `${index + 1}. "${song.title_music}"${artistStr}`;
                        })
                        .join("\n");

                    context = `REKOMENDASI UNTUK ${userStatus.user.name_user}:\nBerdasarkan lagu populer Goovlize\n\nLagu yang direkomendasikan:\n${songsList}`;
                } else {
                    context = `Tidak ada rekomendasi untuk ${userStatus.user.name_user} saat ini. Coba dengarkan lebih banyak musik!`;
                }
            }
        }
    }
    break;
    

      case "recommended_playlists":
        if (!userStatus.isLoggedIn) {
          console.log("🔍 Getting popular playlists for non-logged in user");
          const popularPlaylists = await getPopularPlaylists(4);

          if (
            popularPlaylists.success &&
            popularPlaylists.playlists.length > 0
          ) {
            const playlistsList = popularPlaylists.playlists
              .slice(0, 4)
              .map((playlist, index) => {
                return `${index + 1}. "${playlist.playlist_name}" (${
                  playlist.playlist_tipe
                }) - ${playlist.total_songs || 0} lagu`;
              })
              .join("\n");

            context = `REKOMENDASI PLAYLIST POPULER DI GOOVLIZE:\n\n${playlistsList}\n\n💡 Login untuk mendapatkan rekomendasi playlist personal!`;
          } else {
            context =
              "Belum ada data playlist populer saat ini. Coba login untuk mengeksplor playlist yang tersedia!";
          }
        } else {
          const activityCheck = await hasSufficientActivity();

          if (!activityCheck.hasActivity) {
            console.log(
              `🎵 User ${userStatus.user.name_user} has insufficient activity, showing popular playlists`
            );
            const popularPlaylists = await getPopularPlaylists(4);

            if (
              popularPlaylists.success &&
              popularPlaylists.playlists.length > 0
            ) {
              const playlistsList = popularPlaylists.playlists
                .slice(0, 4)
                .map((playlist, index) => {
                  return `${index + 1}. "${playlist.playlist_name}" (${
                    playlist.playlist_tipe
                  }) - ${playlist.total_songs || 0} lagu`;
                })
                .join("\n");

              context =
                `REKOMENDASI PLAYLIST AWAL UNTUK ${userStatus.user.name_user}:\n` +
                `Kamu baru memulai! Coba eksplor playlist populer ini:\n\n${playlistsList}\n\n` +
                `💡 Dengarkan berbagai jenis musik untuk membantu saya merekomendasikan playlist yang lebih cocok!`;
            } else {
              context =
                `Selamat datang, ${userStatus.user.name_user}! 🎧\n` +
                `Kamu bisa mulai dengan mengeksplor playlist populer di Goovlize. ` +
                `Semakin banyak kamu mendengarkan, semakin personal rekomendasi playlist yang bisa saya berikan!`;
            }
          } else {
            console.log(
              `🎵 User ${userStatus.user.name_user} has sufficient activity, showing personalized playlists`
            );
            const playlistData = await getPersonalizedPlaylistRecommendations(
              5
            );

            if (playlistData.success && playlistData.music.length > 0) {
              // HAPUS DUPLIKAT - ambil playlist unik berdasarkan nama
              const uniquePlaylists = [];
              const seenNames = new Set();

              playlistData.music.forEach((playlist) => {
                if (!seenNames.has(playlist.playlist_name)) {
                  seenNames.add(playlist.playlist_name);
                  uniquePlaylists.push(playlist);
                }
              });

              const playlistsList = uniquePlaylists
                .slice(0, 4)
                .map((playlist, index) => {
                  return `${index + 1}. "${playlist.playlist_name}" (${
                    playlist.playlist_tipe
                  }) - ${playlist.total_songs || 0} lagu`;
                })
                .join("\n");

              let basedOnInfo = "";
              if (
                playlistData.based_on &&
                playlistData.based_on !== "popular"
              ) {
                if (
                  playlistData.based_on.artists &&
                  playlistData.based_on.artists.length > 0
                ) {
                  basedOnInfo = `Berdasarkan artis favoritmu: ${playlistData.based_on.artists.join(
                    ", "
                  )}`;
                }
              } else {
                basedOnInfo = "Berdasarkan playlist populer";
              }

              context = `REKOMENDASI PLAYLIST PERSONAL UNTUK ${userStatus.user.name_user}:\n${basedOnInfo}\n\nPlaylist yang direkomendasikan:\n${playlistsList}`;
            } else {
              // Fallback ke playlist populer jika tidak ada rekomendasi personal
              console.log(
                "🎵 No personalized playlists found, falling back to popular playlists"
              );
              const popularPlaylists = await getPopularPlaylists(4);

              if (
                popularPlaylists.success &&
                popularPlaylists.playlists.length > 0
              ) {
                const playlistsList = popularPlaylists.playlists
                  .slice(0, 4)
                  .map((playlist, index) => {
                    return `${index + 1}. "${playlist.playlist_name}" (${
                      playlist.playlist_tipe
                    }) - ${playlist.total_songs || 0} lagu`;
                  })
                  .join("\n");

                context = `REKOMENDASI PLAYLIST UNTUK ${userStatus.user.name_user}:\nBerdasarkan playlist populer:\n\n${playlistsList}`;
              } else {
                context = `Belum ada rekomendasi playlist untukmu saat ini, ${userStatus.user.name_user}. Coba dengarkan lebih banyak musik!`;
              }
            }
          }
        }
        break;

      case "my_favorites":
        if (!userStatus.isLoggedIn) {
          context =
            "User meminta lagu favorit tetapi belum login. Sarankan untuk login terlebih dahulu.";
        } else {
          // Tentukan jumlah lagu yang diminta
          let limit = 10; // default
          let showAll = false;

          // Cek jika user meminta "semua"
          if (
            userMessage.toLowerCase().includes("semua") ||
            userMessage.toLowerCase().includes("semua lagu")
          ) {
            limit = 1000; // Angka besar untuk mengambil semua data
            showAll = true;
          }
          // Cek entities dari AI
          else if (entities.limit && !isNaN(entities.limit)) {
            limit = parseInt(entities.limit);
            // Batasi maksimal 100 lagu untuk performa
            if (limit > 100) limit = 100;
            if (limit < 1) limit = 1;
          }
          // Extract angka dari pesan user sebagai fallback
          else {
            const numberMatch = userMessage.match(/\b(\d+)\b/);
            if (numberMatch) {
              limit = parseInt(numberMatch[1]);
              if (limit > 100) limit = 100;
              if (limit < 1) limit = 1;
            }
          }

          console.log(
            `🎵 Getting ${showAll ? "all" : limit} favorite songs for user ${
              userStatus.user.name_user
            }`
          );

          const favoritesData = await getUserFavoriteMusic(limit);

          if (favoritesData.success && favoritesData.music.length > 0) {
            let songsList;
            let additionalInfo = "";

            if (showAll || favoritesData.music.length > 8) {
              // Jika banyak lagu, tampilkan dalam format yang lebih ringkas
              songsList = favoritesData.music
                .slice(0, 15) // Tampilkan maksimal 15 di list
                .map((song, index) => {
                  const artists = formatArtists(song.artists);
                  const artistStr =
                    artists.length > 0 ? ` - ${artists.join(", ")}` : "";
                  return `${index + 1}. "${song.title_music}"${artistStr}`;
                })
                .join("\n");

              if (favoritesData.music.length > 15) {
                additionalInfo = `\n... dan ${
                  favoritesData.music.length - 15
                } lagu favorit lainnya`;
              }
            } else {
              // Jika sedikit lagu, tampilkan semua dengan format normal
              songsList = favoritesData.music
                .map((song, index) => {
                  const artists = formatArtists(song.artists);
                  const artistStr =
                    artists.length > 0 ? ` - ${artists.join(", ")}` : "";
                  return `${index + 1}. "${song.title_music}"${artistStr}`;
                })
                .join("\n");
            }

            let header = `LAGU FAVORIT ${userStatus.user.name_user}`;
            if (showAll) {
              header += " (SEMUA LAGU)";
            } else if (limit !== 10) {
              header += ` (${favoritesData.music.length} lagu)`;
            }

            context = `${header}:\n${songsList}${additionalInfo}`;

            // Tambahkan info total jika user tidak meminta semua
            if (
              !showAll &&
              favoritesData.count &&
              favoritesData.count > favoritesData.music.length
            ) {
              context += `\n\nKamu memiliki total ${favoritesData.count} lagu favorit. Tanyakan "semua lagu favorit saya" untuk melihat semuanya!`;
            }
          } else {
            context = `Kamu belum memiliki lagu favorit, ${userStatus.user.name_user}. Tambahkan lagu favorit untuk mendapatkan rekomendasi personal!\n\n💡 Tips: Klik tombol hati (♥) pada lagu yang kamu sukai untuk menambahkannya ke favorit!`;
          }
        }
        break;

      case "my_profile":
        if (!userStatus.isLoggedIn) {
          context = "User meminta info profil tetapi belum login.";
        } else {
          const user = userStatus.user;
          context = `PROFIL ${user.name_user}:\n• Nama: ${
            user.name_user
          }\n• Email: ${user.email_user}\n• Followers: ${
            user.user_followers || 0
          }\n• Member sejak: ${new Date(user.created_at).toLocaleDateString(
            "id-ID"
          )}`;
        }
        break;

      case "followed_artists":
        if (!userStatus.isLoggedIn) {
          context =
            "User meminta artist yang di-follow tetapi belum login. Sarankan untuk login terlebih dahulu.";
        } else {
          const followedArtistsData = await getFollowedArtists(8);
          if (
            followedArtistsData.success &&
            followedArtistsData.artists.length > 0
          ) {
            const artistsList = followedArtistsData.artists
              .slice(0, 6)
              .map((artist, index) => {
                return `${index + 1}. ${artist.artist_name} (${
                  artist.artist_followers || 0
                } followers)`;
              })
              .join("\n");
            context = `ARTIST YANG DI-FOLLOW ${userStatus.user.name_user}:\n${artistsList}\n\nTotal: ${followedArtistsData.artists.length} artist`;
          } else {
            context = `Kamu belum mengikuti artist apapun, ${userStatus.user.name_user}. Mulai follow artist favoritmu untuk mendapatkan update terbaru!`;
          }
        }
        break;

      case "followed_artists_music":
        if (!userStatus.isLoggedIn) {
          context =
            "User meminta musik dari artist yang di-follow tetapi belum login.";
        } else {
          const followedMusicData = await getFollowedArtistsMusic(6);
          if (followedMusicData.success && followedMusicData.music.length > 0) {
            const songsList = followedMusicData.music
              .slice(0, 5)
              .map((song, index) => {
                return `${index + 1}. "${song.title_music}" - ${
                  song.artist_name
                }`;
              })
              .join("\n");
            context = `MUSIK TERBARU DARI ARTIST YANG DI-FOLLOW ${userStatus.user.name_user}:\n${songsList}`;
          } else {
            context = `Belum ada musik terbaru dari artist yang kamu follow, ${userStatus.user.name_user}. Atau coba follow lebih banyak artist!`;
          }
        }
        break;

      case "check_artist_follow":
        if (!userStatus.isLoggedIn) {
          context = "User mengecek follow artist tetapi belum login.";
        } else if (entities.artist_name) {
          // Cari artist di database untuk mendapatkan id_artist
          const artistCheck = await checkArtistExists(entities.artist_name);
          if (artistCheck.exists && artistCheck.artist) {
            const followCheck = await checkArtistFollow(
              artistCheck.artist.id_artist
            );
            if (followCheck.success) {
              if (followCheck.is_following) {
                context = `Ya, kamu mengikuti ${
                  artistCheck.artist.artist_name
                }. Kamu mulai follow sejak ${new Date(
                  followCheck.follow_data.created_at
                ).toLocaleDateString("id-ID")}.`;
              } else {
                context = `Kamu belum mengikuti ${artistCheck.artist.artist_name}.`;
              }
            } else {
              context = `Tidak bisa mengecek status follow untuk ${artistCheck.artist.artist_name}.`;
            }
          } else {
            context = `Artist "${entities.artist_name}" tidak ditemukan di database.`;
          }
        } else {
          context = "Artist mana yang ingin kamu cek status follow-nya?";
        }
        break;

      case "artist_followers":
        if (entities.artist_name) {
          console.log(
            `🔍 Checking followers for artist: ${entities.artist_name}`
          );
          const artistCheck = await checkArtistExists(entities.artist_name);

          if (artistCheck.exists && artistCheck.artist) {
            const artist = artistCheck.artist;
            const followers = artist.artist_followers || 0;

            // Format angka dengan separator
            const formattedFollowers = new Intl.NumberFormat("id-ID").format(
              followers
            );

            context =
              `ARTIST FOLLOWER INFO - HANYA GUNAKAN INI:\n` +
              `Artist: ${artist.artist_name}\n` +
              `Jumlah Followers: ${formattedFollowers} pengikut\n\n` +
              `PERINGATAN: JANGAN MENGARANG DATA. GUNAKAN INFORMASI DI ATAS SAJA.`;
          } else {
            // Coba cari artist yang mirip
            if (artistCheck.all_matches && artistCheck.all_matches.length > 0) {
              const similarArtists = artistCheck.all_matches
                .slice(0, 3)
                .map((artist) => artist.artist_name)
                .join(", ");
              context = `TIDAK DITEMUKAN: Artist "${entities.artist_name}" tidak ditemukan.\nArtist yang mirip: ${similarArtists}`;
            } else {
              context = `TIDAK DITEMUKAN: Artist "${entities.artist_name}" tidak ditemukan di database Goovlize.`;
            }
          }
        } else {
          context = "Artist mana yang ingin kamu ketahui jumlah followers-nya?";
        }
        break;

      case "saved_playlists":
        if (!userStatus.isLoggedIn) {
          context =
            "User meminta playlist yang disimpan tetapi belum login. Sarankan untuk login terlebih dahulu.";
        } else {
          const savedPlaylistsData = await getSavedPlaylists(8);
          if (
            savedPlaylistsData.success &&
            savedPlaylistsData.playlists.length > 0
          ) {
            const playlistsList = savedPlaylistsData.playlists
              .slice(0, 6)
              .map((playlist, index) => {
                return `${index + 1}. "${playlist.playlist_name}" (${
                  playlist.playlist_tipe
                }) - ${playlist.total_songs || 0} lagu`;
              })
              .join("\n");
            context = `PLAYLIST YANG DISIMPAN ${userStatus.user.name_user}:\n${playlistsList}\n\nTotal: ${savedPlaylistsData.playlists.length} playlist`;
          } else {
            context = `Kamu belum menyimpan playlist apapun, ${userStatus.user.name_user}. Simpan playlist favoritmu untuk mendengarkannya kapan saja!`;
          }
        }
        break;

      case "playlist_detail":
        if (!userStatus.isLoggedIn) {
          context = "User meminta detail playlist tetapi belum login.";
        } else if (entities.playlist_name) {
          // Cari playlist berdasarkan nama
          const savedPlaylistsData = await getSavedPlaylists(20);
          const foundPlaylist = savedPlaylistsData.playlists.find((playlist) =>
            playlist.playlist_name
              .toLowerCase()
              .includes(entities.playlist_name.toLowerCase())
          );

          if (foundPlaylist) {
            const playlistDetail = await getPlaylistDetail(
              foundPlaylist.id_playlist,
              8
            );
            if (playlistDetail.success && playlistDetail.playlist) {
              const playlist = playlistDetail.playlist;
              const songsList = playlist.songs
                .slice(0, 6)
                .map((song, index) => {
                  const artistStr =
                    song.artists.length > 0
                      ? ` - ${song.artists.join(", ")}`
                      : "";
                  return `${index + 1}. "${song.title_music}"${artistStr}`;
                })
                .join("\n");

              const saveDate = new Date(foundPlaylist.saved_at);
              const formattedDate = saveDate.toLocaleDateString("id-ID", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              });

              context =
                `DETAIL PLAYLIST "${playlist.playlist_name}":\n` +
                `Tipe: ${playlist.playlist_tipe}\n` +
                `Total lagu: ${playlist.total_songs}\n` +
                `Disimpan pada: ${formattedDate}\n\n` +
                `Lagu dalam playlist:\n${songsList}`;
            } else {
              context = `Tidak bisa mengambil detail playlist "${entities.playlist_name}".`;
            }
          } else {
            context = `Playlist "${entities.playlist_name}" tidak ditemukan dalam playlist yang kamu simpan.`;
          }
        } else {
          context = "Playlist mana yang ingin kamu lihat detailnya?";
        }
        break;

      case "my_custom_playlists":
        if (!userStatus.isLoggedIn) {
          context =
            "User meminta custom playlist tetapi belum login. Sarankan untuk login terlebih dahulu.";
        } else {
          const customPlaylistsData = await getCustomPlaylists(10);
          if (
            customPlaylistsData.success &&
            customPlaylistsData.playlists.length > 0
          ) {
            const playlistsList = customPlaylistsData.playlists
              .slice(0, 8)
              .map((playlist, index) => {
                const songCount = playlist.total_songs || 0;
                return `${index + 1}. "${
                  playlist.playlist_name
                }" (${songCount} lagu)`;
              })
              .join("\n");

            context = `CUSTOM PLAYLIST BUATAN ${userStatus.user.name_user}:\n${playlistsList}\n\nTotal: ${customPlaylistsData.playlists.length} playlist custom`;
          } else {
            context = `Kamu belum membuat custom playlist apapun, ${userStatus.user.name_user}. Ayo buat playlist custom pertamamu!`;
          }
        }
        break;

      case "my_custom_playlists_with_dates":
        if (!userStatus.isLoggedIn) {
          context =
            "User meminta custom playlist dengan tanggal tetapi belum login. Sarankan untuk login terlebih dahulu.";
        } else {
          const customPlaylistsData = await getCustomPlaylists(10);
          if (
            customPlaylistsData.success &&
            customPlaylistsData.playlists.length > 0
          ) {
            const playlistsList = customPlaylistsData.playlists
              .slice(0, 8)
              .map((playlist, index) => {
                const songCount = playlist.total_songs || 0;
                const dateCreated = new Date(
                  playlist.created_at
                ).toLocaleDateString("id-ID");
                return `${index + 1}. "${
                  playlist.playlist_name
                }" (${songCount} lagu) - Dibuat: ${dateCreated}`;
              })
              .join("\n");

            context = `CUSTOM PLAYLIST BUATAN ${userStatus.user.name_user}:\n${playlistsList}\n\nTotal: ${customPlaylistsData.playlists.length} playlist custom`;
          } else {
            context = `Kamu belum membuat custom playlist apapun, ${userStatus.user.name_user}. Ayo buat playlist custom pertamamu!`;
          }
        }
        break;

      case "custom_playlist_detail":
        if (!userStatus.isLoggedIn) {
          context = "User meminta detail custom playlist tetapi belum login.";
        } else if (entities.playlist_name) {
          // Cari custom playlist berdasarkan nama
          const findResult = await findCustomPlaylistByName(
            entities.playlist_name
          );

          if (findResult.success && findResult.playlist) {
            const playlistDetail = await getCustomPlaylistDetail(
              findResult.playlist.id_cus,
              12
            );

            if (playlistDetail.success && playlistDetail.playlist) {
              const playlist = playlistDetail.playlist;
              let songsList = "";

              if (playlist.songs && playlist.songs.length > 0) {
                songsList = playlist.songs
                  .slice(0, 10)
                  .map((song, index) => {
                    const artistStr =
                      song.artists && song.artists.length > 0
                        ? ` - ${song.artists.join(", ")}`
                        : "";
                    return `${index + 1}. "${song.title_music}"${artistStr}`;
                  })
                  .join("\n");

                if (playlist.songs.length > 10) {
                  songsList += `\n... dan ${
                    playlist.songs.length - 10
                  } lagu lainnya`;
                }
              } else {
                songsList = "Belum ada lagu dalam playlist ini";
              }

              context =
                `DETAIL CUSTOM PLAYLIST "${playlist.playlist_name}":\n` +
                `Deskripsi: ${
                  playlist.description || "Tidak ada deskripsi"
                }\n` +
                `Total lagu: ${playlist.total_songs || 0}\n\n` +
                `Daftar Lagu:\n${songsList}`;
            } else {
              context = `Tidak bisa mengambil detail playlist "${entities.playlist_name}".`;
            }
          } else {
            // Jika tidak ditemukan dengan nama, tampilkan daftar custom playlist yang dimiliki TANPA TANGGAL
            const customPlaylistsData = await getCustomPlaylists(5);
            if (
              customPlaylistsData.success &&
              customPlaylistsData.playlists.length > 0
            ) {
              const playlistNames = customPlaylistsData.playlists
                .map((p) => `"${p.playlist_name}" (${p.total_songs || 0} lagu)`)
                .join(", ");
              context = `Custom playlist "${entities.playlist_name}" tidak ditemukan.\n\nCustom playlist milikmu: ${playlistNames}`;
            } else {
              context = `Custom playlist "${entities.playlist_name}" tidak ditemukan dan kamu belum memiliki custom playlist.`;
            }
          }
        } else {
          context = "Custom playlist mana yang ingin kamu lihat detailnya?";
        }
        break;

      case "recent_activity":
        if (!userStatus.isLoggedIn) {
          context =
            "User meminta aktivitas terbaru tetapi belum login. Sarankan untuk login terlebih dahulu.";
        } else {
          // Tentukan jumlah aktivitas yang diminta
          let limit = 10;
          if (entities.limit && !isNaN(entities.limit)) {
            limit = parseInt(entities.limit);
            if (limit > 20) limit = 20;
            if (limit < 1) limit = 1;
          }

          console.log(
            `🎵 Getting ${limit} recent activities for user ${userStatus.user.name_user}`
          );

          const recentData = await getRecentActivity(limit);

          if (recentData.success && recentData.activities.length > 0) {
            let activitiesList = "";
            let processedItems = new Set(); // Untuk menghindari duplikat

            for (
              let i = 0;
              i < Math.min(recentData.activities.length, 8);
              i++
            ) {
              const activity = recentData.activities[i];
              const itemKey = `${activity.item_type}-${activity.item_id}`;

              // Skip jika item sudah diproses (untuk menghindari duplikat)
              if (processedItems.has(itemKey)) continue;
              processedItems.add(itemKey);

              // Format waktu
              const playedDate = new Date(activity.played_at);
              const timeAgo = getTimeAgo(playedDate);

              let itemInfo = "";

              // Dapatkan detail item berdasarkan type
              const itemDetails = await getItemDetails(
                activity.item_type,
                activity.item_id,
                activity.id_music
              );

              switch (activity.item_type) {
                case "playlist":
                case "custom_playlist":
                  if (itemDetails) {
                    itemInfo = `🎵 Playlist "${itemDetails.name}" (${itemDetails.type})`;
                    if (itemDetails.total_songs) {
                      itemInfo += ` - ${itemDetails.total_songs} lagu`;
                    }
                  } else {
                    itemInfo = `🎵 Playlist`;
                  }
                  break;

                case "artist":
                  if (itemDetails) {
                    itemInfo = `🎤 Artist "${itemDetails.name}"`;
                    if (itemDetails.followers) {
                      itemInfo += ` - ${itemDetails.followers} followers`;
                    }
                  } else {
                    itemInfo = `🎤 Artist`;
                  }
                  break;

                case "album":
                  if (itemDetails) {
                    itemInfo = `💿 Album "${itemDetails.name}"`;
                    if (itemDetails.release_date) {
                      const releaseYear = new Date(
                        itemDetails.release_date
                      ).getFullYear();
                      itemInfo += ` - ${releaseYear}`;
                    }
                  } else {
                    itemInfo = `💿 Album`;
                  }
                  break;

                case "search":
                  if (activity.music_title) {
                    const artists =
                      activity.artists.length > 0
                        ? ` - ${activity.artists.join(", ")}`
                        : "";
                    itemInfo = `🔍 Pencarian: "${activity.music_title}"${artists}`;
                  } else {
                    itemInfo = `🔍 Pencarian`;
                  }
                  break;

                default:
                  if (activity.music_title) {
                    const artists =
                      activity.artists.length > 0
                        ? ` - ${activity.artists.join(", ")}`
                        : "";
                    itemInfo = `🎵 "${activity.music_title}"${artists}`;
                  } else {
                    itemInfo = `🎵 Musik`;
                  }
              }

              activitiesList += `${i + 1}. ${itemInfo} (${timeAgo})\n`;
            }

            context = `AKTIVITAS TERBARU ${userStatus.user.name_user}:\n${activitiesList}`;

            if (recentData.count > 8) {
              context += `\n... dan ${recentData.count - 8} aktivitas lainnya.`;
            }
          } else {
            context = `Kamu belum memiliki aktivitas terbaru, ${userStatus.user.name_user}. Mulai dengarkan musik, jelajahi playlist, atau cari artist favoritmu!`;
          }
        }
        break;

      case "recent_music":
        if (!userStatus.isLoggedIn) {
          context = "User meminta musik terbaru tetapi belum login. Sarankan untuk login terlebih dahulu.";
        } else {
          // Tentukan jumlah musik yang diminta
          let limit = 10;
          if (entities.limit && !isNaN(entities.limit)) {
            limit = parseInt(entities.limit);
            if (limit > 15) limit = 15;
            if (limit < 1) limit = 1;
          }

          console.log(`🎵 Getting ${limit} recent music for user ${userStatus.user.name_user}`);
          
          const recentData = await getRecentActivity(limit * 2); // Ambil lebih banyak untuk filter
          
          if (recentData.success && recentData.activities.length > 0) {
            // Filter hanya aktivitas yang berhubungan dengan musik
            const musicActivities = recentData.activities.filter(activity => 
              activity.music_title || 
              activity.item_type === 'music' ||
              activity.id_music
            );
            
            if (musicActivities.length > 0) {
              let musicList = "";
              let processedMusic = new Set(); // Untuk menghindari duplikat lagu
              
              for (let i = 0; i < Math.min(musicActivities.length, limit); i++) {
                const activity = musicActivities[i];
                const musicKey = activity.id_music || activity.music_title;
                
                // Skip jika lagu sudah diproses
                if (processedMusic.has(musicKey)) continue;
                processedMusic.add(musicKey);
                
                // Format waktu
                const playedDate = new Date(activity.played_at);
                const timeAgo = getTimeAgo(playedDate);
                
                let musicInfo = "";
                
                if (activity.music_title) {
                  const artists = activity.artists.length > 0 ? ` - ${activity.artists.join(', ')}` : '';
                  musicInfo = `"${activity.music_title}"${artists}`;
                } else {
                  // Coba dapatkan detail musik
                  const itemDetails = await getItemDetails(
                    'music', 
                    null, 
                    activity.id_music
                  );
                  if (itemDetails) {
                    musicInfo = `"${itemDetails.name}"`;
                    if (itemDetails.artists) {
                      musicInfo += ` - ${itemDetails.artists}`;
                    }
                  } else {
                    musicInfo = `Musik`;
                  }
                }
                
                musicList += `${i + 1}. ${musicInfo} (${timeAgo})\n`;
              }
              
              context = `MUSIK TERBARU YANG DIPUTAR ${userStatus.user.name_user}:\n${musicList}`;
              
              if (musicActivities.length > limit) {
                context += `\n... dan ${musicActivities.length - limit} lagu lainnya.`;
              }
              
            } else {
              context = `Belum ada musik yang kamu putar baru-baru ini, ${userStatus.user.name_user}. Mulai dengarkan lagu favoritmu!`;
            }
            
          } else {
            context = `Kamu belum memutar musik apapun, ${userStatus.user.name_user}. Ayo mulai jelajahi koleksi musik di Goovlize!`;
          }
        }
        break;

      default:
        // Untuk pertanyaan umum atau pencarian
        if (userMessage.includes("?") || userMessage.length > 10) {
          // Cek jika ini kemungkinan percakapan biasa
          const casualWords = [
            "siap",
            "salah",
            "baik",
            "bagus",
            "ok",
            "oke",
            "ya",
            "tidak",
          ];
          const isLikelyCasual = casualWords.some((word) =>
            userMessage.toLowerCase().includes(word)
          );

          if (isLikelyCasual && userMessage.length < 25) {
            context = `User mengobrol: "${userMessage}" - Kemungkinan percakapan sehari-hari.`;
          } else {
            context = `User bertanya: "${userMessage}"`;
          }
        } else {
          // Untuk pesan pendek, asumsikan casual chat
          context = `User mengobrol: "${userMessage}" - Pesan pendek, kemungkinan percakapan sehari-hari.`;
        }
        break;
    }
  } catch (error) {
    context = "Terjadi kesalahan sistem";
  }


  chatHistory.push({
    role: "user",
    parts: [{ text: userMessage }],
  });

  const websiteContext = `
ANDALAH: ${chatbotConfig.botName} - Asisten ${chatbotConfig.websiteName}

KONTEKS PERCAKAPAN DAN DATA:
User: "${userMessage}"
${context}

ATURAN BERDASARKAN KONTEKS:

${
  context.includes("REKOMENDASI DARI DATABASE") ||
  context.includes("TIDAK ADA REKOMENDASI")
    ? `
ATURAN MUSIK (KETAT):
1. HANYA gunakan lagu-lagu yang tercantum dalam "REKOMENDASI DARI DATABASE GOOVLIZE"
2. JANGAN merekomendasikan lagu yang tidak ada dalam daftar
3. JANGAN mengarang judul lagu, artist, atau genre
4. Jika tidak ada data, katakan dengan jujur
`
    : context.includes("casual_chat") ||
      context.includes("percakapan sehari-hari")
    ? `
ATURAN PERCAKAPAN (FLEKSIBEL):
1. Ini adalah percakapan sehari-hari, bukan tentang musik
2. Respons dengan ramah dan natural
3. Boleh menggunakan emoji yang sesuai
4. Tidak perlu mengarahkan ke musik kecuali relevan
`
    : `
ATURAN UMUM:
1. Bantu user dengan ramah dan natural
2. Fokus pada konteks percakapan
3. Gunakan bahasa sehari-hari
`
}

INSTRUKSI RESPONS:
- Jadilah asisten yang friendly dan natural
- Sesuaikan respons dengan konteks
- Gunakan bahasa sehari-hari yang natural
- Boleh menggunakan emoji yang sesuai

CONTOH RESPONS:
- Untuk musik: "Berikut rekomendasi dari Goovlize: [daftar lagu]"
- Untuk casual chat: Respons sesuai percakapan
- Untuk tidak ada data: "Maaf, tidak ada data untuk itu di Goovlize"

DATA YANG TERSEDIA:
${context}

JAWAB BERDASARKAN DATA DI ATAS:
`;

  const requestOptions = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: chatHistory,
      systemInstruction: {
        parts: [{ text: websiteContext }],
      },
    }),
  };

  try {
    const response = await fetch(API_URL, requestOptions);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error.message);

    let apiResponseText = data.candidates[0].content.parts[0].text;
    apiResponseText = apiResponseText.replace(/\*\*(.*?)\*\*/g, "$1").trim();
    apiResponseText = apiResponseText.replace(/\n/g, "<br>");
    messageElement.innerHTML = apiResponseText;

    chatHistory.push({
      role: "model",
      parts: [{ text: apiResponseText }],
    });
  } catch (error) {
 
    messageElement.innerText = "Maaf, terjadi error. Silakan coba lagi.";
    messageElement.style.color = "#ff0000";
  } finally {
    incomingMessageDiv.classList.remove("thinking");
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
  }
};

const handleOutgoingMessage = (e) => {
  e.preventDefault();

  userData.message = messageInput.value.trim();
  if (!userData.message) return;

  messageInput.value = "";
  messageInput.dispatchEvent(new Event("input"));

  // User message
  const messageContent = `<div class="message-text">${userData.message}</div>`;
  const outgoingMessageDiv = createMessageElement(
    messageContent,
    "user-message"
  );
  chatBody.appendChild(outgoingMessageDiv);
  chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });

  // Bot thinking
  setTimeout(() => {
    const messageContent = `<svg class="bot-avatar"
                xmlns="http://www.w3.org/2000/svg"
                width="50"
                height="50"
                viewBox="0 0 1024 1024"
            >
                <path
                d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5zM867.2 644.5V453.1h26.5c19.4 0 35.1 15.7 35.1 35.1v121.1c0 19.4-15.7 35.1-35.1 35.1h-26.5zM95.2 609.4V488.2c0-19.4 15.7-35.1 35.1-35.1h26.5v191.3h-26.5c-19.4 0-35.1-15.7-35.1-35.1zM561.5 149.6c0 23.4-15.6 43.3-36.9 49.7v44.9h-30v-44.9c-21.4-6.5-36.9-26.3-36.9-49.7 0-28.6 23.3-51.9 51.9-51.9s51.9 23.3 51.9 51.9z"
                ></path>
            </svg>
            <div class="message-text">
                    <div class="thinking-indicator">
                            <div class="dot"></div>
                            <div class="dot"></div>
                            <div class="dot"></div>
                    </div>
            </div>`;
    const incomingMessageDiv = createMessageElement(
      messageContent,
      "bot-message",
      "thinking"
    );
    chatBody.appendChild(incomingMessageDiv);
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
    generateBotResponse(incomingMessageDiv);
  }, 600);
};

// Event listeners
messageInput.addEventListener("keydown", (e) => {
  const userMessage = e.target.value.trim();
  if (
    e.key === "Enter" &&
    userMessage &&
    !e.shiftKey &&
    window.innerWidth > 768
  ) {
    handleOutgoingMessage(e);
    document.body.classList.remove("show-emoji-picker");
  }
});

messageInput.addEventListener("input", () => {
  messageInput.style.height = `${initialInputHeight}px`;
  messageInput.style.height = `${messageInput.scrollHeight}px`;
  document.querySelector(".chat-form").style.borderRadius =
    messageInput.scrollHeight > initialInputHeight ? "15px" : "32px";
});

const initializeChatbot = async () => {
    await loadChatbotConfig();

    if (!userStatus.isLoggedIn) {
        const greetingMessageContent = `
            <svg class="bot-avatar"
                xmlns="http://www.w3.org/2000/svg"
                width="50"
                height="50"
                viewBox="0 0 1024 1024"
            >
                <path
                d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5zM867.2 644.5V453.1h26.5c19.4 0 35.1 15.7 35.1 35.1v121.1c0 19.4-15.7 35.1-35.1 35.1h-26.5zM95.2 609.4V488.2c0-19.4 15.7-35.1 35.1-35.1h26.5v191.3h-26.5c-19.4 0-35.1-15.7-35.1-35.1zM561.5 149.6c0 23.4-15.6 43.3-36.9 49.7v44.9h-30v-44.9c-21.4-6.5-36.9-26.3-36.9-49.7 0-28.6 23.3-51.9 51.9-51.9s51.9 23.3 51.9 51.9z"
                ></path>
            </svg>
            <div class="message-text">
                <strong>Halo! 👋</strong><br>
                Saya ${chatbotConfig.botName}, asisten musik pribadi Anda.<br><br>
                <small>Login untuk mendapatkan pengalaman personal</small>
            </div>`;
        
        const greetingMessage = createMessageElement(greetingMessageContent, "bot-message");
        chatBody.appendChild(greetingMessage);
        console.log("✅ Generic greeting added for non-logged in user");
        return;
    }


    allMusicData = await getAllMusicFromDB();
    musicStats = await getMusicStats();

    // GET DATA YANG DIPERLUKAN SECARA PARALEL
    const [
        followedArtistsData,
        savedPlaylistsData,
        customPlaylistsData
    ] = await Promise.all([
        getFollowedArtists(),
        getSavedPlaylists(),
        getCustomPlaylists()
    ]);

    const followedCount = followedArtistsData.success ? 
        (followedArtistsData.count || followedArtistsData.followed_artists?.length || 0) : 0;
    
    // Hitung total playlist yang disimpan (reguler + custom orang lain)
    let savedPlaylistsCount = 0;
    if (savedPlaylistsData.success) {
        if (savedPlaylistsData.counts) {
            // Hanya playlist reguler dan custom orang lain yang dihitung sebagai "disimpan"
            savedPlaylistsCount = 
                (savedPlaylistsData.counts.regular_playlists || 0) + 
                (savedPlaylistsData.counts.custom_playlists_others || 0);
        } else {
            // Fallback untuk backward compatibility
            savedPlaylistsCount = savedPlaylistsData.playlists?.length || 0;
        }
    }
    
    const customPlaylistCount = customPlaylistsData.success ? 
        (customPlaylistsData.count || customPlaylistsData.playlists?.length || 0) : 0;

    let greetingMessageContent;
    
    // Bangun personal info dengan format yang lebih rapi
    let personalInfo = "";
    let infoParts = [];
    
    if (followedCount > 0) {
        infoParts.push(`🎤 ${followedCount} artist yang kamu follow`);
    }
    if (savedPlaylistsCount > 0) {
        infoParts.push(`🎵 ${savedPlaylistsCount} playlist yang kamu simpan`);
    }
    if (customPlaylistCount > 0) {
        infoParts.push(`🎧 ${customPlaylistCount} custom playlist buatanmu`);
    }
    
    if (infoParts.length > 0) {
        personalInfo = `
            <div class="goovlize-stats">
                <div class="goovlize-stats-title">Statistik Musik Kamu:</div>
                <div class="goovlize-stats-items">
                    ${infoParts.map(item => `<div class="goovlize-stat-item">${item}</div>`).join('')}
                </div>
            </div>`;
    }

    // Buat kalimat saran yang lebih natural berdasarkan data yang ada
    let suggestionText = "";
    if (customPlaylistCount > 0) {
        suggestionText = "Kamu juga bisa tanya tentang custom playlist yang sudah kamu buat!";
    } else if (savedPlaylistsCount > 0) {
        suggestionText = "Coba tanya tentang playlist favorit atau artist yang kamu follow!";
    } else if (followedCount > 0) {
        suggestionText = "Kamu bisa tanya tentang artist yang kamu follow atau minta rekomendasi musik!";
    } else {
        suggestionText = "Mulai explore musik favoritmu, dan nanti saya bisa kasih rekomendasi yang lebih personal!";
    }

    greetingMessageContent = `
        <svg class="bot-avatar"
            xmlns="http://www.w3.org/2000/svg"
            width="50"
            height="50"
            viewBox="0 0 1024 1024"
        >
            <path
            d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5zM867.2 644.5V453.1h26.5c19.4 0 35.1 15.7 35.1 35.1v121.1c0 19.4-15.7 35.1-35.1 35.1h-26.5zM95.2 609.4V488.2c0-19.4 15.7-35.1 35.1-35.1h26.5v191.3h-26.5c-19.4 0-35.1-15.7-35.1-35.1zM561.5 149.6c0 23.4-15.6 43.3-36.9 49.7v44.9h-30v-44.9c-21.4-6.5-36.9-26.3-36.9-49.7 0-28.6 23.3-51.9 51.9-51.9s51.9 23.3 51.9 51.9z"
            ></path>
        </svg>
        <div class="message-text">
            <strong>Halo ${userStatus.user.name_user}! 👋</strong><br>
            Senang bertemu lagi! Saya ${chatbotConfig.botName}, asisten musik pribadi Anda.
            ${personalInfo}
            <div class="goovlize-suggestion">
                <small>💡 ${suggestionText}</small>
            </div>
        </div>`;

    const greetingMessage = createMessageElement(greetingMessageContent, "bot-message");
    
    // Cek apakah chatBody ada
    if (!chatBody) {
        return;
    }
    
    // Tambahkan ke chatBody
    chatBody.appendChild(greetingMessage);
    
    // Scroll ke bawah
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: 'smooth' });
    
};




// Emoji picker
const picker = new EmojiMart.Picker({
  theme: "light",
  skinTonePosition: "none",
  previewPosition: "none",
  onEmojiSelect: (emoji) => {
    const { selectionStart: start, selectionEnd: end } = messageInput;
    messageInput.setRangeText(emoji.native, start, end, "end");
    messageInput.focus();
  },
  onClickOutside: (e) => {
    if (e.target.id === "emoji-picker") {
      document.body.classList.toggle("show-emoji-picker");
    } else {
      document.body.classList.remove("show-emoji-picker");
    }
  },
});
document.querySelector(".chat-form").appendChild(picker);

sendMessageButton.addEventListener("click", (e) => handleOutgoingMessage(e));
chatbotToggle.addEventListener("click", () =>
  document.body.classList.toggle("show-chatbot")
);
closeChatbot.addEventListener("click", () =>
  document.body.classList.remove("show-chatbot")
);



const checkUserLogin = async () => {
  try {
    const response = await fetch("/personalization/user-info");
    if (response.status === 401) {
      return { isLoggedIn: false, user: null };
    }

    const data = await response.json();
    if (data.success) {
      return { isLoggedIn: true, user: data.user };
    }
    return { isLoggedIn: false, user: null };
  } catch (error) {
    console.error("Error checking user login:", error);
    return { isLoggedIn: false, user: null };
  }
};

// Fungsi untuk mendapatkan musik favorit user
const getUserFavoriteMusic = async (limit = 10) => {
  try {
    const response = await fetch(
      `/personalization/favorite-music?limit=${limit}`
    );
    if (response.status === 401) {
      return { success: false, music: [], error: "Not logged in" };
    }

    const data = await response.json();
    if (data.success) {
      return {
        success: true,
        music: data.favorite_music,
        count: data.count || data.favorite_music.length,
      };
    }
    return { success: false, music: [], error: "Failed to get favorites" };
  } catch (error) {
    console.error("Error getting user favorite music:", error);
    return { success: false, music: [], error: error.message };
  }
};

const getPersonalizedRecommendations = async (limit = 6, type = "music") => {
  try {
    const response = await fetch(
      `/personalization/personalized-recommendations?limit=${limit}&type=${type}`
    );
    if (response.status === 401) {
      return { success: false, music: [], error: "Not logged in" };
    }

    const data = await response.json();
    if (data.success) {
      return {
        success: true,
        music: data.recommendations,
        based_on: data.based_on,
        count: data.count,
      };
    }
    return {
      success: false,
      music: [],
      error: "Failed to get recommendations",
    };
  } catch (error) {
    console.error("Error getting personalized recommendations:", error);
    return { success: false, music: [], error: error.message };
  }
};

// Fungsi khusus untuk rekomendasi playlist personal
const getPersonalizedPlaylistRecommendations = async (limit = 5) => {
  return await getPersonalizedRecommendations(limit, "playlist");
};

let userStatus = {
  isLoggedIn: false,
  user: null,
};

// Fungsi untuk mendapatkan artist yang di-follow user
const getFollowedArtists = async (limit = 8) => {
    try {
        const response = await fetch(
            `/personalization/followed-artists?limit=${limit}`
        );
        
        console.log(`🔍 getFollowedArtists response status: ${response.status}`);
        
        if (response.status === 401) {
            console.log('❌ User not logged in for followed artists');
            return { success: false, artists: [], error: "Not logged in" };
        }

        if (!response.ok) {
            console.log(`❌ HTTP error: ${response.status}`);
            return { 
                success: false, 
                artists: [], 
                error: `HTTP error: ${response.status}` 
            };
        }

        const data = await response.json();
        console.log('📦 getFollowedArtists raw response:', data);
        
        if (data.success) {
            console.log(`✅ Found ${data.count || data.followed_artists?.length || 0} followed artists`);
            return { 
                success: true, 
                followed_artists: data.followed_artists || [],
                count: data.count || data.followed_artists?.length || 0
            };
        }
        
        console.log('❌ API returned success: false');
        return {
            success: false,
            followed_artists: [],
            error: data.error || "Failed to get followed artists"
        };
    } catch (error) {
        console.error("❌ Error getting followed artists:", error);
        return { success: false, artists: [], error: error.message };
    }
};

// Fungsi untuk mendapatkan musik terbaru dari artist yang di-follow
const getFollowedArtistsMusic = async (limit = 6) => {
  try {
    const response = await fetch(
      `/personalization/followed-artists-music?limit=${limit}`
    );
    if (response.status === 401) {
      return { success: false, music: [], error: "Not logged in" };
    }

    const data = await response.json();
    if (data.success) {
      return { success: true, music: data.music };
    }
    return {
      success: false,
      music: [],
      error: "Failed to get followed artists music",
    };
  } catch (error) {
    console.error("Error getting followed artists music:", error);
    return { success: false, music: [], error: error.message };
  }
};

// Fungsi untuk mengecek apakah user follow artist tertentu
const checkArtistFollow = async (artistId) => {
  try {
    const response = await fetch(
      `/personalization/check-follow-artist/${artistId}`
    );
    if (response.status === 401) {
      return { success: false, is_following: false, error: "Not logged in" };
    }

    const data = await response.json();
    if (data.success) {
      return {
        success: true,
        is_following: data.is_following,
        follow_data: data.follow_data,
      };
    }
    return {
      success: false,
      is_following: false,
      error: "Failed to check follow status",
    };
  } catch (error) {
    console.error("Error checking artist follow:", error);
    return { success: false, is_following: false, error: error.message };
  }
};

// Fungsi untuk mendapatkan playlist yang disimpan user
const getSavedPlaylists = async (limit = 8) => {
  try {
    const response = await fetch(
      `/personalization/saved-playlists?limit=${limit}`
    );
    if (response.status === 401) {
      return { success: false, playlists: [], error: "Not logged in" };
    }

    const data = await response.json();
    if (data.success) {
      return { success: true, playlists: data.playlists };
    }
    return {
      success: false,
      playlists: [],
      error: "Failed to get saved playlists",
    };
  } catch (error) {
    console.error("Error getting saved playlists:", error);
    return { success: false, playlists: [], error: error.message };
  }
};

// Fungsi untuk mendapatkan detail playlist
const getPlaylistDetail = async (playlistId, limit = 10) => {
  try {
    const response = await fetch(
      `/personalization/playlist-detail/${playlistId}?limit=${limit}`
    );
    if (response.status === 401) {
      return { success: false, playlist: null, error: "Not logged in" };
    }
    if (response.status === 403) {
      return {
        success: false,
        playlist: null,
        error: "Playlist not saved by user",
      };
    }

    const data = await response.json();
    if (data.success) {
      return { success: true, playlist: data.playlist };
    }
    return {
      success: false,
      playlist: null,
      error: "Failed to get playlist detail",
    };
  } catch (error) {
    console.error("Error getting playlist detail:", error);
    return { success: false, playlist: null, error: error.message };
  }
};

// Fungsi untuk mendapatkan custom playlist user
const getCustomPlaylists = async (limit = 10) => {
  try {
    const response = await fetch(
      `/personalization/custom-playlists?limit=${limit}`
    );
    if (response.status === 401) {
      return { success: false, playlists: [], error: "Not logged in" };
    }

    const data = await response.json();
    if (data.success) {
      return { success: true, playlists: data.playlists };
    }
    return {
      success: false,
      playlists: [],
      error: "Failed to get custom playlists",
    };
  } catch (error) {
    console.error("Error getting custom playlists:", error);
    return { success: false, playlists: [], error: error.message };
  }
};

// Fungsi untuk mendapatkan detail custom playlist
const getCustomPlaylistDetail = async (playlistId, limit = 15) => {
  try {
    const response = await fetch(
      `/personalization/custom-playlist-detail/${playlistId}?limit=${limit}`
    );
    if (response.status === 401) {
      return { success: false, playlist: null, error: "Not logged in" };
    }
    if (response.status === 404) {
      return { success: false, playlist: null, error: "Playlist not found" };
    }

    const data = await response.json();
    if (data.success) {
      return { success: true, playlist: data.playlist };
    }
    return {
      success: false,
      playlist: null,
      error: "Failed to get playlist detail",
    };
  } catch (error) {
    console.error("Error getting custom playlist detail:", error);
    return { success: false, playlist: null, error: error.message };
  }
};

// Fungsi untuk mencari custom playlist by name
const findCustomPlaylistByName = async (playlistName) => {
  try {
    const response = await fetch(
      `/personalization/find-custom-playlist?name=${encodeURIComponent(
        playlistName
      )}`
    );
    if (response.status === 401) {
      return { success: false, playlist: null, error: "Not logged in" };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error finding custom playlist:", error);
    return { success: false, playlist: null, error: error.message };
  }
};

const getPopularPlaylists = async (limit = 5) => {
  try {
    console.log(`🔍 Fetching ${limit} popular playlists`);
    const response = await fetch(`/chatbot/playlists/popular?limit=${limit}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("📊 Popular playlists response:", data);

    if (data.success) {
      console.log(`✅ Found ${data.playlists.length} popular playlists`);
      return { success: true, playlists: data.playlists };
    }

    console.log("❌ Failed to get popular playlists:", data.error);
    return {
      success: false,
      playlists: [],
      error: data.error || "Failed to get popular playlists",
    };
  } catch (error) {
    console.error("❌ Error getting popular playlists:", error);
    return { success: false, playlists: [], error: error.message };
  }
};

const hasSufficientActivity = async () => {
  try {
    const response = await fetch("/personalization/activity-check");
    if (response.status === 401) {
      return { hasActivity: false, activityCount: 0 };
    }

    const data = await response.json();
    if (data.success) {
      return {
        hasActivity: data.has_sufficient_activity,
        activityCount: data.activity_count,
        recentArtists: data.recent_artists || [],
      };
    }
    return { hasActivity: false, activityCount: 0 };
  } catch (error) {
    console.error("Error checking user activity:", error);
    return { hasActivity: false, activityCount: 0 };
  }
};

// Fungsi untuk mendapatkan aktivitas terbaru user
const getRecentActivity = async (limit = 10) => {
  try {
    const response = await fetch(
      `/personalization/recent-activity?limit=${limit}`
    );
    if (response.status === 401) {
      return { success: false, activities: [], error: "Not logged in" };
    }

    const data = await response.json();
    if (data.success) {
      return {
        success: true,
        activities: data.activities,
        count: data.count,
      };
    }
    return {
      success: false,
      activities: [],
      error: "Failed to get recent activity",
    };
  } catch (error) {
    console.error("Error getting recent activity:", error);
    return { success: false, activities: [], error: error.message };
  }
};

// Fungsi untuk mendapatkan detail berdasarkan item_type dan item_id
const getItemDetails = async (itemType, itemId, musicId = null) => {
  try {
    const response = await fetch(
      `/personalization/activity-item-details?item_type=${itemType}&item_id=${
        itemId || ""
      }&music_id=${musicId || ""}`
    );
    const data = await response.json();

    if (data.success) {
      return data.item_details;
    }
    return null;
  } catch (error) {
    console.error("Error getting item details:", error);
    return null;
  }
};

// Helper function untuk format waktu "time ago"
const getTimeAgo = (date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) {
    return "baru saja";
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} menit yang lalu`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} jam yang lalu`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} hari yang lalu`;
  } else {
    const months = Math.floor(diffInSeconds / 2592000);
    return `${months} bulan yang lalu`;
  }
};


// Fungsi untuk mendapatkan semua musik dari database
const getAllMusicFromDB = async () => {
  try {
    const response = await fetch("/chatbot/music/all?limit=300");
    const data = await response.json();
    if (data.success) {
      return data.music;
    }
    return [];
  } catch (error) {
    console.error("Error getting all music:", error);
    return [];
  }
};

// Fungsi untuk mendapatkan statistik
const getMusicStats = async () => {
  try {
    const response = await fetch("/chatbot/music/stats");
    const data = await response.json();
    if (data.success) {
      return data.stats;
    }
    return null;
  } catch (error) {
    console.error("Error getting music stats:", error);
    return null;
  }
};

// Fungsi untuk mencari lagu oleh artist tertentu
const getMusicByArtist = async (artistName) => {
  try {
    console.log("🔍 Getting music by artist:", artistName);
    const response = await fetch(
      `/chatbot/music/by-artist?artist=${encodeURIComponent(artistName)}`
    );
    const data = await response.json();

    if (data.success) {
      return data.music;
    }
    return [];
  } catch (error) {
    console.error("Error getting music by artist:", error);
    return [];
  }
};

// Fungsi untuk mencari lagu spesifik
const findSpecificSong = async (songTitle) => {
  try {
    console.log("🔍 Finding specific song:", songTitle);
    const response = await fetch(
      `/chatbot/music/find?title=${encodeURIComponent(songTitle)}`
    );
    const data = await response.json();

    if (data.success && data.music.length > 0) {
      return data.music[0];
    }
    return null;
  } catch (error) {
    console.error("Error finding specific song:", error);
    return null;
  }
};

// Fungsi untuk mendapatkan artist dari lagu
const getArtistsForSong = async (songTitle) => {
  try {
    const response = await fetch(
      `/chatbot/music/${encodeURIComponent(songTitle)}/artists`
    );
    const data = await response.json();

    if (data.success) {
      return data.artists;
    }
    return [];
  } catch (error) {
    console.error("Error getting artists for song:", error);
    return [];
  }
};

// Fungsi untuk search artist
const searchArtist = async (query) => {
  try {
    const response = await fetch(
      `/chatbot/artist/search?query=${encodeURIComponent(query)}&limit=8`
    );
    const data = await response.json();

    if (data.success) {
      return data.artists;
    }
    return [];
  } catch (error) {
    console.error("Error searching artist:", error);
    return [];
  }
};

// Fungsi untuk mengecek apakah artist ada
const checkArtistExists = async (artistName) => {
  try {
    const response = await fetch(
      `/chatbot/artist/check?artist=${encodeURIComponent(artistName)}`
    );
    const data = await response.json();

    if (data.success) {
      console.log("🎤 Artist check result:", {
        exists: data.exists,
        artist: data.artist,
        followers: data.artist?.artist_followers,
      });
      return data;
    }
    return { exists: false, artist: null, all_matches: [] };
  } catch (error) {
    console.error("Error checking artist:", error);
    return { exists: false, artist: null, all_matches: [] };
  }
};

// Fungsi untuk search umum
const searchMusic = async (query) => {
  try {
    const response = await fetch(
      `/chatbot/music/search?query=${encodeURIComponent(query)}&limit=8`
    );
    const data = await response.json();

    if (data.success) {
      return data.music;
    }
    return [];
  } catch (error) {
    console.error("Error searching music:", error);
    return [];
  }
};

// Fungsi untuk mendapatkan lagu populer
const getPopularMusic = async (limit = 5) => {
  try {
    const response = await fetch(`/chatbot/music/popular?limit=${limit}`);
    const data = await response.json();

    if (data.success) {
      return data.music;
    }
    return [];
  } catch (error) {
    console.error("Error getting popular music:", error);
    return [];
  }
};

// Format artists dari string ke array
const formatArtists = (artistsString) => {
  if (!artistsString) return [];
  return artistsString
    .split(",")
    .map((artist) => artist.trim())
    .filter((artist) => artist);
};



document.addEventListener("DOMContentLoaded", initializeChatbot);