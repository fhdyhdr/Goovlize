const natural = require('natural');
const Hashids = require('hashids');

class GenreMatcher {
    constructor() {
        this.tfidf = new natural.TfIdf();
        this.genres = [];
        
        // Inisialisasi hashids dengan salt yang sama
        this.hashids = new Hashids('goovlize-secret', 6);
        
        // Mapping genre baru ke kategori (diperbarui)
        this.genreCategoryMapping = {
            'Editor\'s Choice': [
                'Abstract', 'Acoustic', 'Ambient', 'Beat', 'Bass',
                'Chase Scene', 'Cinematic', 'Corporate', 'Dramatic Classical',
                'Electronic', 'Epic Classical', 'Future Bass', 'Instrumental',
                'Lofi', 'Modern Classical', 'Modern Pop', 'Orchestral',
                'Pop', 'Trailer', 'Upbeat', 'Vocal'
            ],
            'Focus & Study': [
                'Abstract', 'Acoustic', 'Ambient', 'Background',
                'Classical Piano', 'Classical String Quartet', 'Electronic',
                'Elevator Music', 'Instrumental', 'Lofi', 'Meditation Music',
                'Modern Classical', 'Orchestral', 'Solo Classical Instrument',
                'Solo Guitar', 'Solo Instrument', 'Solo Piano'
            ],
            'Relax & Chill': [
                'Acoustic', 'Acoustic Group', 'Ambient', 'Bossa Nova',
                'Cafe', 'Chill', 'Classical Piano', 'Folk',
                'Instrumental', 'Jazz', 'Lofi', 'Lullabies',
                'Meditation Music', 'Modern Jazz', 'Smooth Jazz',
                'Solo Guitar', 'Solo Piano', 'Soul', 'Spa'
            ],
            'Cinematic & Storytelling': [
                'Action', 'Adventure', 'Chase Scene', 'Cinematic',
                'Crime Scene', 'Drama Scene', 'Dramatic Classical',
                'Epic Classical', 'Fantasy & Dreamy Childrens',
                'Horror Scene', 'Main Title', 'Mystery',
                'Orchestral', 'Suspense', 'Trailer'
            ],
            'Upbeat & Positive': [
                'Bright', 'Dance', 'Disco', 'Funk',
                'Happy Childrens Tunes', 'Modern Pop', 'Pop',
                'Upbeat', 'Upbeat Pop Music'
            ],
            'Energy & Action': [
                'Action', 'Bass', 'Beat', 'Chase Scene',
                'Drum N Bass', 'Dubstep', 'EDM', 'Electro',
                'Electronic', 'Hard Rock', 'Rock', 'Techno & Trance'
            ],
            'Urban & Beat': [
                'Afrobeat', 'Alternative Hip Hop', 'Bass', 'Beat',
                'Future Bass', 'Hip Hop', 'Mainstream Hip Hop',
                'Old School Hip Hop', 'Rap', 'R&B', 'Trap',
                'Urban Latin'
            ],
            'Ambient & Atmosphere': [
                'Abstract', 'Ambient', 'Atmospheric', 'Background',
                'Elevator Music', 'Electronic', 'Low Drones',
                'Meditation Music', 'Pulses', 'Synthwave'
            ],
            'Creative & Experimental': [
                'Abstract', 'Alternative', 'Cyberpunk Music',
                'Electronic', 'Experimental', 'Future Bass',
                'Indie Pop', 'Post Rock', 'Synthwave',
                'Techno & Trance'
            ],
            'Corporate & Commercial': [
                'Advertising', 'Background', 'Bright',
                'Commercial', 'Corporate', 'Elevator Music',
                'Instrumental', 'Modern Pop', 'Upbeat'
            ],
            'Romantic & Emotional': [
                'Acoustic', 'Acoustic Group', 'Classical Piano',
                'Dramatic Classical', 'Emotional', 'Instrumental',
                'Modern Classical', 'Romantic', 'Solo Piano',
                'Soul', 'Vocal'
            ],
            'Cultural & World': [
                'Afrobeat', 'Bossa Nova', 'China', 'France',
                'Folk', 'India', 'Traditional Jazz',
                'Urban Latin', 'World'
            ],
            'Children & Family': [
                'Fantasy & Dreamy Childrens', 'Happy Childrens Tunes',
                'Lullabies', 'Scary Childrens Tunes'
            ],
            'Holiday & Special Occasions': [
                'Christmas', 'Special Occasions'
            ],
            'Jazz & Blues': [
                'Acid Jazz', 'Bossa Nova', 'Jazz',
                'Modern Jazz', 'Smooth Jazz', 'Traditional Jazz'
            ]
        };

        // Daftar genre baru lengkap untuk referensi
        this.allNewGenres = [
            'Abstract', 'Acid Jazz', 'Acoustic', 'Acoustic Group', 'Action',
            'Advanced', 'Adventure', 'Advertising', 'Afrobeat', 'Alternative',
            'Alternative Hip Hop', 'Ambient', 'Background', 'Bass', 'Bass Music',
            'Beat', 'Beats', 'Beautiful Plays', 'Bossa Nova', 'Bright',
            'Build Up Scenes', 'Cafe', 'Chase Scene', 'China', 'Choir',
            'Christmas', 'Classical Piano', 'Classical String Quartet', 'Comedy',
            'Commercial', 'Corporate', 'Crime Scene', 'Cyberpunk Music', 'Dance',
            'Disco', 'Drama Scene', 'Dramatic Classical', 'Drum N Bass', 'Dubstep',
            'EDM', 'Elevator Music', 'Electro', 'Electronic', 'Epic Classical',
            'Fantasy & Dreamy Childrens', 'Folk', 'France', 'Funk', 'Future Bass',
            'Happy Childrens Tunes', 'Hard Rock', 'Horror Scene', 'House', 'India',
            'Indie Pop', 'Instrumental', 'Intro / Outro', 'Lofi', 'Low Drones',
            'Lullabies', 'Main Title', 'Mainstream Hip Hop', 'Meditation Music',
            'Meditation / Spiritual', 'Modern Classical', 'Modern Jazz', 'Modern Pop',
            'Mystery', 'Nostalgia', 'Old School Hip Hop', 'Orchestral', 'Percussion',
            'Pop', 'Post Rock', 'Pulses', 'Rap', 'R&B', 'Rock', 'Scary Children Tunes',
            'Small Drama', 'Small Emotions', 'Smooth Jazz', 'Soft House',
            'Solo Classical Instrument', 'Solo Guitar', 'Solo Instrument', 'Solo Piano',
            'Special Occasions', 'Supernatural', 'Suspense', 'Synthwave',
            'Techno & Trance', 'Traditional Jazz', 'Trailer', 'Trap', 'Upbeat',
            'Upbeat Pop Music', 'Urban Latin', 'Vocal', 'World'
        ];
    }

