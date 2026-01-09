import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from '../models/Admin.js';

dotenv.config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const adminData = {
      username: 'admin',
      email: 'admin@genericwholesale.pk',
      password: 'admin123',
      role: 'superadmin'
    };

    const existingAdmin = await Admin.findOne({ username: adminData.username });
    
    if (existingAdmin) {
      console.log('Admin already exists');
      process.exit(0);
    }

    const admin = new Admin(adminData);
    await admin.save();
    
    console.log('Admin created successfully');
    console.log('Username:', adminData.username);
    console.log('Password:', adminData.password);
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
};

createAdmin();
