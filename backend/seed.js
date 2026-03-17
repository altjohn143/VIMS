const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  phone: String,
  password: String,
  role: { type: String, enum: ['resident', 'admin', 'security'] },
  houseNumber: String,
  isActive: { type: Boolean, default: true },
  isApproved: { type: Boolean, default: false } // Changed default to false
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

const seedDatabase = async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/vims_system', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB for seeding');

    const adminExists = await User.findOne({ email: 'admin@vims.com' });
    const securityExists = await User.findOne({ email: 'security@vims.com' });
    
    if (adminExists && securityExists) {
      console.log('Admin and Security accounts already exist');
      console.log('Skipping seeding...');
      
      // Update existing admin and security to be approved
      await User.updateMany(
        { role: { $in: ['admin', 'security'] } },
        { $set: { isApproved: true } }
      );
      console.log('Updated admin/security accounts to approved');
      
      mongoose.connection.close();
      return;
    }
    
    console.log('Creating pre-registered accounts...');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123!', salt);

    if (!adminExists) {
      const adminUser = new User({
        firstName: 'System',
        lastName: 'Administrator',
        email: 'admin@vims.com',
        phone: '9876543210',
        password: hashedPassword,
        role: 'admin',
        isApproved: true,  // Explicitly set to true
        isActive: true
      });
      await adminUser.save();
      console.log('Admin account created');
    }

    if (!securityExists) {
      const securityUser = new User({
        firstName: 'Security',
        lastName: 'Officer',
        email: 'security@vims.com',
        phone: '9876543211',
        password: hashedPassword,
        role: 'security',
        isApproved: true,  // Explicitly set to true
        isActive: true
      });
      await securityUser.save();
      console.log('Security account created');
    }

    console.log('\nPre-registered accounts:');
    console.log('Admin: admin@vims.com / SecurePass123!');
    console.log('Security: security@vims.com / SecurePass123!');
    console.log('IMPORTANT: Change these passwords after first login!');

    mongoose.connection.close();
    
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedDatabase();