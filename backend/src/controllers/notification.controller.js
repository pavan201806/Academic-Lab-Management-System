const notificationService = require('../services/notificationService');

const createNotification = async (req, res, next) => {
  try {
    const notification = await notificationService.createNotification(req.user, req.body);
    res.status(201).json({
      status: 'success',
      data: notification
    });
  } catch (err) {
    next(err);
  }
};

const getNotifications = async (req, res, next) => {
  try {
    const result = await notificationService.getNotifications(req.user);
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const getNotificationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notification = await notificationService.getNotificationById(req.user, id);
    res.status(200).json({
      status: 'success',
      data: notification
    });
  } catch (err) {
    next(err);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await notificationService.markAsRead(req.user, id);
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    const result = await notificationService.markAllAsRead(req.user);
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await notificationService.deleteNotification(req.user, id);
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createNotification,
  getNotifications,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  deleteNotification
};
