// controllers/reminder.controller.js
import Reminder from "../models/reminder.model.js"

export const createReminder = async (req, res) => {
  try {
    const { title, message, remindAt, type, relatedId } = req.body

    // Validate remindAt is a future date
    if (!remindAt || new Date(remindAt) < new Date()) {
      return res
        .status(400)
        .json({ error: "remindAt must be a future timestamp" })
    }

    const newRem = await Reminder.create({
      userId: req.user._id,
      title,
      message,
      remindAt,
      type: type || "custom",
      relatedId: relatedId || null,
    })

    return res.status(201).json(newRem)
  } catch (err) {
    console.error("Create Reminder Error:", err)
    return res.status(500).json({ error: "Could not create reminder" })
  }
}

export const getReminders = async (req, res) => {
  try {
    // Fetch all reminders for this user, sorted by soonest remindAt first
    const reminders = await Reminder.find({ userId: req.user._id }).sort({
      remindAt: 1,
    })
    return res.status(200).json(reminders)
  } catch (err) {
    console.error("Get Reminders Error:", err)
    return res.status(500).json({ error: "Could not fetch reminders" })
  }
}

export const getReminderById = async (req, res) => {
  try {
    const { reminderId } = req.params
    const rem = await Reminder.findOne({
      _id: reminderId,
      userId: req.user._id,
    })
    if (!rem) return res.status(404).json({ error: "Reminder not found" })
    return res.status(200).json(rem)
  } catch (err) {
    console.error("Get Reminder By ID Error:", err)
    return res.status(500).json({ error: "Could not fetch reminder" })
  }
}

export const updateReminder = async (req, res) => {
  try {
    const { reminderId } = req.params
    const { title, message, remindAt, type, relatedId } = req.body

    // If remindAt is provided, ensure it’s still in the future
    if (remindAt && new Date(remindAt) < new Date()) {
      return res
        .status(400)
        .json({ error: "remindAt must be a future timestamp" })
    }

    const updated = await Reminder.findOneAndUpdate(
      { _id: reminderId, userId: req.user._id },
      {
        title,
        message,
        ...(remindAt ? { remindAt } : {}),
        ...(type ? { type } : {}),
        relatedId: relatedId || null,
        updatedAt: Date.now(),
      },
      { new: true }
    )

    if (!updated)
      return res
        .status(404)
        .json({ error: "Reminder not found or not owned by you" })
    return res.status(200).json(updated)
  } catch (err) {
    console.error("Update Reminder Error:", err)
    return res.status(500).json({ error: "Could not update reminder" })
  }
}

export const deleteReminder = async (req, res) => {
  try {
    const { reminderId } = req.params
    const rem = await Reminder.findOneAndDelete({
      _id: reminderId,
      userId: req.user._id,
    })
    if (!rem)
      return res
        .status(404)
        .json({ error: "Reminder not found or not owned by you" })
    return res.status(200).json({ message: "Reminder deleted" })
  } catch (err) {
    console.error("Delete Reminder Error:", err)
    return res.status(500).json({ error: "Could not delete reminder" })
  }
}
