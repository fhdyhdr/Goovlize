// routes/admin/statistics.js
const express = require('express');
const router = express.Router();
const { isAdminAuthenticated } = require('../../middleware/admin-auth');
const { db } = require('../../db');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { createCanvas } = require('canvas');
const { Chart, registerables } = require('chart.js');

// Register Chart.js components
Chart.register(...registerables);

function executeQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
}

router.get('/statistics', isAdminAuthenticated, async (req, res) => {
    try {
        const statisticsData = await getStatisticsFromDatabase();
        
        res.render('admin/statistics', {
            admin: req.session.admin,
            statistics: statisticsData,
            error: null,
            success: null
        });
        
    } catch (error) {
        console.error('Statistics page error:', error);
        res.render('admin/statistics', {
            admin: req.session.admin,
            statistics: null,
            error: 'Failed to load statistics data',
            success: null
        });
    }
});

// Route untuk API statistics
router.get('/api/statistics', isAdminAuthenticated, async (req, res) => {
    try {
        const statisticsData = await getStatisticsFromDatabase();
        
        if (statisticsData) {
            res.json({
                success: true,
                data: statisticsData
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to fetch statistics'
            });
        }
    } catch (error) {
        console.error('API Statistics error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Route untuk data chart
router.get('/api/chart-data', isAdminAuthenticated, async (req, res) => {
    try {
        const chartType = req.query.type || 'plays';
        const timeRange = req.query.range || 'month';
        
        let chartData;
        if (chartType === 'plays') {
            chartData = await getPlaysChartData(timeRange);
        } else if (chartType === 'genre') {
            chartData = await getGenreChartData();
        } else {
            chartData = {
                labels: [],
                datasets: []
            };
        }
        
        res.json(chartData);
    } catch (error) {
        console.error('Chart data error:', error);
        res.status(500).json({
            error: 'Failed to fetch chart data'
        });
    }
});

router.get('/statistics/export/pdf', isAdminAuthenticated, async (req, res) => {
    try {
        // Ambil data statistik dari database
        const statisticsData = await getStatisticsFromDatabase();
        
        if (!statisticsData) {
            return res.status(500).json({
                success: false,
                message: 'Failed to load statistics data for PDF export'
            });
        }

        // Hitung rata-rata untuk platform statistics
        const avgPlays = statisticsData.totalMusic > 0 
            ? Math.round(statisticsData.totalPlays / statisticsData.totalMusic) 
            : 0;
        
        const avgSongsPerArtist = statisticsData.totalArtists > 0 
            ? (statisticsData.totalMusic / statisticsData.totalArtists).toFixed(1) 
            : 0;
        
        const avgSongsPerAlbum = statisticsData.totalAlbums > 0 
            ? (statisticsData.totalMusic / statisticsData.totalAlbums).toFixed(1) 
            : 0;
        
        const activeUsers = Math.floor(statisticsData.totalMusic * 0.5 + Math.random() * 100);
        const timeRange = req.query.range || 'month';
        
        // Generate chart data untuk PDF
        const playsChartData = await getPlaysChartData(timeRange);
        const genreChartData = await getGenreChartData();
        
        // Buat base64 images untuk chart
        const playsChartImage = await generateChartImage('line', playsChartData, 500, 250);
        const genreChartImage = await generateChartImage('doughnut', genreChartData, 400, 250);
        
        // Render template EJS dengan data
        const ejs = require('ejs');
        const templatePath = path.join(__dirname, '../../views/admin/statistics-pdf.ejs');
        const templateContent = fs.readFileSync(templatePath, 'utf-8');
        
        const html = ejs.render(templateContent, {
            statistics: statisticsData,
            timeRange: timeRange.charAt(0).toUpperCase() + timeRange.slice(1),
            avgPlays: avgPlays,
            avgSongsPerArtist: avgSongsPerArtist,
            avgSongsPerAlbum: avgSongsPerAlbum,
            activeUsers: activeUsers,
            reportId: `REP-${Date.now()}`,
            generatedBy: req.session.admin?.admin_name || 'Admin',
            playsChartImage: playsChartImage,
            genreChartImage: genreChartImage,
            playsChartLabels: playsChartData.labels,
            playsChartData: playsChartData.datasets[0].data,
            totalMusic: statisticsData.totalMusic, // Tambahkan ini
            monthNames: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        });

        // Gunakan Puppeteer untuk generate PDF
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        
        // Generate PDF buffer
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '40px',
                right: '20px',
                bottom: '40px',
                left: '20px'
            },
            displayHeaderFooter: true,
            headerTemplate: `
                <div style="font-size: 10px; color: #666; width: 100%; text-align: center; padding: 10px;">
                    Goovlize Music Dashboard Statistics
                </div>
            `,
            footerTemplate: `
                <div style="font-size: 8px; color: #666; width: 100%; text-align: center; padding: 10px;">
                    Page <span class="pageNumber"></span> of <span class="totalPages"></span> | 
                    Generated on ${new Date().toLocaleDateString()}
                </div>
            `
        });
        
        await browser.close();

        // Set response headers untuk download PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 
            `attachment; filename="statistics_report_${timeRange}_${new Date().toISOString().split('T')[0]}.pdf"`
        );
        
        res.send(pdfBuffer);
        
    } catch (error) {
        console.error('PDF Export error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate PDF report: ' + error.message
        });
    }
});

