const { LabAssignment, Lab, Section, User } = require('../models');
const AppError = require('../utils/appError');

class LabAssignmentService {
  async getAssignments(filter = {}) {
    const query = {};

    if (filter.active !== undefined) {
      query.active = filter.active === 'true' || filter.active === true;
    }

    if (filter.lab) {
      query.lab = filter.lab;
    }

    if (filter.section) {
      query.section = filter.section;
    }

    if (filter.teacher) {
      query.teacher = filter.teacher;
    }

    if (filter.assignmentType) {
      query.assignmentType = filter.assignmentType;
    }

    return await LabAssignment.find(query)
      .populate('lab', 'name code subject department academicYear semester active')
      .populate('section', 'name sectionCode department academicYear semester active')
      .populate('teacher', 'name rollNumber role active')
      .sort({ createdAt: -1 });
  }

  async getAssignmentById(id) {
    const assignment = await LabAssignment.findById(id)
      .populate('lab')
      .populate('section')
      .populate('teacher', 'name rollNumber role active');

    if (!assignment) {
      throw new AppError('Lab assignment not found', 404);
    }
    return assignment;
  }

  async createAssignment({ lab, section, teacher, assignmentType }) {
    // 1. Verify active Lab
    const labDoc = await Lab.findById(lab);
    if (!labDoc) {
      throw new AppError('Referenced laboratory not found', 404);
    }
    if (!labDoc.active) {
      throw new AppError('Cannot assign teachers to an inactive laboratory', 400);
    }

    // 2. Verify active Section
    const sectionDoc = await Section.findById(section);
    if (!sectionDoc) {
      throw new AppError('Referenced section not found', 404);
    }
    if (!sectionDoc.active) {
      throw new AppError('Cannot assign teachers to an inactive section', 400);
    }

    // 3. Verify Teacher
    const teacherDoc = await User.findById(teacher);
    if (!teacherDoc) {
      throw new AppError('Referenced teacher not found', 404);
    }
    if (teacherDoc.role !== 'TEACHER') {
      throw new AppError(`User '${teacherDoc.name}' is a ${teacherDoc.role}, not a TEACHER. Only teachers can be assigned to labs.`, 400);
    }
    if (!teacherDoc.active) {
      throw new AppError('Cannot assign an inactive teacher', 400);
    }

    // 4. Check for existing active assignment for this specific teacher in this lab + section
    const existingTeacherAssignment = await LabAssignment.findOne({
      lab,
      section,
      teacher,
      active: true
    });

    if (existingTeacherAssignment) {
      throw new AppError(
        `Teacher '${teacherDoc.name}' is already actively assigned as ${existingTeacherAssignment.assignmentType} teacher for this lab and section.`,
        409
      );
    }

    // 5. If assigning as MAIN teacher, ensure no other active MAIN teacher exists for this lab + section
    if (assignmentType === 'MAIN') {
      const existingMainAssignment = await LabAssignment.findOne({
        lab,
        section,
        assignmentType: 'MAIN',
        active: true
      }).populate('teacher', 'name');

      if (existingMainAssignment) {
        throw new AppError(
          `This Lab and Section already has an active Main Teacher: '${existingMainAssignment.teacher?.name || 'Unknown'}'. Only one Main Teacher is permitted per lab section cohort.`,
          409
        );
      }
    }

    // 6. Create Assignment
    const assignment = await LabAssignment.create({
      lab,
      section,
      teacher,
      assignmentType,
      active: true,
      assignedAt: new Date()
    });

    return await this.getAssignmentById(assignment._id);
  }

  async toggleActive(id, active) {
    const assignment = await LabAssignment.findById(id);
    if (!assignment) {
      throw new AppError('Lab assignment not found', 404);
    }

    // If reactivating as MAIN, check that no other active MAIN teacher currently exists
    if (active && assignment.assignmentType === 'MAIN') {
      const activeMain = await LabAssignment.findOne({
        lab: assignment.lab,
        section: assignment.section,
        assignmentType: 'MAIN',
        active: true,
        _id: { $ne: assignment._id }
      });
      if (activeMain) {
        throw new AppError('Cannot activate assignment: another active Main Teacher is already assigned to this lab and section.', 409);
      }
    }

    assignment.active = active;
    await assignment.save();
    return await this.getAssignmentById(assignment._id);
  }

  async getLabAssignments(labId) {
    return await LabAssignment.find({ lab: labId, active: true })
      .populate('section', 'name sectionCode department academicYear semester')
      .populate('teacher', 'name rollNumber role')
      .sort({ assignmentType: 1 });
  }

  async getTeacherAssignments(teacherId) {
    return await LabAssignment.find({ teacher: teacherId, active: true })
      .populate('lab', 'name code subject department academicYear semester')
      .populate('section', 'name sectionCode department academicYear semester')
      .sort({ createdAt: -1 });
  }
}

module.exports = new LabAssignmentService();