    // Normalisasi nama genre
    normalizeGenreName(genreName) {
        if (!genreName) return '';
        return genreName.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // Method khusus untuk Editor's Choice (diperbarui)
    async calculateEditorChoiceScore(playlist, db) {
        if (!playlist.genres || playlist.genres.length === 0) return 0;
        
        // Genre populer berdasarkan genre baru
        const popularGenres = [
            'abstract', 'acoustic', 'ambient', 'beat', 'bass',
            'electronic', 'instrumental', 'lofi', 'modern classical',
            'modern pop', 'orchestral', 'pop', 'trailer', 'upbeat', 'vocal'
        ];
        
        const normalizedPlaylistGenres = playlist.genres.map(g => this.normalizeGenreName(g));
        
        let popularGenreCount = 0;
        normalizedPlaylistGenres.forEach(genre => {
            if (popularGenres.includes(genre)) {
                popularGenreCount++;
            }
        });
        
        const trackScore = Math.min(playlist.total_tracks / 15, 1.0) * 0.4;
        const popularScore = (popularGenreCount / Math.max(normalizedPlaylistGenres.length, 1)) * 0.4;
        const varietyScore = Math.min(normalizedPlaylistGenres.length / 8, 1.0) * 0.2;
        
        let finalScore = trackScore + popularScore + varietyScore;
        
        if (playlist.total_tracks > 10) {
            finalScore *= 1.1;
        }
        
        if (popularGenreCount > 3) {
            finalScore *= 1.1;
        }
        
        if (playlist.artist_names && playlist.artist_names.includes(',')) {
            finalScore *= 1.05;
        }
        
        return {
            score: finalScore,
            popularGenreCount: popularGenreCount,
            totalGenres: normalizedPlaylistGenres.length,
            trackCount: playlist.total_tracks
        };
    }

    // Hitung persentase musik dalam playlist yang memiliki genre target
    calculateMusicMatchPercentage(playlistId, targetGenres, db) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    m.id_music,
                    GROUP_CONCAT(DISTINCT g.genre_name) as music_genres
                FROM music_playlist mp
                JOIN music m ON mp.id_music = m.id_music
                LEFT JOIN music_genre mg ON m.id_music = mg.id_music
                LEFT JOIN genre g ON mg.id_genre = g.id_genre
                WHERE mp.id_playlist = ?
                GROUP BY m.id_music
            `;
            
            db.query(sql, [playlistId], (err, results) => {
                if (err) {
                    console.error('Error calculating music match:', err);
                    return resolve(0);
                }
                
                if (results.length === 0) return resolve(0);
                
                let matchingMusicCount = 0;
                const normalizedTargetGenres = targetGenres.map(g => this.normalizeGenreName(g));
                
                results.forEach(music => {
                    if (!music.music_genres) return;
                    
                    const musicGenres = music.music_genres.split(',')
                        .map(g => this.normalizeGenreName(g.trim()));
                    
                    const hasTargetGenre = musicGenres.some(genre => 
                        normalizedTargetGenres.includes(genre)
                    );
                    
                    if (hasTargetGenre) {
                        matchingMusicCount++;
                    }
                });
                
                const matchPercentage = matchingMusicCount / results.length;
                resolve(matchPercentage);
            });
        });
    }

    // Hitung skor playlist (umum) - tetap sama
    async calculatePlaylistScore(playlist, targetGenres, db) {
        if (!playlist.genres || playlist.genres.length === 0) return {
            score: 0,
            musicMatchPercentage: 0,
            genreMatchPercentage: 0,
            matchingGenreCount: 0
        };
        
        const musicMatchPercentage = await this.calculateMusicMatchPercentage(
            playlist.id_playlist, 
            targetGenres, 
            db
        );
        
        const normalizedPlaylistGenres = playlist.genres.map(g => this.normalizeGenreName(g));
        const normalizedTargetGenres = targetGenres.map(g => this.normalizeGenreName(g));
        
        let matchingGenreCount = 0;
        normalizedPlaylistGenres.forEach(genre => {
            if (normalizedTargetGenres.includes(genre)) {
                matchingGenreCount++;
            }
        });
        
        const genreMatchPercentage = matchingGenreCount / Math.max(normalizedTargetGenres.length, 1);
        
        const trackBonus = Math.min(playlist.total_tracks / 20, 1) * 0.1;
        
        let finalScore = (musicMatchPercentage * 0.6) + (genreMatchPercentage * 0.3) + trackBonus;
        
        if (musicMatchPercentage > 0.7) {
            finalScore *= 1.2;
        }
        
        if (musicMatchPercentage < 0.3) {
            finalScore *= 0.5;
        }
        
        if (playlist.genres.length > 15) {
            finalScore *= 0.8;
        }
        
        return {
            score: finalScore,
            musicMatchPercentage: musicMatchPercentage,
            genreMatchPercentage: genreMatchPercentage,
            matchingGenreCount: matchingGenreCount
        };
    }

    // Rekomendasi playlist dengan kriteria ketat (diperbarui mapping)
    async recommendPlaylists(playlists, categoryName, db, limit = 20) {
        // SPECIAL CASE: Editor's Choice menggunakan logika berbeda
        if (categoryName === 'Editor\'s Choice' || categoryName === 'Editor\u2019s Choice') {
            return await this.recommendEditorChoice(playlists, db, limit);
        }
        
        // SPECIAL CASE: Top Playlist menggunakan logika berbeda
        if (categoryName === 'Top Playlist') {
            return await this.getTopPlaylists(db, limit);
        }
        
        const targetGenres = this.genreCategoryMapping[categoryName] || [];
        if (targetGenres.length === 0) {
            console.log(`Category ${categoryName} not found in mapping`);
            return [];
        }
        
        console.log(`\n=== Recommending for: ${categoryName} ===`);
        console.log(`Target genres: ${targetGenres.join(', ')}`);
        
        const scoredPlaylists = [];
        
        for (const playlist of playlists) {
            if (!playlist.genres || playlist.genres.length === 0) continue;
            
            const scoreResult = await this.calculatePlaylistScore(playlist, targetGenres, db);
            
            if (scoreResult.musicMatchPercentage >= 0.3 && scoreResult.matchingGenreCount >= 1) {
                scoredPlaylists.push({
                    ...playlist,
                    categoryScore: scoreResult.score,
                    musicMatchPercentage: scoreResult.musicMatchPercentage,
                    genreMatchPercentage: scoreResult.genreMatchPercentage,
                    matchingGenreCount: scoreResult.matchingGenreCount
                });
            }
        }
        
        scoredPlaylists.sort((a, b) => {
            if (b.musicMatchPercentage - a.musicMatchPercentage > 0.1) {
                return b.musicMatchPercentage - a.musicMatchPercentage;
            }
            
            if (b.matchingGenreCount !== a.matchingGenreCount) {
                return b.matchingGenreCount - a.matchingGenreCount;
            }
            
            return b.categoryScore - a.categoryScore;
        });
        
        const recommended = scoredPlaylists.slice(0, limit);
        
        console.log(`\nTotal playlists considered: ${playlists.length}`);
        console.log(`Playlists meeting criteria: ${scoredPlaylists.length}`);
        console.log(`Final recommendations: ${recommended.length}`);
        
        if (recommended.length > 0) {
            console.log('\n=== Top Recommendations ===');
            recommended.slice(0, 5).forEach((p, i) => {
                console.log(`${i+1}. ${p.playlist_name}`);
                console.log(`   Music Match: ${(p.musicMatchPercentage * 100).toFixed(1)}%`);
                console.log(`   Genre Match: ${p.matchingGenreCount} genres`);
                console.log(`   Total Score: ${p.categoryScore.toFixed(3)}`);
                console.log(`   Tracks: ${p.total_tracks}`);
                console.log(`   Genres: ${p.genres ? p.genres.join(', ') : 'None'}`);
            });
        }
        
        return recommended;
    }
    
    // Method khusus untuk Editor's Choice (diperbarui)
    async recommendEditorChoice(playlists, db, limit = 20) {
        console.log(`\n=== Recommending Editor's Choice ===`);
        console.log(`Total playlists to evaluate: ${playlists.length}`);
        
        const scoredPlaylists = [];
        
        for (const playlist of playlists) {
            if (!playlist.genres || playlist.genres.length === 0) {
                console.log(`Skipping playlist ${playlist.playlist_name} - No genres`);
                continue;
            }
            
            console.log(`\nEvaluating: ${playlist.playlist_name}`);
            console.log(`  Tracks: ${playlist.total_tracks}`);
            console.log(`  Genres: ${playlist.genres.join(', ')}`);
            
            const scoreResult = await this.calculateEditorChoiceScore(playlist, db);
            
            console.log(`  Editor's Score: ${scoreResult.score.toFixed(3)}`);
            console.log(`  Popular Genres: ${scoreResult.popularGenreCount}`);
            
            if (playlist.total_tracks >= 5 && 
                playlist.genres.length >= 2 && 
                scoreResult.score >= 0.3) {
                
                scoredPlaylists.push({
                    ...playlist,
                    categoryScore: scoreResult.score,
                    musicMatchPercentage: 0.7,
                    genreMatchPercentage: scoreResult.popularGenreCount / scoreResult.totalGenres,
                    matchingGenreCount: scoreResult.popularGenreCount,
                    editorScore: scoreResult.score,
                    popularGenreCount: scoreResult.popularGenreCount
                });
                
                console.log(`  ✅ INCLUDED in Editor's Choice`);
            } else {
                console.log(`  ❌ EXCLUDED from Editor's Choice`);
            }
        }
        
        scoredPlaylists.sort((a, b) => {
            if (b.editorScore - a.editorScore > 0.05) {
                return b.editorScore - a.editorScore;
            }
            
            if (b.total_tracks !== a.total_tracks) {
                return b.total_tracks - a.total_tracks;
            }
            
            return b.popularGenreCount - a.popularGenreCount;
        });
        
        const recommended = scoredPlaylists.slice(0, limit);
        
        console.log(`\n=== Editor's Choice Results ===`);
        console.log(`Total qualified: ${scoredPlaylists.length}`);
        console.log(`Final recommendations: ${recommended.length}`);
        
        if (recommended.length === 0 && playlists.length > 0) {
            console.log(`\n⚠️ No playlists qualified for Editor's Choice!`);
            console.log(`Showing top ${Math.min(5, playlists.length)} playlists as fallback...`);
            
            return playlists
                .sort((a, b) => b.total_tracks - a.total_tracks)
                .slice(0, Math.min(5, limit))
                .map(p => ({
                    ...p,
                    categoryScore: 0.8,
                    musicMatchPercentage: 0.8,
                    genreMatchPercentage: 0.8,
                    matchingGenreCount: p.genres ? p.genres.length : 0,
                    editorScore: 0.8,
                    popularGenreCount: p.genres ? Math.min(p.genres.length, 3) : 0
                }));
        }
        
        return recommended;
    }
    
