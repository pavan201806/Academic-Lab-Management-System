const User = require('./user.model');
const Section = require('./section.model');
const Lab = require('./lab.model');
const LabAssignment = require('./labAssignment.model');
const Experiment = require('./experiment.model');
const Submission = require('./submission.model');
const TestCase = require('./testCase.model');
const Evaluation = require('./evaluation.model');
const VivaEvaluation = require('./vivaEvaluation.model');
const ReevaluationRequest = require('./reevaluationRequest.model');
const Notification = require('./notification.model');
const { MalpracticeEvent, EVENT_TYPES, SEVERITY_LEVELS, DEFAULT_SEVERITY_MAP } = require('./malpracticeEvent.model');

module.exports = {
  User,
  Section,
  Lab,
  LabAssignment,
  Experiment,
  Submission,
  TestCase,
  Evaluation,
  VivaEvaluation,
  ReevaluationRequest,
  Notification,
  MalpracticeEvent,
  EVENT_TYPES,
  SEVERITY_LEVELS,
  DEFAULT_SEVERITY_MAP
};


