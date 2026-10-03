const { Lab, LabAssignment, Section, User } = require('../models');
const AppError = require('../utils/appError');

class LabService {
  /**
   * Admin-level query to retrieve all labs with query filtering
   */
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
          .populate('section', 'name sectionCode academicYear semester department')
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

  /**
   * Role-aware lab assignment retrieval
   * - ADMIN_HOD: returns all labs with assignments
   * - TEACHER: returns active labs assigned to the authenticated teacher (MAIN & ASSISTANT)
   * - STUDENT: returns active labs assigned to the student's active section
   */
  async getAssignedLabs(user) {
    if (!user || !user.active) {
      throw new AppError('User account is inactive or invalid', 403);
    }

    if (user.role === 'ADMIN_HOD') {
      return await this.getLabs({ active: true });
    }

    if (user.role === 'TEACHER') {
      // Find all active assignments for this teacher
      const assignments = await LabAssignment.find({
        teacher: user._id,
        active: true
      })
        .populate('lab')
        .populate('section')
        .sort({ createdAt: -1 });

      // Filter to only include assignments where both lab and section are active
      const validAssignments = assignments.filter(
        (a) => a.lab && a.lab.active && a.section && a.section.active
      );

      // Return formatted teacher lab cards with assignment metadata
      return validAssignments.map((assignment) => {
        const lab = assignment.lab;
        const section = assignment.section;
        return {
          _id: lab._id,
          labId: lab._id,
          name: lab.name,
          code: lab.code,
          subject: lab.subject,
          department: lab.department,
          academicYear: lab.academicYear,
          semester: lab.semester,
          description: lab.description,
          active: lab.active,
          assignmentId: assignment._id,
          assignmentType: assignment.assignmentType, // MAIN or ASSISTANT
          assignedAt: assignment.assignedAt,
          section: {
            _id: section._id,
            name: section.name,
            sectionCode: section.sectionCode,
            academicYear: section.academicYear,
            semester: section.semester,
            department: section.department
          }
        };
      });
    }

    if (user.role === 'STUDENT') {
      if (!user.section) {
        return [];
      }

      // Look up student's active section
      const section = await Section.findOne({
        sectionCode: user.section.toUpperCase(),
        active: true
      });

      if (!section) {
        return [];
      }

      // Find all active lab assignments for this student's section
      const assignments = await LabAssignment.find({
        section: section._id,
        active: true
      })
        .populate('lab')
        .populate('teacher', 'name rollNumber');

      // Filter for active labs and group assignments by lab
      const activeAssignments = assignments.filter((a) => a.lab && a.lab.active);

      const labMap = new Map();

      for (const a of activeAssignments) {
        const labIdStr = a.lab._id.toString();
        if (!labMap.has(labIdStr)) {
          labMap.set(labIdStr, {
            _id: a.lab._id,
            labId: a.lab._id,
            name: a.lab.name,
            code: a.lab.code,
            subject: a.lab.subject,
            department: a.lab.department,
            academicYear: a.lab.academicYear,
            semester: a.lab.semester,
            description: a.lab.description,
            active: a.lab.active,
            section: {
              _id: section._id,
              name: section.name,
              sectionCode: section.sectionCode,
              academicYear: section.academicYear,
              semester: section.semester,
              department: section.department
            },
            teachers: []
          });
        }

        if (a.teacher) {
          labMap.get(labIdStr).teachers.push({
            _id: a.teacher._id,
            name: a.teacher.name,
            rollNumber: a.teacher.rollNumber,
            assignmentType: a.assignmentType
          });
        }
      }

      return Array.from(labMap.values());
    }

    throw new AppError('Unauthorized role access', 403);
  }

