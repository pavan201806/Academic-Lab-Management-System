const mongoose = require('mongoose');
const config = require('../config/env');
const connectDB = require('../config/db');
const { User } = require('../models');
const logger = require('./logger');

const seedUsersData = [
  {
    name: 'Dr. Arthur Vance (HOD)',
    rollNumber: 'ADMIN01',
    plainPassword: 'AdminPass123!',
    role: 'ADMIN_HOD',
    mustChangePassword: false,
    section: '',
    active: true
  },
  {
    name: 'Prof. Elena Rostova',
    rollNumber: 'PROFVANCE',
    plainPassword: 'TeacherPass123!',
    role: 'TEACHER',
    mustChangePassword: false,
    section: '',
    active: true
  },
  {
    name: 'Marcus Chen',
    rollNumber: '202301001',
    plainPassword: 'TempStudent#2024',
    role: 'STUDENT',
    mustChangePassword: true, // Temporary password requiring first-login change
    section: 'CSE-A',
    active: true
  },
  {
    name: 'Aria Stark',
    rollNumber: '202301002',
    plainPassword: 'StudentPass123!',
    role: 'STUDENT',
    mustChangePassword: false,
    section: 'CSE-A',
    active: true
  },
  {
    name: 'Inactive User',
    rollNumber: '202301099',
    plainPassword: 'InactivePass123!',
    role: 'STUDENT',
    mustChangePassword: false,
    section: 'CSE-B',
    active: false
  }
];

const seedUsers = async () => {
  try {
    const dbRes = await connectDB();
    if (!dbRes.connected) {
      logger.warn('Database is not connected. Seed execution aborted.');
      return false;
    }

    logger.info('Seeding development test accounts...');

    for (const userData of seedUsersData) {
      const { plainPassword, ...rest } = userData;
      const passwordHash = await User.hashPassword(plainPassword);

      await User.findOneAndUpdate(
        { rollNumber: rest.rollNumber },
        { ...rest, passwordHash },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      logger.info(`Seeded account: [${rest.role}] ${rest.rollNumber} - ${rest.name}`);
    }

    logger.info('Seeding completed successfully.');
    return true;
  } catch (error) {
    logger.error('Error during database seeding:', error.message);
    return false;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  }
};

if (require.main === module) {
  seedUsers().then(() => process.exit(0));
}

module.exports = {
  seedUsers,
  seedUsersData
};
