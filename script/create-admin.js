const bcrypt = require('bcrypt');
const { db } = require('../db'); // Import db promise wrapper

async function createAdmin() {
    try {
        const adminData = {
            name: 'Super Admin',
            email: 'admin@goovlize.com',
            password: 'Admin@123!' // Password yang kuat
        };
        
        console.log('Creating admin user...');
        
        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(adminData.password, saltRounds);
        
        // Check if admin already exists
        try {
            const existingAdmin = await db.query(
                'SELECT * FROM user_admin WHERE email_admin = ?',
                [adminData.email]
            );
            
            if (existingAdmin.length > 0) {
                console.log('❌ Admin already exists!');
                process.exit(1);
            }
        } catch (err) {
            // Jika tabel belum ada, lanjutkan
            console.log('Table might not exist, proceeding...');
        }
        
        // Create admin
        const result = await db.query(
            'INSERT INTO user_admin (admin_name, email_admin, password_admin) VALUES (?, ?, ?)',
            [adminData.name, adminData.email, hashedPassword]
        );
        
        console.log('✅ Admin created successfully!');
        console.log('========================================');
        console.log(`Email: ${adminData.email}`);
        console.log(`Password: ${adminData.password}`);
        console.log('========================================');
        console.log('⚠️ WARNING: Change password immediately after first login!');
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error creating admin:', error.message);
        
        // Cek jika error karena tabel tidak ada
        if (error.code === 'ER_NO_SUCH_TABLE') {
            console.log('\n📋 Table user_admin does not exist. Please create it first:');
            console.log(`
CREATE TABLE user_admin (
    ua INT AUTO_INCREMENT PRIMARY KEY,
    admin_name VARCHAR(100) NOT NULL,
    email_admin VARCHAR(100) UNIQUE NOT NULL,
    password_admin VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
            `);
        }
        
        process.exit(1);
    }
}

createAdmin();