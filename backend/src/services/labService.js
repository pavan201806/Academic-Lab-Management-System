const { Lab, LabAssignment } = require('../models');
const AppError = require('../utils/appError');

class LabService {
  async getLabs(filter = {}) {
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
      query.$or = [{ name: regex }, { code: regex }, { subject: regex }, { department: regex }];
    }

    const labs = await Lab.find(query).sort({ code: 1 });

    // Attach assignment metadata for each lab
    const labsWithAssignments = await Promise.all(
      labs.map(async (lab) => {
        const assignments = await LabAssignment.find({ lab: lab._id, active: true })
          .populate('section', 'name sectionCode')
          .populate('teacher', 'name rollNumber');

        const labObj = lab.toJSON();
        labObj.assignments = assignments;
        labObj.assignedSectionsCount = new Set(assignments.map((a) => a.section?._id?.toString())).size;
        labObj.assignedTeachersCount = new Set(assignments.map((a) => a.teacher?._id?.toString())).size;
        return labObj;
      })
    );

    return labsWithAssignments;
  }

  async getLabById(id) {
    const lab = await Lab.findById(id);
    if (!lab) {
      throw new AppError('Laboratory not found', 404);
    }

    const assignments = await LabAssignment.find({ lab: lab._id, active: true })
      .populate('section', 'name sectionCode academicYear semester department')
      .populate('teacher', 'name rollNumber role');

    const labObj = lab.toJSON();
    labObj.assignments = assignments;
    return labObj;
  }

  async createLab(data) {
    const normalizedCode = data.code.trim().toUpperCase();

    const existingLab = await Lab.findOne({ code: normalizedCode });
    if (existingLab) {
      throw new AppError(`Laboratory with code '${normalizedCode}' already exists`, 409);
    }

    const lab = await Lab.create({
      ...data,
      code: normalizedCode
    });

    return lab;
  }

  async updateLab(id, data) {
    const lab = await Lab.findById(id);
    if (!lab) {
      throw new AppError('Laboratory not found', 404);
    }

    if (data.code && data.code.toUpperCase() !== lab.code) {
      const normalizedCode = data.code.trim().toUpperCase();
      const duplicate = await Lab.findOne({ code: normalizedCode });
      if (duplicate && duplicate._id.toString() !== id) {
        throw new AppError(`Laboratory with code '${normalizedCode}' already exists`, 409);
      }
      lab.code = normalizedCode;
    }

    if (data.name) lab.name = data.name;
    if (data.subject) lab.subject = data.subject;
    if (data.department) lab.department = data.department;
    if (data.academicYear) lab.academicYear = data.academicYear;
    if (data.semester) lab.semester = data.semester;
    if (data.description !== undefined) lab.description = data.description;
    if (data.active !== undefined) lab.active = data.active;

    await lab.save();
    return lab;
  }

  async toggleActive(id, active) {
    const lab = await Lab.findById(id);
    if (!lab) {
      throw new AppError('Laboratory not found', 404);
    }

    lab.active = active;
    await lab.save();
    return lab;
  }
}

module.exports = new LabService();
