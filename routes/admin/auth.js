const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { db } = require('../../db'); // Import db dari db.js
const { redirectIfAdminAuthenticated } = require('../../middleware/admin-auth');

// GET Admin Login Page
router.get('/admin/login', redirectIfAdminAuthenticated, (req, res) => {
    res.render('admin/login', { 
        error: null,
        success: null 
    });
});

// POST Admin Login
router.post('/admin/login', redirectIfAdminAuthenticated, async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validasi input
        if (!email || !password) {
            return res.render('admin/login', {
                error: 'Email dan password harus diisi',
                success: null
            });
        }
        
        // Cari admin di database menggunakan promise wrapper
        const [admin] = await db.promise().query(
            'SELECT * FROM user_admin WHERE email_admin = ?',
            [email]
        );
        
        if (admin.length === 0) {
            return res.render('admin/login', {
                error: 'Email atau password salah',
                success: null
            });
        }
        
        const adminData = admin[0];
        
        // Verifikasi password dengan bcrypt
        const isPasswordValid = await bcrypt.compare(password, adminData.password_admin);
        
        if (!isPasswordValid) {
            return res.render('admin/login', {
                error: 'Email atau password salah',
                success: null
            });
        }
        
        // Simpan session user jika ada sebelum set admin session
        const userSessionId = req.session.user_id;
        
        // Set session admin
        req.session.admin = {
            id: adminData.ua,
            name: adminData.admin_name,
            email: adminData.email_admin,
            createdAt: adminData.created_at
        };
        
        // Kembalikan session user jika ada
        if (userSessionId) {
            req.session.user_id = userSessionId;
            console.log('Session user dikembalikan setelah admin login');
        }
        
        // Redirect ke dashboard
        res.redirect('/admin/dashboard');
        
    } catch (error) {
        console.error('Login error:', error);
        res.render('admin/login', {
            error: 'Terjadi kesalahan sistem',
            success: null
        });
    }
});

// Admin Logout
router.get('/admin/logout', (req, res) => {
    // PERBAIKAN: Simpan session user terlebih dahulu
    const userSessionId = req.session.user_id;
    
    // Hapus HANYA session admin
    delete req.session.admin;
    
    // Kembalikan session user jika ada
    if (userSessionId) {
        req.session.user_id = userSessionId;
        console.log('Session user dikembalikan setelah admin logout');
    }
    
    res.redirect('/admin/login');
});

module.exports = router;