  /**
   * Role-aware lab details retrieval enforcing strict IDOR protection & section-specific authorization
   * @param {string} id - Lab ID
   * @param {object} user - Authenticated User object from JWT
   * @param {object} [options] - Optional section context ({ sectionId, sectionCode })
   */
  async getLabDetailsForUser(id, user, options = {}) {
    if (!user || !user.active) {
      throw new AppError('User account is inactive or invalid', 403);
    }

    const lab = await Lab.findById(id);
    if (!lab) {
      throw new AppError('Laboratory not found', 404);
    }

    // ADMIN_HOD has administrative access to any lab
    if (user.role === 'ADMIN_HOD') {
      const assignmentQuery = { lab: lab._id, active: true };
      if (options.sectionId) {
        assignmentQuery.section = options.sectionId;
      }

      const assignments = await LabAssignment.find(assignmentQuery)
        .populate('section', 'name sectionCode academicYear semester department active')
        .populate('teacher', 'name rollNumber role active');

      const labObj = lab.toJSON();
      labObj.assignments = assignments;
      return labObj;
    }

    // Inactive labs cannot be accessed by teachers or students
    if (!lab.active) {
      throw new AppError('This laboratory is deactivated and unavailable for access', 403);
    }

    // TEACHER access validation
    if (user.role === 'TEACHER') {
      // Find all active assignments for this teacher in this lab
      const teacherAssignments = await LabAssignment.find({
        lab: lab._id,
        teacher: user._id,
        active: true
      }).populate('section');

      const activeTeacherAssignments = teacherAssignments.filter(
        (a) => a.section && a.section.active
      );

      if (activeTeacherAssignments.length === 0) {
        throw new AppError('You do not have an active faculty assignment for this laboratory', 403);
      }

      // If a specific section context was requested (by sectionId or sectionCode),
      // verify the teacher has an active assignment for that specific section.
      if (options.sectionId || options.sectionCode) {
        const matchingAssignment = activeTeacherAssignments.find((a) => {
          if (options.sectionId && a.section._id.toString() === options.sectionId.toString()) {
            return true;
          }
          if (options.sectionCode && a.section.sectionCode?.toUpperCase() === options.sectionCode.toUpperCase()) {
            return true;
          }
          return false;
        });

        if (!matchingAssignment) {
          throw new AppError(
            'You do not have an active faculty assignment for this specific section in this laboratory',
            403
          );
        }

        // Fetch cohort assignments for this specific section
        const sectionCohortAssignments = await LabAssignment.find({
          lab: lab._id,
          section: matchingAssignment.section._id,
          active: true
        })
          .populate('section', 'name sectionCode academicYear semester department')
          .populate('teacher', 'name rollNumber role');

        const labObj = lab.toJSON();
        labObj.currentSection = matchingAssignment.section;
        labObj.myAssignment = {
          assignmentId: matchingAssignment._id,
          assignmentType: matchingAssignment.assignmentType,
          section: matchingAssignment.section
        };
        labObj.cohortAssignments = sectionCohortAssignments;
        labObj.assignedSections = activeTeacherAssignments.map((a) => a.section);
        return labObj;
      }

      // If no section context specified, return all sections the teacher is assigned to for this lab
      const sectionIds = activeTeacherAssignments.map((a) => a.section._id);

      const allCohortAssignments = await LabAssignment.find({
        lab: lab._id,
        section: { $in: sectionIds },
        active: true
      })
        .populate('section', 'name sectionCode academicYear semester department')
        .populate('teacher', 'name rollNumber role');

      const labObj = lab.toJSON();
      labObj.myAssignments = activeTeacherAssignments.map((a) => ({
        assignmentId: a._id,
        assignmentType: a.assignmentType,
        section: a.section
      }));
      labObj.cohortAssignments = allCohortAssignments;
      labObj.assignedSections = activeTeacherAssignments.map((a) => a.section);
      return labObj;
    }

    // STUDENT access validation
    if (user.role === 'STUDENT') {
      if (!user.section) {
        throw new AppError('You are not currently enrolled in any academic section', 403);
      }

      const section = await Section.findOne({
        sectionCode: user.section.toUpperCase(),
        active: true
      });

      if (!section) {
        throw new AppError('Your enrolled section is inactive or does not exist', 403);
      }

      // If student requested a different section context, reject it (cannot access another section's lab)
      if (options.sectionId && options.sectionId.toString() !== section._id.toString()) {
        throw new AppError('You cannot access laboratory details for a section other than your own enrolled section', 403);
      }
      if (options.sectionCode && options.sectionCode.toUpperCase() !== section.sectionCode.toUpperCase()) {
        throw new AppError('You cannot access laboratory details for a section other than your own enrolled section', 403);
      }

      const sectionAssignments = await LabAssignment.find({
        lab: lab._id,
        section: section._id,
        active: true
      }).populate('teacher', 'name rollNumber');

      if (sectionAssignments.length === 0) {
        throw new AppError('This laboratory is not assigned to your academic section', 403);
      }

      const labObj = lab.toJSON();
      labObj.enrolledSection = {
        _id: section._id,
        name: section.name,
        sectionCode: section.sectionCode,
        academicYear: section.academicYear,
        semester: section.semester,
        department: section.department
      };
      labObj.instructors = sectionAssignments.map((a) => ({
        _id: a.teacher?._id,
        name: a.teacher?.name,
        rollNumber: a.teacher?.rollNumber,
        assignmentType: a.assignmentType
      }));

      return labObj;
    }

    throw new AppError('Unauthorized access', 403);
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