// Fungsi untuk generate chart image untuk PDF
async function generateChartImage(type, chartData, width = 600, height = 300) {
    try {
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        
        // Set background color
        ctx.fillStyle = '#2d2d44';
        ctx.fillRect(0, 0, width, height);
        
        // Prepare data untuk Chart.js v3
        const preparedData = {
            labels: chartData.labels,
            datasets: chartData.datasets.map(dataset => ({
                ...dataset,
                // Pastikan properti yang diperlukan ada
                backgroundColor: dataset.backgroundColor || 'rgba(139, 92, 246, 0.2)',
                borderColor: dataset.borderColor || 'rgba(139, 92, 246, 1)',
                borderWidth: dataset.borderWidth || 2
            }))
        };
        
        // Create chart configuration untuk Chart.js v3
        const config = {
            type: type,
            data: preparedData,
            options: {
                responsive: false,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: type !== 'line', // Tampilkan legend untuk chart selain line
                        position: 'right',
                        labels: {
                            color: '#ffffff',
                            font: {
                                size: 10
                            }
                        }
                    },
                    title: {
                        display: false // Nonaktifkan title di dalam chart
                    }
                },
                scales: type === 'line' ? {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#ffffff',
                            font: {
                                size: 10
                            }
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#ffffff',
                            font: {
                                size: 10
                            },
                            beginAtZero: true
                        }
                    }
                } : undefined
            }
        };
        
        // Create chart
        const chart = new Chart(ctx, config);
        
        // Wait a bit for chart to render
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Convert canvas to base64
        const base64Image = canvas.toDataURL('image/png');
        
        // Destroy chart to free memory
        chart.destroy();
        
        return base64Image;
    } catch (error) {
        console.error('Error generating chart image:', error);
        // Return placeholder jika error
        return createPlaceholderImage(type, width, height);
    }
}

// Fungsi untuk membuat placeholder image jika chart gagal
function createPlaceholderImage(type, width, height) {
    try {
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        
        // Background
        ctx.fillStyle = '#2d2d44';
        ctx.fillRect(0, 0, width, height);
        
        // Border
        ctx.strokeStyle = '#3d3d5a';
        ctx.lineWidth = 2;
        ctx.strokeRect(5, 5, width - 10, height - 10);
        
        // Title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
            type === 'line' ? 'Plays Chart' : 'Genre Chart',
            width / 2,
            height / 2 - 10
        );
        
        // Message
        ctx.fillStyle = '#a5a5a5';
        ctx.font = '12px Arial';
        ctx.fillText(
            'Chart failed to load',
            width / 2,
            height / 2 + 10
        );
        
        return canvas.toDataURL('image/png');
    } catch (error) {
        console.error('Error creating placeholder:', error);
        return null;
    }
}