    // Method khusus untuk Top Playlist (berdasarkan playing count) - tetap sama
    async getTopPlaylists(db, limit = 50) {
        console.log(`\n=== Fetching Top Playlists (by playing count) ===`);
        
        try {
            // Query untuk mengambil playlist berdasarkan playing count (descending)
            const sql = `
                SELECT 
                    p.id_playlist,
                    p.playlist_name,
                    p.playlist_cover,
                    p.playlist_tipe,
                    p.playing as play_count,
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
                    AND p.playing > 0  -- Hanya playlist yang pernah diputar
                GROUP BY p.id_playlist, p.playlist_name, p.playlist_cover, p.playlist_tipe, p.playing
                HAVING COUNT(DISTINCT mp.id_music) >= 3  -- Minimal 3 track
                ORDER BY p.playing DESC, COUNT(DISTINCT mp.id_music) DESC
                LIMIT ?
            `;
            
            return new Promise((resolve, reject) => {
                db.query(sql, [limit], (err, playlists) => {
                    if (err) {
                        console.error('Error fetching top playlists:', err);
                        reject(err);
                        return;
                    }
                    
                    console.log(`Found ${playlists.length} top playlists`);
                    
                    // Proses playlist
                    const processedPlaylists = playlists.map(playlist => {
                        const genres = playlist.genres ? 
                            playlist.genres.split(',').map(g => g.trim()) : [];
                        
                        return {
                            ...playlist,
                            hashid: this.hashids.encode(playlist.id_playlist),
                            genres: genres,
                            total_tracks: playlist.total_tracks || 0,
                            genre_count: playlist.genre_count || 0,
                            play_count: playlist.play_count || 0,
                            categoryScore: 1.0,
                            musicMatchPercentage: 1.0,
                            genreMatchPercentage: 1.0,
                            matchingGenreCount: genres.length,
                            isTopPlaylist: true,
                            rank: playlists.indexOf(playlist) + 1
                        };
                    });
                    
                    // Debug output
                    if (processedPlaylists.length > 0) {
                        console.log('\n=== Top 10 Playlists ===');
                        processedPlaylists.slice(0, 10).forEach((p, i) => {
                            console.log(`${i+1}. ${p.playlist_name}`);
                            console.log(`   Play Count: ${p.play_count}`);
                            console.log(`   Tracks: ${p.total_tracks}`);
                            console.log(`   Genres: ${p.genres ? p.genres.join(', ') : 'None'}`);
                            console.log(`   Rank: ${p.rank}`);
                        });
                    }
                    
                    resolve(processedPlaylists);
                });
            });
            
        } catch (error) {
            console.error('Error in getTopPlaylists:', error);
            return [];
        }
    }

