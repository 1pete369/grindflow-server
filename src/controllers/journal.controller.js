import Journal from "../models/journal.model.js"
// Create a new journal entry
export const createJournal = async (req, res) => {
  try {
    const { title, body } = req.body
    const newEntry = await Journal.create({
      userId: req.user._id,
      title,
      body,
    })
    return res.status(201).json(newEntry)
  } catch (err) {
    console.error("Create Journal Error:", err)
    return res.status(500).json({ error: "Could not create journal entry" })
  }
}

// Get all journal entries for current user
export const getJournals = async (req, res) => {
  try {
    const entries = await Journal.find({ userId: req.user._id }).sort({
      createdAt: -1,
    })
    return res.status(200).json(entries)
  } catch (err) {
    console.error("Get Journals Error:", err)
    return res.status(500).json({ error: "Could not fetch journal entries" })
  }
}

// Get single journal entry by ID
export const getJournalById = async (req, res) => {
  try {
    const { journalId } = req.params
    const entry = await Journal.findOne({
      _id: journalId,
      userId: req.user._id,
    })
    if (!entry)
      return res.status(404).json({ error: "Journal entry not found" })
    return res.status(200).json(entry)
  } catch (err) {
    console.error("Get Journal By ID Error:", err)
    return res.status(500).json({ error: "Could not fetch journal entry" })
  }
}

// Update a journal entry
export const updateJournal = async (req, res) => {
  try {
    const { journalId } = req.params
    const { title, body } = req.body
    const entry = await Journal.findOneAndUpdate(
      { _id: journalId, userId: req.user._id },
      { title, body, updatedAt: Date.now() },
      { new: true }
    )
    if (!entry)
      return res
        .status(404)
        .json({ error: "Journal entry not found or not owned by you" })
    return res.status(200).json(entry)
  } catch (err) {
    console.error("Update Journal Error:", err)
    return res.status(500).json({ error: "Could not update journal entry" })
  }
}

// Delete a journal entry
export const deleteJournal = async (req, res) => {
  try {
    const { journalId } = req.params
    const entry = await Journal.findOneAndDelete({
      _id: journalId,
      userId: req.user._id,
    })
    if (!entry)
      return res
        .status(404)
        .json({ error: "Journal entry not found or not owned by you" })
    return res.status(200).json({ message: "Journal entry deleted" })
  } catch (err) {
    console.error("Delete Journal Error:", err)
    return res.status(500).json({ error: "Could not delete journal entry" })
  }
}