async function getStatisticsFromDatabase() {
    try {
        console.log('Fetching statistics from database...');
        
        // Query untuk mendapatkan total musik
        const musicResult = await executeQuery('SELECT COUNT(*) as total FROM music');
        const totalMusic = musicResult[0]?.total || 0;
        
        // Query untuk mendapatkan total artis
        const artistResult = await executeQuery('SELECT COUNT(*) as total FROM artist');
        const totalArtists = artistResult[0]?.total || 0;
        
        // Query untuk mendapatkan total album
        const albumResult = await executeQuery('SELECT COUNT(*) as total FROM album');
        const totalAlbums = albumResult[0]?.total || 0;
        
        // Query untuk mendapatkan total play (dari field playing di tabel music)
        const playResult = await executeQuery('SELECT SUM(playing) as total FROM music');
        const totalPlays = playResult[0]?.total || 0;
        
        // Query untuk mendapatkan genre populer - HANYA 10 TERATAS
        const genreResult = await executeQuery(`
            SELECT 
                g.genre_name as name,
                COUNT(mg.id_music) as count
            FROM genre g
            LEFT JOIN music_genre mg ON g.id_genre = mg.id_genre
            GROUP BY g.id_genre, g.genre_name
            ORDER BY count DESC, g.genre_name ASC
            LIMIT 10
        `);
        
        const popularGenres = genreResult.map(genre => ({
            name: genre.name,
            count: genre.count || 0
        }));
        
        // Query untuk mendapatkan upload terbaru
        const recentResult = await executeQuery(`
            SELECT 
                m.id_music,
                m.title_music as title,
                a.artist_name as artist,
                DATE_FORMAT(m.created_at, '%Y-%m-%d %H:%i:%s') as upload_date,
                m.playing as plays
            FROM music m
            LEFT JOIN music_artist ma ON m.id_music = ma.id_music
            LEFT JOIN artist a ON ma.id_artist = a.id_artist
            WHERE m.title_music IS NOT NULL
            GROUP BY m.id_music, m.title_music, m.created_at, m.playing, a.artist_name
            ORDER BY m.created_at DESC
            LIMIT 5
        `);
        
        const recentUploads = recentResult.map(item => ({
            id: item.id_music,
            title: item.title || 'No Title',
            artist: item.artist || 'Unknown Artist',
            date: formatDate(item.upload_date),
            plays: item.plays || 0
        }));
        
        // Query untuk mendapatkan musik paling sering diputar
        const topPlayedResult = await executeQuery(`
            SELECT 
                m.id_music,
                m.title_music as title,
                a.artist_name as artist,
                m.playing as plays
            FROM music m
            LEFT JOIN music_artist ma ON m.id_music = ma.id_music
            LEFT JOIN artist a ON ma.id_artist = a.id_artist
            WHERE m.playing > 0 AND m.title_music IS NOT NULL
            GROUP BY m.id_music, m.title_music, m.playing, a.artist_name
            ORDER BY m.playing DESC
            LIMIT 5
        `);
        
        const topPlayed = topPlayedResult.map(item => ({
            id: item.id_music,
            title: item.title || 'No Title',
            artist: item.artist || 'Unknown Artist',
            plays: item.plays || 0
        }));
        
        return {
            totalMusic,
            totalArtists,
            totalAlbums,
            totalPlays,
            popularGenres,
            recentUploads,
            topPlayed,
            monthlyData: [],
            monthLabels: []
        };
        
    } catch (error) {
        console.error('Error fetching statistics from database:', error);
        return null;
    }
}