    // Metode bantu untuk mendapatkan semua kategori yang tersedia
    getAvailableCategories() {
        return Object.keys(this.genreCategoryMapping);
    }

    // Metode untuk mendapatkan semua genre baru
    getAllNewGenres() {
        return this.allNewGenres;
    }

    // Metode untuk mendapatkan genre dalam kategori tertentu
    getGenresByCategory(categoryName) {
        return this.genreCategoryMapping[categoryName] || [];
    }

    // Metode untuk mengecek apakah genre termasuk dalam kategori tertentu
    isGenreInCategory(genreName, categoryName) {
        const normalizedGenre = this.normalizeGenreName(genreName);
        const categoryGenres = this.genreCategoryMapping[categoryName] || [];
        
        return categoryGenres.some(g => 
            this.normalizeGenreName(g) === normalizedGenre
        );
    }

    // Metode untuk mendapatkan kategori yang cocok dengan genre tertentu
    getCategoriesForGenre(genreName) {
        const normalizedGenre = this.normalizeGenreName(genreName);
        const matchingCategories = [];
        
        for (const [category, genres] of Object.entries(this.genreCategoryMapping)) {
            const normalizedCategoryGenres = genres.map(g => this.normalizeGenreName(g));
            if (normalizedCategoryGenres.includes(normalizedGenre)) {
                matchingCategories.push(category);
            }
        }
        
        return matchingCategories;
    }
    
    // Method untuk encode ID
    encodeId(id) {
        return this.hashids.encode(id);
    }
    
    // Method untuk decode hashid
    decodeHashid(hashid) {
        return this.hashids.decode(hashid)[0];
    }
}

module.exports = new GenreMatcher();