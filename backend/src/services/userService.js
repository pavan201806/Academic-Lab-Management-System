const { User } = require('../models');
const AppError = require('../utils/appError');

class UserService {
  async getUsers(filter = {}) {
    const query = {};

    if (filter.role) {
      query.role = filter.role;
    }

    if (filter.active !== undefined) {
      query.active = filter.active === 'true' || filter.active === true;
    }

    if (filter.section) {
      query.section = filter.section;
    }

    if (filter.search) {
      const searchRegex = new RegExp(filter.search, 'i');
      query.$or = [{ name: searchRegex }, { rollNumber: searchRegex }];
    }

    return await User.find(query).sort({ rollNumber: 1 });
  }

  async getUserById(id) {
    const user = await User.findById(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return user;
  }

  async createUser({ name, rollNumber, role, temporaryPassword, section }) {
    const normalizedRoll = rollNumber.trim().toUpperCase();

    const existingUser = await User.findOne({ rollNumber: normalizedRoll });
    if (existingUser) {
      throw new AppError(`A user with roll number / username '${normalizedRoll}' already exists`, 409);
    }

    const passwordHash = await User.hashPassword(temporaryPassword);

    const user = await User.create({
      name,
      rollNumber: normalizedRoll,
      passwordHash,
      role,
      mustChangePassword: true,
      section: section || '',
      active: true
    });

    return user;
  }

  async updateUser(id, { name, section, active }) {
    const user = await User.findById(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (name !== undefined) user.name = name;
    if (section !== undefined) user.section = section;
    if (active !== undefined) user.active = active;

    await user.save();
    return user;
  }

  async resetTemporaryPassword(id, temporaryPassword) {
    const user = await User.findById(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    user.passwordHash = await User.hashPassword(temporaryPassword);
    user.mustChangePassword = true;
    await user.save();
    return user;
  }

  async toggleActive(id, active) {
    const user = await User.findById(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    user.active = active;
    await user.save();
    return user;
  }
}

module.exports = new UserService();