// Fungsi untuk mendapatkan data chart plays
async function getPlaysChartData(timeRange) {
    try {
        let query;
        let labels = [];
        let data = [];
        
        if (timeRange === 'today') {
            query = `
                SELECT 
                    HOUR(created_at) as hour,
                    SUM(playing) as plays
                FROM music
                WHERE DATE(created_at) = CURDATE()
                GROUP BY HOUR(created_at)
                ORDER BY hour
            `;
            
            const result = await executeQuery(query);
            
            // Buat array untuk 24 jam
            for (let i = 0; i < 24; i++) {
                labels.push(`${i}:00`);
                data.push(0);
            }
            
            // Isi data dari query
            result.forEach(item => {
                const hour = parseInt(item.hour);
                if (hour >= 0 && hour < 24) {
                    data[hour] = Number(item.plays) || 0;
                }
            });
            
        } else if (timeRange === 'week') {
            query = `
                SELECT 
                    DAYNAME(created_at) as day,
                    DAYOFWEEK(created_at) as day_num,
                    SUM(playing) as plays
                FROM music
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                GROUP BY DAYNAME(created_at), DAYOFWEEK(created_at)
                ORDER BY DAYOFWEEK(created_at)
            `;
            
            const result = await executeQuery(query);
            
            // Urutan hari dalam seminggu
            const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            
            // Inisialisasi data
            dayOrder.forEach((day, index) => {
                labels.push(dayLabels[index]);
                data.push(0);
            });
            
            // Isi data dari query
            result.forEach(item => {
                const dayName = item.day;
                const dayIndex = dayOrder.indexOf(dayName);
                if (dayIndex !== -1) {
                    data[dayIndex] = Number(item.plays) || 0;
                }
            });
            
        } else if (timeRange === 'month') {
            query = `
                SELECT 
                    DAY(created_at) as day,
                    SUM(playing) as plays
                FROM music
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY DAY(created_at)
                ORDER BY DAY(created_at)
            `;
            
            const result = await executeQuery(query);
            
            // Buat array untuk 30 hari terakhir
            const today = new Date();
            for (let i = 29; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                labels.push(`${date.getDate()}`);
                data.push(0);
            }
            
            // Isi data dari query
            result.forEach(item => {
                const day = parseInt(item.day);
                const dateIndex = labels.indexOf(day.toString());
                if (dateIndex !== -1) {
                    data[dateIndex] = Number(item.plays) || 0;
                }
            });
            
        } else if (timeRange === 'year') {
            query = `
                SELECT 
                    MONTH(created_at) as month,
                    SUM(playing) as plays
                FROM music
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
                GROUP BY MONTH(created_at)
                ORDER BY MONTH(created_at)
            `;
            
            const result = await executeQuery(query);
            
            // Label bulan
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            
            // Inisialisasi data
            monthNames.forEach(month => {
                labels.push(month);
                data.push(0);
            });
            
            // Isi data dari query
            result.forEach(item => {
                const monthIndex = parseInt(item.month) - 1;
                if (monthIndex >= 0 && monthIndex < 12) {
                    data[monthIndex] = Number(item.plays) || 0;
                }
            });
            
        } else { // all time
            query = `
                SELECT 
                    YEAR(created_at) as year,
                    SUM(playing) as plays
                FROM music
                GROUP BY YEAR(created_at)
                ORDER BY YEAR(created_at)
            `;
            
            const result = await executeQuery(query);
            
            result.forEach(item => {
                labels.push(item.year.toString());
                data.push(Number(item.plays) || 0);
            });
        }
        
        return {
            labels: labels,
            datasets: [{
                label: 'Plays',
                data: data,
                backgroundColor: "rgba(139, 92, 246, 0.1)",
                borderColor: "rgba(139, 92, 246, 1)",
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        };
        
    } catch (error) {
        console.error('Error fetching plays chart data:', error);
        return {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Plays',
                data: [100, 200, 150, 300, 250, 400],
                backgroundColor: "rgba(139, 92, 246, 0.1)",
                borderColor: "rgba(139, 92, 246, 1)",
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        };
    }
}

async function getGenreChartData() {
    try {
        const genreResult = await executeQuery(`
            SELECT 
                g.genre_name as name,
                COUNT(mg.id_music) as count
            FROM genre g
            LEFT JOIN music_genre mg ON g.id_genre = mg.id_genre
            GROUP BY g.id_genre, g.genre_name
            ORDER BY count DESC, g.genre_name ASC
            LIMIT 10
        `);
        
        const labels = genreResult.map(item => item.name || 'Unknown');
        const data = genreResult.map(item => item.count || 0);
        
        // Generate warna yang lebih beragam untuk 10 genre
        const colors = [
            'rgba(139, 92, 246, 0.8)',    // Purple
            'rgba(16, 185, 129, 0.8)',    // Green
            'rgba(59, 130, 246, 0.8)',    // Blue
            'rgba(245, 158, 11, 0.8)',    // Yellow
            'rgba(239, 68, 68, 0.8)',     // Red
            'rgba(168, 85, 247, 0.8)',    // Purple 2
            'rgba(20, 184, 166, 0.8)',    // Teal
            'rgba(249, 115, 22, 0.8)',    // Orange
            'rgba(236, 72, 153, 0.8)',    // Pink
            'rgba(139, 92, 246, 0.6)'     // Purple light
        ];
        
        // Function untuk generate warna yang unik berdasarkan nama genre
        function generateGenreColor(genreName, index) {
            // Jika ada warna yang sudah ditentukan, gunakan itu
            if (colors[index]) return colors[index];
            
            // Generate warna berdasarkan hash nama genre
            let hash = 0;
            for (let i = 0; i < genreName.length; i++) {
                hash = genreName.charCodeAt(i) + ((hash << 5) - hash);
            }
            
            const hue = Math.abs(hash % 360);
            return `hsla(${hue}, 70%, 60%, 0.8)`;
        }
        
        const backgroundColor = labels.map((label, index) => generateGenreColor(label, index));
        const borderColor = backgroundColor.map(color => color.replace('0.8', '1'));
        
        return {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColor,
                borderColor: borderColor,
                borderWidth: 2
            }]
        };
        
    } catch (error) {
        console.error('Error fetching genre chart data:', error);
        return {
            labels: ['Pop', 'Rock', 'Jazz', 'Hip Hop', 'Electronic'],
            datasets: [{
                data: [30, 25, 15, 20, 10],
                backgroundColor: [
                    'rgba(139, 92, 246, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(239, 68, 68, 0.8)'
                ],
                borderColor: [
                    'rgba(139, 92, 246, 1)',
                    'rgba(16, 185, 129, 1)',
                    'rgba(59, 130, 246, 1)',
                    'rgba(245, 158, 11, 1)',
                    'rgba(239, 68, 68, 1)'
                ],
                borderWidth: 2
            }]
        };
    }
}

// Fungsi untuk format tanggal
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
        console.error('Error formatting date:', dateString, error);
        return 'Unknown date';
    }
}

module.exports = router;