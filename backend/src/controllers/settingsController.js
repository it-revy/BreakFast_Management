const BreakfastSetting = require('../models/BreakfastSetting');
const BreakfastReason = require('../models/BreakfastReason');
const { logAudit } = require('../middleware/auditLogger');

const getSettings = async (req, res) => {
  try {
    let settings = await BreakfastSetting.findOne();
    if (!settings) {
      settings = await BreakfastSetting.create({ cutoffTime: '12:00', timezone: 'Asia/Kolkata', autoLockEnabled: true });
    }

    const reasons = await BreakfastReason.find().sort({ displayOrder: 1 });

    res.json({
      success: true,
      settings,
      reasons
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch settings', error: error.message });
  }
};

const updateSettings = async (req, res) => {
  try {
    const { cutoffTime, timezone, autoLockEnabled } = req.body;

    let settings = await BreakfastSetting.findOne();
    if (!settings) {
      settings = new BreakfastSetting();
    }

    const beforeState = settings.toJSON();

    if (cutoffTime) settings.cutoffTime = cutoffTime;
    if (timezone) settings.timezone = timezone;
    if (autoLockEnabled !== undefined) settings.autoLockEnabled = autoLockEnabled;

    await settings.save();

    const afterState = settings.toJSON();

    await logAudit(
      req,
      'BREAKFAST_SETTINGS_UPDATED',
      { details: `Updated cutoff time to ${settings.cutoffTime}` },
      beforeState,
      afterState
    );

    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update settings', error: error.message });
  }
};

const addReasonType = async (req, res) => {
  try {
    const { code, label, isCustomAllowed, displayOrder } = req.body;

    if (!code || !label) {
      return res.status(400).json({ success: false, message: 'Code and label are required' });
    }

    const upperCode = code.trim().toUpperCase();
    const existing = await BreakfastReason.findOne({ code: upperCode });
    if (existing) {
      return res.status(400).json({ success: false, message: `Reason code ${upperCode} already exists` });
    }

    const reason = new BreakfastReason({
      code: upperCode,
      label: label.trim(),
      isCustomAllowed: !!isCustomAllowed,
      displayOrder: displayOrder || 99
    });

    await reason.save();

    await logAudit(
      req,
      'BREAKFAST_REASON_ADDED',
      { details: `Added new breakfast rejection reason: ${label}` },
      null,
      reason.toJSON()
    );

    res.status(201).json({
      success: true,
      message: 'Reason added successfully',
      reason
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add reason type', error: error.message });
  }
};

module.exports = {
  getSettings,
  updateSettings,
  addReasonType
};
