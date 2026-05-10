-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: db
-- Waktu pembuatan: 08 Feb 2026 pada 16.35
-- Versi server: 8.0.43
-- Versi PHP: 8.2.29

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `goovlize`
--

-- --------------------------------------------------------

--
-- Struktur dari tabel `album`
--

CREATE TABLE `album` (
  `id_album_auto` int NOT NULL,
  `id_al` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `id_artist` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `album_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `album_cover` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `playing` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Trigger `album`
--
DELIMITER $$
CREATE TRIGGER `before_album_insert` BEFORE INSERT ON `album` FOR EACH ROW BEGIN
    DECLARE next_id INT;
    
    -- Jika id_album tidak disediakan, generate otomatis
    IF NEW.id_al IS NULL OR NEW.id_al = '' THEN
        -- Dapatkan ID terakhir
        SELECT COALESCE(MAX(CAST(SUBSTRING(id_al, 3) AS UNSIGNED)), 0) + 1 
        INTO next_id 
        FROM album 
        WHERE id_al LIKE 'AL%';
        
        -- Set id_album dengan format AL + next_id
        SET NEW.id_al = CONCAT('AL', next_id);
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Struktur dari tabel `album_fav`
--

CREATE TABLE `album_fav` (
  `id_fav` int NOT NULL,
  `id_al` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `id_user` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `artist`
--

CREATE TABLE `artist` (
  `id_artist_auto` int NOT NULL,
  `id_artist` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `artist_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `artist_profile` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `artist_bio` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `artist_followers` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `playing` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `artist`
--

INSERT INTO `artist` (`id_artist_auto`, `id_artist`, `artist_name`, `artist_profile`, `artist_bio`, `artist_followers`, `created_at`, `playing`) VALUES
(1, 'AR1', 'DeltaX-Music', '/uploads/undefine_artist.png', NULL, NULL, '2026-01-09 06:06:46', NULL),
(2, 'AR2', 'Audioknap', '/uploads/undefine_artist.png', NULL, NULL, '2026-01-09 06:10:37', NULL),
(3, 'AR3', 'Bransboynd', '/uploads/undefine_artist.png', NULL, NULL, '2026-01-09 06:12:14', NULL),
(4, 'AR4', 'ilyatruhanov', '/uploads/undefine_artist.png', NULL, NULL, '2026-01-09 06:14:13', NULL),
(5, 'AR5', 'AlexGrohl', '/uploads/undefine_artist.png', NULL, NULL, '2026-01-09 06:19:46', NULL),
(6, 'AR6', 'kontraa', '/uploads/undefine_artist.png', NULL, NULL, '2026-01-09 06:22:07', NULL),
(7, 'AR7', 'NverAvetyanMusic', '/uploads/undefine_artist.png', NULL, NULL, '2026-01-09 06:26:13', NULL),
(8, 'AR8', 'ummbrella', '/uploads/undefine_artist.png', NULL, NULL, '2026-01-09 06:28:17', NULL),
(9, 'AR9', 'raspberrymusic', '/uploads/undefine_artist.png', NULL, NULL, '2026-01-09 06:29:43', NULL),
(10, 'AR10', 'Alex_MakeMusic', '/uploads/undefine_artist.png', NULL, NULL, '2026-01-09 06:31:25', NULL),
(11, 'AR11', 'Tunetank', '/uploads/undefine_artist.png', NULL, NULL, '2026-01-09 06:34:08', NULL),
(12, 'AR12', 'Denys_Brodovskyi', '/uploads/undefine_artist.png', NULL, NULL, '2026-01-09 06:35:24', NULL),
(13, 'AR13', 'Evgeny_Bardyuzha', '/uploads/undefine_artist.png', NULL, NULL, '2026-01-09 06:43:57', NULL),
(14, 'AR14', 'Rockot', '/uploads/undefine_artist.png', NULL, NULL, '2026-01-09 06:45:30', NULL),
(15, 'AR15', 'DIMMYSAD', '/uploads/undefine_artist.png', NULL, NULL, '2026-01-09 06:46:22', NULL),
(16, 'AR16', 'penguinmusic', '/uploads/undefine_artist.png', NULL, NULL, '2026-01-09 06:47:21', NULL),
(17, 'AR17', 'VasilYatsevich', '/uploads/undefine_artist.png', NULL, NULL, '2026-01-09 06:48:25', NULL),
(18, 'AR18', 'SergePavkinMusic', '/uploads/undefine_artist.png', NULL, NULL, '2026-01-09 06:49:48', NULL),
(19, 'AR19', 'Loksii', '/uploads/undefine_artist.png', NULL, NULL, '2026-01-09 06:51:12', NULL),
(20, 'AR20', 'moodmode', '/uploads/undefine_artist.png', NULL, NULL, '2026-01-09 06:52:41', NULL),
(21, 'AR21', 'SoulProdMusic', '/uploads/undefine_artist.png', NULL, NULL, '2026-01-09 06:53:56', NULL),
(22, 'AR22', 'Good_B_Music', '/uploads/undefine_artist.png', NULL, NULL, '2026-01-09 06:57:04', NULL),
(23, 'AR23', 'AmbientAUDIOVISION', '/uploads/undefine_artist.png', NULL, NULL, '2026-01-09 07:00:04', NULL),
(24, 'AR24', 'Syouki_Takahashi', '/uploads/undefine_artist.png', NULL, NULL, '2026-01-09 07:02:42', NULL);

--
-- Trigger `artist`
--
DELIMITER $$
CREATE TRIGGER `before_artist_insert` BEFORE INSERT ON `artist` FOR EACH ROW BEGIN
    DECLARE next_id INT;
    
    -- Jika id_artist tidak disediakan, generate otomatis
    IF NEW.id_artist IS NULL OR NEW.id_artist = '' THEN
        -- Dapatkan ID terakhir
        SELECT COALESCE(MAX(CAST(SUBSTRING(id_artist, 3) AS UNSIGNED)), 0) + 1 
        INTO next_id 
        FROM artist 
        WHERE id_artist LIKE 'AR%';
        
        -- Set id_artist dengan format AR + next_id
        SET NEW.id_artist = CONCAT('AR', next_id);
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Struktur dari tabel `artist_follow`
--

CREATE TABLE `artist_follow` (
  `id_af` int NOT NULL,
  `id_artist` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `id_user` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `custom_fav`
--

CREATE TABLE `custom_fav` (
  `id_fav` int NOT NULL,
  `id_playlist` int DEFAULT NULL,
  `id_user` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `custom_playlist`
--

CREATE TABLE `custom_playlist` (
  `id_auto` int NOT NULL,
  `id_cus` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `playlist_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `playlist_cover` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `id_user` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `playing` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Trigger `custom_playlist`
--
DELIMITER $$
CREATE TRIGGER `before_custom_playlist_insert` BEFORE INSERT ON `custom_playlist` FOR EACH ROW BEGIN
  DECLARE next_id INT;
  
  -- Jika id_cus tidak disediakan, generate otomatis
  IF NEW.id_cus IS NULL OR NEW.id_cus = '' THEN
    -- Dapatkan ID terakhir
    SELECT COALESCE(MAX(CAST(SUBSTRING(id_cus, 2) AS UNSIGNED)), 0) + 1 
    INTO next_id 
    FROM custom_playlist 
    WHERE id_cus LIKE 'C%';
    
    -- Set id_cus dengan format C + next_id
    SET NEW.id_cus = CONCAT('C', next_id);
  END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Struktur dari tabel `genre`
--

CREATE TABLE `genre` (
  `id_genre` int NOT NULL,
  `genre_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `genre`
--

INSERT INTO `genre` (`id_genre`, `genre_name`, `created_at`) VALUES
(1, 'Trippy', '2026-01-09 06:07:50'),
(2, 'Upbeat', '2026-01-09 06:07:56'),
(3, 'Love music', '2026-01-09 06:08:08'),
(4, 'Idea', '2026-01-09 06:09:43'),
(5, 'Business', '2026-01-09 06:09:54'),
(6, 'Technology music', '2026-01-09 06:10:00'),
(7, 'Nature', '2026-01-09 06:11:34'),
(8, 'Christmas', '2026-01-09 06:11:40'),
(9, 'Flower music', '2026-01-09 06:11:48'),
(10, 'Romantic', '2026-01-09 06:13:17'),
(11, 'Love', '2026-01-09 06:13:22'),
(12, 'Nature music', '2026-01-09 06:13:28'),
(13, 'Wedding', '2026-01-09 06:16:07'),
(14, 'Relax', '2026-01-09 06:16:12'),
(15, 'Lovers', '2026-01-09 06:16:17'),
(16, 'Spain', '2026-01-09 06:16:22'),
(17, 'Abstract', '2026-01-09 06:19:06'),
(18, 'Advertising', '2026-01-09 06:19:12'),
(19, 'Background', '2026-01-09 06:19:17'),
(20, 'Chill', '2026-01-09 06:19:22'),
(21, 'Commercial', '2026-01-09 06:19:27'),
(22, 'Drill', '2026-01-09 06:20:41'),
(23, 'Trap', '2026-01-09 06:20:45'),
(24, 'Hiphop', '2026-01-09 06:20:52'),
(25, 'Type Beat', '2026-01-09 06:20:58'),
(26, 'Classic Hip Hop', '2026-01-09 06:21:03'),
(27, 'Good', '2026-01-09 06:23:37'),
(28, 'Food', '2026-01-09 06:23:41'),
(29, 'Baking music', '2026-01-09 06:23:47'),
(30, 'Atmospheric', '2026-01-09 06:25:01'),
(31, 'Cars', '2026-01-09 06:25:07'),
(32, 'Chillstep music', '2026-01-09 06:25:12'),
(33, 'Beat music', '2026-01-09 06:27:00'),
(34, 'Atmosphere', '2026-01-09 06:28:39'),
(35, 'Advanced', '2026-01-09 06:30:07'),
(36, 'Advertising music', '2026-01-09 06:30:14'),
(37, 'Beach', '2026-01-09 06:31:02'),
(38, 'Bright', '2026-01-09 06:31:07'),
(39, 'Retro', '2026-01-09 06:31:59'),
(40, 'Vintage', '2026-01-09 06:32:04'),
(41, 'Minimalist music', '2026-01-09 06:32:10'),
(42, 'Beat', '2026-01-09 06:33:26'),
(43, 'Beats', '2026-01-09 06:33:32'),
(44, 'Background beat music', '2026-01-09 06:33:38'),
(45, 'Restless', '2026-01-09 06:34:55'),
(46, 'Energetic', '2026-01-09 06:35:01'),
(47, 'Quirky music', '2026-01-09 06:35:06'),
(48, 'Epic music', '2026-01-09 06:36:45'),
(49, 'Ambient', '2026-01-09 06:43:24'),
(50, 'Chill music', '2026-01-09 06:43:38'),
(51, 'Emotional', '2026-01-09 06:44:39'),
(52, 'Dreamy music', '2026-01-09 06:44:45'),
(53, 'Breakbeat', '2026-01-09 06:45:51'),
(54, 'Discovery', '2026-01-09 06:46:00'),
(55, 'Bass music', '2026-01-09 06:46:06'),
(56, 'Action', '2026-01-09 06:47:53'),
(57, 'Trailer', '2026-01-09 06:48:01'),
(58, 'Cyberpunk music', '2026-01-09 06:48:07'),
(59, 'Cinematic', '2026-01-09 06:49:18'),
(60, 'Contemplative', '2026-01-09 06:49:23'),
(61, 'Melancholic music', '2026-01-09 06:49:28'),
(62, 'Elegant', '2026-01-09 06:50:34'),
(63, 'Fashion show music', '2026-01-09 06:50:48'),
(64, 'Acoustic', '2026-01-09 06:52:11'),
(65, 'Adversiting', '2026-01-09 06:52:17'),
(66, 'Children', '2026-01-09 06:52:23'),
(67, 'Corporate', '2026-01-09 06:52:28'),
(68, 'Car', '2026-01-09 06:53:33'),
(69, 'Promo music', '2026-01-09 06:53:38'),
(70, 'Background music', '2026-01-09 06:55:13'),
(71, 'Spa', '2026-01-09 06:55:54'),
(72, 'Meditation music', '2026-01-09 06:56:00'),
(73, 'Aerial', '2026-01-09 06:58:53'),
(74, 'Atmospheric music', '2026-01-09 06:58:58'),
(75, 'Lofi', '2026-01-09 06:59:34'),
(76, 'Lo-fi', '2026-01-09 06:59:40'),
(77, 'Hip hop', '2026-01-09 07:00:45'),
(78, 'Crispy', '2026-01-09 07:00:58'),
(79, 'Dark', '2026-01-09 07:01:04'),
(80, 'Original', '2026-01-09 07:02:14'),
(81, 'Instrumental', '2026-01-09 07:02:21'),
(82, 'Ambient music', '2026-01-09 07:02:26'),
(83, 'Pop', '2026-01-09 07:12:22'),
(84, 'Modern pop', '2026-01-09 07:12:27'),
(85, 'Upbeat pop music', '2026-01-09 07:12:40'),
(86, 'Bass', '2026-01-09 07:14:25'),
(87, 'Drive', '2026-01-09 07:15:36'),
(88, 'Music music', '2026-01-09 07:15:48');

-- --------------------------------------------------------

--
-- Struktur dari tabel `music`
--

CREATE TABLE `music` (
  `id_music` int NOT NULL,
  `title_music` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `audio_file` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `cover_music` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `lyric` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `line_durations` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `playing` int UNSIGNED NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `music`
--

INSERT INTO `music` (`id_music`, `title_music`, `audio_file`, `cover_music`, `lyric`, `line_durations`, `playing`, `created_at`) VALUES
(1, 'Honey Kisses', '/uploads/audio/1767938920864-771563941.mp3', '/uploads/musiccover/1767938920863-570004892.webp', '', NULL, 0, '2026-01-09 06:08:40'),
(2, 'Music free', '/uploads/audio/1767939061009-530792580.mp3', '/uploads/musiccover/1767939061009-637368794.webp', '', NULL, 0, '2026-01-09 06:11:01'),
(3, 'Fresh', '/uploads/audio/1767939157087-135630857.mp3', '/uploads/musiccover/1767939157086-741613340.webp', '', NULL, 0, '2026-01-09 06:12:37'),
(4, 'For P', '/uploads/audio/1767939341762-817467033.mp3', '/uploads/musiccover/1767939341762-557281383.jpg', '', NULL, 0, '2026-01-09 06:15:41'),
(5, 'Sweet Life (Luxury Chill)', '/uploads/audio/1767939609519-800207707.mp3', '/uploads/musiccover/1767939609519-844781939.webp', '', NULL, 0, '2026-01-09 06:20:09'),
(6, 'Hype | Drill Music', '/uploads/audio/1767939762219-108144305.mp3', '/uploads/musiccover/1767939762218-968796602.jpg', '', NULL, 0, '2026-01-09 06:22:42'),
(7, 'Groovy Vibe', '/uploads/audio/1767939875835-131628773.mp3', '/uploads/musiccover/1767939875835-92696423.jpg', '', NULL, 0, '2026-01-09 06:24:35'),
(8, 'Cascade Breathe (Future Garage)', '/uploads/audio/1767939975741-599600890.mp3', '/uploads/musiccover/1767939975741-419356390.webp', '', NULL, 2, '2026-01-09 06:26:15'),
(9, 'Deep Abstract Ambient_Snowcap', '/uploads/audio/1767940114483-280755647.mp3', '/uploads/musiccover/1767940114483-808687239.webp', '', NULL, 0, '2026-01-09 06:28:34'),
(10, 'The Last Point (Beat, Electronic, Digital)', '/uploads/audio/1767940198769-384724950.mp3', '/uploads/musiccover/1767940198769-912719534.webp', '', NULL, 0, '2026-01-09 06:29:58'),
(11, 'Running Night', '/uploads/audio/1767940302931-841718033.mp3', '/uploads/musiccover/1767940302931-166840271.webp', '', NULL, 0, '2026-01-09 06:31:42'),
(12, 'Retro Lounge', '/uploads/audio/1767940390278-102334947.mp3', '/uploads/musiccover/1767940390277-47326677.webp', '', NULL, 0, '2026-01-09 06:33:10'),
(13, 'Vlog Beat Background', '/uploads/audio/1767940467011-675041579.mp3', '/uploads/musiccover/1767940467011-530575105.jpg', '', NULL, 0, '2026-01-09 06:34:27'),
(14, 'Tell Me What', '/uploads/audio/1767940557366-268396184.mp3', '/uploads/musiccover/1767940557366-531837778.webp', '', NULL, 0, '2026-01-09 06:35:57'),
(15, 'Sandbreaker', '/uploads/audio/1767940660765-616908188.mp3', '/uploads/musiccover/1767940660765-172331199.webp', '', NULL, 0, '2026-01-09 06:37:40'),
(16, 'Embrace', '/uploads/audio/1767941057023-116952976.mp3', '/uploads/undefine.jpg', '', NULL, 0, '2026-01-09 06:44:17'),
(17, 'EONA - Emotional Ambient Pop', '/uploads/audio/1767941132370-7875227.mp3', '/uploads/musiccover/1767941132370-185954772.webp', '', NULL, 0, '2026-01-09 06:45:32'),
(18, 'Jungle Waves (Drum&Bass Electronic Inspiring Promo', '/uploads/audio/1767941208444-238928491.mp3', '/uploads/musiccover/1767941208443-298446343.jpg', '', NULL, 0, '2026-01-09 06:46:48'),
(19, 'Future Design', '/uploads/audio/1767941255330-35493378.mp3', '/uploads/musiccover/1767941255330-237894452.webp', '', NULL, 0, '2026-01-09 06:47:35'),
(20, 'Brain Implant (Cyberpunk Sci-Fi Trailer Action Int', '/uploads/audio/1767941333289-181110619.mp3', '/uploads/musiccover/1767941333289-856744877.jpg', '', NULL, 1, '2026-01-09 06:48:53'),
(21, 'No Place To Go', '/uploads/audio/1767941410965-839183818.mp3', '/uploads/musiccover/1767941410964-927635920.webp', '', NULL, 0, '2026-01-09 06:50:11'),
(22, 'Flow', '/uploads/audio/1767941487077-65841366.mp3', '/uploads/musiccover/1767941487077-682732413.webp', '', NULL, 0, '2026-01-09 06:51:27'),
(23, 'No Copyright Music', '/uploads/audio/1767941585113-15949229.mp3', '/uploads/musiccover/1767941585113-778562364.webp', '', NULL, 0, '2026-01-09 06:53:05'),
(24, 'Movement', '/uploads/audio/1767941649890-622931464.mp3', '/uploads/musiccover/1767941649889-281198325.jpg', '', NULL, 0, '2026-01-09 06:54:09'),
(25, 'Ethereal Vistas', '/uploads/audio/1767941709554-788898126.mp3', '/uploads/musiccover/1767941709554-465901695.webp', '', NULL, 0, '2026-01-09 06:55:09');

-- --------------------------------------------------------

--
-- Struktur dari tabel `music_album`
--

CREATE TABLE `music_album` (
  `id_mal` int NOT NULL,
  `id_al` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `id_music` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `music_artist`
--

CREATE TABLE `music_artist` (
  `id_ma` int NOT NULL,
  `id_artist` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `id_music` int DEFAULT NULL,
  `role` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'main'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `music_artist`
--

INSERT INTO `music_artist` (`id_ma`, `id_artist`, `id_music`, `role`) VALUES
(1, 'AR1', 1, 'main'),
(2, 'AR2', 2, 'main'),
(3, 'AR3', 3, 'main'),
(5, 'AR4', 4, 'main'),
(6, 'AR5', 5, 'main'),
(7, 'AR6', 6, 'main'),
(8, 'AR3', 7, 'main'),
(9, 'AR7', 8, 'main'),
(11, 'AR8', 9, 'main'),
(13, 'AR9', 10, 'main'),
(14, 'AR10', 11, 'main'),
(15, 'AR3', 12, 'main'),
(16, 'AR11', 13, 'main'),
(18, 'AR12', 14, 'main'),
(19, 'AR12', 15, 'main'),
(20, 'AR13', 16, 'main'),
(21, 'AR14', 17, 'main'),
(22, 'AR15', 18, 'main'),
(23, 'AR16', 19, 'main'),
(24, 'AR17', 20, 'main'),
(25, 'AR18', 21, 'main'),
(26, 'AR19', 22, 'main'),
(27, 'AR20', 23, 'main'),
(28, 'AR21', 24, 'main'),
(30, 'AR12', 25, 'main');

-- --------------------------------------------------------

--
-- Struktur dari tabel `music_cus`
--

CREATE TABLE `music_cus` (
  `id_ms` int NOT NULL,
  `id_cus` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `id_music` int DEFAULT NULL,
  `id_playlist` int DEFAULT NULL,
  `id_user` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `music_fav`
--

CREATE TABLE `music_fav` (
  `id_fav` int NOT NULL,
  `id_music` int DEFAULT NULL,
  `id_user` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `music_genre`
--

CREATE TABLE `music_genre` (
  `id_music` int NOT NULL,
  `id_genre` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `music_genre`
--

INSERT INTO `music_genre` (`id_music`, `id_genre`, `created_at`) VALUES
(1, 1, '2026-01-09 06:08:40'),
(1, 2, '2026-01-09 06:08:40'),
(1, 3, '2026-01-09 06:08:40'),
(2, 4, '2026-01-09 06:11:01'),
(2, 5, '2026-01-09 06:11:01'),
(2, 6, '2026-01-09 06:11:01'),
(3, 7, '2026-01-09 06:12:37'),
(3, 8, '2026-01-09 06:12:37'),
(3, 9, '2026-01-09 06:12:37'),
(4, 7, '2026-01-09 06:17:35'),
(4, 10, '2026-01-09 06:17:35'),
(4, 13, '2026-01-09 06:17:35'),
(4, 14, '2026-01-09 06:17:35'),
(4, 15, '2026-01-09 06:17:35'),
(4, 16, '2026-01-09 06:17:35'),
(5, 17, '2026-01-09 06:20:09'),
(5, 18, '2026-01-09 06:20:09'),
(5, 19, '2026-01-09 06:20:09'),
(5, 20, '2026-01-09 06:20:09'),
(5, 21, '2026-01-09 06:20:09'),
(6, 22, '2026-01-09 06:22:42'),
(6, 23, '2026-01-09 06:22:42'),
(6, 24, '2026-01-09 06:22:42'),
(6, 25, '2026-01-09 06:22:42'),
(6, 26, '2026-01-09 06:22:42'),
(7, 27, '2026-01-09 06:24:35'),
(7, 28, '2026-01-09 06:24:35'),
(7, 29, '2026-01-09 06:24:35'),
(8, 30, '2026-01-09 06:26:15'),
(8, 31, '2026-01-09 06:26:15'),
(8, 32, '2026-01-09 06:26:15'),
(9, 17, '2026-01-09 06:28:46'),
(9, 33, '2026-01-09 06:28:46'),
(9, 34, '2026-01-09 06:28:46'),
(10, 17, '2026-01-09 06:30:37'),
(10, 35, '2026-01-09 06:30:37'),
(10, 36, '2026-01-09 06:30:37'),
(11, 21, '2026-01-09 06:31:42'),
(11, 37, '2026-01-09 06:31:42'),
(11, 38, '2026-01-09 06:31:42'),
(12, 39, '2026-01-09 06:33:10'),
(12, 40, '2026-01-09 06:33:10'),
(12, 41, '2026-01-09 06:33:10'),
(13, 42, '2026-01-09 06:34:27'),
(13, 43, '2026-01-09 06:34:27'),
(13, 44, '2026-01-09 06:34:27'),
(14, 45, '2026-01-09 06:36:12'),
(14, 46, '2026-01-09 06:36:12'),
(14, 47, '2026-01-09 06:36:12'),
(15, 45, '2026-01-09 06:37:40'),
(15, 46, '2026-01-09 06:37:40'),
(15, 48, '2026-01-09 06:37:40'),
(16, 30, '2026-01-09 06:44:17'),
(16, 49, '2026-01-09 06:44:17'),
(16, 50, '2026-01-09 06:44:17'),
(17, 49, '2026-01-09 06:45:32'),
(17, 51, '2026-01-09 06:45:32'),
(17, 52, '2026-01-09 06:45:32'),
(18, 53, '2026-01-09 06:46:48'),
(18, 54, '2026-01-09 06:46:48'),
(18, 55, '2026-01-09 06:46:48'),
(19, 17, '2026-01-09 06:47:35'),
(19, 19, '2026-01-09 06:47:35'),
(19, 55, '2026-01-09 06:47:35'),
(20, 56, '2026-01-09 06:48:53'),
(20, 57, '2026-01-09 06:48:53'),
(20, 58, '2026-01-09 06:48:53'),
(21, 59, '2026-01-09 06:50:11'),
(21, 60, '2026-01-09 06:50:11'),
(21, 61, '2026-01-09 06:50:11'),
(22, 51, '2026-01-09 06:51:27'),
(22, 62, '2026-01-09 06:51:27'),
(22, 63, '2026-01-09 06:51:27'),
(23, 19, '2026-01-09 06:53:05'),
(23, 64, '2026-01-09 06:53:05'),
(23, 65, '2026-01-09 06:53:05'),
(23, 66, '2026-01-09 06:53:05'),
(23, 67, '2026-01-09 06:53:05'),
(24, 53, '2026-01-09 06:54:09'),
(24, 68, '2026-01-09 06:54:09'),
(24, 69, '2026-01-09 06:54:09'),
(25, 17, '2026-01-09 06:55:22'),
(25, 34, '2026-01-09 06:55:22'),
(25, 70, '2026-01-09 06:55:22');

-- --------------------------------------------------------

--
-- Struktur dari tabel `music_playlist`
--

CREATE TABLE `music_playlist` (
  `id_mp` int NOT NULL,
  `id_music` int DEFAULT NULL,
  `id_playlist` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `music_playlist`
--

INSERT INTO `music_playlist` (`id_mp`, `id_music`, `id_playlist`, `created_at`) VALUES
(2, 20, 1, '2026-01-09 11:47:22'),
(3, 8, 1, '2026-01-09 11:47:22'),
(20, 20, 15, '2026-02-08 16:25:35'),
(21, 20, 2, '2026-02-08 16:25:35'),
(22, 20, 16, '2026-02-08 16:25:35'),
(23, 20, 9, '2026-02-08 16:25:35'),
(24, 20, 3, '2026-02-08 16:25:35'),
(25, 20, 8, '2026-02-08 16:25:35'),
(26, 20, 13, '2026-02-08 16:25:35'),
(27, 20, 14, '2026-02-08 16:25:35'),
(28, 20, 7, '2026-02-08 16:25:35'),
(29, 20, 4, '2026-02-08 16:25:35'),
(30, 20, 5, '2026-02-08 16:25:35'),
(31, 20, 10, '2026-02-08 16:25:35'),
(32, 20, 11, '2026-02-08 16:25:35'),
(33, 20, 12, '2026-02-08 16:25:35'),
(34, 20, 6, '2026-02-08 16:25:35'),
(35, 8, 15, '2026-02-08 16:25:35'),
(36, 8, 2, '2026-02-08 16:25:35'),
(37, 8, 16, '2026-02-08 16:25:35'),
(38, 8, 9, '2026-02-08 16:25:35'),
(39, 8, 3, '2026-02-08 16:25:35'),
(40, 8, 8, '2026-02-08 16:25:35'),
(41, 8, 13, '2026-02-08 16:25:35'),
(42, 8, 14, '2026-02-08 16:25:35'),
(43, 8, 7, '2026-02-08 16:25:35'),
(44, 8, 4, '2026-02-08 16:25:35'),
(45, 8, 5, '2026-02-08 16:25:35'),
(46, 8, 10, '2026-02-08 16:25:35'),
(47, 8, 11, '2026-02-08 16:25:35'),
(48, 8, 12, '2026-02-08 16:25:35'),
(49, 8, 6, '2026-02-08 16:25:35'),
(65, 16, 15, '2026-02-08 16:25:35'),
(66, 16, 2, '2026-02-08 16:25:35'),
(67, 16, 16, '2026-02-08 16:25:35'),
(68, 16, 9, '2026-02-08 16:25:35'),
(69, 16, 1, '2026-02-08 16:25:35'),
(70, 16, 3, '2026-02-08 16:25:35'),
(71, 16, 8, '2026-02-08 16:25:35'),
(72, 16, 13, '2026-02-08 16:25:35'),
(73, 16, 14, '2026-02-08 16:25:35'),
(74, 16, 7, '2026-02-08 16:25:35'),
(75, 16, 4, '2026-02-08 16:25:35'),
(76, 16, 5, '2026-02-08 16:25:35'),
(77, 16, 10, '2026-02-08 16:25:35'),
(78, 16, 11, '2026-02-08 16:25:35'),
(79, 16, 12, '2026-02-08 16:25:35'),
(80, 16, 6, '2026-02-08 16:25:35'),
(81, 9, 15, '2026-02-08 16:25:35'),
(82, 9, 2, '2026-02-08 16:25:35'),
(83, 9, 16, '2026-02-08 16:25:35'),
(84, 9, 9, '2026-02-08 16:25:35'),
(85, 9, 1, '2026-02-08 16:25:35'),
(86, 9, 3, '2026-02-08 16:25:35'),
(87, 9, 8, '2026-02-08 16:25:35'),
(88, 9, 13, '2026-02-08 16:25:35'),
(89, 9, 14, '2026-02-08 16:25:35'),
(90, 9, 7, '2026-02-08 16:25:35'),
(91, 9, 4, '2026-02-08 16:25:35'),
(92, 9, 5, '2026-02-08 16:25:35'),
(93, 9, 10, '2026-02-08 16:25:35'),
(94, 9, 11, '2026-02-08 16:25:35'),
(95, 9, 12, '2026-02-08 16:25:35'),
(96, 9, 6, '2026-02-08 16:25:35'),
(97, 17, 15, '2026-02-08 16:25:35'),
(98, 17, 2, '2026-02-08 16:25:35'),
(99, 17, 16, '2026-02-08 16:25:35'),
(100, 17, 9, '2026-02-08 16:25:35'),
(101, 17, 1, '2026-02-08 16:25:35'),
(102, 17, 3, '2026-02-08 16:25:35'),
(103, 17, 8, '2026-02-08 16:25:35'),
(104, 17, 13, '2026-02-08 16:25:35'),
(105, 17, 14, '2026-02-08 16:25:35'),
(106, 17, 7, '2026-02-08 16:25:35'),
(107, 17, 4, '2026-02-08 16:25:35'),
(108, 17, 5, '2026-02-08 16:25:35'),
(109, 17, 10, '2026-02-08 16:25:35'),
(110, 17, 11, '2026-02-08 16:25:35'),
(111, 17, 12, '2026-02-08 16:25:35'),
(112, 17, 6, '2026-02-08 16:25:35'),
(113, 25, 15, '2026-02-08 16:25:35'),
(114, 25, 2, '2026-02-08 16:25:35'),
(115, 25, 16, '2026-02-08 16:25:35'),
(116, 25, 9, '2026-02-08 16:25:35'),
(117, 25, 1, '2026-02-08 16:25:35'),
(118, 25, 3, '2026-02-08 16:25:35'),
(119, 25, 8, '2026-02-08 16:25:35'),
(120, 25, 13, '2026-02-08 16:25:35'),
(121, 25, 14, '2026-02-08 16:25:35'),
(122, 25, 7, '2026-02-08 16:25:35'),
(123, 25, 4, '2026-02-08 16:25:35'),
(124, 25, 5, '2026-02-08 16:25:35'),
(125, 25, 10, '2026-02-08 16:25:35'),
(126, 25, 11, '2026-02-08 16:25:35'),
(127, 25, 12, '2026-02-08 16:25:35'),
(128, 25, 6, '2026-02-08 16:25:35'),
(129, 22, 15, '2026-02-08 16:25:35'),
(130, 22, 2, '2026-02-08 16:25:35'),
(131, 22, 16, '2026-02-08 16:25:35'),
(132, 22, 9, '2026-02-08 16:25:35'),
(133, 22, 1, '2026-02-08 16:25:35'),
(134, 22, 3, '2026-02-08 16:25:35'),
(135, 22, 8, '2026-02-08 16:25:35'),
(136, 22, 13, '2026-02-08 16:25:35'),
(137, 22, 14, '2026-02-08 16:25:35'),
(138, 22, 7, '2026-02-08 16:25:35'),
(139, 22, 4, '2026-02-08 16:25:35'),
(140, 22, 5, '2026-02-08 16:25:35'),
(141, 22, 10, '2026-02-08 16:25:35'),
(142, 22, 11, '2026-02-08 16:25:35'),
(143, 22, 12, '2026-02-08 16:25:35'),
(144, 22, 6, '2026-02-08 16:25:35'),
(145, 4, 15, '2026-02-08 16:25:35'),
(146, 4, 2, '2026-02-08 16:25:35'),
(147, 4, 16, '2026-02-08 16:25:35'),
(148, 4, 9, '2026-02-08 16:25:35'),
(149, 4, 1, '2026-02-08 16:25:35'),
(150, 4, 3, '2026-02-08 16:25:35'),
(151, 4, 8, '2026-02-08 16:25:35'),
(152, 4, 13, '2026-02-08 16:25:35'),
(153, 4, 14, '2026-02-08 16:25:35'),
(154, 4, 7, '2026-02-08 16:25:35'),
(155, 4, 4, '2026-02-08 16:25:35'),
(156, 4, 5, '2026-02-08 16:25:35'),
(157, 4, 10, '2026-02-08 16:25:35'),
(158, 4, 11, '2026-02-08 16:25:35'),
(159, 4, 12, '2026-02-08 16:25:35'),
(160, 4, 6, '2026-02-08 16:25:35'),
(161, 3, 15, '2026-02-08 16:25:35'),
(162, 3, 2, '2026-02-08 16:25:35'),
(163, 3, 16, '2026-02-08 16:25:35'),
(164, 3, 9, '2026-02-08 16:25:35'),
(165, 3, 1, '2026-02-08 16:25:35'),
(166, 3, 3, '2026-02-08 16:25:35'),
(167, 3, 8, '2026-02-08 16:25:35'),
(168, 3, 13, '2026-02-08 16:25:35'),
(169, 3, 14, '2026-02-08 16:25:35'),
(170, 3, 7, '2026-02-08 16:25:35'),
(171, 3, 4, '2026-02-08 16:25:35'),
(172, 3, 5, '2026-02-08 16:25:35'),
(173, 3, 10, '2026-02-08 16:25:35'),
(174, 3, 11, '2026-02-08 16:25:35'),
(175, 3, 12, '2026-02-08 16:25:35'),
(176, 3, 6, '2026-02-08 16:25:35'),
(177, 19, 15, '2026-02-08 16:25:35'),
(178, 19, 2, '2026-02-08 16:25:35'),
(179, 19, 16, '2026-02-08 16:25:35'),
(180, 19, 9, '2026-02-08 16:25:35'),
(181, 19, 1, '2026-02-08 16:25:35'),
(182, 19, 3, '2026-02-08 16:25:35'),
(183, 19, 8, '2026-02-08 16:25:35'),
(184, 19, 13, '2026-02-08 16:25:35'),
(185, 19, 14, '2026-02-08 16:25:35'),
(186, 19, 7, '2026-02-08 16:25:35'),
(187, 19, 4, '2026-02-08 16:25:35'),
(188, 19, 5, '2026-02-08 16:25:35'),
(189, 19, 10, '2026-02-08 16:25:35'),
(190, 19, 11, '2026-02-08 16:25:35'),
(191, 19, 12, '2026-02-08 16:25:35'),
(192, 19, 6, '2026-02-08 16:25:35'),
(193, 7, 15, '2026-02-08 16:25:35'),
(194, 7, 2, '2026-02-08 16:25:35'),
(195, 7, 16, '2026-02-08 16:25:35'),
(196, 7, 9, '2026-02-08 16:25:35'),
(197, 7, 1, '2026-02-08 16:25:35'),
(198, 7, 3, '2026-02-08 16:25:35'),
(199, 7, 8, '2026-02-08 16:25:35'),
(200, 7, 13, '2026-02-08 16:25:35'),
(201, 7, 14, '2026-02-08 16:25:35'),
(202, 7, 7, '2026-02-08 16:25:35'),
(203, 7, 4, '2026-02-08 16:25:35'),
(204, 7, 5, '2026-02-08 16:25:35'),
(205, 7, 10, '2026-02-08 16:25:35'),
(206, 7, 11, '2026-02-08 16:25:35'),
(207, 7, 12, '2026-02-08 16:25:35'),
(208, 7, 6, '2026-02-08 16:25:35'),
(209, 1, 15, '2026-02-08 16:25:35'),
(210, 1, 2, '2026-02-08 16:25:35'),
(211, 1, 16, '2026-02-08 16:25:35'),
(212, 1, 9, '2026-02-08 16:25:35'),
(213, 1, 1, '2026-02-08 16:25:35'),
(214, 1, 3, '2026-02-08 16:25:35'),
(215, 1, 8, '2026-02-08 16:25:35'),
(216, 1, 13, '2026-02-08 16:25:35'),
(217, 1, 14, '2026-02-08 16:25:35'),
(218, 1, 7, '2026-02-08 16:25:35'),
(219, 1, 4, '2026-02-08 16:25:35'),
(220, 1, 5, '2026-02-08 16:25:35'),
(221, 1, 10, '2026-02-08 16:25:35'),
(222, 1, 11, '2026-02-08 16:25:35'),
(223, 1, 12, '2026-02-08 16:25:35'),
(224, 1, 6, '2026-02-08 16:25:35'),
(225, 6, 15, '2026-02-08 16:25:35'),
(226, 6, 2, '2026-02-08 16:25:35'),
(227, 6, 16, '2026-02-08 16:25:35'),
(228, 6, 9, '2026-02-08 16:25:35'),
(229, 6, 1, '2026-02-08 16:25:35'),
(230, 6, 3, '2026-02-08 16:25:35'),
(231, 6, 8, '2026-02-08 16:25:35'),
(232, 6, 13, '2026-02-08 16:25:35'),
(233, 6, 14, '2026-02-08 16:25:35'),
(234, 6, 7, '2026-02-08 16:25:35'),
(235, 6, 4, '2026-02-08 16:25:35'),
(236, 6, 5, '2026-02-08 16:25:35'),
(237, 6, 10, '2026-02-08 16:25:35'),
(238, 6, 11, '2026-02-08 16:25:35'),
(239, 6, 12, '2026-02-08 16:25:35'),
(240, 6, 6, '2026-02-08 16:25:35'),
(241, 18, 15, '2026-02-08 16:25:35'),
(242, 18, 2, '2026-02-08 16:25:35'),
(243, 18, 16, '2026-02-08 16:25:35'),
(244, 18, 9, '2026-02-08 16:25:35'),
(245, 18, 1, '2026-02-08 16:25:35'),
(246, 18, 3, '2026-02-08 16:25:35'),
(247, 18, 8, '2026-02-08 16:25:35'),
(248, 18, 13, '2026-02-08 16:25:35'),
(249, 18, 14, '2026-02-08 16:25:35'),
(250, 18, 7, '2026-02-08 16:25:35'),
(251, 18, 4, '2026-02-08 16:25:35'),
(252, 18, 5, '2026-02-08 16:25:35'),
(253, 18, 10, '2026-02-08 16:25:35'),
(254, 18, 11, '2026-02-08 16:25:35'),
(255, 18, 12, '2026-02-08 16:25:35'),
(256, 18, 6, '2026-02-08 16:25:35'),
(289, 24, 15, '2026-02-08 16:25:35'),
(290, 24, 2, '2026-02-08 16:25:35'),
(291, 24, 16, '2026-02-08 16:25:35'),
(292, 24, 9, '2026-02-08 16:25:35'),
(293, 24, 1, '2026-02-08 16:25:35'),
(294, 24, 3, '2026-02-08 16:25:35'),
(295, 24, 8, '2026-02-08 16:25:35'),
(296, 24, 13, '2026-02-08 16:25:35'),
(297, 24, 14, '2026-02-08 16:25:35'),
(298, 24, 7, '2026-02-08 16:25:35'),
(299, 24, 4, '2026-02-08 16:25:35'),
(300, 24, 5, '2026-02-08 16:25:35'),
(301, 24, 10, '2026-02-08 16:25:35'),
(302, 24, 11, '2026-02-08 16:25:35'),
(303, 24, 12, '2026-02-08 16:25:35'),
(304, 24, 6, '2026-02-08 16:25:35'),
(305, 2, 15, '2026-02-08 16:25:35'),
(306, 2, 2, '2026-02-08 16:25:35'),
(307, 2, 16, '2026-02-08 16:25:35'),
(308, 2, 9, '2026-02-08 16:25:35'),
(309, 2, 1, '2026-02-08 16:25:35'),
(310, 2, 3, '2026-02-08 16:25:35'),
(311, 2, 8, '2026-02-08 16:25:35'),
(312, 2, 13, '2026-02-08 16:25:35'),
(313, 2, 14, '2026-02-08 16:25:35'),
(314, 2, 7, '2026-02-08 16:25:35'),
(315, 2, 4, '2026-02-08 16:25:35'),
(316, 2, 5, '2026-02-08 16:25:35'),
(317, 2, 10, '2026-02-08 16:25:35'),
(318, 2, 11, '2026-02-08 16:25:35'),
(319, 2, 12, '2026-02-08 16:25:35'),
(320, 2, 6, '2026-02-08 16:25:35'),
(321, 23, 15, '2026-02-08 16:25:35'),
(322, 23, 2, '2026-02-08 16:25:35'),
(323, 23, 16, '2026-02-08 16:25:35'),
(324, 23, 9, '2026-02-08 16:25:35'),
(325, 23, 1, '2026-02-08 16:25:35'),
(326, 23, 3, '2026-02-08 16:25:35'),
(327, 23, 8, '2026-02-08 16:25:35'),
(328, 23, 13, '2026-02-08 16:25:35'),
(329, 23, 14, '2026-02-08 16:25:35'),
(330, 23, 7, '2026-02-08 16:25:35'),
(331, 23, 4, '2026-02-08 16:25:35'),
(332, 23, 5, '2026-02-08 16:25:35'),
(333, 23, 10, '2026-02-08 16:25:35'),
(334, 23, 11, '2026-02-08 16:25:35'),
(335, 23, 12, '2026-02-08 16:25:35'),
(336, 23, 6, '2026-02-08 16:25:35'),
(337, 21, 15, '2026-02-08 16:25:35'),
(338, 21, 2, '2026-02-08 16:25:35'),
(339, 21, 16, '2026-02-08 16:25:35'),
(340, 21, 9, '2026-02-08 16:25:35'),
(341, 21, 1, '2026-02-08 16:25:35'),
(342, 21, 3, '2026-02-08 16:25:35'),
(343, 21, 8, '2026-02-08 16:25:35'),
(344, 21, 13, '2026-02-08 16:25:35'),
(345, 21, 14, '2026-02-08 16:25:35'),
(346, 21, 7, '2026-02-08 16:25:35'),
(347, 21, 4, '2026-02-08 16:25:35'),
(348, 21, 5, '2026-02-08 16:25:35'),
(349, 21, 10, '2026-02-08 16:25:35'),
(350, 21, 11, '2026-02-08 16:25:35'),
(351, 21, 12, '2026-02-08 16:25:35'),
(352, 21, 6, '2026-02-08 16:25:35'),
(369, 12, 15, '2026-02-08 16:25:35'),
(370, 12, 2, '2026-02-08 16:25:35'),
(371, 12, 16, '2026-02-08 16:25:35'),
(372, 12, 9, '2026-02-08 16:25:35'),
(373, 12, 1, '2026-02-08 16:25:35'),
(374, 12, 3, '2026-02-08 16:25:35'),
(375, 12, 8, '2026-02-08 16:25:35'),
(376, 12, 13, '2026-02-08 16:25:35'),
(377, 12, 14, '2026-02-08 16:25:35'),
(378, 12, 7, '2026-02-08 16:25:35'),
(379, 12, 4, '2026-02-08 16:25:35'),
(380, 12, 5, '2026-02-08 16:25:35'),
(381, 12, 10, '2026-02-08 16:25:35'),
(382, 12, 11, '2026-02-08 16:25:35'),
(383, 12, 12, '2026-02-08 16:25:35'),
(384, 12, 6, '2026-02-08 16:25:35'),
(385, 11, 15, '2026-02-08 16:25:35'),
(386, 11, 2, '2026-02-08 16:25:35'),
(387, 11, 16, '2026-02-08 16:25:35'),
(388, 11, 9, '2026-02-08 16:25:35'),
(389, 11, 1, '2026-02-08 16:25:35'),
(390, 11, 3, '2026-02-08 16:25:35'),
(391, 11, 8, '2026-02-08 16:25:35'),
(392, 11, 13, '2026-02-08 16:25:35'),
(393, 11, 14, '2026-02-08 16:25:35'),
(394, 11, 7, '2026-02-08 16:25:35'),
(395, 11, 4, '2026-02-08 16:25:35'),
(396, 11, 5, '2026-02-08 16:25:35'),
(397, 11, 10, '2026-02-08 16:25:35'),
(398, 11, 11, '2026-02-08 16:25:35'),
(399, 11, 12, '2026-02-08 16:25:35'),
(400, 11, 6, '2026-02-08 16:25:35'),
(417, 15, 15, '2026-02-08 16:25:36'),
(418, 15, 2, '2026-02-08 16:25:36'),
(419, 15, 16, '2026-02-08 16:25:36'),
(420, 15, 9, '2026-02-08 16:25:36'),
(421, 15, 1, '2026-02-08 16:25:36'),
(422, 15, 3, '2026-02-08 16:25:36'),
(423, 15, 8, '2026-02-08 16:25:36'),
(424, 15, 13, '2026-02-08 16:25:36'),
(425, 15, 14, '2026-02-08 16:25:36'),
(426, 15, 7, '2026-02-08 16:25:36'),
(427, 15, 4, '2026-02-08 16:25:36'),
(428, 15, 5, '2026-02-08 16:25:36'),
(429, 15, 10, '2026-02-08 16:25:36'),
(430, 15, 11, '2026-02-08 16:25:36'),
(431, 15, 12, '2026-02-08 16:25:36'),
(432, 15, 6, '2026-02-08 16:25:36'),
(433, 5, 15, '2026-02-08 16:25:36'),
(434, 5, 2, '2026-02-08 16:25:36'),
(435, 5, 16, '2026-02-08 16:25:36'),
(436, 5, 9, '2026-02-08 16:25:36'),
(437, 5, 1, '2026-02-08 16:25:36'),
(438, 5, 3, '2026-02-08 16:25:36'),
(439, 5, 8, '2026-02-08 16:25:36'),
(440, 5, 13, '2026-02-08 16:25:36'),
(441, 5, 14, '2026-02-08 16:25:36'),
(442, 5, 7, '2026-02-08 16:25:36'),
(443, 5, 4, '2026-02-08 16:25:36'),
(444, 5, 5, '2026-02-08 16:25:36'),
(445, 5, 10, '2026-02-08 16:25:36'),
(446, 5, 11, '2026-02-08 16:25:36'),
(447, 5, 12, '2026-02-08 16:25:36'),
(448, 5, 6, '2026-02-08 16:25:36'),
(449, 14, 15, '2026-02-08 16:25:36'),
(450, 14, 2, '2026-02-08 16:25:36'),
(451, 14, 16, '2026-02-08 16:25:36'),
(452, 14, 9, '2026-02-08 16:25:36'),
(453, 14, 1, '2026-02-08 16:25:36'),
(454, 14, 3, '2026-02-08 16:25:36'),
(455, 14, 8, '2026-02-08 16:25:36'),
(456, 14, 13, '2026-02-08 16:25:36'),
(457, 14, 14, '2026-02-08 16:25:36'),
(458, 14, 7, '2026-02-08 16:25:36'),
(459, 14, 4, '2026-02-08 16:25:36'),
(460, 14, 5, '2026-02-08 16:25:36'),
(461, 14, 10, '2026-02-08 16:25:36'),
(462, 14, 11, '2026-02-08 16:25:36'),
(463, 14, 12, '2026-02-08 16:25:36'),
(464, 14, 6, '2026-02-08 16:25:36'),
(465, 10, 15, '2026-02-08 16:25:36'),
(466, 10, 2, '2026-02-08 16:25:36'),
(467, 10, 16, '2026-02-08 16:25:36'),
(468, 10, 9, '2026-02-08 16:25:36'),
(469, 10, 1, '2026-02-08 16:25:36'),
(470, 10, 3, '2026-02-08 16:25:36'),
(471, 10, 8, '2026-02-08 16:25:36'),
(472, 10, 13, '2026-02-08 16:25:36'),
(473, 10, 14, '2026-02-08 16:25:36'),
(474, 10, 7, '2026-02-08 16:25:36'),
(475, 10, 4, '2026-02-08 16:25:36'),
(476, 10, 5, '2026-02-08 16:25:36'),
(477, 10, 10, '2026-02-08 16:25:36'),
(478, 10, 11, '2026-02-08 16:25:36'),
(479, 10, 12, '2026-02-08 16:25:36'),
(480, 10, 6, '2026-02-08 16:25:36'),
(481, 13, 15, '2026-02-08 16:25:36'),
(482, 13, 2, '2026-02-08 16:25:36'),
(483, 13, 16, '2026-02-08 16:25:36'),
(484, 13, 9, '2026-02-08 16:25:36'),
(485, 13, 1, '2026-02-08 16:25:36'),
(486, 13, 3, '2026-02-08 16:25:36'),
(487, 13, 8, '2026-02-08 16:25:36'),
(488, 13, 13, '2026-02-08 16:25:36'),
(489, 13, 14, '2026-02-08 16:25:36'),
(490, 13, 7, '2026-02-08 16:25:36'),
(491, 13, 4, '2026-02-08 16:25:36'),
(492, 13, 5, '2026-02-08 16:25:36'),
(493, 13, 10, '2026-02-08 16:25:36'),
(494, 13, 11, '2026-02-08 16:25:36'),
(495, 13, 12, '2026-02-08 16:25:36'),
(496, 13, 6, '2026-02-08 16:25:36');

-- --------------------------------------------------------

--
-- Struktur dari tabel `playlist`
--

CREATE TABLE `playlist` (
  `id_playlist` int NOT NULL,
  `playlist_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `playlist_tipe` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `playlist_cover` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `id_tag` int DEFAULT NULL,
  `playing` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `playlist`
--

INSERT INTO `playlist` (`id_playlist`, `playlist_name`, `playlist_tipe`, `playlist_cover`, `id_tag`, `playing`, `created_at`) VALUES
(1, 'Calma', NULL, '/uploads/playlistcover/1767959422922-282357430.jpg', 1, 6, '2026-01-09 11:42:58'),
(2, 'Action & Adventure', NULL, '/uploads/playlistcover/1770567673258-554204225.jpg', NULL, NULL, '2026-02-08 16:21:13'),
(3, 'Dark & Mystery', NULL, '/uploads/playlistcover/1770567690780-539192875.jpg', NULL, NULL, '2026-02-08 16:21:30'),
(4, 'House & Groove', NULL, '/uploads/playlistcover/1770567704994-381109047.jpg', NULL, NULL, '2026-02-08 16:21:45'),
(5, 'Nightfall Sessions', NULL, '/uploads/playlistcover/1770567718164-912992121.jpg', NULL, NULL, '2026-02-08 16:21:58'),
(6, 'Urban Frequency', NULL, '/uploads/playlistcover/1770567731319-382717122.jpg', NULL, NULL, '2026-02-08 16:22:11'),
(7, 'Future Vibes', NULL, '/uploads/playlistcover/1770567745337-805895361.jpg', NULL, NULL, '2026-02-08 16:22:25'),
(8, 'Drama & Suspense', NULL, '/uploads/playlistcover/1770567763248-744048842.png', NULL, NULL, '2026-02-08 16:22:43'),
(9, 'Calm Focus', NULL, '/uploads/playlistcover/1770567777026-410411846.jpg', NULL, NULL, '2026-02-08 16:22:57'),
(10, 'Silent Echoes', NULL, '/uploads/playlistcover/1770567789239-947527903.jpg', NULL, NULL, '2026-02-08 16:23:09'),
(11, 'Upbeat Energy', NULL, '/uploads/playlistcover/1770567800824-296542265.jpg', NULL, NULL, '2026-02-08 16:23:20'),
(12, 'Vocal Stories', NULL, '/uploads/playlistcover/1770567813635-405744656.jpg', NULL, NULL, '2026-02-08 16:23:33'),
(13, 'Echoes of Emotion', NULL, '/uploads/playlistcover/1770567825937-593417017.jpg', NULL, NULL, '2026-02-08 16:23:45'),
(14, 'Epic Moments', NULL, '/uploads/playlistcover/1770567836666-247701384.jpg', NULL, NULL, '2026-02-08 16:23:56'),
(15, 'Acoustic Serenity', NULL, '/uploads/playlistcover/1770567847844-665098430.jpg', NULL, NULL, '2026-02-08 16:24:07'),
(16, 'Background Stories', NULL, '/uploads/playlistcover/1770567858878-224814019.jpg', NULL, NULL, '2026-02-08 16:24:18');

-- --------------------------------------------------------

--
-- Struktur dari tabel `playlist_fav`
--

CREATE TABLE `playlist_fav` (
  `id_fav` int NOT NULL,
  `id_playlist` int DEFAULT NULL,
  `id_user` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `playlist_fav`
--

INSERT INTO `playlist_fav` (`id_fav`, `id_playlist`, `id_user`, `created_at`) VALUES
(3, 1, 1, '2026-01-09 11:47:06');

-- --------------------------------------------------------

--
-- Struktur dari tabel `recent_activity`
--

CREATE TABLE `recent_activity` (
  `id` int NOT NULL,
  `id_user` int NOT NULL,
  `item_type` enum('playlist','custom_playlist','album','artist','search') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `item_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `id_music` int DEFAULT NULL,
  `played_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `recent_activity`
--

INSERT INTO `recent_activity` (`id`, `id_user`, `item_type`, `item_id`, `id_music`, `played_at`) VALUES
(2, 1, 'playlist', '1', 8, '2026-01-09 11:47:26'),
(5, 1, 'playlist', '1', 20, '2026-01-09 11:47:31'),
(6, 1, 'playlist', '1', 8, '2026-01-09 11:47:32');

-- --------------------------------------------------------

--
-- Struktur dari tabel `tag_playlist`
--

CREATE TABLE `tag_playlist` (
  `id_tag` int NOT NULL,
  `tag_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `tag_playlist`
--

INSERT INTO `tag_playlist` (`id_tag`, `tag_name`, `created_at`) VALUES
(1, 'first', '2026-01-09 11:44:00'),
(2, 'second', '2026-02-08 16:24:43');

-- --------------------------------------------------------

--
-- Struktur dari tabel `users`
--

CREATE TABLE `users` (
  `id_user` int NOT NULL,
  `name_user` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `email_user` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `bio` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `password_user` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `profile_user` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `user_followers` bigint DEFAULT NULL,
  `google_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `users`
--

INSERT INTO `users` (`id_user`, `name_user`, `email_user`, `bio`, `password_user`, `profile_user`, `user_followers`, `google_id`, `created_at`) VALUES
(1, 'Johan Tri Asmara', 'triasmara.johan@gmail.com', NULL, NULL, 'https://lh3.googleusercontent.com/a/ACg8ocKJlY9dBUFQxZIacunQVTpETs8zJfR0vRxcIW4kYjosHmGkRxtq=s96-c', 0, '117457651497608456304', '2026-01-09 10:37:40');

-- --------------------------------------------------------

--
-- Struktur dari tabel `user_admin`
--

CREATE TABLE `user_admin` (
  `ua` int NOT NULL,
  `admin_name` varchar(100) NOT NULL,
  `email_admin` varchar(100) NOT NULL,
  `password_admin` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data untuk tabel `user_admin`
--

INSERT INTO `user_admin` (`ua`, `admin_name`, `email_admin`, `password_admin`, `created_at`) VALUES
(1, 'Super Admin', 'admin@goovlize.com', '$2b$10$IQ.LU6rB8ZllWM5xnhEGR.I7avUu2mPfXZIL8hUDPsV9Y5pEopBqS', '2025-12-14 08:07:12');

-- --------------------------------------------------------

--
-- Struktur dari tabel `user_follow`
--

CREATE TABLE `user_follow` (
  `id_uf` int NOT NULL,
  `id_user` int DEFAULT NULL,
  `id_user_follow` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Indexes for dumped tables
--

--
-- Indeks untuk tabel `album`
--
ALTER TABLE `album`
  ADD PRIMARY KEY (`id_album_auto`),
  ADD UNIQUE KEY `id_al` (`id_al`),
  ADD KEY `id_artist` (`id_artist`);

--
-- Indeks untuk tabel `album_fav`
--
ALTER TABLE `album_fav`
  ADD PRIMARY KEY (`id_fav`),
  ADD KEY `id_al` (`id_al`),
  ADD KEY `id_user` (`id_user`);

--
-- Indeks untuk tabel `artist`
--
ALTER TABLE `artist`
  ADD PRIMARY KEY (`id_artist_auto`),
  ADD UNIQUE KEY `id_artist` (`id_artist`);

--
-- Indeks untuk tabel `artist_follow`
--
ALTER TABLE `artist_follow`
  ADD PRIMARY KEY (`id_af`),
  ADD KEY `id_artist` (`id_artist`),
  ADD KEY `id_user` (`id_user`);

--
-- Indeks untuk tabel `custom_fav`
--
ALTER TABLE `custom_fav`
  ADD PRIMARY KEY (`id_fav`),
  ADD KEY `id_playlist` (`id_playlist`),
  ADD KEY `id_user` (`id_user`);

--
-- Indeks untuk tabel `custom_playlist`
--
ALTER TABLE `custom_playlist`
  ADD PRIMARY KEY (`id_auto`),
  ADD UNIQUE KEY `id_cus` (`id_cus`),
  ADD KEY `id_user` (`id_user`);

--
-- Indeks untuk tabel `genre`
--
ALTER TABLE `genre`
  ADD PRIMARY KEY (`id_genre`),
  ADD UNIQUE KEY `genre_name` (`genre_name`);

--
-- Indeks untuk tabel `music`
--
ALTER TABLE `music`
  ADD PRIMARY KEY (`id_music`);

--
-- Indeks untuk tabel `music_album`
--
ALTER TABLE `music_album`
  ADD PRIMARY KEY (`id_mal`),
  ADD KEY `id_al` (`id_al`),
  ADD KEY `id_music` (`id_music`);

--
-- Indeks untuk tabel `music_artist`
--
ALTER TABLE `music_artist`
  ADD PRIMARY KEY (`id_ma`),
  ADD KEY `id_artist` (`id_artist`),
  ADD KEY `id_music` (`id_music`);

--
-- Indeks untuk tabel `music_cus`
--
ALTER TABLE `music_cus`
  ADD PRIMARY KEY (`id_ms`),
  ADD KEY `id_cus` (`id_cus`),
  ADD KEY `id_music` (`id_music`),
  ADD KEY `id_playlist` (`id_playlist`),
  ADD KEY `id_user` (`id_user`);

--
-- Indeks untuk tabel `music_fav`
--
ALTER TABLE `music_fav`
  ADD PRIMARY KEY (`id_fav`),
  ADD KEY `id_music` (`id_music`),
  ADD KEY `id_user` (`id_user`);

--
-- Indeks untuk tabel `music_genre`
--
ALTER TABLE `music_genre`
  ADD PRIMARY KEY (`id_music`,`id_genre`),
  ADD KEY `id_genre` (`id_genre`);

--
-- Indeks untuk tabel `music_playlist`
--
ALTER TABLE `music_playlist`
  ADD PRIMARY KEY (`id_mp`),
  ADD KEY `id_playlist` (`id_playlist`),
  ADD KEY `id_music` (`id_music`);

--
-- Indeks untuk tabel `playlist`
--
ALTER TABLE `playlist`
  ADD PRIMARY KEY (`id_playlist`),
  ADD KEY `id_tag` (`id_tag`);

--
-- Indeks untuk tabel `playlist_fav`
--
ALTER TABLE `playlist_fav`
  ADD PRIMARY KEY (`id_fav`),
  ADD KEY `id_playlist` (`id_playlist`),
  ADD KEY `id_user` (`id_user`);

--
-- Indeks untuk tabel `recent_activity`
--
ALTER TABLE `recent_activity`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_user` (`id_user`),
  ADD KEY `id_music` (`id_music`);

--
-- Indeks untuk tabel `tag_playlist`
--
ALTER TABLE `tag_playlist`
  ADD PRIMARY KEY (`id_tag`);

--
-- Indeks untuk tabel `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id_user`),
  ADD UNIQUE KEY `google_id` (`google_id`);

--
-- Indeks untuk tabel `user_admin`
--
ALTER TABLE `user_admin`
  ADD PRIMARY KEY (`ua`),
  ADD UNIQUE KEY `email_admin` (`email_admin`);

--
-- Indeks untuk tabel `user_follow`
--
ALTER TABLE `user_follow`
  ADD PRIMARY KEY (`id_uf`),
  ADD KEY `id_user` (`id_user`),
  ADD KEY `id_user_follow` (`id_user_follow`);

--
-- AUTO_INCREMENT untuk tabel yang dibuang
--

--
-- AUTO_INCREMENT untuk tabel `album`
--
ALTER TABLE `album`
  MODIFY `id_album_auto` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `album_fav`
--
ALTER TABLE `album_fav`
  MODIFY `id_fav` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `artist`
--
ALTER TABLE `artist`
  MODIFY `id_artist_auto` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT untuk tabel `artist_follow`
--
ALTER TABLE `artist_follow`
  MODIFY `id_af` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `custom_fav`
--
ALTER TABLE `custom_fav`
  MODIFY `id_fav` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `custom_playlist`
--
ALTER TABLE `custom_playlist`
  MODIFY `id_auto` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `genre`
--
ALTER TABLE `genre`
  MODIFY `id_genre` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=89;

--
-- AUTO_INCREMENT untuk tabel `music`
--
ALTER TABLE `music`
  MODIFY `id_music` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT untuk tabel `music_album`
--
ALTER TABLE `music_album`
  MODIFY `id_mal` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `music_artist`
--
ALTER TABLE `music_artist`
  MODIFY `id_ma` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=40;

--
-- AUTO_INCREMENT untuk tabel `music_cus`
--
ALTER TABLE `music_cus`
  MODIFY `id_ms` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `music_fav`
--
ALTER TABLE `music_fav`
  MODIFY `id_fav` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `music_playlist`
--
ALTER TABLE `music_playlist`
  MODIFY `id_mp` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=497;

--
-- AUTO_INCREMENT untuk tabel `playlist`
--
ALTER TABLE `playlist`
  MODIFY `id_playlist` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT untuk tabel `playlist_fav`
--
ALTER TABLE `playlist_fav`
  MODIFY `id_fav` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT untuk tabel `recent_activity`
--
ALTER TABLE `recent_activity`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT untuk tabel `tag_playlist`
--
ALTER TABLE `tag_playlist`
  MODIFY `id_tag` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT untuk tabel `users`
--
ALTER TABLE `users`
  MODIFY `id_user` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT untuk tabel `user_admin`
--
ALTER TABLE `user_admin`
  MODIFY `ua` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT untuk tabel `user_follow`
--
ALTER TABLE `user_follow`
  MODIFY `id_uf` int NOT NULL AUTO_INCREMENT;

--
-- Ketidakleluasaan untuk tabel pelimpahan (Dumped Tables)
--

--
-- Ketidakleluasaan untuk tabel `album`
--
ALTER TABLE `album`
  ADD CONSTRAINT `album_ibfk_1` FOREIGN KEY (`id_artist`) REFERENCES `artist` (`id_artist`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `album_fav`
--
ALTER TABLE `album_fav`
  ADD CONSTRAINT `album_fav_ibfk_1` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE CASCADE,
  ADD CONSTRAINT `album_fav_ibfk_2` FOREIGN KEY (`id_al`) REFERENCES `album` (`id_al`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `artist_follow`
--
ALTER TABLE `artist_follow`
  ADD CONSTRAINT `artist_follow_ibfk_1` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE CASCADE,
  ADD CONSTRAINT `artist_follow_ibfk_2` FOREIGN KEY (`id_artist`) REFERENCES `artist` (`id_artist`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `custom_fav`
--
ALTER TABLE `custom_fav`
  ADD CONSTRAINT `custom_fav_ibfk_1` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE CASCADE,
  ADD CONSTRAINT `custom_fav_ibfk_2` FOREIGN KEY (`id_playlist`) REFERENCES `playlist` (`id_playlist`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `custom_playlist`
--
ALTER TABLE `custom_playlist`
  ADD CONSTRAINT `custom_playlist_ibfk_1` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `music_album`
--
ALTER TABLE `music_album`
  ADD CONSTRAINT `music_album_ibfk_1` FOREIGN KEY (`id_music`) REFERENCES `music` (`id_music`) ON DELETE CASCADE,
  ADD CONSTRAINT `music_album_ibfk_2` FOREIGN KEY (`id_al`) REFERENCES `album` (`id_al`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `music_artist`
--
ALTER TABLE `music_artist`
  ADD CONSTRAINT `music_artist_ibfk_1` FOREIGN KEY (`id_music`) REFERENCES `music` (`id_music`) ON DELETE CASCADE,
  ADD CONSTRAINT `music_artist_ibfk_2` FOREIGN KEY (`id_artist`) REFERENCES `artist` (`id_artist`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `music_cus`
--
ALTER TABLE `music_cus`
  ADD CONSTRAINT `music_cus_ibfk_1` FOREIGN KEY (`id_music`) REFERENCES `music` (`id_music`) ON DELETE CASCADE,
  ADD CONSTRAINT `music_cus_ibfk_2` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE CASCADE,
  ADD CONSTRAINT `music_cus_ibfk_3` FOREIGN KEY (`id_playlist`) REFERENCES `playlist` (`id_playlist`) ON DELETE CASCADE,
  ADD CONSTRAINT `music_cus_ibfk_4` FOREIGN KEY (`id_cus`) REFERENCES `custom_playlist` (`id_cus`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `music_fav`
--
ALTER TABLE `music_fav`
  ADD CONSTRAINT `music_fav_ibfk_1` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE CASCADE,
  ADD CONSTRAINT `music_fav_ibfk_2` FOREIGN KEY (`id_music`) REFERENCES `music` (`id_music`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `music_genre`
--
ALTER TABLE `music_genre`
  ADD CONSTRAINT `music_genre_ibfk_1` FOREIGN KEY (`id_music`) REFERENCES `music` (`id_music`) ON DELETE CASCADE,
  ADD CONSTRAINT `music_genre_ibfk_2` FOREIGN KEY (`id_genre`) REFERENCES `genre` (`id_genre`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `music_playlist`
--
ALTER TABLE `music_playlist`
  ADD CONSTRAINT `music_playlist_ibfk_1` FOREIGN KEY (`id_music`) REFERENCES `music` (`id_music`) ON DELETE CASCADE,
  ADD CONSTRAINT `music_playlist_ibfk_2` FOREIGN KEY (`id_playlist`) REFERENCES `playlist` (`id_playlist`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `playlist`
--
ALTER TABLE `playlist`
  ADD CONSTRAINT `playlist_ibfk_1` FOREIGN KEY (`id_tag`) REFERENCES `tag_playlist` (`id_tag`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `playlist_fav`
--
ALTER TABLE `playlist_fav`
  ADD CONSTRAINT `playlist_fav_ibfk_1` FOREIGN KEY (`id_playlist`) REFERENCES `playlist` (`id_playlist`) ON DELETE CASCADE,
  ADD CONSTRAINT `playlist_fav_ibfk_2` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `recent_activity`
--
ALTER TABLE `recent_activity`
  ADD CONSTRAINT `recent_activity_fk_music` FOREIGN KEY (`id_music`) REFERENCES `music` (`id_music`) ON DELETE CASCADE,
  ADD CONSTRAINT `recent_activity_fk_user` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE RESTRICT;

--
-- Ketidakleluasaan untuk tabel `user_follow`
--
ALTER TABLE `user_follow`
  ADD CONSTRAINT `user_follow_ibfk_1` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_follow_ibfk_2` FOREIGN KEY (`id_user_follow`) REFERENCES `users` (`id_user`) ON DELETE RESTRICT;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
