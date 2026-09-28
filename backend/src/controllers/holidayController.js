const PublicHoliday = require('../models/PublicHoliday');
const { logAudit } = require('../middleware/auditLogger');

const getHolidays = async (req, res) => {
  try {
    const holidays = await PublicHoliday.find().sort({ date: 1 });
    res.json({ success: true, holidays });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch holidays', error: error.message });
  }
};

const createHoliday = async (req, res) => {
  try {
    const { date, name } = req.body;

    if (!date || !name) {
      return res.status(400).json({ success: false, message: 'Date and holiday name are required' });
    }

    const existing = await PublicHoliday.findOne({ date: date.trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: `Public holiday on ${date} already exists (${existing.name})` });
    }

    const holidayId = `HOL-${date.replace(/-/g, '')}`;
    const holiday = new PublicHoliday({
      holidayId,
      date: date.trim(),
      name: name.trim(),
      createdBy: req.user.name
    });

    await holiday.save();

    await logAudit(
      req,
      'PUBLIC_HOLIDAY_CREATED',
      { target: holidayId, details: `Created public holiday ${name} on ${date}` },
      null,
      holiday.toJSON()
    );

    res.status(201).json({ success: true, message: 'Public holiday created successfully', holiday });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create holiday', error: error.message });
  }
};

const deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const holiday = await PublicHoliday.findOne({ holidayId: id });
    if (!holiday) {
      return res.status(404).json({ success: false, message: 'Holiday not found' });
    }

    await PublicHoliday.deleteOne({ holidayId: id });

    await logAudit(
      req,
      'PUBLIC_HOLIDAY_DELETED',
      { details: `Deleted public holiday ${holiday.name} (${holiday.date})` },
      holiday.toJSON(),
      null
    );

    res.json({ success: true, message: 'Public holiday deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete holiday', error: error.message });
  }
};

module.exports = { getHolidays, createHoliday, deleteHoliday };
