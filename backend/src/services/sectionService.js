const { Section, User } = require('../models');
const AppError = require('../utils/appError');

class SectionService {
  async getSections(filter = {}) {
    const query = {};

    if (filter.active !== undefined) {
      query.active = filter.active === 'true' || filter.active === true;
    }

    if (filter.academicYear) {
      query.academicYear = filter.academicYear;
    }

    if (filter.semester) {
      query.semester = filter.semester;
    }

    if (filter.department) {
      query.department = filter.department;
    }

    if (filter.search) {
      const regex = new RegExp(filter.search, 'i');
      query.$or = [{ name: regex }, { sectionCode: regex }, { department: regex }];
    }

    const sections = await Section.find(query).sort({ sectionCode: 1 });

    // Attach student count dynamically
    const sectionsWithCount = await Promise.all(
      sections.map(async (sec) => {
        const studentCount = await User.countDocuments({
          section: sec.sectionCode,
          role: 'STUDENT',
          active: true
        });
        const secObj = sec.toJSON();
        secObj.studentCount = studentCount;
        return secObj;
      })
    );

    return sectionsWithCount;
  }

  async getSectionById(id) {
    const section = await Section.findById(id);
    if (!section) {
      throw new AppError('Section not found', 404);
    }
    const studentCount = await User.countDocuments({
      section: section.sectionCode,
      role: 'STUDENT',
      active: true
    });
    const secObj = section.toJSON();
    secObj.studentCount = studentCount;
    return secObj;
  }

  async createSection(data) {
    const normalizedCode = data.sectionCode.trim().toUpperCase();

    const existingSection = await Section.findOne({ sectionCode: normalizedCode });
    if (existingSection) {
      throw new AppError(`Section with code '${normalizedCode}' already exists`, 409);
    }

    const section = await Section.create({
      ...data,
      sectionCode: normalizedCode
    });

    return section;
  }

  async updateSection(id, data) {
    const section = await Section.findById(id);
    if (!section) {
      throw new AppError('Section not found', 404);
    }

    if (data.sectionCode && data.sectionCode.toUpperCase() !== section.sectionCode) {
      const normalizedCode = data.sectionCode.trim().toUpperCase();
      const duplicate = await Section.findOne({ sectionCode: normalizedCode });
      if (duplicate && duplicate._id.toString() !== id) {
        throw new AppError(`Section with code '${normalizedCode}' already exists`, 409);
      }
      section.sectionCode = normalizedCode;
    }

    if (data.name) section.name = data.name;
    if (data.academicYear) section.academicYear = data.academicYear;
    if (data.semester) section.semester = data.semester;
    if (data.department) section.department = data.department;
    if (data.active !== undefined) section.active = data.active;

    await section.save();
    return section;
  }

  async toggleActive(id, active) {
    const section = await Section.findById(id);
    if (!section) {
      throw new AppError('Section not found', 404);
    }

    section.active = active;
    await section.save();
    return section;
  }

  async getSectionStudents(sectionCode) {
    return await User.find({
      section: sectionCode.toUpperCase(),
      role: 'STUDENT'
    }).sort({ rollNumber: 1 });
  }

  async assignStudentToSection(studentId, sectionCode) {
    const student = await User.findById(studentId);
    if (!student || student.role !== 'STUDENT') {
      throw new AppError('Valid student not found', 404);
    }

    if (sectionCode) {
      const sectionExists = await Section.findOne({
        sectionCode: sectionCode.toUpperCase(),
        active: true
      });
      if (!sectionExists) {
        throw new AppError(`Active section with code '${sectionCode}' not found`, 404);
      }
      student.section = sectionCode.toUpperCase();
    } else {
      student.section = '';
    }

    await student.save();
    return student;
  }
}

module.exports = new SectionService();
